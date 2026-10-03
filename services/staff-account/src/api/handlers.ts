// The API layer of the Staff Account Service (handlers.ts): one function per method of staff_account.proto, from the request message to the
// response message (ADR-14). grpc.ts wraps it as the gRPC server; the monolith mode calls it in-process. A refused sign-in is UNAUTHENTICATED (401 at the gateway).
// The domain is asynchronous (its store is): every handler answers a Promise, which grpc.ts and the monolith await.
import type { ApiOf } from '@seats/proto/api';
import type { StaffAccountsHandlers } from '@seats/proto/gen/seats/staffaccount/v1/StaffAccounts';
import * as domain from '../domain/index.js';
/** A failure as the gRPC status the caller sees (grpc.ts and the monolith take it from here). */
export { toServiceError } from '@seats/errors/src/index.js';

export const api: ApiOf<StaffAccountsHandlers> = {
  SignIn: async (req) => domain.signIn(req),
  SignOut: async (req) => domain.signOut(req),
  CreateStaffAccount: async (req) => domain.createStaffAccount(req),
  ListStaffAccounts: async () => ({ accounts: await domain.listStaffAccounts() }),
  UpdateStaffAccount: async (req) => domain.updateStaffAccount(req),
  DisableStaffAccount: async (req) => domain.disableStaffAccount(req),
};
