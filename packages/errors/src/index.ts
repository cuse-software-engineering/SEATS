// The three kinds of failure a service tells apart, and the one place they become a gRPC status.
//
//  - DomainError: a rule of the business said no (the round is not open, the table is taken, the phone number is not
//    Thai). Expected, part of the contract, answered with the rule's message. The domain names the kind of refusal; it
//    never knows HTTP or gRPC codes, the API layer maps the kind.
//  - InfrastructureError: something the service depends on did not answer as it should: a collaborator service, the
//    database, an external system behind an adapter (the object storage, the payment gateway, the LINE platform).
//    Expected too, retryable as a rule, answered as UNAVAILABLE with the system named so the caller can say so.
//  - a defect: anything else that is thrown, a bug or a broken invariant. Never expected: logged here with its stack
//    under a reference id, answered as INTERNAL with the reference only, so a stack or an internal message never
//    reaches a client.
//
// The API Gateway maps the gRPC status to HTTP (INVALID_ARGUMENT 400, UNAUTHENTICATED 401, NOT_FOUND 404,
// FAILED_PRECONDITION 409, UNIMPLEMENTED 501, UNAVAILABLE 502, DEADLINE_EXCEEDED 504, INTERNAL 500) and puts the
// error-details-bin metadata into the JSON body as `details`.
import { randomUUID } from 'node:crypto';
import grpc from '@grpc/grpc-js';

export type DomainErrorKind = 'invalid' | 'not_found' | 'conflict' | 'unauthenticated' | 'not_implemented';

/** A rule of the business refused: `kind` says how, `message` says why in the words of the rule, `details` carries
 *  what the client can act on (the list of validation problems, say). */
export class DomainError extends Error {
  constructor(public readonly kind: DomainErrorKind, message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'DomainError';
  }
}

/** Something the service depends on failed: `system` names it (the Concert Round Service, MongoDB, the object storage),
 *  `cause` keeps the original error for the log, `retryable` says whether trying again can help. */
export class InfrastructureError extends Error {
  readonly retryable: boolean;
  constructor(public readonly system: string, message: string, options: { cause?: unknown; retryable?: boolean } = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'InfrastructureError';
    this.retryable = options.retryable ?? true;
  }
}

const GRPC_OF_KIND: Record<DomainErrorKind, grpc.status> = {
  invalid: grpc.status.INVALID_ARGUMENT,
  not_found: grpc.status.NOT_FOUND,
  conflict: grpc.status.FAILED_PRECONDITION,
  unauthenticated: grpc.status.UNAUTHENTICATED,
  not_implemented: grpc.status.UNIMPLEMENTED,
};
/** The gRPC status the API layer answers for a kind of domain error. */
export const grpcStatusOf = (kind: DomainErrorKind): grpc.status => GRPC_OF_KIND[kind];

/** A gRPC error as a client receives it from another service. */
export const isGrpcServiceError = (e: unknown): e is grpc.ServiceError =>
  typeof e === 'object' && e !== null && typeof (e as { code?: unknown }).code === 'number' && 'details' in e && 'metadata' in e;

/** The statuses that mean the collaborator did not answer (down, slow, broken), as opposed to answering no. */
const TRANSPORT_FAILURES: grpc.status[] = [grpc.status.UNAVAILABLE, grpc.status.DEADLINE_EXCEEDED, grpc.status.CANCELLED, grpc.status.UNKNOWN, grpc.status.INTERNAL];

/** What a gRPC client of a collaborator should throw: a transport failure becomes an InfrastructureError naming the
 *  collaborator; the collaborator's own answers (NOT_FOUND, FAILED_PRECONDITION, …) pass through for the domain to
 *  interpret. */
export function fromCollaborator(system: string, e: unknown): unknown {
  if (isGrpcServiceError(e) && TRANSPORT_FAILURES.includes(e.code)) {
    return new InfrastructureError(system, `${system} did not answer: ${e.details || grpc.status[e.code]}`, { cause: e });
  }
  return e;
}

/** How a domain reads a collaborator's answer without knowing gRPC: the kind of refusal the collaborator's status
 *  stands for, or null when the error is not a refusal (a transport failure, a defect). A domain names its own
 *  message for the refusal it expects (`refusalOf(e) === 'not_found' ? new DomainError('not_found', 'round not found') : e`). */
export function refusalOf(e: unknown): DomainErrorKind | null {
  const code = typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined;
  switch (code) {
    case grpc.status.NOT_FOUND: return 'not_found';
    case grpc.status.FAILED_PRECONDITION: case grpc.status.ALREADY_EXISTS: case grpc.status.ABORTED: return 'conflict';
    case grpc.status.INVALID_ARGUMENT: return 'invalid';
    case grpc.status.UNAUTHENTICATED: return 'unauthenticated';
    case grpc.status.UNIMPLEMENTED: return 'not_implemented';
    default: return null;
  }
}

export type ErrorLog = (line: string, cause?: unknown) => void;

/** The gRPC status a failure becomes at the API layer of a service; `log` receives the infrastructure failures and
 *  the defects (the domain errors are the caller's business, not the log's). */
export function toServiceError(e: unknown, log: ErrorLog = (line, cause) => console.error(line, cause ?? '')): grpc.ServiceError {
  const metadata = new grpc.Metadata();
  if (e instanceof DomainError) {
    if (e.details !== undefined) metadata.set('error-details-bin', Buffer.from(JSON.stringify(e.details)));   // the gateway puts it in the JSON body
    return Object.assign(new Error(e.message), { code: GRPC_OF_KIND[e.kind], details: e.message, metadata });
  }
  if (e instanceof InfrastructureError) {
    metadata.set('error-details-bin', Buffer.from(JSON.stringify({ system: e.system, retryable: e.retryable })));
    log(`[infrastructure] ${e.system}: ${e.message}`, e.cause);
    return Object.assign(new Error(e.message), { code: grpc.status.UNAVAILABLE, details: e.message, metadata });
  }
  if (isGrpcServiceError(e)) {
    // a collaborator's answer the domain did not translate: the collaboration failed, the caller may retry
    metadata.set('error-details-bin', Buffer.from(JSON.stringify({ system: 'collaborator', status: grpc.status[e.code], retryable: true })));
    log(`[infrastructure] a collaborator answered ${grpc.status[e.code]}: ${e.details}`);
    return Object.assign(new Error(e.details), { code: grpc.status.UNAVAILABLE, details: e.details, metadata });
  }
  const ref = randomUUID().slice(0, 8);
  log(`[defect ${ref}] ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
  const message = `internal error (ref ${ref})`;
  return Object.assign(new Error(message), { code: grpc.status.INTERNAL, details: message, metadata });
}
