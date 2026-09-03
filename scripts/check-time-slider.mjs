import assert from 'node:assert/strict';
import {
  timelineStepMinutes,
  timelineStepPixels,
  timelineTicks,
  timelineTrackPixels,
  timelineTickLabel,
} from '../app/time-slider.mjs';

const viewportWidth = 298;
const selectedMinutes = 21 * 60;
const selectedIndex = selectedMinutes / timelineStepMinutes;
const contentWidth = viewportWidth + timelineTrackPixels;
const tickPosition = (contentWidth - timelineTrackPixels) / 2 + selectedIndex * timelineStepPixels;
const scrollLeft = selectedIndex * timelineStepPixels;

assert.equal(tickPosition - scrollLeft, viewportWidth / 2, 'Selected hour must stay under the fixed centre cursor');
assert.equal(timelineTickLabel(16 * 60), '16');
assert.equal(timelineTickLabel(23 * 60), '23');
assert.equal(timelineTickLabel(24 * 60), '00');
assert.equal(timelineTickLabel(25 * 60), '01');
assert.equal(timelineTickLabel(16 * 60 + 15), undefined);
assert.equal(timelineTicks.at(-1), 30 * 60);

console.log('Time slider uses centred, hourly 24-hour labels through midnight.');
