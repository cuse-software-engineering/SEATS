// REST transport of the Booking Service: the route table of docs/contracts.md. The gateway sends x-user-id and x-role.
import express, { type NextFunction, type Request, type Response } from 'express';
import * as d from './domain.js';

type Req = Request<Record<string, string>>;
const wrap = (fn: (req: Req, me: string) => unknown) => async (req: Req, res: Response, next: NextFunction) => {
  try { res.json(await fn(req, req.get('x-user-id') as string)); } catch (e) { next(e); }
};

export function restApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => { res.json({ service: 'booking', ok: true }); });
  app.use((req, res, next) => { if (req.get('x-user-id')) next(); else res.status(401).json({ error: 'x-user-id is required' }); });

  app.post('/bookings', wrap((req, me) => d.createHeldBooking(me, req.body)));
  app.get('/bookings/:id', wrap((req, me) => d.getBooking(req.params.id, me)));
  app.put('/bookings/:id/party-size', wrap((req, me) => d.setPartySize(req.params.id, me, req.body)));
  app.get('/bookings/:id/fee', wrap((req, me) => d.calculateTableFee(req.params.id, me)));
  app.get('/bookings/:id/terms', wrap((req, me) => d.getBookingTerms(req.params.id, me)));
  app.post('/bookings/:id/terms-acceptance', wrap((req, me) => d.acceptBookingTerms(req.params.id, me)));
  app.post('/bookings/:id/payment', wrap((req, me) => d.startPayment(req.params.id, me)));
  app.post('/bookings/:id/cancel', wrap((req, me) => d.cancelBooking(req.params.id, me)));
  app.get('/bookings/:id/e-ticket', wrap(() => d.getETicket()));

  app.get('/customers/me', wrap((_req, me) => d.getCustomerProfile(me)));
  app.post('/customers/me', wrap((req, me) => d.createCustomerProfile(me, req.body)));
  app.put('/customers/me', wrap((req, me) => d.updateCustomerProfile(me, req.body)));
  app.get('/customers/me/bookings', wrap((_req, me) => d.getCustomerBookings(me)));

  app.get('/rounds/:id/bookings', wrap((req) => d.getRoundBookings(req.params.id)));
  app.post('/check-ins/verify', wrap(() => d.verifyBookingReference()));
  app.post('/check-ins', wrap(() => d.checkInBooking()));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof d.DomainError) { res.status(err.status).json({ error: err.message, details: err.details }); return; }
    const grpcError = typeof err === 'object' && err !== null && 'code' in err;
    res.status(grpcError ? 502 : 500).json({ error: err instanceof Error ? err.message : String(err) });
  });
  return app;
}
