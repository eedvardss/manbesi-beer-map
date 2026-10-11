import { test, expect } from '../application/scripts/playwright-fixtures.mjs';
import { priceSuggestions } from './price-suggestions.mjs';

test('Anonymous price suggestion persists; admin writes are denied', async ({ browser, catalog }, testInfo) => {
  await priceSuggestions({ browser, ...catalog, expect,
    artifacts: testInfo.outputDir, trace: false });
});
