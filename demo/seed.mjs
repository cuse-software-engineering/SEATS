// The demo data, made through the API Gateway as the manager and as customers exactly as the web apps make it: no
// script writes to a store. `npm run demo:seed` (GATEWAY=… for a deployment); `npm run demo:reset` empties the
// backend first and then runs this. The names are fixed, so on a backend that holds the demo rounds already the
// script says so and changes nothing.
//
//   table types   sofa6 (6-person sofa), round2 (2-person round table), booth4 (4-person booth)
//   zone map      "Main hall", Active: zone A "Front stage" with tables 1–6, zone B "Balcony" with tables 7–12
//   rounds        three Published rounds on the next three Saturdays, doors 18:00 and start 20:00 Bangkok time,
//                 open for booking; the third keeps tables 11 and 12 not for sale
//   bookings      on the first round three customers each hold a table: one with a profile, a party size and the
//                 terms accepted (UC-01 up to the payment), one with a profile, one bare. A hold is Held until
//                 holdPeriodMinutes (15, BRULE-02) pass and the expiry job frees the table: the rule, not a defect.
//                 Booked and Occupied tables need the payment of progress 2 (UC-10, UC-02), so none is seeded.
import { call, GATEWAY, H, waitForGateway } from '../scripts/gateway.mjs';

const manager = H('manager-nok', 'manager');
const TYPES = [
  { id: 'sofa6', name: '6-person sofa', capacity: 6 },
  { id: 'round2', name: '2-person round table', capacity: 2 },
  { id: 'booth4', name: '4-person booth', capacity: 4 },
];
const ZONES = [{ id: 'A', name: 'Front stage' }, { id: 'B', name: 'Balcony' }];
const TABLES = [
  ...[1, 2, 3].map((n, i) => ({ tableNumber: n, zoneId: 'A', tableTypeId: 'sofa6', capacity: 6, x: 10 + i * 30, y: 20 })),
  ...[4, 5, 6].map((n, i) => ({ tableNumber: n, zoneId: 'A', tableTypeId: 'round2', capacity: 2, x: 10 + i * 30, y: 45 })),
  ...[7, 8, 9, 10].map((n, i) => ({ tableNumber: n, zoneId: 'B', tableTypeId: 'booth4', capacity: 4, x: 5 + i * 24, y: 75 })),
  ...[11, 12].map((n, i) => ({ tableNumber: n, zoneId: 'B', tableTypeId: 'round2', capacity: 2, x: 20 + i * 40, y: 92 })),
];
const PRICES = [
  { zoneId: 'A', tableTypeId: 'sofa6', packagePrice: 7200, packageContent: 'a bottle of whisky, mixers, a fruit platter' },
  { zoneId: 'A', tableTypeId: 'round2', packagePrice: 2400, packageContent: 'a bottle of wine, a snack plate' },
  { zoneId: 'B', tableTypeId: 'booth4', packagePrice: 3600, packageContent: 'a bottle of spirits, mixers' },
  { zoneId: 'B', tableTypeId: 'round2', packagePrice: 1800, packageContent: 'a bottle of wine' },
];
const ROUNDS = [
  { name: 'Saturday Live: The Band', artist: 'The Band' },
  { name: 'Saturday Live: Night Jazz Trio', artist: 'Night Jazz Trio', tablesNotForSale: [] },
  { name: 'Saturday Live: Siam Strings', artist: 'Siam Strings', tablesNotForSale: [11, 12] },
];
const CUSTOMERS = [
  { user: 'U-somchai', table: 1, profile: { name: 'Somchai Jaidee', phone: '0812345678', consent: true }, partySize: 7, acceptTerms: true },
  { user: 'U-malee', table: 5, profile: { name: 'Malee Srisuk', phone: '0898765432', consent: true } },
  { user: 'U-anan', table: 8 },
];

// the next three Saturdays of the venue's calendar (Bangkok, UTC+7); doors 18:00 and start 20:00 there are 11:00Z and 13:00Z
const BANGKOK_MS = 7 * 3600e3;
const saturdays = (n) => {
  const today = new Date(Date.now() + BANGKOK_MS);
  const ahead = ((6 - today.getUTCDay() + 7) % 7) || 7;   // at least tomorrow
  return Array.from({ length: n }, (_, i) => new Date(today.getTime() + (ahead + 7 * i) * 864e5).toISOString().slice(0, 10));
};

await waitForGateway();
const days = saturdays(ROUNDS.length);
const existing = (await call(manager, 'GET', '/api/rounds')).filter((r) => days.includes(r.date));
if (existing.length) {
  console.log(`demo data present at ${GATEWAY}: ${existing.map((r) => `"${r.name}" on ${r.date}`).join(', ')}; nothing changed (npm run demo:reset starts over)`);
  process.exit(0);
}

for (const t of TYPES) await call(manager, 'PUT', `/api/table-types/${t.id}`, { name: t.name, capacity: t.capacity });
const map = await call(manager, 'POST', '/api/zone-maps', { name: 'Main hall' });
await call(manager, 'POST', `/api/zone-maps/${map.id}/image`, { fileName: 'main-hall.png' });
await call(manager, 'PUT', `/api/zone-maps/${map.id}`, { zones: ZONES, tables: TABLES });
await call(manager, 'POST', `/api/zone-maps/${map.id}/activate`);
console.log(`zone map "Main hall" (${map.id}) Active: ${ZONES.length} zones, ${TABLES.length} tables, ${TYPES.length} table types`);

const rounds = [];
for (const [i, r] of ROUNDS.entries()) {
  const day = days[i];
  const round = await call(manager, 'POST', '/api/rounds', { name: r.name });
  await call(manager, 'PUT', `/api/rounds/${round.id}`, {
    artist: r.artist, date: day, doorsOpenAt: `${day}T11:00:00Z`, startAt: `${day}T13:00:00Z`, bookingOpenAt: new Date(Date.now() - 60e3).toISOString(),
    zoneMapId: map.id, tablesNotForSale: r.tablesNotForSale ?? [], prices: PRICES,
  });
  await call(manager, 'POST', `/api/rounds/${round.id}/publish`);
  rounds.push({ ...round, day });
  console.log(`round "${r.name}" (${round.id}) Published on ${day}${r.tablesNotForSale?.length ? `, tables ${r.tablesNotForSale.join(' and ')} not for sale` : ''}`);
}

for (const c of CUSTOMERS) {
  const who = H(c.user, 'customer');
  const booking = await call(who, 'POST', '/api/bookings', { roundId: rounds[0].id, tableNumber: c.table });
  if (c.profile) await call(who, 'POST', '/api/customers/me', c.profile);
  if (c.partySize) await call(who, 'PUT', `/api/bookings/${booking.id}/party-size`, { partySize: c.partySize });
  if (c.acceptTerms) await call(who, 'POST', `/api/bookings/${booking.id}/terms-acceptance`);
  console.log(`${c.user} holds table ${c.table} of "${rounds[0].name}" (booking ${booking.id})${c.profile ? ', profile' : ''}${c.partySize ? `, party of ${c.partySize}` : ''}${c.acceptTerms ? ', terms accepted' : ''}`);
}
console.log(`\nseeded ${GATEWAY}: ${rounds.length} rounds, ${CUSTOMERS.length} held tables (Held for 15 minutes, BRULE-02); back-office manager/manager, door1/door1, owner/owner`);
