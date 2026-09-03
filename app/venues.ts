import rigaVenueData from './data/riga-venue-points.json';
import researchedBeerPricesA from './data/beer-prices-a.json';
import researchedBeerPricesB from './data/beer-prices-b.json';
import researchedNewBeerPricesA from './data/beer-prices-new-a.json';
import researchedNewBeerPricesB from './data/beer-prices-new-b.json';
import researchedNewBeerPricesC from './data/beer-prices-new-c.json';
import researchedNewBeerPricesD from './data/beer-prices-new-d.json';
import researchedNewBeerPricesE from './data/beer-prices-new-e.json';
import researchedNewBeerPricesF from './data/beer-prices-new-f.json';
import researchedNewBeerPricesG from './data/beer-prices-new-g.json';
import researchedNewBeerPricesH from './data/beer-prices-new-h.json';
import researchedNewBeerPricesI from './data/beer-prices-new-i.json';
import researchedNewBeerPricesJ from './data/beer-prices-new-j.json';
import expandedVenueData from './data/verified-venues-expansion.json';
import { popularVenueData } from './popular-venues';

export type BeerPrice = {
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

export const checkedAt = '03.09.2026';

const baseVenues: Venue[] = [
  {
    id: 'alus-muiza', name: 'Alus Muiža', kind: 'alus bārs', address: 'Ģertrūdes iela 45',
    lat: 56.9536063, lng: 24.1298322, beer: 'Brenguļu Tumšais', volumeMl: 500, price: 4.3,
    sourceUrl: 'https://untappd.com/v/alus-muiza/2055441', sourceLabel: 'Untappd — Alus Muiža', sourceType: 'Verificēta aktuālā alus karte',
  },
  {
    id: 'hat', name: 'HAT Brewery Taproom', kind: 'darītavas taproom', address: 'Dzirnavu iela 66',
    lat: 56.9532714, lng: 24.1212992, beer: 'Juicy Haze', volumeMl: 500, price: 5,
    sourceUrl: 'https://untappd.com/v/hat-brewery-taproom/13514640', sourceLabel: 'Untappd — HAT Taproom', sourceType: 'Verificēta aktuālā alus karte',
  },
  {
    id: 'nurme', name: 'Nurme Brewery & Taproom', kind: 'darītavas taproom', address: 'Vagonu iela 21',
    lat: 56.950107, lng: 24.1507912, beer: 'Übertragung', volumeMl: 500, price: 5.2,
    sourceUrl: 'https://untappd.com/v/nurme-brewery-and-taproom/10568297', sourceLabel: 'Untappd — Nurme', sourceType: 'Verificēta aktuālā alus karte',
  },
  {
    id: 'labietis-market', name: 'Labietis Centrāltirgū', kind: 'darītavas bārs', address: 'Centrāltirgus iela 3 k-2',
    lat: 56.9437605, lng: 24.1140834, beer: 'Mežs', volumeMl: 500, price: 5.5,
    sourceUrl: 'https://untappd.com/v/labietis-central-market/4285173', sourceLabel: 'Untappd — Labietis Central Market', sourceType: 'Verificēta aktuālā alus karte',
  },
  {
    id: 'kakis-maisa', name: 'Kaķis Maisā', kind: 'craft alus bārs', address: 'Torņa iela 4',
    lat: 56.9515354, lng: 24.1072492, beer: 'TEIKAS Gaisma', volumeMl: 500, price: 5.3,
    sourceUrl: 'https://untappd.com/v/kakis-maisa-local-craft-beer/11288693', sourceLabel: 'Untappd — Kaķis Maisā', sourceType: 'Verificēta aktuālā alus karte',
  },
  {
    id: 'gust', name: 'Gust', kind: 'alus un kokteiļu bārs', address: 'Matīsa iela 8',
    lat: 56.9584603, lng: 24.1293462, beer: 'Užavas Gaišais', volumeMl: 500, price: 4.5,
    sourceUrl: 'https://untappd.com/v/gust/14012302', sourceLabel: 'Untappd — Gust', sourceType: 'Verificēta aktuālā alus karte',
  },
  {
    id: 'armoury', name: 'The Armoury Bar', kind: 'pubs', address: 'Vecpilsētas iela 11',
    lat: 56.9462201, lng: 24.1112763, beer: 'Sazobe', volumeMl: 500, price: 6.5,
    sourceUrl: 'https://untappd.com/v/the-armoury-bar/4540376', sourceLabel: 'Untappd — The Armoury Bar', sourceType: 'Verificēta aktuālā alus karte',
  },
  {
    id: 'beera', name: 'BEERA Bar & Shop', kind: 'craft alus bārs', address: 'Ģertrūdes iela 39',
    lat: 56.9540754, lng: 24.1288955, beer: 'TDH Single Hop Series Krush', volumeMl: 400, price: 6.2,
    sourceUrl: 'https://untappd.com/v/beera-bar-riga/9938945', sourceLabel: 'Untappd — BEERA Bar Riga', sourceType: 'Verificēta aktuālā alus karte',
  },
  {
    id: 'banshee', name: 'The Banshee', kind: 'craft alus bārs', address: 'Skārņu iela 11',
    lat: 56.9479949, lng: 24.1091146, beer: 'The Emotional Support PILS', volumeMl: 500, price: 4.8,
    sourceUrl: 'https://untappd.com/v/the-banshee/11248889', sourceLabel: 'Untappd — The Banshee', sourceType: 'Verificēta aktuālā alus karte',
  },
  {
    id: 'kwak-gleznotaju', name: 'KwakInn — Gleznotāju', kind: 'beļģu alus bārs', address: 'Gleznotāju iela 2',
    lat: 56.9484376, lng: 24.1104711, beer: 'Stella Artois', volumeMl: 500, price: 4.7,
    sourceUrl: 'https://kwakinnriga.mozello.lv/dzerienkarte/izlejamais-alus/', sourceLabel: 'KwakInn izlejamā alus karte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'kwak-jauniela', name: 'KwakInn — Jauniela', kind: 'beļģu alus bārs', address: 'Jauniela 13',
    lat: 56.9491426, lng: 24.1059235, beer: 'Stella Artois', volumeMl: 500, price: 4.7,
    sourceUrl: 'https://kwakinnriga.mozello.lv/dzerienkarte/izlejamais-alus/', sourceLabel: 'KwakInn izlejamā alus karte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'bibelot', name: 'Bibelot', kind: 'shot bārs', address: 'Alberta iela 9',
    lat: 56.9590141, lng: 24.109163, beer: 'Mežpils gaišais', volumeMl: 300, price: 3,
    sourceUrl: 'https://bibelot.bar/', sourceLabel: 'Bibelot oficiālā ēdienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'paddy', name: "Paddy Whelan’s", kind: 'īru pubs', address: 'Grēcinieku iela 4',
    lat: 56.946951, lng: 24.1102062, beer: 'Corona', volumeMl: 330, price: 5,
    sourceUrl: 'https://www.pub.lv/web/wp-content/uploads/2024/02/beer_on_tap_packaged_menu.pdf', sourceLabel: 'Paddy Whelan’s alus karte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'two-more', name: 'Two More Beers', kind: 'alus restorāns', address: 'Kalēju iela 9/11',
    lat: 56.948316, lng: 24.1101536, beer: 'TwoMoreBeers Lager / IPA / Rye Porter', volumeMl: 400, price: 6.2, priceIsFrom: true,
    sourceUrl: 'https://twomorebeers.lv/', sourceLabel: 'Two More Beers oficiālā lapa', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'bon-vivant', name: 'Bon-Vivant', kind: 'beļģu alus kafejnīca', address: 'Mārstaļu iela 8',
    lat: 56.9466142, lng: 24.1103808, beer: 'Leffe Blonde', volumeMl: 500, price: 7,
    sourceUrl: 'https://www.bonvivant.lv/index_en', sourceLabel: 'Bon-Vivant oficiālā ēdienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'duvels', name: 'Duvel’s', kind: 'gastropubs', address: 'Meistaru iela 10',
    lat: 56.9500748, lng: 24.1086197, beer: 'Cēsu Premium', volumeMl: 500, price: 6.5,
    sourceUrl: 'https://www.gastropubduvels.lv/en/', sourceLabel: 'Duvel’s oficiālā ēdienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'bbars', name: 'B Bārs', kind: 'restorāns un bārs', address: 'Doma laukums 2',
    lat: 56.9493279, lng: 24.1034813, beer: 'Bauskas alus', volumeMl: 500, price: 6,
    sourceUrl: 'https://bbars.lv/en/alcoholic-drinks/', sourceLabel: 'B Bārs oficiālā dzērienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'bellevue', name: 'Bellevue Lobby Bar', kind: 'viesnīcas bārs', address: 'Slokas iela 1',
    lat: 56.9416897, lng: 24.0814846, beer: 'Lielvārdes', volumeMl: 500, price: 5.5,
    sourceUrl: 'https://bellevue.lv/assets/media/menu/2026-beverage-list.pdf', sourceLabel: 'Bellevue 2026 dzērienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'islande', name: 'Islande Lobby Bar', kind: 'viesnīcas bārs', address: 'Ķīpsalas iela 2',
    lat: 56.9512011, lng: 24.0839526, beer: 'Valmiermuižas gaišais', volumeMl: 500, price: 6,
    sourceUrl: 'https://islandehotel.lv/wp-content/uploads/2026/04/RIH-a-la-carte-menu-2026.pdf', sourceLabel: 'Islande Hotel 2026 ēdienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'joker', name: 'Joker Klubs', kind: 'sporta kluba bārs', address: 'Katrīnas iela 12',
    lat: 56.9664526, lng: 24.1004772, beer: 'Bauskas izlejamais', volumeMl: 500, price: 5,
    sourceUrl: 'https://jokerklubs.lv/wp-content/uploads/2025/01/drinks_menu_eng_01_2025.pdf', sourceLabel: 'Joker Klubs dzērienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'kimmel', name: 'Kimmel Kvartāls', kind: 'alus dārzs', address: 'Bruņinieku iela 2',
    lat: 56.960562, lng: 24.1219659, beer: 'Bauskas alus', volumeMl: 400, price: 5,
    sourceUrl: 'https://www.kimmelkvartals.lv/wp-content/uploads/2025/06/KIMMEL_dzerienkarte_labota_print_02.pdf', sourceLabel: 'Kimmel Kvartāla dzērienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'chambao', name: 'Chambao', kind: 'restorāns un bārs', address: 'Antonijas iela 12',
    lat: 56.9585875, lng: 24.1122242, beer: 'Mežpils Light', volumeMl: 500, price: 5,
    sourceUrl: 'https://chambaoriga.lv/menu/', sourceLabel: 'Chambao oficiālā ēdienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'fazenda', name: 'Fazenda Āgenskalns', kind: 'restorāns un bārs', address: 'Nometņu iela 7',
    lat: 56.9433786, lng: 24.0780781, beer: 'Madonas izlejamais', volumeMl: 500, price: 5,
    sourceUrl: 'https://www.fazenda.lv/dzerienu-karte-fazenda-agenskalns', sourceLabel: 'Fazenda oficiālā dzērienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'cuba', name: 'Cuba Cafe', kind: 'kokteiļu bārs', address: 'Jauniela 15',
    lat: 56.9489941, lng: 24.1058993, beer: 'Heineken izlejamais', volumeMl: 500, price: 5,
    sourceUrl: 'https://www.cubacaferiga.com/menu', sourceLabel: 'Cuba Cafe oficiālā ēdienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'motormuzejs', name: 'Motormuzeja restorāns', kind: 'restorāns un bārs', address: 'Sergeja Eizenšteina iela 8',
    lat: 56.9706056, lng: 24.2277708, beer: 'Lāčplēsis Ekstra', volumeMl: 500, price: 5,
    sourceUrl: 'https://www.gardumgardi.lv/motormuzeja-restorana-edienkarte?menu=alkoholiskie-dz%C4%93rieni', sourceLabel: 'Gardum Gardi oficiālā ēdienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'skyline', name: 'Skyline Bar', kind: 'jumta bārs', address: 'Elizabetes iela 55',
    lat: 56.9550443, lng: 24.1178576, beer: 'Cēsu Premium', volumeMl: 300, price: 7.5,
    sourceUrl: 'https://skylinebar.lv/wp-content/uploads/2026/05/SkyLine_Drinks_menu_225x200_2026-05-05.pdf', sourceLabel: 'Skyline Bar 2026 dzērienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'ezitis-aldaru', name: 'Aldaru Ezītis miglā', kind: 'bārs', address: 'Aldaru iela 12/14',
    lat: 56.9511315, lng: 24.1064897, beer: 'Lāčplēsis Ekstra', volumeMl: 400, price: 2.5,
    sourceUrl: 'https://www.ezitis.lv/wp-content/uploads/2026/03/Aldari-majaslapa-01-scaled.jpg', sourceLabel: 'Aldaru Ezīša 2026 dzērienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'ezitis-grecinieku', name: 'Grēcinieku Ezītis miglā', kind: 'bārs', address: 'Grēcinieku iela 11A',
    lat: 56.9472022, lng: 24.1094507, beer: 'Lāčplēsis Ekstra', volumeMl: 400, price: 2.5,
    sourceUrl: 'https://www.ezitis.lv/wp-content/uploads/2026/03/Grecinieki.jpg', sourceLabel: 'Grēcinieku Ezīša 2026 dzērienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'ezitis-baznicas', name: 'Baznīcas Ezītis miglā', kind: 'bārs', address: 'Baznīcas iela 14',
    lat: 56.9568795, lng: 24.1199976, beer: 'Lāčplēsis Ekstra', volumeMl: 400, price: 2.5,
    sourceUrl: 'https://www.ezitis.lv/wp-content/uploads/2026/03/Baznica.jpg', sourceLabel: 'Baznīcas Ezīša 2026 dzērienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
  {
    id: 'ezitis-palasta', name: 'Palasta Ezītis miglā', kind: 'bārs', address: 'Palasta iela 9',
    lat: 56.9478248, lng: 24.1044797, beer: 'Lāčplēsis Ekstra', volumeMl: 400, price: 2.5,
    sourceUrl: 'https://www.ezitis.lv/wp-content/uploads/2026/03/Palasta-majaslapa-01-scaled.jpg', sourceLabel: 'Palasta Ezīša 2026 dzērienkarte', sourceType: 'Oficiālā ēdienkarte',
  },
];

const dedupeBeerPrices = (prices: BeerPrice[]) => [...new Map(
  prices.map((beer) => [`${beer.name}\u0000${beer.volumeMl}\u0000${beer.price}`, beer]),
).values()];

const distanceMetres = (first: { lat: number; lng: number }, second: { lat: number; lng: number }) => {
  const latitudeScale = 111_320;
  const longitudeScale = Math.cos(((first.lat + second.lat) / 2) * Math.PI / 180) * latitudeScale;
  return Math.hypot((first.lat - second.lat) * latitudeScale, (first.lng - second.lng) * longitudeScale);
};

const normalizeName = (value: string | null) => value?.toLocaleLowerCase('lv').replace(/[^\p{L}\p{N}]+/gu, '') ?? '';

const unverifiedPriceVenueIds = new Set(['armoury', 'cuba', 'joker', 'kimmel', 'paddy']);

const researchedBeerPrices = new Map([
  ...researchedBeerPricesA.venues,
  ...researchedBeerPricesB.venues,
].filter((venue) => !unverifiedPriceVenueIds.has(venue.id)).map((venue) => [
  venue.id,
  dedupeBeerPrices(venue.beerPrices as BeerPrice[]),
] as const));

const supplementalBeerMenus = researchedNewBeerPricesJ.venues.map((venue) => ({
  ...venue,
  beerPrices: dedupeBeerPrices(venue.beerPrices as BeerPrice[]),
}));

export const venues: Venue[] = baseVenues.filter((venue) => !unverifiedPriceVenueIds.has(venue.id)).map((venue) => {
  const knownName = normalizeName(venue.name);
  const supplementalMenu = supplementalBeerMenus.find((menu) => {
    const menuName = normalizeName(menu.name);
    return distanceMetres(venue, menu) < 45 && (knownName.includes(menuName) || menuName.includes(knownName));
  });
  const beerPrices = dedupeBeerPrices([
    ...(researchedBeerPrices.get(venue.id) ?? []),
    ...(supplementalMenu?.beerPrices ?? []),
  ]);
  if (!beerPrices?.length) return venue;
  const cheapest = beerPrices.reduce((best, beer) => beer.price < best.price ? beer : best);
  return {
    ...venue,
    beer: cheapest.name,
    volumeMl: cheapest.volumeMl,
    price: cheapest.price,
    priceIsFrom: cheapest.priceIsFrom,
    packageCount: cheapest.packageCount,
    beerPrices,
  };
});

export const pricePerLitre = (venue: Venue) => venue.volumeMl
  ? venue.price / (venue.volumeMl * (venue.packageCount ?? 1) / 1000)
  : Number.POSITIVE_INFINITY;

export const venueBeerPrices = (venue: Venue): BeerPrice[] => venue.beerPrices ?? [{
  name: venue.beer,
  volumeMl: venue.volumeMl,
  price: venue.price,
  priceIsFrom: venue.priceIsFrom,
  packageCount: venue.packageCount,
}];

export const isPricedVenue = (venue: MapVenue): venue is Venue => 'price' in venue;

const categoryLabels: Record<string, string> = {
  restaurant: 'restorāns',
  bar: 'bārs',
  pub: 'pubs',
  biergarten: 'alus dārzs',
  cafe: 'kafejnīca',
  nightclub: 'naktsklubs',
  fast_food: 'ātrā ēdināšana',
  food_court: 'ēdināšanas zona',
};

const nonBarBaseVenueIds = new Set(['two-more', 'bon-vivant', 'chambao', 'fazenda', 'motormuzejs']);
const drinkingVenueCategories = new Set(['bar', 'pub', 'biergarten', 'nightclub']);
const nonBarVenuePointIds = new Set([
  'osm-node-11018108905', // La Casetta is a restaurant despite its OSM bar tag.
  'osm-node-4382264754', // OlyBet menu is explicitly valid only at Voodoo, not Jugla.
  'osm-node-6685178387', // OlyBet menu is explicitly valid only at Voodoo, not Teika.
]);
const isEzitisVenue = (venue: MapVenue) => normalizeName(venue.name).includes('ezītis');

const newBeerMenus = new Map(researchedNewBeerPricesA.venues
  .filter((venue) => venue.beerPrices.length > 0)
  .map((venue) => [normalizeName(venue.name), {
    sourceUrl: venue.sourceUrl,
    beerPrices: dedupeBeerPrices(venue.beerPrices as BeerPrice[]),
  }] as const));

const newBeerMenusByOsmId = new Map([
  ...researchedNewBeerPricesB.venues.filter((venue) => venue.status === 'verified_current'),
  ...researchedNewBeerPricesC.venues.filter((venue) => venue.beerPrices.length > 0),
  ...researchedNewBeerPricesD.venues.filter((venue) => venue.status === 'verified_current_prices'),
  ...researchedNewBeerPricesE.venues.filter((venue) => venue.status === 'verified_current'),
  ...researchedNewBeerPricesF.venues.filter((venue) => venue.beerPrices.length > 0),
  ...researchedNewBeerPricesG.venues.filter((venue) => venue.status === 'verified_current_prices'),
  ...researchedNewBeerPricesH.venues.filter((venue) => venue.beerPrices.length > 0),
  ...researchedNewBeerPricesI.venues.filter((venue) => venue.status === 'verified_current'),
  ...researchedNewBeerPricesJ.venues.filter((venue) => venue.status === 'verified_current'),
].map((venue) => [String(venue.osmId), {
  sourceUrl: venue.sourceUrl,
  beerPrices: dedupeBeerPrices(venue.beerPrices as BeerPrice[]),
}] as const));

const venuePoints: MapVenue[] = rigaVenueData.venues
  .filter((point) => !venues.some((venue) => {
    const distance = distanceMetres(venue, point);
    const knownName = normalizeName(venue.name);
    const pointName = normalizeName(point.name);
    return distance < 12 || (distance < 45 && Boolean(pointName) && (knownName.includes(pointName) || pointName.includes(knownName)));
  }))
  .map((point) => {
    const kind = categoryLabels[point.category] ?? point.category;
    const basePoint: VenuePoint = {
      id: point.id,
      name: point.name ?? `${kind[0].toLocaleUpperCase('lv')}${kind.slice(1)} bez nosaukuma`,
      kind,
      address: point.address ?? 'Adrese nav norādīta',
      lat: point.lat,
      lng: point.lng,
      sourceUrl: point.osmUrl,
      sourceLabel: 'OpenStreetMap vietas ieraksts',
      category: point.category,
    };
    const osmId = point.id.slice(point.id.lastIndexOf('-') + 1);
    const menu = newBeerMenusByOsmId.get(osmId) ?? (point.name ? newBeerMenus.get(normalizeName(point.name)) : null);
    if (!menu?.sourceUrl) return basePoint;
    const cheapest = menu.beerPrices.reduce((best, beer) => beer.price < best.price ? beer : best);
    return {
      ...basePoint,
      beer: cheapest.name,
      volumeMl: cheapest.volumeMl,
      price: cheapest.price,
      priceIsFrom: cheapest.priceIsFrom,
      packageCount: cheapest.packageCount,
      beerPrices: menu.beerPrices,
      sourceUrl: menu.sourceUrl,
      sourceLabel: 'Oficiālā vietas dzērienkarte',
      sourceType: 'Oficiālā ēdienkarte',
    } satisfies Venue;
  });

const existingMapVenues: Venue[] = [
  ...venues.filter((venue) => !nonBarBaseVenueIds.has(venue.id)),
  ...venuePoints
    .filter((venue) => 'category' in venue
      && !nonBarVenuePointIds.has(venue.id)
      && (drinkingVenueCategories.has(venue.category) || isEzitisVenue(venue)))
    .filter(isPricedVenue),
];

const expandedVenues: Venue[] = [
  ...expandedVenueData.venues,
  ...popularVenueData.venues,
].map((venue) => {
  const beerPrices = dedupeBeerPrices(venue.beerPrices as BeerPrice[])
    .sort((first, second) => first.price - second.price);
  const cheapest = beerPrices[0];
  return {
    id: venue.id,
    name: venue.name,
    kind: venue.kind,
    address: venue.address,
    lat: venue.lat,
    lng: venue.lng,
    beer: cheapest.name,
    volumeMl: cheapest.volumeMl,
    price: cheapest.price,
    priceIsFrom: cheapest.priceIsFrom,
    packageCount: cheapest.packageCount,
    beerPrices,
    sourceUrl: venue.sourceUrl,
    sourceLabel: venue.sourceLabel,
    sourceType: venue.sourceType as Venue['sourceType'],
  };
});

export const mapVenues: Venue[] = [
  ...existingMapVenues,
  ...expandedVenues.filter((candidate) => !existingMapVenues.some((known) => {
    const candidateName = normalizeName(candidate.name);
    const knownName = normalizeName(known.name);
    return candidate.id === known.id
      || candidateName === knownName;
  })),
];
export const osmSnapshotAt = rigaVenueData.osmTimestamp;
