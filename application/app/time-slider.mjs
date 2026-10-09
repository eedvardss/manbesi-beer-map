export const timelineStepMinutes = 15;
export const timelineStepPixels = 12;
export const timelineMaxMinutes = 30 * 60;
export const timelineTicks = Array.from(
  { length: timelineMaxMinutes / timelineStepMinutes + 1 },
  (_, index) => index * timelineStepMinutes,
);
export const timelineTrackPixels = (timelineTicks.length - 1) * timelineStepPixels;
export const timelineContentWidth = `calc(100% + ${timelineTrackPixels}px)`;

export const timelineTickPosition = (index) => (
  `calc((100% - ${timelineTrackPixels}px) / 2 + ${index * timelineStepPixels}px)`
);

export const timelineTickLabel = (minutes) => minutes % 60 === 0
  ? String(Math.floor(minutes / 60) % 24).padStart(2, '0')
  : undefined;
