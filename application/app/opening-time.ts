export type RigaClock = { dayIndex: number; minutes: number };
export type PreparedWeek = (readonly [number, number][] | null)[];
const weekdays: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const clockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Riga', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function getRigaClock(date = new Date()): RigaClock {
  const parts = clockFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return { dayIndex: weekdays[part('weekday')] ?? 0, minutes: Number(part('hour')) * 60 + Number(part('minute')) };
}

export function formatClockTime(minutes: number) {
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function isScheduleOpenAt(week: PreparedWeek | undefined, clock: RigaClock): boolean | null {
  if (!week) return null;
  const today = week[clock.dayIndex];
  const previous = week[(clock.dayIndex + 6) % 7];
  if (today?.some(([start, end]) => clock.minutes >= start && (end <= start || clock.minutes < end))) return true;
  if (previous?.some(([start, end]) => end <= start && clock.minutes < end)) return true;
  return today === null || previous === null ? null : false;
}
