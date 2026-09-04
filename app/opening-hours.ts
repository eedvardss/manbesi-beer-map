import expandedVenueData from './data/verified-venues-expansion.json';
import { popularVenueData } from './popular-venues';
import { verifiedVenueData150 } from './verified-venues-150';

export type DayHours = string[] | null;

export type VenueOpeningHours = {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
  sourceUrl: string;
  checkedAt: string;
  note?: string;
};

export type RigaClock = {
  dayIndex: number;
  minutes: number;
};

const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const weekdayIndexes: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

const checkedAt = '2026-09-03';
type Week = [DayHours, DayHours, DayHours, DayHours, DayHours, DayHours, DayHours];

const schedule = (week: Week, sourceUrl: string, note?: string): VenueOpeningHours => ({
  mon: week[0],
  tue: week[1],
  wed: week[2],
  thu: week[3],
  fri: week[4],
  sat: week[5],
  sun: week[6],
  sourceUrl,
  checkedAt,
  note,
});

export const venueOpeningHours: Record<string, VenueOpeningHours> = {
  'alus-muiza': schedule([
    ['16:00-23:00'], ['16:00-23:00'], ['16:00-23:00'], ['16:00-23:00'], ['16:00-00:00'], ['16:00-00:00'], ['16:00-23:00'],
  ], 'https://untappd.com/v/alus-muiza/2055441'),
  hat: schedule([
    [], [], ['17:00-23:00'], ['17:00-23:00'], ['16:00-00:00'], ['16:00-00:00'], [],
  ], 'https://www.hatbrewery.lv/taproom/'),
  nurme: schedule([
    [], ['17:00-23:00'], ['17:00-00:00'], ['17:00-00:00'], ['17:00-01:00'], ['17:00-01:00'], ['17:00-23:00'],
  ], 'https://untappd.com/v/nurme-brewery-and-taproom/10568297'),
  'labietis-market': schedule([
    ['10:00-18:00'], ['10:00-18:00'], ['10:00-18:00'], ['10:00-18:00'], ['10:00-18:00'], ['10:00-18:00'], ['10:00-17:00'],
  ], 'https://labietis.lv/centraltirgus/'),
  'kakis-maisa': schedule([
    ['16:00-22:00'], ['16:00-22:00'], ['16:00-23:00'], ['16:00-23:00'], ['14:00-00:00'], ['14:00-00:00'], ['14:00-22:00'],
  ], 'https://www.kakismaisa.lv/kontakti/'),
  gust: schedule([
    ['17:00-23:00'], ['17:00-23:00'], ['17:00-23:00'], ['17:00-23:00'], ['17:00-00:00'], ['17:00-00:00'], [],
  ], 'https://untappd.com/v/gust/14012302'),
  beera: schedule([
    ['15:00-00:00'], ['15:00-00:00'], ['15:00-00:00'], ['15:00-00:00'], ['15:00-02:00'], ['14:00-02:00'], ['14:00-23:00'],
  ], 'https://beerabar.lv/contact-us/'),
  banshee: schedule([
    ['14:00-00:00'], ['14:00-00:00'], ['14:00-00:00'], ['14:00-00:00'], ['14:00-02:00'], ['14:00-02:00'], ['14:00-00:00'],
  ], 'https://www.thebansheeriga.com/menu'),
  'kwak-gleznotaju': schedule([
    ['12:00-01:00'], ['12:00-01:00'], ['12:00-01:00'], ['12:00-01:00'], ['12:00-02:00'], ['12:00-02:00'], ['12:00-01:00'],
  ], 'https://kwakinnriga.mozello.lv/kontakti/'),
  'kwak-jauniela': schedule([
    [], ['12:00-01:00'], ['12:00-01:00'], ['12:00-01:00'], ['12:00-02:00'], ['12:00-02:00'], ['12:00-01:00'],
  ], 'https://kwakinnriga-doma.mozello.lv/kontakty/', 'Trešo pušu ieraksti nav vienoti par vietas pašreizējo darbību.'),
  bibelot: schedule([
    [], ['17:00-01:00'], ['17:00-01:00'], ['17:00-01:00'], ['17:00-03:00'], ['17:00-03:00'], [],
  ], 'https://bibelot.bar/'),
  duvels: schedule([
    ['12:00-23:00'], ['12:00-23:00'], ['12:00-23:00'], ['12:00-23:00'], ['12:00-01:00'], ['12:00-01:00'], ['12:00-22:00'],
  ], 'https://www.gastropubduvels.lv/en/'),
  bbars: schedule([
    ['11:00-00:00'], ['11:00-00:00'], ['11:00-00:00'], ['11:00-00:00'], ['11:00-02:00'], ['12:00-02:00'], ['12:00-22:00'],
  ], 'https://bbars.lv/', 'Oficiālajā lapā dažās vietās redzams vecāks darba laiks; izmantots galvenās lapas grafiks.'),
  bellevue: schedule([
    ['12:00-23:00'], ['12:00-23:00'], ['12:00-23:00'], ['12:00-23:00'], ['12:00-23:00'], ['12:00-23:00'], ['12:00-23:00'],
  ], 'https://bellevue.lv/en/faq'),
  islande: schedule([
    null, null, null, null, null, null, null,
  ], 'https://islandehotel.lv/lv/restorani/', 'Oficiālā lapa nenorāda Lobby Bar darba laiku.'),
  skyline: schedule([
    ['15:00-01:00'], ['15:00-01:00'], ['15:00-01:00'], ['15:00-01:00'], ['15:00-02:00'], ['12:00-02:00'], ['12:00-01:00'],
  ], 'https://skylinebar.lv/en/'),
  'ezitis-aldaru': schedule([
    ['12:00-23:00'], ['12:00-23:00'], ['12:00-23:00'], ['12:00-00:00'], ['12:00-02:00'], ['12:00-02:00'], ['12:00-23:00'],
  ], 'https://www.ezitis.lv/aldaru-ielas-ezitis-migla/'),
  'ezitis-grecinieku': schedule([
    ['12:00-01:00'], ['12:00-01:00'], ['12:00-02:00'], ['12:00-03:00'], ['12:00-05:00'], ['12:00-05:00'], ['12:00-01:00'],
  ], 'https://www.ezitis.lv/grecinieku-ielas-ezitis-migla/'),
  'ezitis-baznicas': schedule([
    ['11:00-02:00'], ['11:00-02:00'], ['11:00-03:00'], ['11:00-03:00'], ['11:00-03:00'], ['11:00-03:00'], ['11:00-02:00'],
  ], 'https://www.ezitis.lv/baznicas-ezitis-migla/'),
  'ezitis-palasta': schedule([
    ['12:00-23:00'], ['12:00-23:00'], ['12:00-23:00'], ['12:00-00:00'], ['12:00-03:00'], ['12:00-03:00'], ['12:00-23:00'],
  ], 'https://www.ezitis.lv/palasta-ielas-ezitis-migla/'),
  'osm-node-12060927658': schedule([
    ['14:00-22:00'], ['14:00-22:00'], ['14:00-00:00'], null, null, null, ['12:00-22:00'],
  ], 'https://www.kvartalaangars.lv/en/angars-2/', 'Ceturtdien–sestdien oficiāli norādīts “līdz pēdējam viesim”, bez fiksēta slēgšanas laika.'),
  'osm-way-653650039': schedule([
    [], ['16:00-22:00'], ['16:00-22:00'], ['16:00-22:00'], ['16:00-00:00'], ['11:00-00:00'], ['11:00-22:00'],
  ], 'https://restaurantguru.com/Bruzis-manufaktura-Riga'),
  'osm-node-1316197370': schedule([
    ['12:00-23:00'], ['12:00-23:00'], ['12:00-23:00'], ['12:00-23:00'], ['11:00-23:00'], ['11:00-23:00'], ['11:00-22:00'],
  ], 'https://cabo.lv/kontakti/'),
  'osm-node-569925824': schedule([
    ['19:00-05:00'], ['19:00-05:00'], ['19:00-05:00'], ['19:00-05:00'], ['19:00-05:00'], ['19:00-05:00'], ['19:00-05:00'],
  ], 'https://callme.bar/'),
  'osm-node-4159686991': schedule([
    ['10:00-22:00'], ['10:00-22:00'], ['10:00-00:00'], ['10:00-00:00'], ['10:00-01:00'], ['10:00-01:00'], ['10:00-00:00'],
  ], 'https://www.ezitis.lv/purcika-ezitis-migla/'),
  'osm-node-10709927452': schedule([
    ['12:00-00:00'], ['12:00-00:00'], ['12:00-01:00'], ['12:00-01:00'], ['12:00-05:00'], ['12:00-05:00'], ['12:00-00:00'],
  ], 'https://www.ezitis.lv/tallinas-kvartala-ezitis-migla/'),
  'osm-node-12733275708': schedule([
    ['11:00-00:00'], ['11:00-00:00'], ['11:00-00:00'], ['11:00-00:00'], ['11:00-02:00'], ['11:00-02:00'], ['11:00-00:00'],
  ], 'https://www.ezitis.lv/kengaraga-ezitis-migla/'),
  'osm-node-10704645478': schedule([
    ['11:00-02:00'], ['11:00-02:00'], ['11:00-02:00'], ['11:00-02:00'], ['11:00-05:00'], ['11:00-05:00'], ['11:00-02:00'],
  ], 'https://www.ezitis.lv/terbatas-ielas-ezitis-migla/'),
  'osm-node-790320835': schedule([
    ['11:00-00:00'], ['11:00-00:00'], ['11:00-00:00'], ['11:00-00:00'], ['10:00-02:00'], ['10:00-02:00'], ['11:00-00:00'],
  ], 'https://www.ezitis.lv/imantas-ezitis-migla/'),
  'osm-node-12800153579': schedule([
    [], ['18:00-00:00'], [], ['16:00-23:00'], ['16:00-00:00'], ['16:00-00:00'], [],
  ], 'https://www.masastudija.com/lv/about'),
  'osm-node-4382264754': schedule([
    ['00:00-24:00'], ['00:00-24:00'], ['00:00-24:00'], ['00:00-24:00'], ['00:00-24:00'], ['00:00-24:00'], ['00:00-24:00'],
  ], 'https://olympic-casino.lv/lv/casino/olympic-casino-jugla'),
  'osm-node-6685178387': schedule([
    ['00:00-24:00'], ['00:00-24:00'], ['00:00-24:00'], ['00:00-24:00'], ['00:00-24:00'], ['00:00-24:00'], ['00:00-24:00'],
  ], 'https://olympic-casino.lv/lv/sports-bar/olybet-sports-bar-teika'),
  'osm-node-2285515946': schedule([
    ['11:00-23:00'], ['11:00-23:00'], ['11:00-23:00'], ['11:00-23:00'], ['11:00-01:00'], ['11:00-01:00'], ['11:00-23:00'],
  ], 'https://www.ezitis.lv/plavnieku-ezitis-migla/'),
  'osm-node-10946190440': schedule([
    [], [], ['17:00-00:00'], ['17:00-00:00'], ['17:00-04:00'], ['17:00-04:00'], [],
  ], 'https://www.skapisriga.com/'),
};

