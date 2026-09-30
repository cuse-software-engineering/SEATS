// The shape of a service's API layer (ADR-14): one function per method of its .proto file, from the request message
// to the response message, with the caller passed explicitly. The gRPC server of the service wraps it; the monolith
// mode calls it in-process. Types only: nothing here runs.
import type grpc from '@grpc/grpc-js';

/** Who calls: the identity and role that the API Gateway authenticated (gRPC metadata x-user-id and x-role). */
export interface CallContext { caller?: string; role?: string }

/** The API layer derived from the generated handlers type of a service. */
export type ApiOf<H> = {   // the named methods only: the generated handlers type also carries the index signature of UntypedServiceImplementation
  [K in keyof H as string extends K ? never : K]: H[K] extends grpc.handleUnaryCall<infer Req, infer Res> ? (request: Req, ctx: CallContext) => Res | Promise<Res> : never;
};
