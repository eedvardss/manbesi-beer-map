import type { PriceBand, SortMode } from './beer-query';
import { timelineMaxMinutes } from './time-slider.mjs';

export type MapRetryContext = {
  query: string;
  priceBand: PriceBand;
  sortMode: SortMode;
  venueId: string | null;
  selectedMinutes: number;
  timeIsLive: boolean;
  mobileListOpen: boolean;
};

type RetryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const storageKey = 'beer-map:map-retry';
const maximumAge = 5 * 60_000;

// A failed module import can stay failed for this document's lifetime. A user
// retry reloads the document, carrying only a short-lived, one-shot UI context.
export function saveMapRetry(storage: RetryStorage, context: MapRetryContext, now = Date.now()) {
  // A failed write must not revive an older venue choice on the next reload.
  storage.removeItem(storageKey);
  storage.setItem(storageKey, JSON.stringify({ savedAt: now, context }));
}

export function consumeMapRetry(storage: RetryStorage, now = Date.now()): MapRetryContext | null {
  const raw = storage.getItem(storageKey);
  if (!raw) return null;
  storage.removeItem(storageKey);
  try {
    const value = JSON.parse(raw);
    const context = value?.context;
    if (typeof value?.savedAt !== 'number' || now < value.savedAt || now - value.savedAt > maximumAge ||
      !context || typeof context.query !== 'string' ||
      !['all', 'under5', 'fiveToSix', 'over6'].includes(context.priceBand) ||
      !['price', 'litre', 'name'].includes(context.sortMode) ||
      !(context.venueId === null || typeof context.venueId === 'string') ||
      !Number.isInteger(context.selectedMinutes) || context.selectedMinutes < 0 || context.selectedMinutes > timelineMaxMinutes ||
      typeof context.timeIsLive !== 'boolean' || typeof context.mobileListOpen !== 'boolean') return null;
    return context;
  } catch {
    return null;
  }
}
