import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(process.env.BEER_MAP_TEST_URL ?? 'http://localhost:3000/');
  await page.locator('.price-marker').first().waitFor();
  const search = page.getByRole('textbox', { name: 'Meklēt vietas' });
  assert.equal(await page.locator('.marker-node').count(), 165, 'Every venue must have its own marker');
  assert.equal(await page.locator('.cluster-marker').count(), 0, 'Venue grouping is disabled');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.marker-node').count(), 165, 'Zoom must retain individual markers');
  await search.fill('Vagonu iela 21');
  await page.waitForFunction(() => document.querySelectorAll('.marker-node').length === 2);
  assert.equal(await page.locator('.cluster-marker').count(), 0, 'Co-located venues remain separate');
  await search.fill('ALA Pagrabs');
  await page.getByRole('combobox', { name: 'Kārtot vietas' }).click();
  await page.getByRole('option', { name: 'Lētākais litrs' }).click();
  await page
    .locator('.venue-card .card-price small')
    .filter({ hasText: '6,30' })
    .waitFor();
  assert.match(await page.locator('.venue-card').innerText(), /3000 ml/);
  const marker = page.locator('.price-marker');
  await marker.focus();
  const original = await marker.elementHandle();
  await page.keyboard.press('Enter');
  await page.locator('.marker-detail').waitFor();
  assert(
    await original.evaluate(
      (node) => node.isConnected && document.activeElement === node,
    ),
    'Marker button must keep keyboard focus when expanded',
  );
  const other = await page.evaluateHandle(() =>
    document.querySelector('.price-marker'),
  );
  await page.keyboard.press('Enter');
  await page.locator('.marker-detail').waitFor({ state: 'detached' });
  assert(
    await other.evaluate((node) => node.isConnected),
    'Marker must be retained when collapsed',
  );
  await search.fill('IPA');
  const priceSlider = page.getByRole('slider', { name: 'Cenas diapazons' });
  await priceSlider.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const alaCard = page.locator('.venue-card[data-venue-id="folkklubs-ala-pagrabs"]');
  await alaCard.waitFor();
  assert.match(await alaCard.innerText(), /5,50/);
  assert.match(await alaCard.innerText(), /IPA/);
  await search.fill('Swings Golf');
  await priceSlider.focus();
  await page.keyboard.press('Home');
  await page.getByText('Tilpums nav norādīts', { exact: true }).waitFor();
  assert(!(await page.locator('body').innerText()).includes('∞'));

  await search.fill('ALA Pagrabs');
  await page.getByRole('button', { name: 'Parādīt kartē: Folkklubs ALA Pagrabs', exact: true }).click();
  await page.waitForTimeout(1100);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.waitForTimeout(700);
  const resizedFooter = await page.locator('.marker-detail-footer').boundingBox();
  const resizedControls = await page.locator('.mobile-results').boundingBox();
  assert(resizedFooter && resizedControls && resizedFooter.y + resizedFooter.height < resizedControls.y - 8,
    'An already-open menu must stay clear of controls after a smaller resize');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.mobile-results').click();
  await search.fill('ALA Pagrabs');
  await page
    .getByRole('button', {
      name: 'Parādīt kartē: Folkklubs ALA Pagrabs',
      exact: true,
    })
    .click();
  await page.locator('.sidebar.mobile-open').waitFor({ state: 'detached' });
  await page.locator('.marker-detail').waitFor();
  // Wait for map animation to settle, then assert the expanded menu stays in the viewport.
  await page.waitForTimeout(1100);
  const box = await page.locator('.marker-detail').boundingBox();
  assert(
    box &&
      box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= 391 &&
      box.y + box.height <= 845,
    'Expanded marker should be visible on mobile',
  );
  // Reopening at the existing zoom can still produce a flyTo zoom event.
  // Programmatic camera movement must not dismiss the selected place.
  await marker.click();
  await page.locator('.marker-detail').waitFor({ state: 'detached' });
  await page.locator('.mobile-results').click();
  await page.getByRole('button', {
    name: 'Parādīt kartē: Folkklubs ALA Pagrabs', exact: true,
  }).click();
  await page.locator('.sidebar.mobile-open').waitFor({ state: 'detached' });
  await page.locator('.marker-detail').waitFor();
  await page.waitForTimeout(1100);
  assert.equal(await marker.getAttribute('aria-expanded'), 'true');
  // Selecting an already-open place must retain space for its source controls.
  await page.locator('.mobile-results').click();
  await page.getByRole('button', {
    name: 'Parādīt kartē: Folkklubs ALA Pagrabs', exact: true,
  }).click();
  await page.locator('.sidebar.mobile-open').waitFor({ state: 'detached' });
  await page.waitForTimeout(1100);
  const footer = await page.locator('.marker-detail-footer').boundingBox();
  const results = await page.locator('.mobile-results').boundingBox();
  assert(footer && results && footer.y + footer.height < results.y - 8,
    'Repeated selection must keep source links clear of mobile controls');
  await page.locator('.mobile-results').click();
  await page.locator('.mobile-scrim').click({ position: { x: 380, y: 20 } });
  await page.locator('.sidebar.mobile-open').waitFor({ state: 'detached' });
  const slider = page.getByRole('slider', { name: 'Izvēlēties laiku' });
  await slider.evaluate((node) => {
    node.scrollLeft = 96;
    node.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(100);
  assert.equal(await slider.getAttribute('aria-valuenow'), '120');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  assert.equal(await slider.getAttribute('aria-valuenow'), '135');
  // The real CSS tick and cursor must agree, including after a user scroll.
  const delta = await page.evaluate(() => {
    const cursor = document
      .querySelector('.time-slider-cursor')
      .getBoundingClientRect();
    const tick = document
      .querySelectorAll('.time-slider-content i')[9]
      .getBoundingClientRect();
    return Math.abs(
      cursor.left + cursor.width / 2 - (tick.left + tick.width / 2),
    );
  });
  assert(delta < 3, `Timeline cursor misaligned by ${delta}px`);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator('.mobile-results').click();
  await page.getByRole('button', { name: 'Parādīt kartē: Folkklubs ALA Pagrabs', exact: true }).click();
  await page.waitForTimeout(1100);
  const smallFooter = await page.locator('.marker-detail-footer').boundingBox();
  const smallResults = await page.locator('.mobile-results').boundingBox();
  assert(smallFooter && smallResults && smallFooter.y + smallFooter.height <= smallResults.y - 16,
    'Source links must stay clear of controls on a smaller phone');
  await page.setViewportSize({ width: 390, height: 844 });

  // A fresh document must recover a cached failed dynamic import, keeping
  // the newest choice rather than returning to the original venue permalink.
  const runtimeRequest = /\/(?:map-runtime-[^/?]+\.js|map-runtime\.ts)(?:\?|$)/;
  await page.route(runtimeRequest, (route) => route.abort('failed'));
  const retryUrl = new URL(page.url());
  retryUrl.search = '?venue=folkklubs-ala-pagrabs';
  await page.goto(retryUrl.href);
  await page.getByRole('alert').waitFor();
  await page.getByRole('slider', { name: 'Izvēlēties laiku' }).press('ArrowRight');
  await page.getByRole('button', { name: '165 vietas', exact: true }).click();
  await search.fill('Swings Golf');
  await page.getByRole('button', { name: 'zem 5 €', exact: true }).click();
  await page.getByRole('combobox', { name: 'Kārtot vietas' }).click();
  await page.getByRole('option', { name: 'Lētākais litrs', exact: true }).click();
  await page.getByRole('button', { name: 'Parādīt kartē: Swings Golf Rīga', exact: true }).click();
  const retryTime = await slider.getAttribute('aria-valuenow');
  await page.unroute(runtimeRequest);
  await Promise.all([
    page.waitForURL((url) => url.searchParams.get('venue') === 'swings-golf-riga'),
    page.getByRole('button', { name: 'Mēģināt vēlreiz', exact: true }).click(),
  ]);
  await page.locator('.marker-detail').waitFor();
  await page.locator('.map-load-state').waitFor({ state: 'detached' });
  assert.equal(await search.inputValue(), 'Swings Golf');
  assert.equal(await page.getByRole('button', { name: 'zem 5 €', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.match(await page.getByRole('combobox', { name: 'Kārtot vietas' }).innerText(), /Lētākais litrs/);
  assert.equal(await page.locator('.marker-detail-head strong').innerText(), 'Swings Golf Rīga');
  assert.equal(await slider.getAttribute('aria-valuenow'), retryTime);
  assert.equal(await page.locator('.price-marker').count(), 1);
  assert.equal(await page.locator('.price-marker').innerText(), '— €/l');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('beer-map:map-retry')), null);

  console.log(
    'Browser checks passed: price filters, litre comparison, unknown size, stable marker focus, mobile drawer, marker positioning, timeline, and failed-runtime recovery.',
  );
} finally {
  await browser.close();
}
