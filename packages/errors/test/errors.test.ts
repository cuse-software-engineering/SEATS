// The one mapping of failures to gRPC statuses that every service's API layer uses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import grpc from '@grpc/grpc-js';
import { DomainError, InfrastructureError, fromCollaborator, isGrpcServiceError, refusalOf, toServiceError } from '../src/index.js';

const quiet = () => {};
const details = (e: grpc.ServiceError): unknown => { const raw = e.metadata.get('error-details-bin')[0]; return raw ? JSON.parse(raw.toString()) : undefined; };
const serviceError = (code: grpc.status, message: string): grpc.ServiceError => Object.assign(new Error(message), { code, details: message, metadata: new grpc.Metadata() });

test('a domain error answers its kind with the message of the rule and the details for the client', () => {
  const e = toServiceError(new DomainError('conflict', 'the table has just been taken by another customer'), quiet);
  assert.equal(e.code, grpc.status.FAILED_PRECONDITION); assert.equal(e.details, 'the table has just been taken by another customer'); assert.equal(details(e), undefined);
  const v = toServiceError(new DomainError('invalid', 'invalid profile', ['name is required']), quiet);
  assert.equal(v.code, grpc.status.INVALID_ARGUMENT); assert.deepEqual(details(v), ['name is required']);
  assert.equal(toServiceError(new DomainError('not_found', 'x'), quiet).code, grpc.status.NOT_FOUND);
  assert.equal(toServiceError(new DomainError('unauthenticated', 'x'), quiet).code, grpc.status.UNAUTHENTICATED);
  assert.equal(toServiceError(new DomainError('not_implemented', 'x'), quiet).code, grpc.status.UNIMPLEMENTED);
});

test('an infrastructure error is UNAVAILABLE, names the system, and is logged with its cause', () => {
  const lines: string[] = [];
  const cause = new Error('ECONNREFUSED');
  const e = toServiceError(new InfrastructureError('the object storage', 'the object storage did not accept the image', { cause }), (line, c) => lines.push(`${line} <${(c as Error)?.message}>`));
  assert.equal(e.code, grpc.status.UNAVAILABLE); assert.equal(e.details, 'the object storage did not accept the image');
  assert.deepEqual(details(e), { system: 'the object storage', retryable: true });
  assert.deepEqual(lines, ['[infrastructure] the object storage: the object storage did not accept the image <ECONNREFUSED>']);
});

test('a defect is INTERNAL with a reference only; the stack goes to the log', () => {
  const lines: string[] = [];
  const e = toServiceError(new TypeError("Cannot read properties of undefined (reading 'tables')"), (line) => lines.push(line));
  assert.equal(e.code, grpc.status.INTERNAL);
  assert.match(e.details, /^internal error \(ref [0-9a-f]{8}\)$/);
  assert.equal(lines.length, 1); assert.match(lines[0], /^\[defect [0-9a-f]{8}\] TypeError: Cannot read properties/); assert.match(lines[0], /\n\s+at /);
  assert.doesNotMatch(e.details, /Cannot read/);
});

test('refusalOf() reads the kind of a collaborator refusal, null for anything else', () => {
  assert.equal(refusalOf(serviceError(grpc.status.NOT_FOUND, 'round not found')), 'not_found');
  assert.equal(refusalOf({ code: grpc.status.FAILED_PRECONDITION }), 'conflict');   // a stub in a unit test carries the code only
  assert.equal(refusalOf(serviceError(grpc.status.INVALID_ARGUMENT, 'x')), 'invalid');
  assert.equal(refusalOf(serviceError(grpc.status.UNAVAILABLE, 'down')), null);
  assert.equal(refusalOf(new Error('x')), null); assert.equal(refusalOf(undefined), null);
});

test('a collaborator that did not answer is an infrastructure error; its own refusals pass through', () => {
  const down = fromCollaborator('the Concert Round Service', serviceError(grpc.status.UNAVAILABLE, 'No connection established'));
  assert.ok(down instanceof InfrastructureError); assert.equal(down.system, 'the Concert Round Service'); assert.match(down.message, /did not answer: No connection established/);
  assert.ok(fromCollaborator('x', serviceError(grpc.status.DEADLINE_EXCEEDED, 'Deadline exceeded')) instanceof InfrastructureError);
  const refused = serviceError(grpc.status.NOT_FOUND, 'round not found');
  assert.equal(fromCollaborator('x', refused), refused);
  assert.ok(isGrpcServiceError(refused)); assert.equal(isGrpcServiceError(new Error('x')), false);
  // untranslated by the domain, a collaborator's refusal still means the collaboration failed
  const e = toServiceError(refused, quiet);
  assert.equal(e.code, grpc.status.UNAVAILABLE); assert.equal(e.details, 'round not found'); assert.deepEqual(details(e), { system: 'collaborator', status: 'NOT_FOUND', retryable: true });
});
