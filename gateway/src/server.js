// API Gateway: fake auth (progress 1), role check per route, forward to the owning service with the identity headers.
import express from 'express';
import { ROUTES } from './routes.js';

const PORT = Number(process.env.PORT ?? 4000);
const app = express();
app.use(express.raw({ type: '*/*', limit: '2mb' }));   // forward the body as received

app.get('/health', async (_req, res) => {
  const targets = [...new Set(ROUTES.map((r) => r.target))];
  const status = await Promise.all(targets.map((t) => fetch(`${t}/health`).then((r) => r.json()).catch(() => ({ target: t, ok: false }))));
  res.json({ service: 'gateway', ok: status.every((s) => s.ok), services: status });
});

app.use(async (req, res) => {
  const route = ROUTES.find((r) => r.match.test(req.path));
  if (!route) return res.status(404).json({ error: `no route for ${req.path}` });
  const userId = req.get('x-user-id');
  const role = req.get('x-role');
  if (!userId || !role) return res.status(401).json({ error: 'x-user-id and x-role headers are required (fake auth, progress 1)' });
  const allowed = req.method === 'GET' ? route.read : route.write;
  if (!allowed.includes(role)) return res.status(403).json({ error: `role ${role} may not ${req.method} ${req.path}` });   // FR-66
  const url = route.target + req.originalUrl.replace(/^\/api/, '');
  const started = Date.now();
  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: { 'content-type': req.get('content-type') ?? 'application/json', 'x-user-id': userId, 'x-role': role, ...(req.get('if-none-match') ? { 'if-none-match': req.get('if-none-match') } : {}) },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : (req.body?.length ? req.body : undefined),
    });
    const body = await upstream.arrayBuffer();
    console.log(`[gateway] ${role}:${userId} ${req.method} ${req.originalUrl} -> ${url} ${upstream.status} (${Date.now() - started} ms)`);
    for (const h of ['content-type', 'etag']) if (upstream.headers.get(h)) res.set(h, upstream.headers.get(h));
    res.status(upstream.status).send(Buffer.from(body));
  } catch (e) {
    console.error(`[gateway] ${req.method} ${req.originalUrl} -> ${url} failed: ${e.message}`);
    res.status(502).json({ error: `the service behind ${req.path} is not reachable` });
  }
});

app.listen(PORT, () => console.log(`[gateway] REST on :${PORT}`));
