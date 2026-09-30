// REST transport: only the polled read of the table map (ADR-09) and the health check.
import express from 'express';
import * as domain from './domain.js';

export function restApp() {
  const app = express();
  app.get('/health', (_req, res) => res.json({ service: 'table-availability', ok: true }));
  app.get('/rounds/:id/table-status', (req, res) => {
    const status = domain.getRoundTableStatus({ roundId: req.params.id });
    if (req.get('if-none-match') === String(status.version)) return res.status(304).end();   // unchanged map costs nothing
    res.set('ETag', String(status.version)).json(status);
  });
  app.use((err, _req, res, _next) => res.status(err.status ?? 500).json({ error: err.message }));
  return app;
}
