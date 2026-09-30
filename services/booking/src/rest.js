// REST transport of the Booking Service: the route table of docs/contracts.md. The gateway sends x-user-id and x-role.
import express from 'express';
import * as d from './domain.js';

const wrap = (fn) => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };
const me = (req) => req.get('x-user-id');

export function restApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ service: 'booking', ok: true }));
  app.use((req, res, next) => (me(req) ? next() : res.status(401).json({ error: 'x-user-id is required' })));

  app.post('/bookings', wrap((req) => d.createHeldBooking(me(req), req.body)));
  app.get('/bookings/:id', wrap((req) => d.getBooking(req.params.id, me(req))));
  app.put('/bookings/:id/party-size', wrap((req) => d.setPartySize(req.params.id, me(req), req.body)));
  app.get('/bookings/:id/fee', wrap((req) => d.calculateTableFee(req.params.id, me(req))));
  app.get('/bookings/:id/terms', wrap((req) => d.getBookingTerms(req.params.id, me(req))));
  app.post('/bookings/:id/terms-acceptance', wrap((req) => d.acceptBookingTerms(req.params.id, me(req))));
  app.post('/bookings/:id/payment', wrap((req) => d.startPayment(req.params.id, me(req))));
  app.post('/bookings/:id/cancel', wrap((req) => d.cancelBooking(req.params.id, me(req))));
  app.get('/bookings/:id/e-ticket', wrap(() => d.getETicket()));

  app.get('/customers/me', wrap((req) => d.getCustomerProfile(me(req))));
  app.post('/customers/me', wrap((req) => d.createCustomerProfile(me(req), req.body)));
  app.put('/customers/me', wrap((req) => d.updateCustomerProfile(me(req), req.body)));
  app.get('/customers/me/bookings', wrap((req) => d.getCustomerBookings(me(req))));

  app.get('/rounds/:id/bookings', wrap((req) => d.getRoundBookings(req.params.id)));
  app.post('/check-ins/verify', wrap(() => d.verifyBookingReference()));
  app.post('/check-ins', wrap(() => d.checkInBooking()));

  app.use((err, _req, res, _next) => {
    const status = err.status ?? (err.code !== undefined ? 502 : 500);
    res.status(status).json({ error: err.message, details: err.details });
  });
  return app;
}
