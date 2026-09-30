// Route table of the gateway (docs/contracts.md): each REST route is one gRPC method of the owning service. The
// builder turns the path parameters, the query, the headers and the JSON body into the request message; `pick` unwraps
// a list message; `etag` gives the polled read its version; `auth: 'none'` marks the routes anyone may call (sign-in,
// the payment webhook). The roles are those of Table 6.11 of the project document (FR-66), the same table as docs/openapi.yaml.
import type grpc from '@grpc/grpc-js';
import { bookings, concertRound, payment, staffAccounts, tableAvailability } from './clients.js';

export type Role = 'customer' | 'manager' | 'front_staff' | 'owner';
export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
export interface Ctx { params: Record<string, string>; query: Record<string, string | undefined>; body: Record<string, any>; header: (name: string) => string | undefined }
export type Unary = (request: unknown, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<any>) => grpc.ClientUnaryCall;
export interface Route {
  method: Method; path: string; roles: Role[]; label: string; call: Unary;
  request: (c: Ctx) => unknown; pick?: (res: any) => unknown; etag?: (res: any) => string;
  auth?: 'none';   // no x-user-id / x-role needed and no role check
}

type RequestOf<F> = F extends (argument: infer R, ...rest: any[]) => any ? R : never;   // the last overload: (argument, callback)
interface Options<Res> { pick?: (res: Res) => unknown; etag?: (res: Res) => string; auth?: 'none' }

/** One route: the request builder is type-checked against the generated request message of the method. */
function route<C extends object, K extends keyof C & string>(method: Method, path: string, roles: Role[], target: [C, K, string], request: (c: Ctx) => RequestOf<C[K]> = () => ({}) as RequestOf<C[K]>, options: Options<any> = {}): Route {
  const [client, rpc, service] = target;
  return { method, path, roles, label: `${service}/${rpc[0].toUpperCase()}${rpc.slice(1)}`, call: (client[rpc] as unknown as Unary).bind(client), request, ...options };
}

const ANY: Role[] = ['customer', 'manager', 'front_staff', 'owner'];
const MANAGEMENT: Role[] = ['manager', 'owner'];
const CR = <K extends keyof typeof concertRound & string>(k: K): [typeof concertRound, K, string] => [concertRound, k, 'ConcertRound'];
const BK = <K extends keyof typeof bookings & string>(k: K): [typeof bookings, K, string] => [bookings, k, 'Bookings'];
const TA = <K extends keyof typeof tableAvailability & string>(k: K): [typeof tableAvailability, K, string] => [tableAvailability, k, 'TableAvailability'];
const PM = <K extends keyof typeof payment & string>(k: K): [typeof payment, K, string] => [payment, k, 'Payment'];
const SA = <K extends keyof typeof staffAccounts & string>(k: K): [typeof staffAccounts, K, string] => [staffAccounts, k, 'StaffAccounts'];
const STAFF: Role[] = ['manager', 'front_staff', 'owner'];
const bearer = (c: Ctx) => c.header('authorization')?.replace(/^Bearer\s+/i, '') || c.header('x-user-id');   // the session token (ADR-07), or the fake-auth id
const wrap = (values: any[] | undefined) => (values ? { values } : undefined);   // a list left out is not changed

