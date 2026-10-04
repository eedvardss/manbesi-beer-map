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
  const alaCard = page.locator('[data-venue-id="folkklubs-ala-pagrabs"]');
  await alaCard.waitFor();
  assert.match(await alaCard.innerText(), /5,50/);
  assert.match(await alaCard.innerText(), /IPA/);
  await search.fill('Swings Golf');
  await priceSlider.focus();
  await page.keyboard.press('Home');
  await page.getByText('Tilpums nav norādīts', { exact: true }).waitFor();
  assert(!(await page.locator('body').innerText()).includes('∞'));

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
  console.log(
    'Browser checks passed: price filters, litre comparison, unknown size, stable marker focus, mobile drawer, marker positioning, and timeline.',
  );
} finally {
  await browser.close();
}
