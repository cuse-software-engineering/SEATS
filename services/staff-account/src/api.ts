// The API layer of the Staff Account Service: one function per method of staff_account.proto, from the request message to the
// response message (ADR-14). grpc.ts wraps it as the gRPC server; the monolith mode calls it in-process. A refused sign-in is UNAUTHENTICATED (401 at the gateway).
// The domain is asynchronous (its store is): every handler answers a Promise, which grpc.ts and the monolith await.
import grpc from '@grpc/grpc-js';
import type { ApiOf } from '@seats/proto/api';
import type { StaffAccountsHandlers } from '@seats/proto/gen/seats/staffaccount/v1/StaffAccounts';
import * as domain from './domain.js';

const CODES: Record<number, grpc.status> = { 400: grpc.status.INVALID_ARGUMENT, 401: grpc.status.UNAUTHENTICATED, 404: grpc.status.NOT_FOUND, 409: grpc.status.FAILED_PRECONDITION, 501: grpc.status.UNIMPLEMENTED };

/** A DomainError as the gRPC status the caller sees. */
export function toServiceError(e: unknown): grpc.ServiceError {
  if (e instanceof domain.DomainError) {
    const metadata = new grpc.Metadata();
    if (e.details !== undefined) metadata.set('error-details-bin', Buffer.from(JSON.stringify(e.details)));   // the gateway puts it in the JSON body
    return Object.assign(new Error(e.message), { code: CODES[e.status] ?? grpc.status.INTERNAL, details: e.message, metadata });
  }
  const message = e instanceof Error ? e.message : String(e);
  return Object.assign(new Error(message), { code: grpc.status.INTERNAL, details: message, metadata: new grpc.Metadata() });
}

export const api: ApiOf<StaffAccountsHandlers> = {
  SignIn: async (req) => domain.signIn(req),
  SignOut: async (req) => domain.signOut(req),
  CreateStaffAccount: async (req) => domain.createStaffAccount(req),
  ListStaffAccounts: async () => ({ accounts: await domain.listStaffAccounts() }),
  UpdateStaffAccount: async (req) => domain.updateStaffAccount(req),
  DisableStaffAccount: async (req) => domain.disableStaffAccount(req),
};
