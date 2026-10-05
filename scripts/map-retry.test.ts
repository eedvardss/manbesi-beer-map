import assert from 'node:assert/strict';
import { test } from 'node:test';
import { consumeMapRetry, saveMapRetry, type MapRetryContext } from '../app/map-retry';

const context: MapRetryContext = {
  query: 'Swings Golf', priceBand: 'under5', sortMode: 'litre', venueId: 'swings-golf-riga',
  selectedMinutes: 135, timeIsLive: false, mobileListOpen: false,
};
const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
};

await test('explicit map retry carries the latest choice, filters and custom time once', () => {
  const session = storage();
  saveMapRetry(session, context, 1000);
  assert.deepEqual(consumeMapRetry(session, 1100), context);
  assert.equal(consumeMapRetry(session, 1200), null);
});

await test('expired or corrupt map retry context cannot override a later visit', () => {
  for (const raw of [
    '{', 'null', JSON.stringify({ savedAt: 1000, context: { ...context, sortMode: 'invalid' } }),
    JSON.stringify({ savedAt: 1000, context: { ...context, selectedMinutes: -1 } }),
    JSON.stringify({ savedAt: 1000, context: { ...context, timeIsLive: 'false' } }),
  ]) {
    const session = storage();
    session.setItem('beer-map:map-retry', raw);
    assert.equal(consumeMapRetry(session, 1100), null);
    assert.equal(session.getItem('beer-map:map-retry'), null);
  }
  const session = storage();
  saveMapRetry(session, context, 1000);
  assert.equal(consumeMapRetry(session, 301001), null);
  saveMapRetry(session, context, 1000);
  assert.equal(consumeMapRetry(session, 999), null);
});

await test('failed recovery storage writes cannot restore an older venue choice', () => {
  const session = storage();
  saveMapRetry(session, { ...context, venueId: 'folkklubs-ala-pagrabs' }, 1000);
  const fullStorage = { ...session, setItem: () => { throw new Error('Quota exceeded'); } };
  assert.throws(() => saveMapRetry(fullStorage, context, 1100), /Quota exceeded/);
  assert.equal(consumeMapRetry(session, 1200), null);
});
