// Route table of the gateway (docs/contracts.md). The first matching prefix wins; `read` and `write` list the roles.
const CONCERT_ROUND = process.env.CONCERT_ROUND_URL ?? 'http://localhost:4001';
const BOOKING = process.env.BOOKING_URL ?? 'http://localhost:4002';
const TABLE_AVAILABILITY = process.env.TABLE_AVAILABILITY_URL ?? 'http://localhost:4003';

const ANY = ['customer', 'manager', 'front_staff', 'owner'];
const STAFF = ['manager', 'front_staff', 'owner'];

export const ROUTES = [
  { match: /^\/api\/rounds\/[^/]+\/table-status$/, target: TABLE_AVAILABILITY, read: ANY, write: [] },
  { match: /^\/api\/rounds\/[^/]+\/bookings$/, target: BOOKING, read: ['manager', 'owner'], write: [] },
  { match: /^\/api\/(zone-maps|table-types|business-parameters)(\/|$)/, target: CONCERT_ROUND, read: ['manager', 'owner'], write: ['manager'] },
  { match: /^\/api\/rounds(\/|$)/, target: CONCERT_ROUND, read: ANY, write: ['manager'] },
  { match: /^\/api\/(bookings|customers)(\/|$)/, target: BOOKING, read: ['customer'], write: ['customer'] },
  { match: /^\/api\/check-ins(\/|$)/, target: BOOKING, read: STAFF, write: ['front_staff', 'manager'] },
];
