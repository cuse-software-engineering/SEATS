// In-process transport of the monolith mode (ADR-14): client objects whose methods call a service's API layer in the
// same process. Every request and response still passes through the Protocol Buffers serializer and deserializer of
// the method, so the messages behave exactly as over gRPC (defaults, optional fields, int64 as number); only the
// network, the deadlines and UNAVAILABLE are gone.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import type { CallContext } from '@seats/proto/api';

const PROTO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../proto');
const OPTS = { keepCase: false, longs: Number, defaults: true };

/** The service definition (method table with the serializers) of one service of a .proto file. */
export function serviceDefinition(file: string, ...packagePath: string[]): grpc.ServiceDefinition {
  let node: any = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, file), OPTS));
  for (const part of packagePath) node = node[part];
  return node.service as grpc.ServiceDefinition;
}

type Api = Record<string, (request: any, ctx: CallContext) => unknown>;
export interface InProcess {
  /** callback style, the shape of a generated gRPC client: (request, metadata?, options?, callback) */
  callback: Record<string, (...args: unknown[]) => grpc.ClientUnaryCall>;
  /** promise style, for the service-to-service calls */
  promise: Record<string, (request: unknown, ctx?: CallContext) => Promise<any>>;
}

export function inProcess(service: grpc.ServiceDefinition, api: Api, toServiceError: (e: unknown) => grpc.ServiceError): InProcess {
  const callback: InProcess['callback'] = {};
  const promise: InProcess['promise'] = {};
  for (const [name, definition] of Object.entries(service)) {
    const method = definition as grpc.MethodDefinition<any, any> & { originalName?: string };
    const fn = api[name];
    if (!fn) throw new Error(`${method.path} has no function in the API layer`);
    const run = async (request: unknown, ctx: CallContext) => {
      const req = method.requestDeserialize(method.requestSerialize(request));      // through the wire format, in memory
      const res = await fn(req, ctx);
      return method.responseDeserialize(method.responseSerialize(res));
    };
    promise[name] = (request, ctx = {}) => run(request, ctx).catch((e: unknown) => { throw toServiceError(e); });
    callback[method.originalName ?? name[0].toLowerCase() + name.slice(1)] = (...args: unknown[]) => {
      const cb = args[args.length - 1] as grpc.requestCallback<unknown>;
      const md = args[1] instanceof grpc.Metadata ? args[1] : undefined;
      const ctx: CallContext = { caller: md?.get('x-user-id')[0]?.toString(), role: md?.get('x-role')[0]?.toString() };
      run(args[0], ctx).then((res) => cb(null, res), (e: unknown) => cb(toServiceError(e)));
      return {} as grpc.ClientUnaryCall;
    };
  }
  return { callback, promise };
}
