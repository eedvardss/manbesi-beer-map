export type BeerPrice = {
  id?: string;
  revision?: number;
  priceUpdate?: { observedOn: string; publishedAt: string; sourceUrl: string };
  name: string;
  volumeMl: number | null;
  price: number;
  priceIsFrom?: boolean;
  packageCount?: number;
};

export type Venue = {
  id: string;
  name: string;
  kind: string;
  address: string;
  lat: number;
  lng: number;
  beer: string;
  volumeMl: number | null;
  price: number;
  priceIsFrom?: boolean;
  packageCount?: number;
  beerPrices?: BeerPrice[];
  sourceUrl: string;
  sourceLabel: string;
  sourceType: 'Oficiālā ēdienkarte' | 'Verificēta aktuālā alus karte';
};

export type VenuePoint = {
  id: string;
  name: string;
  kind: string;
  address: string;
  lat: number;
  lng: number;
  sourceUrl: string;
  sourceLabel: string;
  category: string;
};

export type MapVenue = Venue | VenuePoint;

export const pricePerLitre = (venue: Venue) =>
  venue.volumeMl
    ? venue.price / ((venue.volumeMl * (venue.packageCount ?? 1)) / 1000)
    : null;

export const venueBeerPrices = (venue: Venue): BeerPrice[] =>
  venue.beerPrices ?? [
    {
      name: venue.beer,
      volumeMl: venue.volumeMl,
      price: venue.price,
      priceIsFrom: venue.priceIsFrom,
      packageCount: venue.packageCount,
    },
  ];

export const isPricedVenue = (venue: MapVenue): venue is Venue =>
  'price' in venue;
