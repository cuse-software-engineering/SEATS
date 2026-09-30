// REST transport: only the polled read of the table map (ADR-09) and the health check.
import express, { type NextFunction, type Request, type Response } from 'express';
import * as domain from './domain.js';

export function restApp() {
  const app = express();
  app.get('/health', (_req, res) => { res.json({ service: 'table-availability', ok: true }); });
  app.get('/rounds/:id/table-status', (req: Request<{ id: string }>, res) => {
    const status = domain.getRoundTableStatus({ roundId: req.params.id });
    if (req.get('if-none-match') === String(status.version)) { res.status(304).end(); return; }   // unchanged map costs nothing
    res.set('ETag', String(status.version)).json(status);
  });
  app.use((req, res) => { res.status(404).json({ error: `no such operation: ${req.method} ${req.path}` }); });   // JSON, not the HTML default
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = err instanceof domain.DomainError ? err.status : 500;
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  });
  return app;
}
