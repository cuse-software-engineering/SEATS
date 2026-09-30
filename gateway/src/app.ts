// API Gateway: the only REST API of SEATS (ADR-12). Fake auth (progress 1), role check per route (FR-66), then one
// gRPC call to the owning service: path, query and JSON body in, JSON out, gRPC status mapped to an HTTP status.
// A route with auth 'none' (sign-in, the payment webhook) skips the headers and the role check. createApp() builds the
// app without listening: server.ts listens, and so do the monolith (ADR-14) and the in-process tests.
import express, { type Request, type Response } from 'express';
import grpc from '@grpc/grpc-js';
import { DEADLINE_MS, healthOf } from './clients.js';
import { ROUTES, type Role, type Route } from './routes.js';

const HTTP_STATUS: Partial<Record<grpc.status, number>> = {
  [grpc.status.INVALID_ARGUMENT]: 400, [grpc.status.UNAUTHENTICATED]: 401, [grpc.status.PERMISSION_DENIED]: 403, [grpc.status.NOT_FOUND]: 404,
  [grpc.status.ALREADY_EXISTS]: 409, [grpc.status.FAILED_PRECONDITION]: 409, [grpc.status.ABORTED]: 409, [grpc.status.UNIMPLEMENTED]: 501,
  [grpc.status.UNAVAILABLE]: 502, [grpc.status.DEADLINE_EXCEEDED]: 504,
};

const unary = <Res>(run: (cb: grpc.requestCallback<Res>) => void) =>
  new Promise<Res>((resolve, reject) => run((err, res) => (err ? reject(err) : resolve(res as Res))));

function mountHealth(app: express.Express): void {
  app.get('/health', async (_req, res) => {
  const services = await Promise.all(Object.entries(healthOf).map(async ([service, client]) => {
    const ok = await unary<{ status: number }>((cb) => client.check({}, { deadline: Date.now() + DEADLINE_MS }, cb)).then((r) => r.status === 1).catch(() => false);
    return { service, ok };
  }));
  res.json({ service: 'gateway', ok: services.every((s) => s.ok), services });
  });
}

const handle = (route: Route) => async (req: Request, res: Response) => {
  const userId = req.get('x-user-id') ?? '';
  const role = (req.get('x-role') ?? '') as Role | '';
  if (route.auth !== 'none') {
    if (!userId || !role) { res.status(401).json({ error: 'x-user-id and x-role headers are required (fake auth, progress 1)' }); return; }
    if (!route.roles.includes(role)) { res.status(403).json({ error: `role ${role} may not ${req.method} ${req.path}` }); return; }   // FR-66
  }
  const metadata = new grpc.Metadata();
  if (userId) metadata.set('x-user-id', userId);
  if (role) metadata.set('x-role', role);
  const started = Date.now();
  try {
    const request = route.request({ params: req.params as Record<string, string>, query: req.query as Record<string, string | undefined>, body: req.body ?? {}, header: (name) => req.get(name) });
    const out = await unary<any>((cb) => route.call(request, metadata, { deadline: Date.now() + DEADLINE_MS }, cb));
    const etag = route.etag?.(out);
    if (etag !== undefined && req.get('if-none-match') === etag) { log(req, route, 304, started, role, userId); res.status(304).end(); return; }
    if (etag !== undefined) res.set('ETag', etag);
    log(req, route, 200, started, role, userId);
    res.json(route.pick ? route.pick(out) : out);
  } catch (e) {
    const err = e as grpc.ServiceError;
    const status = HTTP_STATUS[err.code] ?? 500;
    const raw = err.metadata?.get('error-details-bin')[0];
    const details = raw ? JSON.parse(raw.toString()) : undefined;
    log(req, route, status, started, role, userId, err.code === grpc.status.UNAVAILABLE ? err.message : undefined);
    res.status(status).json({ error: status === 502 ? `the service behind ${req.path} is not reachable` : err.details ?? err.message, ...(details !== undefined ? { details } : {}) });
  }
};

const log = (req: Request, route: Route, status: number, started: number, role: string, userId: string, note?: string) =>
  console.log(`[gateway] ${role || 'anonymous'}:${userId || '-'} ${req.method} ${req.originalUrl} -> gRPC ${route.label} ${status} (${Date.now() - started} ms)${note ? ` ${note}` : ''}`);

/** The gateway as an Express app: JSON body, health, one handler per route, JSON 404. */
export function createApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  mountHealth(app);
  for (const route of ROUTES) app[route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](route.path, handle(route));
  app.use((req, res) => { res.status(404).json({ error: `no route for ${req.method} ${req.path}` }); });
  return app;
}

