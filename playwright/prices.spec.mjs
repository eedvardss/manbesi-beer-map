import { test, expect } from '../application/scripts/playwright-fixtures.mjs';
import { priceSuggestions } from './price-suggestions.mjs';

test('Suggest a price, sign in as admin, approve, reject and revert', async ({ browser, catalog }, testInfo) => {
  await priceSuggestions({ browser, ...catalog, expect,
    artifacts: testInfo.outputDir, trace: false });
});
