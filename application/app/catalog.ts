import { checkedAt, mapVenues, venueBeerPrices } from './venues';
import { venueOpeningHours } from './opening-hours';
import { servingId } from '../lib/serving-id';

const [day, month, year] = checkedAt.split('.');
const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

// This is the research date, never the build or download date.
export const catalog = {
  schemaVersion: 1,
  city: 'Rīga',
  currency: 'EUR',
  checkedAt: `${year}-${month}-${day}`,
  venues: mapVenues.map((venue) => {
    const hours = venueOpeningHours[venue.id];
    return {
      id: venue.id,
      name: venue.name,
      kind: venue.kind,
      address: venue.address,
      lat: venue.lat,
      lng: venue.lng,
      sourceUrl: venue.sourceUrl,
      sourceLabel: venue.sourceLabel,
      sourceType: venue.sourceType,
      beers: venueBeerPrices(venue).map((beer) => ({
        ...beer,
        id: servingId(venue.id, beer),
        revision: 0,
      })),
      openingHours: hours
        ? {
            week: days.map((key) => hours[key]),
            sourceUrl: hours.sourceUrl,
            checkedAt: hours.checkedAt,
            note: hours.note,
          }
        : null,
    };
  }),
};

export const catalogJson = JSON.stringify(catalog);
