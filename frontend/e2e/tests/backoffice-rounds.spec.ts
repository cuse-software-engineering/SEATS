// The round editor of the Back-office Web App beyond the use-case flows: several rounds in a row, the overlap
// refusal, and the discard of a draft (never of a published round). Every step asserts what the user sees after
// the click: the toast, the badge, the validation box, the confirm dialog.
import { expect, test, type APIRequestContext } from '@playwright/test';
import { freeDays, managerApi, PRICES, ROUND2, seedRound, seedZoneMap, SOFA6, tag, TABLES, type SeededMap, type SeededRound } from '../helpers/seed';
import { chooseZoneMap, confirmDialog, createAndPublishRound, enterDetails, expectToast, localInput, newRound, publishButton, roundHead, roundItem, setPrice, validateRound } from '../helpers/backoffice';
import { signInAsManager } from '../helpers/ui';

const t = tag();
let api: APIRequestContext;
let map: SeededMap;
let days: string[];
let taken: SeededRound;
let published: SeededRound;
const PRICE_BY_NAME = { [SOFA6.name]: PRICES[SOFA6.id], [ROUND2.name]: PRICES[ROUND2.id] };

test.beforeAll(async () => {
  api = await managerApi();
  map = await seedZoneMap(api, t);
  days = await freeDays(api, 5);
  taken = await seedRound(api, map.id, { name: `E2E ${t} taken evening`, day: days[3] });
  published = await seedRound(api, map.id, { name: `E2E ${t} published`, day: days[4] });
});
test.afterAll(async () => { await api.dispose(); });
test.beforeEach(async ({ page }) => { await signInAsManager(page); });

test('three rounds created and published in a row are listed as Published and reach the customer list in date order', async ({ page }) => {
  const names = [0, 1, 2].map((i) => `E2E ${t} series ${i + 1}`);
  for (const [i, name] of names.entries()) await createAndPublishRound(page, { name, day: days[i], map, tables: TABLES.length, prices: PRICE_BY_NAME });

  // all three in the list with the Published badge, newest first among the rounds of this run
  for (const name of names) await expect(roundItem(page, name)).toContainText('Published');

  // and in the customer-facing list, in date order
  const upcoming = (await (await api.get('/api/rounds')).json()) as { name: string; date: string; status: string }[];
  const mine = upcoming.filter((r) => names.includes(r.name));
  expect(mine).toHaveLength(3);
  expect(mine.map((r) => r.date)).toEqual([...mine.map((r) => r.date)].sort());
  expect(mine.map((r) => r.name)).toEqual([...names].sort((a, b) => days[names.indexOf(a)].localeCompare(days[names.indexOf(b)])));
  for (const r of mine) expect(r.status).toBe('open');
});

test('a fourth round on the same evening as a published round fails validation with the overlap message and Publish stays closed', async ({ page }) => {
  const name = `E2E ${t} same evening`;
  const day = days[3];
  await newRound(page, name);
  await enterDetails(page, { artist: 'The E2E Band', day, doors: localInput(`${day}T18:00:00Z`), start: localInput(`${day}T20:00:00Z`), bookingOpens: localInput(new Date(Date.now() - 864e5).toISOString()) });
  await chooseZoneMap(page, map, TABLES.length);
  await setPrice(page, SOFA6.name, PRICES[SOFA6.id]);
  await setPrice(page, ROUND2.name, PRICES[ROUND2.id]);

  const validation = await validateRound(page);   // saves the draft first
  await expectToast(page, 'Saved');
  await expectToast(page, 'Validation found 1 problem');
  await expect(validation).toContainText('Validation result · 1 problem');
  await expect(validation).toContainText(`overlaps the published round "${taken.name}"`);
  await expect(validation).toContainText('Publish opens once the round passes validation');
  await expect(publishButton(page)).toBeDisabled();
  await expect(roundHead(page)).toContainText('Draft');
  await expect(roundItem(page, name)).toContainText('Draft');
});

test('a draft round is discarded through the confirm dialog; a published round cannot be discarded', async ({ page }) => {
  const name = `E2E ${t} throwaway`;
  await newRound(page, name);

  // Cancel in the dialog keeps the draft
  await page.getByRole('button', { name: 'Discard' }).click();
  await confirmDialog(page, `Discard the draft "${name}"?`, 'Cancel');
  await expect(roundHead(page)).toContainText(name);
  await expect(roundItem(page, name)).toHaveCount(1);

  // Discard in the dialog removes it: the toast, the list, the empty editor
  await page.getByRole('button', { name: 'Discard' }).click();
  await confirmDialog(page, `Discard the draft "${name}"?`, 'Discard');
  await expectToast(page, 'Round discarded');
  await expect(roundItem(page, name)).toHaveCount(0);
  await expect(page.getByText('No round open')).toBeVisible();

  // a published round has no Discard, and says why
  await roundItem(page, published.name).click();
  await expect(roundHead(page)).toContainText(published.name);
  await expect(roundHead(page)).toContainText('Published');
  await expect(page.getByRole('button', { name: 'Discard' })).toHaveCount(0);
  await expect(page.getByText('Only a draft can be discarded.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();   // nothing changed yet
});
