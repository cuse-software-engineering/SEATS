// The test of the customer feature specs: `seed` is a worker-scoped fixture that seeds the table types and one
// Active zone map once per worker (helpers/seed.ts), as the manager; a spec then seeds its own rounds on free days
// in beforeAll, so runs never step on each other.
import { test as base, type APIRequestContext } from '@playwright/test';
import { managerApi, type SeededMap, seedZoneMap, tag } from './seed';

export interface Seed { api: APIRequestContext; t: string; map: SeededMap }

export const test = base.extend<{}, { seed: Seed }>({   // eslint-disable-line @typescript-eslint/ban-types
  seed: [async ({}, use) => {
    const t = tag();
    const api = await managerApi();
    const map = await seedZoneMap(api, t);
    await use({ api, t, map });
    await api.dispose();
  }, { scope: 'worker' }],
});

export { expect } from '@playwright/test';