export const ROUTES: Route[] = [
  // Concert Round Service: the venue (manager)
  route('PUT', '/api/table-types/:id', ['manager'], CR('defineTableType'), (c) => ({ id: c.params.id, ...c.body })),
  route('GET', '/api/table-types', MANAGEMENT, CR('listTableTypes'), undefined, { pick: (r) => r.tableTypes }),
  route('GET', '/api/business-parameters', MANAGEMENT, CR('getBusinessParameters')),
  route('PUT', '/api/business-parameters', ['manager'], CR('updateBusinessParameters'), (c) => c.body),
  // Concert Round Service: zone maps (UC-04)
  route('POST', '/api/zone-maps', ['manager'], CR('createZoneMap'), (c) => ({ name: c.body.name })),
  route('GET', '/api/zone-maps', MANAGEMENT, CR('listZoneMaps'), (c) => ({ status: c.query.status }), { pick: (r) => r.zoneMaps }),
  route('GET', '/api/zone-maps/:id', MANAGEMENT, CR('getZoneMap'), (c) => ({ zoneMapId: c.params.id })),
  route('PUT', '/api/zone-maps/:id', ['manager'], CR('updateZoneMap'), (c) => ({ zoneMapId: c.params.id, name: c.body.name, zones: c.body.zones && { zones: c.body.zones }, tables: c.body.tables && { tables: c.body.tables } })),
  route('POST', '/api/zone-maps/:id/image', ['manager'], CR('uploadZoneMapImage'), (c) => ({ zoneMapId: c.params.id, fileName: c.body.fileName })),
  route('POST', '/api/zone-maps/:id/validate', ['manager'], CR('validateZoneMap'), (c) => ({ zoneMapId: c.params.id })),
  route('POST', '/api/zone-maps/:id/activate', ['manager'], CR('activateZoneMap'), (c) => ({ zoneMapId: c.params.id })),
  route('DELETE', '/api/zone-maps/:id', ['manager'], CR('discardDraftZoneMap'), (c) => ({ zoneMapId: c.params.id })),
  // Concert Round Service: rounds (UC-03; the customer reads them, UC-01)
  route('POST', '/api/rounds', ['manager'], CR('createRound'), (c) => ({ name: c.body.name })),
  route('GET', '/api/rounds', ANY, CR('getUpcomingRounds'), undefined, { pick: (r) => r.rounds }),
  route('GET', '/api/rounds/:id', ANY, CR('getRound'), (c) => ({ roundId: c.params.id })),
  route('GET', '/api/rounds/:id/tables', ANY, CR('getRoundTables'), (c) => ({ roundId: c.params.id }), { pick: (r) => r.tables }),
  route('PUT', '/api/rounds/:id', ['manager'], CR('updateRound'), (c) => ({ roundId: c.params.id, ...c.body, tablesNotForSale: wrap(c.body.tablesNotForSale), prices: wrap(c.body.prices) })),
  route('POST', '/api/rounds/:id/validate', ['manager'], CR('validateRound'), (c) => ({ roundId: c.params.id })),
  route('POST', '/api/rounds/:id/publish', ['manager'], CR('publishRound'), (c) => ({ roundId: c.params.id })),
  route('DELETE', '/api/rounds/:id', ['manager'], CR('discardDraftRound'), (c) => ({ roundId: c.params.id })),
  // Table Availability Service: the polled read of the table map (ADR-09), 304 when the version is unchanged
  route('GET', '/api/rounds/:id/table-status', ANY, TA('getRoundTableStatus'), (c) => ({ roundId: c.params.id }), { etag: (r) => String(r.version) }),
  // Booking Service: the customer flow (UC-01, UC-09)
  route('POST', '/api/bookings', ['customer'], BK('createHeldBooking'), (c) => ({ roundId: c.body.roundId, tableNumber: c.body.tableNumber })),
  route('GET', '/api/bookings/:id', ['customer'], BK('getBooking'), (c) => ({ bookingId: c.params.id })),
  route('PUT', '/api/bookings/:id/party-size', ['customer'], BK('setPartySize'), (c) => ({ bookingId: c.params.id, partySize: c.body.partySize })),
  route('GET', '/api/bookings/:id/terms', ['customer'], BK('getBookingTerms'), (c) => ({ bookingId: c.params.id })),
  route('POST', '/api/bookings/:id/terms-acceptance', ['customer'], BK('acceptBookingTerms'), (c) => ({ bookingId: c.params.id })),
  route('POST', '/api/bookings/:id/payment', ['customer'], BK('startPayment'), (c) => ({ bookingId: c.params.id })),
  route('POST', '/api/bookings/:id/cancel', ['customer'], BK('cancelBooking'), (c) => ({ bookingId: c.params.id })),
  route('GET', '/api/bookings/:id/e-ticket', ['customer'], BK('getETicket'), (c) => ({ bookingId: c.params.id })),
  route('GET', '/api/customers/me', ['customer'], BK('getCustomerProfile')),
  route('POST', '/api/customers/me', ['customer'], BK('createCustomerProfile'), (c) => ({ name: c.body.name, phone: c.body.phone, consent: c.body.consent })),
  route('PUT', '/api/customers/me', ['customer'], BK('updateCustomerProfile'), (c) => ({ name: c.body.name, phone: c.body.phone })),
  route('GET', '/api/customers/me/bookings', ['customer'], BK('getCustomerBookings'), undefined, { pick: (r) => r.bookings }),
  // Booking Service: the staff flows (UC-02 in progress 2; the live view)
  route('POST', '/api/check-ins/verify', ['front_staff', 'manager'], BK('verifyBookingReference'), (c) => ({ bookingReference: c.body.bookingReference })),
  route('POST', '/api/check-ins', ['front_staff', 'manager'], BK('checkInBooking'), (c) => ({ bookingReference: c.body.bookingReference })),
  route('GET', '/api/rounds/:id/bookings', MANAGEMENT, BK('getRoundBookings'), (c) => ({ roundId: c.params.id }), { pick: (r) => r.bookings }),
  // Payment Service: the webhook of the (simulated) Payment Gateway and the customer's payment page (UC-10, ADR-11)
  route('POST', '/api/payments/webhook', [], PM('receivePaymentResult'), (c) => ({ paymentId: c.body.paymentId, status: c.body.status, amount: c.body.amount, signature: c.body.signature }), { auth: 'none' }),
  route('GET', '/api/payments/:id', ['customer'], PM('getPaymentStatus'), (c) => ({ paymentId: c.params.id })),
  // Staff Account Service: staff sessions (ADR-07) and the accounts of the back-office (manager)
  route('POST', '/api/sessions', [], SA('signIn'), (c) => ({ username: c.body.username, password: c.body.password }), { auth: 'none' }),
  route('DELETE', '/api/sessions/current', STAFF, SA('signOut'), (c) => ({ token: bearer(c) })),
  route('POST', '/api/staff-accounts', ['manager'], SA('createStaffAccount'), (c) => ({ username: c.body.username, role: c.body.role, password: c.body.password })),
  route('GET', '/api/staff-accounts', MANAGEMENT, SA('listStaffAccounts'), undefined, { pick: (r) => r.accounts }),
  route('PUT', '/api/staff-accounts/:id', ['manager'], SA('updateStaffAccount'), (c) => ({ staffAccountId: c.params.id, role: c.body.role, password: c.body.password })),
  route('DELETE', '/api/staff-accounts/:id', ['manager'], SA('disableStaffAccount'), (c) => ({ staffAccountId: c.params.id })),
];
