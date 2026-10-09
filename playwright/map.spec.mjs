import { test } from '../application/scripts/playwright-fixtures.mjs';
import { mapInteractions } from '../application/scripts/map-interactions.mjs';

test('Explore bars, price filters, menus, mobile map and recovery', async ({ page, catalog }) => {
  await mapInteractions(page, catalog.base);
});