[...expandedVenueData.venues, ...popularVenueData.venues, ...verifiedVenueData150.venues].forEach((venue) => {
  if (!venue.hours) return;
  venueOpeningHours[venue.id] = {
    mon: venue.hours.mon,
    tue: venue.hours.tue,
    wed: venue.hours.wed,
    thu: venue.hours.thu,
    fri: venue.hours.fri,
    sat: venue.hours.sat,
    sun: venue.hours.sun,
    sourceUrl: venue.hours.sourceUrl,
    checkedAt,
    note: 'note' in venue.hours && typeof venue.hours.note === 'string' ? venue.hours.note : undefined,
  };
});

const parseMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const intervalContains = (interval: string, minutes: number, fromPreviousDay: boolean) => {
  const [startText, endText] = interval.split('-');
  const start = parseMinutes(startText);
  const end = parseMinutes(endText);
  if (end > start) return !fromPreviousDay && minutes >= start && minutes < end;
  return fromPreviousDay ? minutes < end : minutes >= start;
};

export const getRigaClock = (date = new Date()): RigaClock => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Riga',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return {
    dayIndex: weekdayIndexes[part('weekday')] ?? 0,
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
};

export const formatClockTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60) % 24;
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

export const isVenueOpenAt = (venueId: string, clock: RigaClock): boolean | null => {
  const schedule = venueOpeningHours[venueId];
  if (!schedule) return null;
  const today = schedule[dayKeys[clock.dayIndex]];
  const previous = schedule[dayKeys[(clock.dayIndex + 6) % 7]];
  if (today?.some((interval) => intervalContains(interval, clock.minutes, false))) return true;
  if (previous?.some((interval) => intervalContains(interval, clock.minutes, true))) return true;
  return today === null || previous === null ? null : false;
};
