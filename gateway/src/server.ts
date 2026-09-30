// API Gateway: fake auth (progress 1), role check per route, forward to the owning service with the identity headers.
import express from 'express';
import { ROUTES, type Role } from './routes.js';

const PORT = Number(process.env.PORT ?? 4000);
const app = express();
app.use(express.raw({ type: '*/*', limit: '2mb' }));   // forward the body as received

app.get('/health', async (_req, res) => {
  const targets = [...new Set(ROUTES.map((r) => r.target))];
  const status = await Promise.all(targets.map((t) => fetch(`${t}/health`).then((r) => r.json() as Promise<{ service: string; ok: boolean }>).catch(() => ({ target: t, ok: false }))));
  res.json({ service: 'gateway', ok: status.every((s) => s.ok), services: status });
});

app.use(async (req, res) => {
  const route = ROUTES.find((r) => r.match.test(req.path));
  if (!route) { res.status(404).json({ error: `no route for ${req.path}` }); return; }
  const userId = req.get('x-user-id');
  const role = req.get('x-role') as Role | undefined;
  if (!userId || !role) { res.status(401).json({ error: 'x-user-id and x-role headers are required (fake auth, progress 1)' }); return; }
  const allowed = req.method === 'GET' ? route.read : route.write;
  if (!allowed.includes(role)) { res.status(403).json({ error: `role ${role} may not ${req.method} ${req.path}` }); return; }   // FR-66
  const url = route.target + req.originalUrl.replace(/^\/api/, '');
  const started = Date.now();
  try {
    const body = req.body as Buffer | undefined;
    const ifNoneMatch = req.get('if-none-match');
    const upstream = await fetch(url, {
      method: req.method,
      headers: { 'content-type': req.get('content-type') ?? 'application/json', 'x-user-id': userId, 'x-role': role, ...(ifNoneMatch ? { 'if-none-match': ifNoneMatch } : {}) },
      body: ['GET', 'HEAD'].includes(req.method) || !body?.length ? undefined : new Uint8Array(body),
    });
    const payload = Buffer.from(await upstream.arrayBuffer());
    console.log(`[gateway] ${role}:${userId} ${req.method} ${req.originalUrl} -> ${url} ${upstream.status} (${Date.now() - started} ms)`);
    for (const h of ['content-type', 'etag']) { const v = upstream.headers.get(h); if (v) res.set(h, v); }
    res.status(upstream.status).send(payload);
  } catch (e) {
    console.error(`[gateway] ${req.method} ${req.originalUrl} -> ${url} failed: ${(e as Error).message}`);
    res.status(502).json({ error: `the service behind ${req.path} is not reachable` });
  }
});

app.listen(PORT, () => console.log(`[gateway] REST on :${PORT}`));
