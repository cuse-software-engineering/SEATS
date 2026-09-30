// REST transport of the Concert Round Service: the route table of docs/contracts.md, nothing else.
import express from 'express';
import * as d from './domain.js';

const wrap = (fn) => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };

export function restApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ service: 'concert-round', ok: true }));

  app.get('/business-parameters', wrap(() => d.getBusinessParameters()));
  app.put('/business-parameters', wrap((req) => d.updateBusinessParameters(req.body)));
  app.get('/table-types', wrap(() => d.listTableTypes()));
  app.put('/table-types/:id', wrap((req) => d.defineTableType(req.params.id, req.body)));

  app.post('/zone-maps', wrap((req) => d.createZoneMap(req.body)));
  app.get('/zone-maps', wrap((req) => d.listZoneMaps(req.query)));
  app.get('/zone-maps/:id', wrap((req) => d.getZoneMap(req.params.id)));
  app.put('/zone-maps/:id', wrap((req) => d.updateZoneMap(req.params.id, req.body)));
  app.post('/zone-maps/:id/image', wrap((req) => d.uploadZoneMapImage(req.params.id, req.body)));
  app.post('/zone-maps/:id/validate', wrap((req) => d.validateZoneMap(req.params.id)));
  app.post('/zone-maps/:id/activate', wrap((req) => d.activateZoneMap(req.params.id)));
  app.delete('/zone-maps/:id', wrap((req) => d.discardDraftZoneMap(req.params.id)));

  app.post('/rounds', wrap((req) => d.createRound(req.body)));
  app.get('/rounds', wrap(() => d.getUpcomingRounds()));
  app.get('/rounds/:id', wrap((req) => d.getRound(req.params.id)));
  app.get('/rounds/:id/tables', wrap((req) => d.getRoundTables(req.params.id)));
  app.get('/rounds/:id/preview', wrap((req) => d.previewRound(req.params.id)));
  app.put('/rounds/:id', wrap((req) => d.updateRound(req.params.id, req.body)));
  app.put('/rounds/:id/published', wrap((req) => d.editPublishedRound(req.params.id, req.body)));
  app.post('/rounds/:id/validate', wrap((req) => d.validateRound(req.params.id)));
  app.post('/rounds/:id/publish', wrap((req) => d.publishRound(req.params.id)));
  app.delete('/rounds/:id', wrap((req) => d.discardDraftRound(req.params.id)));

  app.use((err, _req, res, _next) => {
    const status = err.status ?? (err.code !== undefined ? 502 : 500);                  // err.code: a gRPC error from a collaborator
    res.status(status).json({ error: err.message, details: err.details });
  });
  return app;
}
