import assert from 'node:assert/strict';

// Helpers are supplied by the application runner, which owns dependencies and
// enforces the disposable database and localhost guards before any writes.
export async function priceSuggestions({
  browser,
  db,
  base,
  password,
  expect,
  artifacts,
}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const reviewContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const reviewer = await reviewContext.newPage();
  const search = page.getByRole('textbox', { name: 'Meklēt vietas' });
  const reports = [];
  const faults = [];
  page.on('pageerror', (error) => faults.push(error.message));
  reviewer.on('pageerror', (error) => faults.push(error.message));
  try {
    await page.goto(base);
    await expect(page.locator('.price-marker').first()).toBeVisible();
    const response = await context.request.get(`${base}/api/venues`);
    assert.equal(response.status(), 200);
    const initial = await response.json();
    const venue = initial.venues.find((v) => v.id === 'folkklubs-ala-pagrabs');
    const jug = venue.beers.find((b) => b.volumeMl === 3000);
    assert(jug);
    const marker = page.locator(
      '.marker-node[data-venue-id="folkklubs-ala-pagrabs"]',
    );
    await search.fill('ALA Pagrabs');
    await page.getByRole('combobox', { name: 'Kārtot vietas' }).click();
    await page.getByRole('option', { name: 'Lētākais litrs' }).click();
    await expect(page.locator('.venue-card .card-price small')).toContainText(
      '6,30',
    );
    await page
      .getByRole('button', {
        name: 'Parādīt kartē: Folkklubs ALA Pagrabs',
        exact: true,
      })
      .click();
    const action = marker.locator(`[data-serving-id="${jug.id}"]`);
    await action.click();
    const form = page.getByRole('dialog', { name: 'Ieteikt cenu' });
    await expect(form).toBeVisible();
    await expect(form).toContainText('3000 ml');
    await form.getByLabel('Jaunā cena, EUR').fill('4,501');
    await form.getByRole('button', { name: 'Nosūtīt ieteikumu' }).click();
    await expect(form.getByRole('alert')).toContainText('divām');
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int count FROM beer_map_price_suggestions',
        )
      ).rows[0].count,
      0,
    );
    await form.getByLabel('Jaunā cena, EUR').fill('4,50');
    await form
      .getByLabel('Cenu avota saite', { exact: false })
      .fill('https://example.com/fixture-menu');
    await form
      .getByLabel('Piezīme', { exact: false })
      .fill('Disposable browser fixture — not a real venue quote');
    // Network failure preserves the proposed price and allows an explicit retry.
    await page.route('**/api/prices/suggestions', (route) =>
      route.abort('failed'),
    );
    await form.getByRole('button', { name: 'Nosūtīt ieteikumu' }).click();
    await expect(form.getByRole('alert')).toBeVisible();
    await expect(form.getByLabel('Jaunā cena, EUR')).toHaveValue('4,50');
    await page.unroute('**/api/prices/suggestions');
    const submitted = page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/prices/suggestions') &&
        r.request().method() === 'POST',
    );
    await form.getByRole('button', { name: 'Nosūtīt ieteikumu' }).click();
    const submittedResponse = await submitted;
    assert.equal(submittedResponse.status(), 201);
    const report = await submittedResponse.json();
    reports.push(report.id);
    await expect(
      form.getByText('Ieteikums saglabāts', { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: `${artifacts}/suggestion-desktop.png` });
    const sql = await db.query(
      'SELECT proposed_cents,status FROM beer_map_price_suggestions WHERE id=$1',
      [report.id],
    );
    assert.equal(sql.rows[0].proposed_cents, 450);
    assert.equal(sql.rows[0].status, 'pending');
    assert.equal(
      (await context.request.get(`${base}/api/venues`)).headers().etag,
      response.headers().etag,
      'Pending suggestions must retain ETag',
    );
    // Retrying an already committed request cannot create a second row.
    const retry = await context.request.post(`${base}/api/prices/suggestions`, {
      headers: { Origin: new URL(base).origin },
      data: submittedResponse.request().postDataJSON(),
    });
    assert.equal(retry.status(), 200);
    assert.equal((await retry.json()).id, report.id);
    await form.getByRole('button', { name: 'Gatavs' }).click();
    await expect(form).not.toBeVisible();
    await expect(action).toBeFocused();
    assert.equal(
      (
        await reviewContext.request.get(`${base}/api/price-review/suggestions`)
      ).status(),
      401,
    );
    for (const decision of ['approve', 'reject', 'revert'])
      assert.equal(
        (
          await context.request.post(`${base}/api/price-review/action`, {
            headers: { Origin: new URL(base).origin },
            data: {
              action: decision,
              id: report.id,
              servingId: jug.id,
              revision: 0,
            },
          })
        ).status(),
        401,
        'A regular visitor cannot administer prices',
      );
    await expect(
      page.getByRole('link', { name: 'Admin', exact: true }),
    ).toHaveAttribute('href', '/admin');
    await reviewer.goto(`${base}/price-review`);
    await expect(reviewer).toHaveURL(`${base}/admin`);
    await reviewer.screenshot({ path: `${artifacts}/admin-login-mobile.png` });
    await reviewer.getByLabel('Administratora parole').fill('invalid-password');
    await reviewer
      .getByRole('button', { name: 'Pieslēgties', exact: true })
      .click();
    await expect(reviewer.getByRole('alert')).toContainText('Nepareiza');
    // Review context is deliberately not traced: it submits a login credential.
    await reviewer.getByLabel('Administratora parole').fill(password);
    await reviewer
      .getByRole('button', { name: 'Pieslēgties', exact: true })
      .click();
    const card = reviewer.locator(`[data-suggestion-id="${report.id}"]`);
    await expect(card).toContainText('18,90');
    await expect(card).toContainText('4,50');
    await reviewer.screenshot({ path: `${artifacts}/review-mobile.png` });
    await reviewer.setViewportSize({ width: 320, height: 568 });
    await card
      .getByRole('button', { name: 'Apstiprināt', exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      card.getByRole('button', { name: 'Apstiprināt', exact: true }),
    ).toBeInViewport();
    assert.equal(
      await reviewer
        .locator('.admin-shell')
        .evaluate((element) => element.scrollWidth > element.clientWidth),
      false,
      'Small-screen admin layout must not overflow horizontally',
    );
    await reviewer.screenshot({
      path: `${artifacts}/admin-decision-small.png`,
    });
    await reviewer.setViewportSize({ width: 1280, height: 900 });
    await reviewer.locator('.admin-shell').evaluate((element) => {
      element.scrollTop = 0;
    });
    await reviewer.screenshot({ path: `${artifacts}/admin-desktop.png` });
    await reviewer.setViewportSize({ width: 390, height: 844 });
    const crossSite = await reviewContext.request.post(
      `${base}/api/price-review/action`,
      {
        headers: { Origin: 'https://evil.example' },
        data: { action: 'reject', id: report.id },
      },
    );
    assert.equal(crossSite.status(), 403);
    await card
      .getByRole('button', { name: 'Apstiprināt', exact: true })
      .click();
    await expect(
      reviewer.getByText('Cena apstiprināta un publicēta kartē.'),
    ).toBeVisible();
    await expect(reviewer.getByText('Visi ieteikumi izskatīti')).toBeVisible();
    await reviewer.getByRole('button', { name: /^Vēsture/ }).click();
    await expect(card).toContainText('Apstiprināts');
    const changed = await context.request.get(`${base}/api/venues`);
    assert.notEqual(changed.headers().etag, response.headers().etag);
    const published = (await changed.json()).venues
      .find((v) => v.id === venue.id)
      .beers.find((b) => b.id === jug.id);
    assert.equal(published.price, 4.5);
    assert.equal(published.revision, 1);
    assert.equal(
      published.priceUpdate.sourceUrl,
      'https://example.com/fixture-menu',
    );
    // The observer did not submit or review. Refresh must retain its choice and
    // menu scroll position, while all price-dependent presentation updates.
    const list = marker.locator('.marker-beer-list');
    await list.evaluate((el) => {
      el.scrollTop = 100;
    });
    const scroll = await list.evaluate((el) => el.scrollTop);
    await page.getByRole('button', { name: 'Atjaunot vietas' }).click();
    await expect(page.locator('.venue-card .card-price small')).toContainText(
      '1,50',
    );
    await expect(search).toHaveValue('ALA Pagrabs');
    await expect(marker.locator('.marker-detail')).toBeVisible();
    assert.equal(await list.evaluate((el) => el.scrollTop), scroll);
    await expect(
      marker
        .locator('.marker-beer-row')
        .filter({ has: page.locator(`[data-serving-id="${jug.id}"]`) }),
    ).toContainText('4,50');
    await page.reload();
    await expect(page.locator('.price-marker').first()).toBeVisible();
    await search.fill('ALA Pagrabs');
    await page.getByRole('combobox', { name: 'Kārtot vietas' }).click();
    await page.getByRole('option', { name: 'Lētākais litrs' }).click();
    await expect(page.locator('.venue-card .card-price small')).toContainText(
      '1,50',
    );
    const slider = page.getByRole('slider', { name: 'Cenas diapazons' });
    await slider.focus();
    await slider.press('Home');
    await slider.press('ArrowRight');
    await expect(page.locator('.venue-card')).toHaveCount(1);
    const stale = await context.request.post(`${base}/api/prices/suggestions`, {
      headers: { Origin: new URL(base).origin },
      data: {
        servingId: jug.id,
        revision: 0,
        price: '4,00',
        requestId: crypto.randomUUID(),
      },
    });
    assert.equal(stale.status(), 409);
    await slider.press('Home');
    await search.fill('Swings Golf');
    await expect(
      page.getByText('Tilpums nav norādīts', { exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', {
        name: 'Parādīt kartē: Swings Golf Rīga',
        exact: true,
      })
      .click();
    await expect(page.locator('.marker-detail')).toContainText('Swings');
    await search.fill('Nurme');
    await expect(page.locator('.venue-card').first()).toBeVisible();
    await page
      .getByRole('button', {
        name: 'Parādīt kartē: Nurme Brewery & Taproom',
        exact: true,
      })
      .click();
    await expect(page.locator('.marker-detail')).toContainText('Nurme');
    await search.fill('zz-not-a-venue');
    await expect(page.getByText('Nekas neatradās')).toBeVisible();
    await page.getByRole('button', { name: 'Notīrīt filtrus' }).click();
    await expect(page.locator('.marker-node')).toHaveCount(165);
    // A second submission through the mobile list exercises rejection.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: /165 vietas/ }).click();
    await search.fill('ALA Pagrabs');
    await page
      .getByRole('button', {
        name: 'Ieteikt cenu: Folkklubs ALA Pagrabs',
        exact: true,
      })
      .click();
    await expect(form).toBeVisible();
    await form.getByLabel('Jaunā cena, EUR').fill('3,50');
    await page.screenshot({ path: `${artifacts}/suggestion-mobile.png` });
    const second = page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/prices/suggestions') &&
        r.request().method() === 'POST',
    );
    await form.getByRole('button', { name: 'Nosūtīt ieteikumu' }).click();
    const secondReport = await (await second).json();
    reports.push(secondReport.id);
    await reviewer.getByRole('button', { name: /^Gaida pārbaudi/ }).click();
    const rejection = reviewer.locator(
      `[data-suggestion-id="${secondReport.id}"]`,
    );
    await rejection
      .getByRole('button', { name: 'Noraidīt', exact: true })
      .click();
    await expect(
      reviewer.getByText('Ieteikums noraidīts.', { exact: true }),
    ).toBeVisible();
    await reviewer.getByRole('button', { name: /^Vēsture/ }).click();
    await expect(rejection).toContainText('Noraidīts');
    assert.equal(
      (
        await db.query(
          'SELECT status FROM beer_map_price_suggestions WHERE id=$1',
          [secondReport.id],
        )
      ).rows[0].status,
      'rejected',
    );
    assert.equal(
      (await context.request.get(`${base}/api/venues`)).headers().etag,
      changed.headers().etag,
    );
    // Human-controlled reversal returns the demo fixture's baseline and logs it.
    reviewer.once('dialog', (dialog) => dialog.accept());
    await card
      .getByRole('button', { name: 'Atjaunot iepriekšējo cenu' })
      .click();
    await expect(
      card.getByRole('button', { name: 'Atjaunot iepriekšējo cenu' }),
    ).toHaveCount(0);
    const restored = (
      await (await context.request.get(`${base}/api/venues`)).json()
    ).venues
      .find((v) => v.id === venue.id)
      .beers.find((b) => b.id === jug.id);
    assert.equal(restored.price, jug.price);
    assert.equal(restored.revision, 2);
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int count FROM beer_map_price_changes WHERE serving_id=$1',
          [jug.id],
        )
      ).rows[0].count,
      2,
    );
    await reviewer
      .getByRole('textbox', { name: 'Meklēt ieteikumus' })
      .fill('zz-no-matching-report');
    await reviewer.getByRole('button', { name: 'Meklēt', exact: true }).click();
    await expect(reviewer.getByText('Nekas netika atrasts')).toBeVisible();
    await reviewer.getByRole('button', { name: 'Notīrīt meklēšanu' }).click();
    await expect(card).toBeVisible();
    const fixtures = await db.query(
      `INSERT INTO beer_map_price_suggestions(serving_id,reporter,request_id,expected_version,old_cents,proposed_cents,note,created_at)
      SELECT $1,repeat('f',64),gen_random_uuid(),2,1890,400+i,'Temporary admin pagination fixture',date_trunc('day',now())-interval '1 day'+interval '12 hours 0.123456 seconds'
      FROM generate_series(1,26) i RETURNING id`,
      [jug.id],
    );
    try {
      await reviewer.getByRole('button', { name: /^Gaida pārbaudi/ }).click();
      await expect(reviewer.locator('.admin-report')).toHaveCount(25);
      const firstPage = await reviewer
        .locator('.admin-report')
        .evaluateAll((items) => items.map((item) => item.dataset.suggestionId));
      await reviewer
        .getByRole('button', { name: 'Nākamā', exact: true })
        .click();
      await expect(reviewer.locator('.admin-report')).toHaveCount(1);
      const nextId = await reviewer
        .locator('.admin-report')
        .getAttribute('data-suggestion-id');
      assert(
        !firstPage.includes(nextId),
        'Pagination must not repeat equal-timestamp rows',
      );
      await reviewer
        .getByRole('button', { name: 'Iepriekšējā', exact: true })
        .click();
      await expect(reviewer.locator('.admin-report')).toHaveCount(25);
      // A failed refresh retains the loaded queue and offers an explicit retry.
      await reviewer.route('**/api/price-review/suggestions?**', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Sarakstu neizdevās ielādēt.' }),
        }),
      );
      await reviewer
        .getByRole('button', { name: 'Atjaunot ieteikumus' })
        .click();
      await expect(reviewer.getByRole('alert')).toContainText('neizdevās');
      await expect(reviewer.locator('.admin-report')).toHaveCount(25);
      await reviewer.unroute('**/api/price-review/suggestions?**');
    } finally {
      await db.query(
        'DELETE FROM beer_map_price_suggestions WHERE id=ANY($1::uuid[])',
        [fixtures.rows.map((row) => row.id)],
      );
    }
    await reviewContext.clearCookies();
    await reviewer.getByRole('button', { name: 'Atjaunot ieteikumus' }).click();
    await expect(
      reviewer.getByRole('heading', { name: 'Administratora pieslēgšanās' }),
    ).toBeVisible();
    await expect(reviewer.locator('.admin-report')).toHaveCount(0);
    await expect(
      reviewer.getByRole('button', { name: 'Pieslēgties', exact: true }),
    ).toBeEnabled();
    await reviewer.getByLabel('Administratora parole').fill(password);
    await reviewer
      .getByRole('button', { name: 'Pieslēgties', exact: true })
      .click();
    await expect(
      reviewer.getByRole('heading', { name: 'Cenu ieteikumi', exact: true }),
    ).toBeVisible();
    await reviewer.reload();
    await expect(
      reviewer.getByRole('heading', { name: 'Cenu ieteikumi', exact: true }),
    ).toBeVisible();
    await reviewer.getByRole('button', { name: 'Iziet', exact: true }).click();
    await expect(
      reviewer.getByRole('heading', { name: 'Administratora pieslēgšanās' }),
    ).toBeVisible();
    assert.equal(
      (
        await reviewContext.request.get(`${base}/api/price-review/suggestions`)
      ).status(),
      401,
    );
    assert.deepEqual(faults, [], 'Uncaught browser errors');
    console.log(
      'Price/admin browser checks pass: visitor permissions, login/logout, expiry, review, history/search/pagination, persistence, idempotency, ETags, litre/filter updates, two clients, mobile and failure recovery.',
    );
  } catch (error) {
    await reviewer
      .screenshot({ path: `${artifacts}/admin-failure.png` })
      .catch(() => {});
    await page
      .screenshot({ path: `${artifacts}/price-failure.png` })
      .catch(() => {});
    await context.tracing.stop({ path: `${artifacts}/price-failure.zip` });
    throw error;
  } finally {
    await context.close();
    await reviewContext.close();
  }
}
