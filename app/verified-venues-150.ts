type Beer = { name: string; volumeMl: number | null; price: number };
type DayHours = string[] | null;
type Hours = {
  mon: DayHours; tue: DayHours; wed: DayHours; thu: DayHours;
  fri: DayHours; sat: DayHours; sun: DayHours; sourceUrl: string;
};
type ResearchedVenue = {
  id: string; name: string; kind: string; address: string; lat: number; lng: number;
  sourceUrl: string; sourceLabel: string;
  sourceType: 'Oficiālā ēdienkarte' | 'Verificēta aktuālā alus karte';
  beerPrices: Beer[]; hours: Hours; evidenceNotes: string;
};

const official = 'Oficiālā ēdienkarte' as const;
const photo = 'Verificēta aktuālā alus karte' as const;
const daily = (interval: string, sourceUrl: string): Hours => ({
  mon: [interval], tue: [interval], wed: [interval], thu: [interval],
  fri: [interval], sat: [interval], sun: [interval], sourceUrl,
});

const venues: ResearchedVenue[] = [
  {
    id: 'harpers-lobby-bar', name: 'Harpers Lobby Bar', kind: 'viesnīcas lobby bārs',
    address: 'Jēkaba iela 24, Rīga, LV-1050', lat: 56.952154, lng: 24.105369,
    sourceUrl: 'https://www.ahstatic.com/pdf/9619_rsr001_01_t_x_gb.pdf',
    sourceLabel: 'Pullman Riga Old Town — official current beverage menu', sourceType: official,
    beerPrices: [
      { name: 'Pullman Lager (draft)', volumeMl: 400, price: 7 },
      { name: 'Lielvārdes Lager (draft)', volumeMl: 400, price: 8 },
      { name: 'Bernard Czech Dark Lager (draft)', volumeMl: 400, price: 8 },
      { name: 'Valmiermuižas Light', volumeMl: null, price: 7 },
      { name: 'Valmiermuižas Dark', volumeMl: null, price: 7 },
      { name: 'Sierra Nevada Pale Ale', volumeMl: null, price: 7 },
      { name: 'Limburgse Witte', volumeMl: null, price: 7 },
      { name: 'Corona Extra', volumeMl: null, price: 7 },
      { name: 'Bavaria IPA 0.0', volumeMl: null, price: 7 },
      { name: 'Estrella Galicia 0.0', volumeMl: null, price: 7 },
    ],
    hours: { mon: ['10:00-00:00'], tue: ['10:00-00:00'], wed: ['10:00-00:00'], thu: ['10:00-02:00'], fri: ['10:00-02:00'], sat: ['10:00-02:00'], sun: ['10:00-00:00'], sourceUrl: 'https://all.accor.com/hotel/9619/index.en.shtml' },
    evidenceNotes: 'Official Accor venue page and its linked current beverage PDF; complete beer section transcribed.',
  },
  {
    id: 'stabu-makonis', name: 'Stabu Mākonis', kind: 'kokteiļu bārs / bārs',
    address: 'Stabu iela 42, Rīga, LV-1011', lat: 56.9549032, lng: 24.1309951,
    sourceUrl: 'https://www.makonis.eu/galvenais-menu-stabu', sourceLabel: 'Stabu Mākonis — official live menu', sourceType: official,
    beerPrices: [
      { name: 'Tērvetes alus', volumeMl: 300, price: 3 }, { name: 'Tērvetes alus', volumeMl: 500, price: 4 },
      { name: 'Craft alus (jautāt viesmīlim)', volumeMl: null, price: 5 },
    ],
    hours: { mon: [], tue: ['16:00-23:00'], wed: ['16:00-23:00'], thu: ['16:00-23:00'], fri: ['16:00-01:00'], sat: ['11:00-01:00'], sun: ['11:00-18:00'], sourceUrl: 'https://restaurantguru.com/Makonis-Cocktails-and-Design-Riga' },
    evidenceNotes: 'Official live Stabu Mākonis menu; all beer rows transcribed.',
  },
  {
    id: 'manana-riga', name: 'Mañana', kind: 'taco bārs', address: 'Stabu iela 10-1, Rīga, LV-1010',
    lat: 56.9586925, lng: 24.1232075,
    sourceUrl: 'https://ugc.production.linktr.ee/0ee406ea-5386-4db0-a35a-8273b160d003_ENG-MANANA-DRINK-2026-SPRING-WEEB.pdf',
    sourceLabel: 'Mañana — official Spring 2026 drinks menu PDF', sourceType: official,
    beerPrices: [
      { name: 'Bauskas Light (draft)', volumeMl: 400, price: 5.5 }, { name: 'Lielvārdes Lager (draft)', volumeMl: 400, price: 5.5 },
      { name: 'Lielvārdes Cherry (draft)', volumeMl: 400, price: 6 }, { name: 'Madonas Unfiltered (draft)', volumeMl: 400, price: 6 },
      { name: 'Anarkist IPA (draft)', volumeMl: 400, price: 6 }, { name: 'Estrella', volumeMl: 330, price: 5 },
      { name: 'Solveza', volumeMl: 330, price: 5 }, { name: 'SOL', volumeMl: 330, price: 5 },
      { name: 'Non Alcoholic Beer', volumeMl: 330, price: 4.5 }, { name: 'Valmiermuiža', volumeMl: 330, price: 5 },
      { name: 'Bottled Beer — ASK STAFF', volumeMl: null, price: 7 },
    ],
    hours: { mon: [], tue: ['16:00-23:00'], wed: ['16:00-23:00'], thu: ['16:00-23:00'], fri: ['12:00-02:00'], sat: ['12:00-02:00'], sun: ['12:00-23:00'], sourceUrl: 'https://www.waze.com/live-map/directions/lv/riga/manana?to=place.ChIJ9b2LHt7P7kYRJwQcOeHk8IY' },
    evidenceNotes: 'Official Spring 2026 drink PDF; complete beer section transcribed.',
  },
  {
    id: 'barn-fries-riga', name: 'BARN.fries', kind: 'frī bārs / casual bārs', address: 'Šķūņu iela 10, Rīga, LV-1050',
    lat: 56.949006, lng: 24.1073298, sourceUrl: 'https://barnfries.com/menu', sourceLabel: 'BARN.fries — official live menu', sourceType: official,
    beerPrices: [
      { name: 'Skaidrais mežs / Apinis (non-alcoholic)', volumeMl: null, price: 5 }, { name: 'Ješka', volumeMl: null, price: 5.5 },
      { name: 'Mežs', volumeMl: null, price: 5.5 }, { name: 'Trīs indiāņi', volumeMl: null, price: 5.5 },
    ],
    hours: { mon: ['11:00-21:00'], tue: ['11:00-21:00'], wed: ['11:00-21:00'], thu: ['11:00-21:00'], fri: ['11:00-23:00'], sat: ['11:00-23:00'], sun: ['11:00-21:00'], sourceUrl: 'https://barnfries.com/' },
    evidenceNotes: 'Official live menu and branch hours; complete beer list transcribed.',
  },
  {
    id: 'sloshed-bar-riga', name: 'Sloshed Bar Riga Karaoke Bar', kind: 'karaoke bārs / krogs', address: 'Audēju iela 8, Rīga, LV-1050',
    lat: 56.9470743, lng: 24.1117454, sourceUrl: 'https://menu02.restaurantguru.com/m2/menu-Sloshed-Bar-wpf.jpg', sourceLabel: 'Sloshed — complete current menu-board photo', sourceType: photo,
    beerPrices: [
      { name: 'Lāčplēsis 5.2%', volumeMl: 500, price: 5.95 }, { name: 'Madonas 5.6%', volumeMl: 500, price: 6.5 },
      { name: 'Heineken 5%', volumeMl: 500, price: 6.5 }, { name: 'Anarkist IPA 5.4%', volumeMl: 500, price: 6.5 },
      { name: 'Guinness 4.2%', volumeMl: 500, price: 6.95 }, { name: 'Pinefruit IPA 5.7%', volumeMl: 500, price: 6.95 },
      { name: 'Lielvārdes Tumšais 5%', volumeMl: 500, price: 6.5 }, { name: 'Heineken 0%', volumeMl: 500, price: 5 },
      { name: 'SOL', volumeMl: 500, price: 5.5 }, { name: 'Estrella Galicia 1906', volumeMl: 500, price: 5.5 },
      { name: 'Guinness 0%', volumeMl: 500, price: 5 }, { name: 'Estrella Galicia 0%', volumeMl: 500, price: 5 },
    ],
    hours: { mon: [], tue: ['16:00-00:00'], wed: ['16:00-00:00'], thu: ['16:00-04:00'], fri: ['16:00-04:00'], sat: ['16:00-04:00'], sun: ['16:00-00:00'], sourceUrl: 'https://restaurantguru.com/Sloshed-Bar-Riga' },
    evidenceNotes: 'Complete recently submitted menu-board photo; all beer rows transcribed.',
  },
  {
    id: 'tiki-bar-riga', name: 'Tiki Bar Riga', kind: 'tiki kokteiļu bārs', address: 'Audēju iela 8, Rīga, LV-1050',
    lat: 56.9470725, lng: 24.1116297, sourceUrl: 'https://menu02.restaurantguru.com/m1/Pub-and-bar-Tiki-Bar-Riga-menu-5i7.jpg', sourceLabel: 'Tiki Bar Riga — current full drinks-menu photo', sourceType: photo,
    beerPrices: [
      { name: 'Mežpils 5.5% (draft)', volumeMl: 500, price: 5.75 }, { name: 'Mežpils 5.5% (draft)', volumeMl: 300, price: 4.5 },
      { name: 'Kronenbourg 5.0% (draft)', volumeMl: 500, price: 7.5 }, { name: 'Kronenbourg 5.0% (draft)', volumeMl: 350, price: 5.8 },
      { name: 'Corona Extra 4.5%', volumeMl: null, price: 4.9 }, { name: 'Latgale Dark Lager 4.9%', volumeMl: null, price: 5.75 },
      { name: 'Latgale Wheat Ale 4.6%', volumeMl: null, price: 6 }, { name: 'Latgale Red Ale 5.6%', volumeMl: null, price: 6 },
      { name: 'Kronenbourg 1664 Blanc 0%', volumeMl: null, price: 4.8 },
    ],
    hours: { mon: ['13:00-02:00'], tue: ['13:00-02:00'], wed: ['13:00-02:00'], thu: ['13:00-02:00'], fri: ['13:00-03:00'], sat: ['13:00-03:00'], sun: ['13:00-02:00'], sourceUrl: 'https://restaurantguru.com/Escargot-Cafe-Riga' },
    evidenceNotes: 'Two complementary current menu photos; full beer selection transcribed.',
  },
  {
    id: 'easy-wine-riga', name: 'Easy Wine', kind: 'vīna bārs / bārs', address: 'Audēju iela 11, Rīga, LV-1050',
    lat: 56.9469989, lng: 24.1121514, sourceUrl: 'https://menu02.restaurantguru.com/m8/Easy-Wine-Pub-and-bar-menu-chu.jpg', sourceLabel: 'Easy Wine — current photographed drinks menu', sourceType: photo,
    beerPrices: [
      { name: 'Tērvetes (draft)', volumeMl: 300, price: 3.5 }, { name: 'Tērvetes (draft)', volumeMl: 500, price: 4.2 },
      { name: 'Valmiermuižas (draft)', volumeMl: 300, price: 4.5 }, { name: 'Valmiermuižas (draft)', volumeMl: 500, price: 5.9 },
      { name: 'Estrella (draft)', volumeMl: 500, price: 5.1 }, { name: 'Tērvetes tumšais', volumeMl: 500, price: 6 },
      { name: 'Valmiermuižas bezalkoholiskais', volumeMl: 500, price: 4.6 },
    ],
    hours: { mon: ['12:00-23:00'], tue: ['12:00-23:00'], wed: ['12:00-23:00'], thu: ['12:00-23:00'], fri: ['12:00-01:00'], sat: ['12:00-01:00'], sun: ['12:00-23:00'], sourceUrl: 'https://restaurantguru.com/Easy-Beer-Riga' },
    evidenceNotes: 'Current photographed complete beer subsection; every beer row transcribed.',
  },
];

const add = (venue: ResearchedVenue) => venues.push(venue);

add({
  id: 'ridzene-bar-library', name: 'Rīdzene Bar & Library', kind: 'viesnīcas bārs', address: 'Reimersa iela 1, Rīga, LV-1050', lat: 56.9536295, lng: 24.1121017,
  sourceUrl: 'https://radissonhotels.iceportal.com/asset/radisson-blu-ridzene-hotel-riga/miscellaneous/16256-114235-m18921831.pdf', sourceLabel: 'Radisson Blu Rīdzene official bar menu', sourceType: official,
  beerPrices: [{ name: 'Cēsu Premium (draft)', volumeMl: 300, price: 4 }, { name: 'Cēsu Premium (draft)', volumeMl: 568, price: 5 }, { name: 'Valmiermuiža Light', volumeMl: 500, price: 7 }, { name: 'Valmiermuiža Dark', volumeMl: 500, price: 7.5 }, { name: 'Warsteiner', volumeMl: 500, price: 6 }, { name: 'Warsteiner non-alcoholic', volumeMl: 330, price: 5 }],
  hours: { mon: [], tue: ['14:00-22:00'], wed: ['14:00-22:00'], thu: ['14:00-22:00'], fri: ['14:00-22:00'], sat: ['14:00-22:00'], sun: [], sourceUrl: 'https://www.radissonhotels.com/en-us/hotels/radisson-blu-riga-ridzene/dining/ridzene-bar' }, evidenceNotes: 'Official hotel bar menu and venue page.',
});
add({
  id: 'kempinski-lobby-lounge', name: 'Lobby Lounge — Grand Hotel Kempinski Riga', kind: 'viesnīcas vestibila bārs', address: 'Aspazijas bulvāris 22, Rīga, LV-1050', lat: 56.9490626, lng: 24.1130717,
  sourceUrl: 'https://d1cmxvrarpztze.cloudfront.net/Lobby-Lounge-Menu-Landscape-JULY-20261785495727.pdf', sourceLabel: 'Grand Hotel Kempinski Riga — July 2026 Lobby Lounge menu', sourceType: official,
  beerPrices: [{ name: 'Madonas Unfiltered', volumeMl: 500, price: 7 }, { name: 'Paulaner Munich Hell', volumeMl: 500, price: 8 }, { name: 'Paulaner Weissbier non-alcoholic', volumeMl: 500, price: 8 }, { name: 'Bauskas Klasika (draft)', volumeMl: 300, price: 6 }, { name: 'Bauskas Klasika (draft)', volumeMl: 500, price: 8 }],
  hours: daily('07:00-24:00', 'https://www.kempinski.com/en/grand-hotel-kempinski-riga/restaurants-bars/lobby-lounge'), evidenceNotes: 'Official July 2026 hotel lounge menu.',
});
add({
  id: 'monkey-club', name: 'Monkey Club', kind: 'naktsklubs un lounge', address: 'Tērbatas iela 2A, Rīga', lat: 56.9527447, lng: 24.1194673,
  sourceUrl: 'https://monkeyclub.lv/menu', sourceLabel: 'Monkey Club official live menu', sourceType: official,
  beerPrices: [{ name: 'Heineken 0%', volumeMl: null, price: 15 }, { name: 'Sol 5%', volumeMl: null, price: 16 }, { name: 'Heineken 5%', volumeMl: null, price: 18 }],
  hours: { mon: [], tue: [], wed: [], thu: [], fri: ['20:00-05:00'], sat: ['20:00-05:00'], sun: [], sourceUrl: 'https://monkeyclub.lv/lv' }, evidenceNotes: 'Official club menu and current official hours.',
});
add({
  id: 'snob-bar-grand-poet', name: 'SNOB Bar — Grand Poet Hotel', kind: 'viesnīcas kokteiļu bārs', address: 'Raiņa bulvāris 5/6, Rīga, LV-1050', lat: 56.9534661, lng: 24.1109572,
  sourceUrl: 'https://grandpoet.semarahhotels.com/wp-content/uploads/sites/2/2020/08/web_snob_dzerienu-menu_210x297_01.06.2026_tikai-dzerieni.pdf', sourceLabel: 'SNOB official drinks menu — 01.06.2026', sourceType: official,
  beerPrices: [{ name: 'Lielvārdes alus 5.2% (draft)', volumeMl: 330, price: 6.5 }, { name: 'Heineken 5.0%', volumeMl: 330, price: 7 }, { name: 'Heineken 0.0%', volumeMl: 330, price: 7 }, { name: 'Petrus Blond 6.5%', volumeMl: 330, price: 7 }, { name: 'Guinness Draught 4.2%', volumeMl: 440, price: 7.5 }, { name: 'Tanker Reloaded IPA 5.8%', volumeMl: 440, price: 7.5 }, { name: 'Paulaner Weissbier 5.5%', volumeMl: 500, price: 7.5 }],
  hours: daily('12:00-23:00', 'https://grandpoet.semarahhotels.com/en/restaurant/snob-bar-in-riga/'), evidenceNotes: 'Official current bar page and dated 2026 beverage PDF.',
});
add({
  id: 'radisson-latvija-lobby-bar', name: 'Lobby Bar — Radisson Blu Latvija', kind: 'viesnīcas vestibila bārs', address: 'Elizabetes iela 55, Rīga, LV-1010', lat: 56.954881, lng: 24.11755,
  sourceUrl: 'https://media.radissonhotels.net/asset/radisson-blu-latvija-conference-spa-hotel-riga/food-and-drink/16256-116580-m41524097.pdf', sourceLabel: 'Radisson Blu Latvija official Lobby Bar menu', sourceType: official,
  beerPrices: [{ name: 'Local Dark Beer (draft)', volumeMl: 300, price: 7 }, { name: 'Local Dark Beer (draft)', volumeMl: 568, price: 8 }, { name: 'Cēsu Premium Nefiltrētais (draft)', volumeMl: 300, price: 6.5 }, { name: 'Cēsu Premium Nefiltrētais (draft)', volumeMl: 568, price: 7.5 }, { name: 'Cēsu Premium Local Draught Lager', volumeMl: 300, price: 6.5 }, { name: 'Cēsu Premium Local Draught Lager', volumeMl: 568, price: 7.5 }, { name: 'Leffe Blonde', volumeMl: 330, price: 9 }, { name: 'Paulaner wheat beer', volumeMl: 500, price: 9 }, { name: 'Corona Extra', volumeMl: 330, price: 8.5 }, { name: 'Labietis Local Brewery', volumeMl: 440, price: 9 }, { name: 'Valmiermuiža Craft Brewery Lager', volumeMl: 500, price: 8.5 }, { name: 'Non-alcoholic beer', volumeMl: 330, price: 7.5 }],
  hours: daily('09:00-01:00', 'https://www.radissonhotels.com/en-us/hotels/radisson-blu-conference-riga-latvija-spa/dining/lobby-bar'), evidenceNotes: 'Official Lobby Bar menu and current hotel venue page.',
});
add({
  id: 'stage22', name: 'Stage22 Bar — Grand Hotel Kempinski Riga', kind: 'jumta viesnīcas bārs', address: 'Aspazijas bulvāris 22, Rīga, LV-1050', lat: 56.949345, lng: 24.112705,
  sourceUrl: 'https://d1cmxvrarpztze.cloudfront.net/DRINKS-MENU-Summer-20261782373957.pdf', sourceLabel: 'Stage22 official Summer 2026 drinks menu', sourceType: official,
  beerPrices: [{ name: 'Madonas Unfiltered 5.6% (draft)', volumeMl: 300, price: 6 }, { name: 'Madonas Unfiltered 5.6% (draft)', volumeMl: 500, price: 8 }, { name: 'Bauskas Klasika 5% (draft)', volumeMl: 300, price: 6 }, { name: 'Bauskas Klasika 5% (draft)', volumeMl: 500, price: 8 }, { name: 'Paulaner Weissbier 5.5%', volumeMl: 500, price: 8 }, { name: 'Madonas Lager 5.2%', volumeMl: 500, price: 8 }, { name: 'Paulaner Munich Hell 4.9%', volumeMl: 500, price: 8 }, { name: 'Asahi Super Dry 5%', volumeMl: 330, price: 8 }, { name: 'Kirin Ichiban 5%', volumeMl: 330, price: 8 }, { name: 'Kirin Ichiban 0%', volumeMl: 330, price: 8 }],
  hours: { mon: ['12:00-24:00'], tue: ['12:00-24:00'], wed: ['12:00-24:00'], thu: ['12:00-24:00'], fri: ['12:00-24:00'], sat: ['14:00-24:00'], sun: ['14:00-24:00'], sourceUrl: 'https://www.kempinski.com/en/grand-hotel-kempinski-riga/restaurants-bars/stage22' }, evidenceNotes: 'Official Summer 2026 bar menu.',
});
add({
  id: 'rija-vef-summer-terrace', name: 'Rija VEF Summer Terrace', kind: 'sezonāls viesnīcas jumta bārs', address: 'Brīvības gatve 199C, Rīga, LV-1039', lat: 56.9717755503, lng: 24.1600176816,
  sourceUrl: 'https://www.rijahotels.com/storage/files/drinks-menu-en.pdf', sourceLabel: 'Rija VEF Summer Terrace official drinks menu', sourceType: official,
  beerPrices: [{ name: 'Madonas nefiltrētais gaišais', volumeMl: 500, price: 5.5 }, { name: 'Lielvārdes gaišais', volumeMl: 500, price: 4.5 }, { name: 'Heineken non-alcoholic', volumeMl: 330, price: 3.5 }],
  hours: { mon: [], tue: [], wed: [], thu: ['15:00-22:00'], fri: ['15:00-22:00'], sat: ['15:00-22:00'], sun: [], sourceUrl: 'https://www.rijahotels.com/en/all-about-rija-hotels/restaurants/restaurant-vef' }, evidenceNotes: 'Official terrace drinks menu and seasonal venue page.',
});
add({
  id: 'tallink-riga-lobby-bar', name: 'Lobby Bar — Tallink Hotel Riga', kind: 'viesnīcas vestibila bārs', address: 'Elizabetes iela 24, Rīga, LV-1050', lat: 56.94871, lng: 24.12241,
  sourceUrl: 'https://image.tallink.com/image/upload/hotels/documents/menus/hotel-riga-lobby-menu.pdf', sourceLabel: 'Tallink Hotel Riga official Lobby Bar menu', sourceType: official,
  beerPrices: [{ name: 'Cēsu Premium (draft)', volumeMl: 300, price: 4.5 }, { name: 'Cēsu Premium (draft)', volumeMl: 500, price: 6 }, { name: 'Mežpils', volumeMl: 500, price: 6.5 }, { name: 'Mežpils Tumšais', volumeMl: 500, price: 6.5 }, { name: 'Leffe Blond', volumeMl: 330, price: 5.5 }, { name: 'Leffe Brune', volumeMl: 330, price: 5.5 }, { name: 'Leffe non-alcoholic', volumeMl: 330, price: 4.5 }],
  hours: daily('12:00-01:00', 'https://hotels.tallink.com/tallink-hotel-riga'), evidenceNotes: 'Official hotel Lobby Bar menu.',
});
add({
  id: 'islande-rooftop-terrace', name: 'Riga Islande Hotel Rooftop Terrace', kind: 'sezonāls jumta bārs', address: 'Ķīpsalas iela 2, Rīga, LV-1048', lat: 56.95121, lng: 24.08401,
  sourceUrl: 'https://islandehotel.lv/wp-content/uploads/2026/05/RIH-a-la-carte-menu-2026_summer.pdf', sourceLabel: 'Riga Islande Hotel Rooftop Terrace official Summer 2026 menu', sourceType: official,
  beerPrices: [{ name: 'Kokmuiža Celmlauzis non-alcoholic IPA', volumeMl: 330, price: 4.5 }, { name: 'Valmiermuižas tumšais 5.8%', volumeMl: 500, price: 6 }, { name: 'Valmiermuiža Amber Lager 5.2%', volumeMl: 500, price: 6 }, { name: 'Corona Extra 4.5%', volumeMl: 330, price: 5 }, { name: 'Valmiermuižas gaišais (draft)', volumeMl: 300, price: 5 }, { name: 'Valmiermuižas gaišais (draft)', volumeMl: 500, price: 6 }],
  hours: daily('12:00-23:00', 'https://islandehotel.lv/dinning/'), evidenceNotes: 'Official 2026 summer venue menu.',
});
add({
  id: 'gutenbergs-terrace', name: 'Gutenbergs Terrace', kind: 'viesnīcas jumta bārs', address: 'Doma laukums 1, Rīga, LV-1050', lat: 56.94928, lng: 24.10324,
  sourceUrl: 'https://restaurant-gutenbergs.lv/files/drink-card.pdf', sourceLabel: 'Gutenbergs Terrace official drinks menu', sourceType: official,
  beerPrices: [{ name: 'Bauskas (draft)', volumeMl: 300, price: 5 }, { name: 'Bauskas (draft)', volumeMl: 500, price: 7 }, { name: 'Leffe Blonde', volumeMl: 330, price: 7 }, { name: 'Leffe Brune', volumeMl: 330, price: 8 }, { name: 'Leffe non-alcoholic', volumeMl: 330, price: 6 }],
  hours: daily('13:00-23:00', 'https://restaurant-gutenbergs.lv/en/gutenbergs-terrace/'), evidenceNotes: 'Official terrace drinks menu and venue page.',
});

add({
  id: 'after-restaurant-bar', name: 'After… Restaurant-Bar', kind: 'bārs', address: '11. novembra krastmala 33, Rīga, LV-1050', lat: 56.9451274, lng: 24.1080591,
  sourceUrl: 'https://www.wellton.com/storage/files/after-drink-menu-297x315mm-web.pdf', sourceLabel: 'After… official drinks menu', sourceType: official,
  beerPrices: [{ name: 'Lielvārdes Lager (draft)', volumeMl: 400, price: 4.9 }, { name: 'Madonas Unfiltered (draft)', volumeMl: 500, price: 6.5 }, { name: 'Arhitekts APA', volumeMl: 500, price: 8 }, { name: 'Lutausis NEIPA', volumeMl: 500, price: 8 }, { name: 'Corona', volumeMl: 350, price: 5 }, { name: 'Heineken', volumeMl: 350, price: 4.5 }, { name: 'Lielvārdes Dark', volumeMl: 500, price: 5.5 }, { name: 'Lielvārdes 0', volumeMl: 500, price: 5 }],
  hours: { mon: ['14:00-23:00'], tue: ['14:00-23:00'], wed: ['14:00-23:00'], thu: ['14:00-23:00'], fri: ['12:00-24:00'], sat: ['12:00-24:00'], sun: ['12:00-23:00'], sourceUrl: 'https://www.wellton.com/en/restaurants-bars/after' }, evidenceNotes: 'Official hotel bar drinks menu.',
});
add({
  id: 'tapas-tapas', name: 'Tapas Tapas', kind: 'tapas bārs', address: 'Vaļņu iela 49, Rīga, LV-1050', lat: 56.9463616, lng: 24.1140061,
  sourceUrl: 'https://www.wellton.com/storage/files/tapas-tapas-drinks-2023-web.pdf', sourceLabel: 'Tapas Tapas official live drinks menu', sourceType: official,
  beerPrices: [{ name: 'Heineken (draft)', volumeMl: 350, price: 5 }, { name: 'Heineken (draft)', volumeMl: 500, price: 6 }, { name: 'Lielvārdes Light (draft)', volumeMl: 400, price: 6 }, { name: 'Madonas Unfiltered (draft)', volumeMl: 500, price: 6.5 }, { name: 'Corona', volumeMl: 350, price: 6 }, { name: 'Heineken 0', volumeMl: 330, price: 6.5 }, { name: 'Lielvārdes Dark', volumeMl: 400, price: 6 }],
  hours: { mon: ['15:00-21:00'], tue: ['14:00-22:00'], wed: ['14:00-22:00'], thu: ['14:00-22:00'], fri: ['14:00-23:00'], sat: ['14:00-23:00'], sun: ['15:00-21:00'], sourceUrl: 'https://www.wellton.com/en/restaurants-bars/tapas-tapas' }, evidenceNotes: 'Official live hotel bar menu; URL filename is older but current official page still serves it.',
});
add({
  id: 'halo-bar', name: 'Halo Bar', kind: 'kokteiļu bārs', address: 'Audēju iela 16, Galerija Centrs 4. stāvs, Rīga', lat: 56.9479214, lng: 24.1123598,
  sourceUrl: 'https://burzma.lv/wp-content/uploads/2026/03/Menu_halo.pdf', sourceLabel: 'Halo Bar official 2026 menu', sourceType: official,
  beerPrices: [{ name: 'Lielvārdes', volumeMl: 400, price: 6 }, { name: 'Birra Moretti', volumeMl: 400, price: 6 }, { name: 'Heineken', volumeMl: 400, price: 6 }, { name: 'Lielvārdes Ķiršu', volumeMl: 400, price: 6 }, { name: 'Birra Moretti', volumeMl: 330, price: 4 }, { name: 'Heineken', volumeMl: 330, price: 4 }],
  hours: { mon: ['10:00-21:00'], tue: ['10:00-21:00'], wed: ['10:00-21:00'], thu: ['10:00-21:00'], fri: ['10:00-23:00'], sat: ['10:00-23:00'], sun: ['10:00-21:00'], sourceUrl: 'https://burzma.lv/halo/' }, evidenceNotes: 'Official 2026 bar menu.',
});
add({
  id: 'sapni-un-kokteili', name: 'Sapņi un kokteiļi', kind: 'kokteiļu bārs', address: 'Blaumaņa iela 32, Rīga, LV-1011', lat: 56.9521317, lng: 24.1254031,
  sourceUrl: 'https://www.suk.lv/menus', sourceLabel: 'Sapņi un kokteiļi official live menu', sourceType: official,
  beerPrices: [{ name: 'Valmiermuižas gaišais (draft)', volumeMl: 300, price: 5 }, { name: 'Valmiermuižas gaišais (draft)', volumeMl: 500, price: 6 }, { name: 'Leffe Blonde', volumeMl: 330, price: 5.5 }, { name: 'Leffe Brune', volumeMl: 330, price: 5.5 }, { name: 'Corona', volumeMl: null, price: 5.5 }, { name: 'Desperados', volumeMl: null, price: 5.5 }, { name: 'Non-alcoholic beer', volumeMl: null, price: 5.5 }],
  hours: { mon: [], tue: [], wed: ['17:00-24:00'], thu: ['17:00-24:00'], fri: ['17:00-05:00'], sat: ['20:00-05:00'], sun: [], sourceUrl: 'https://www.suk.lv/' }, evidenceNotes: 'Official live bar menu and current venue hours.',
});
add({
  id: 'kulturas-nams-atmoda', name: 'Kultūras nams Atmoda', kind: 'kultūrbārs / live-music bārs', address: 'Stabu iela 10/2, Rīga, LV-1010', lat: 56.9583432, lng: 24.1232002,
  sourceUrl: 'https://knatmoda.lv/section:dzerienkarte', sourceLabel: 'Kultūras nama Atmoda official live drinks menu', sourceType: official,
  beerPrices: [{ name: 'Piebalgas Mednieku (draft)', volumeMl: 300, price: 3 }, { name: 'Piebalgas Mednieku (draft)', volumeMl: 500, price: 4 }, { name: 'Atmodas Lāgeris (draft)', volumeMl: 300, price: 3.5 }, { name: 'Atmodas Lāgeris (draft)', volumeMl: 500, price: 5 }, { name: 'Brūža nefiltrētais (draft)', volumeMl: 300, price: 4 }, { name: 'Brūža nefiltrētais (draft)', volumeMl: 500, price: 6 }, { name: 'POOKA Lager / APA (draft)', volumeMl: 300, price: 4 }, { name: 'POOKA Lager / APA (draft)', volumeMl: 500, price: 6 }, { name: 'Kāre Viedi IPA (draft)', volumeMl: 300, price: 4 }, { name: 'Kāre Viedi IPA (draft)', volumeMl: 500, price: 6 }, { name: 'Valmiermuižas gaišais (draft)', volumeMl: 300, price: 4.5 }, { name: 'Valmiermuižas gaišais (draft)', volumeMl: 500, price: 6.5 }, { name: 'Corona Extra', volumeMl: 330, price: 4 }, { name: 'Tērvetes Senču', volumeMl: 500, price: 5 }, { name: 'Blondais grēks — Viedi', volumeMl: 440, price: 6.5 }],
  hours: { mon: ['12:00-24:00'], tue: ['12:00-24:00'], wed: ['12:00-24:00'], thu: ['12:00-24:00'], fri: ['12:00-04:00'], sat: ['12:00-04:00'], sun: [], sourceUrl: 'https://knatmoda.lv/section:dzerienkarte' }, evidenceNotes: 'Official live menu, current 2026 update metadata and option pricing.',
});
add({
  id: 'alibi-room', name: 'Alibi Room', kind: 'kokteiļu bārs', address: 'Mazā Smilšu iela 17, Rīga, LV-1050', lat: 56.9502045, lng: 24.1099104,
  sourceUrl: 'https://alibiroom.choiceqr.com/menu/section:alkohols', sourceLabel: 'Alibi Room official live menu', sourceType: official,
  beerPrices: [{ name: 'Valmiermuižas Gaišais', volumeMl: 500, price: 7 }, { name: 'Valmiermuižas Tumšais', volumeMl: 500, price: 7.5 }, { name: 'Valmiermuiža 0', volumeMl: 300, price: 5.5 }, { name: 'Corona', volumeMl: 355, price: 6 }, { name: 'Kasteel Ķiršu', volumeMl: null, price: 6.5 }],
  hours: { mon: ['12:00-24:00'], tue: ['12:00-24:00'], wed: ['12:00-24:00'], thu: ['12:00-24:00'], fri: ['12:00-02:00'], sat: ['12:00-02:00'], sun: ['12:00-24:00'], sourceUrl: 'https://alibiroom.choiceqr.com/' }, evidenceNotes: 'Official live ChoiceQR menu.',
});

add({
  id: 'irish-dublin-pub', name: 'Irish Dublin Pub', kind: 'īru pubs', address: 'Augusta Deglava iela 112, Rīga', lat: 56.9477812, lng: 24.1946051,
  sourceUrl: 'https://irishdublinpub.lv/images/PDF/dzerienkarte_281025.pdf', sourceLabel: 'Irish Dublin Pub official drinks menu', sourceType: official,
  beerPrices: [
    { name: 'Guinness 4.2% (draft)', volumeMl: 300, price: 3.2 }, { name: 'Guinness 4.2% (draft)', volumeMl: 500, price: 4.6 },
    { name: 'Kronenbourg 1664 5% (draft)', volumeMl: 300, price: 3.9 }, { name: 'Kronenbourg 1664 5% (draft)', volumeMl: 500, price: 5.5 },
    { name: 'Estrella Damm 4.6% (draft)', volumeMl: 300, price: 3.2 }, { name: 'Estrella Damm 4.6% (draft)', volumeMl: 500, price: 4.6 },
    { name: 'Mežpils 5.3% (draft)', volumeMl: 300, price: 3.2 }, { name: 'Mežpils 5.3% (draft)', volumeMl: 500, price: 4.6 },
    { name: 'Guinness Original 5%', volumeMl: 330, price: 3.2 }, { name: 'Guinness Hop House 13 Lager 5%', volumeMl: 330, price: 3.5 },
    { name: 'Užavas gaišais 4.6%', volumeMl: 500, price: 4.1 }, { name: 'Tērvetes alus 5.3%', volumeMl: 500, price: 3.9 },
    { name: 'Piebalgas alus 5.6%', volumeMl: 500, price: 3.7 }, { name: 'Augšdaugavas Okeris 4.6%', volumeMl: 500, price: 3.5 },
    { name: 'Augšdaugavas Pienene 4.9%', volumeMl: 500, price: 3.5 }, { name: 'Augšdaugavas Diždadzis 5.8%', volumeMl: 500, price: 3.5 },
    { name: 'Corona Extra 4.5%', volumeMl: 355, price: 3.5 }, { name: 'Hoegaarden 5%', volumeMl: 330, price: 3.5 },
    { name: 'Aldara Ķiršu 4.5%', volumeMl: 500, price: 3.5 }, { name: 'HOPALAA Ale 5.2–8%', volumeMl: 440, price: 5.5 },
    { name: 'Guinness 0.0 (draft)', volumeMl: 440, price: 4 },
  ],
  hours: { mon: [], tue: ['16:00-23:00'], wed: ['16:00-23:00'], thu: ['16:00-23:00'], fri: ['16:00-02:00'], sat: ['14:00-02:00'], sun: [], sourceUrl: 'https://irishdublinpub.lv/' }, evidenceNotes: 'Official pub drinks PDF; full beer selection transcribed.',
});
add({
  id: 'bowlero-riga', name: 'Bowlero', kind: 'boulinga bārs', address: 'Lielirbes iela 27, Rīga, LV-1046', lat: 56.9310749, lng: 24.0373414,
  sourceUrl: 'https://www.bowlero.lv/wp/wp-content/uploads/2025/10/dzerienkarte_Bowlero_2025.pdf', sourceLabel: 'Bowlero official drinks menu', sourceType: official,
  beerPrices: [{ name: 'Piebalgas gaišais (draft)', volumeMl: 300, price: 3.9 }, { name: 'Piebalgas gaišais (draft)', volumeMl: 500, price: 4.9 }, { name: 'Pooka (draft)', volumeMl: 300, price: 3.9 }, { name: 'Pooka (draft)', volumeMl: 500, price: 4.9 }, { name: 'Corona Extra', volumeMl: 330, price: 4.9 }, { name: 'Leffe Blonde', volumeMl: 330, price: 3.9 }, { name: 'Leffe 0.0', volumeMl: 330, price: 3.5 }, { name: 'Corona 0.0', volumeMl: 330, price: 3.5 }],
  hours: { mon: ['10:00-22:00'], tue: ['10:00-22:00'], wed: ['10:00-22:00'], thu: ['10:00-22:00'], fri: ['10:00-24:00'], sat: ['10:00-24:00'], sun: ['10:00-21:00'], sourceUrl: 'https://www.bowlero.lv/' }, evidenceNotes: 'Official current bar menu and venue hours.',
});
add({
  id: 'the-snuggest', name: 'The Snuggest Gastro&Pub', kind: 'gastropubs', address: 'Zirgu iela 3, Rīga, LV-1050', lat: 56.9501692, lng: 24.1098786,
  sourceUrl: 'https://fr.restaurantguru.com/The-Snuggest-GastroandPub-Riga/menu', sourceLabel: 'The Snuggest current photographed menu', sourceType: photo,
  beerPrices: [{ name: 'Cēsu Premium', volumeMl: null, price: 5.5 }, { name: 'Piebalga Lager', volumeMl: null, price: 5.5 }, { name: 'Piebalgas Tumšais / Dark', volumeMl: null, price: 5.5 }, { name: 'Non Alcoholic Beer', volumeMl: null, price: 5 }],
  hours: { mon: [], tue: ['14:00-00:00'], wed: ['14:00-00:00'], thu: ['14:00-00:00'], fri: ['14:00-02:00'], sat: ['15:00-02:00'], sun: ['15:00-22:00'], sourceUrl: 'https://restaurantguru.com/The-Snuggest-GastroandPub-Riga' }, evidenceNotes: 'Current complete photographed beer section; source omits serving volumes.',
});

const ezitisBeers: Beer[] = [
  { name: 'Lāčplēsis Ekstra', volumeMl: 400, price: 2.5 }, { name: 'Lielvārdes Ķiršu', volumeMl: 400, price: 3.9 },
  { name: 'Lielvārdes Gaišais', volumeMl: 400, price: 3.9 }, { name: 'Bauskas Gaišais', volumeMl: 400, price: 3.9 },
  { name: 'Madonas Nefiltrētais', volumeMl: 400, price: 4.4 }, { name: 'Ezītis Miglā × Labietis', volumeMl: 440, price: 4.6 },
  { name: 'Heineken', volumeMl: 330, price: 4.1 }, { name: 'Sol', volumeMl: 330, price: 4.4 },
  { name: 'Tērvetes Senču', volumeMl: 500, price: 4.2 }, { name: 'Bauskas Tumšais', volumeMl: 500, price: 4.5 },
  { name: 'Anarkist New England IPA', volumeMl: 500, price: 4.6 }, { name: 'Užavas Gaišais', volumeMl: 500, price: 4.6 },
  { name: 'Viedi', volumeMl: 440, price: 5 }, { name: 'Fišers', volumeMl: 500, price: 4.7 },
  { name: 'Dzīru Kalve', volumeMl: 440, price: 5.3 }, { name: 'Labietis Dzeltenā Saime', volumeMl: 440, price: 5.1 },
  { name: 'Labietis Sarkanā Saime', volumeMl: 440, price: 5.3 }, { name: 'Heineken non-alcoholic', volumeMl: 330, price: 4.2 },
];
add({
  id: 'hospitalu-ezitis-migla', name: 'Hospitāļu Ezītis miglā', kind: 'bārs', address: 'Zirņu iela 12, Rīga, LV-1013', lat: 56.9711988, lng: 24.1355819,
  sourceUrl: 'https://www.ezitis.lv/wp-content/uploads/2026/03/Teika-majaslapa-01-scaled.jpg', sourceLabel: 'Ezītis miglā official 2026 drinks menu', sourceType: official, beerPrices: ezitisBeers,
  hours: { mon: ['12:00-23:00'], tue: ['12:00-23:00'], wed: ['12:00-23:00'], thu: ['12:00-24:00'], fri: ['12:00-02:00'], sat: ['12:00-02:00'], sun: ['12:00-22:00'], sourceUrl: 'https://www.ezitis.lv/kontakti/' }, evidenceNotes: 'Official shared Ezītis 2026 drinks menu and official Hospitāļu branch page; user confirmed all Ezītis branches share the accepted menu.',
});

const olybetBeers: Beer[] = [
  { name: 'Mežpils (draft)', volumeMl: 300, price: 3.5 }, { name: 'Mežpils (draft)', volumeMl: 500, price: 5 },
  { name: 'Madonas nefiltrētais (draft)', volumeMl: 300, price: 3.5 }, { name: 'Madonas nefiltrētais (draft)', volumeMl: 500, price: 5 },
  { name: 'Heineken', volumeMl: 500, price: 5 }, { name: 'Leffe Blonde', volumeMl: 330, price: 4.5 },
  { name: 'Corona', volumeMl: 355, price: 4 }, { name: 'Kronenbourg 1664 Blanc', volumeMl: 330, price: 3.5 },
  { name: 'Kronenbourg 1664 Blanc non-alcoholic', volumeMl: 330, price: 3.5 }, { name: 'Heineken non-alcoholic', volumeMl: 330, price: 3.5 },
];
const olybetLocations = [
  ['grand-hotel-kempinski', 'Grand Hotel Kempinski', 'Aspazijas bulvāris 22, Rīga', 56.9491743, 24.11326],
  ['bolderaja', 'Bolderāja', 'Stūrmaņu iela 29, Rīga', 57.0323594, 24.0485677],
  ['daugava', 'Daugava', 'Kuģu iela 24, Rīga', 56.9438271, 24.0933045],
  ['dole', 'Dole', 'Latgales iela 357, Rīga', 56.9057589, 24.1913818],
  ['domina', 'Domina', 'Ieriķu iela 3, Rīga', 56.9665832, 24.1627458],
  ['gailezers', 'Gaiļezers', 'Gaiļezera iela 8, Rīga', 56.9680658, 24.236968],
  ['imanta', 'Imanta', 'Anniņmuižas bulvāris 40A, Rīga', 56.960432, 24.012464],
  ['jugla', 'Jugla', 'Brīvības gatve 432, Rīga', 56.9891342, 24.2417368],
  ['lubanas', 'Lubānas', 'Lubānas iela 117, Rīga', 56.9327026, 24.1997201],
  ['lutrinu', 'Lutriņu', 'Lutriņu iela 1, Rīga', 56.9259713, 24.0611502],
  ['minska', 'Minska', 'Nīcgales iela 2B, Rīga', 56.9589081, 24.1768393],
  ['sarkandaugava', 'Sarkandaugava', 'Sarkandaugavas iela 3, Rīga', 56.9963311, 24.1244259],
  ['talava', 'Tālava', 'Andreja Saharova iela 21, Rīga', 56.938301, 24.202242],
  ['terbatas', 'Tērbatas', 'Tērbatas iela 73, Rīga', 56.9596549, 24.1327273],
  ['vecmilgravis', 'Vecmīlgrāvis', 'Augusta Dombrovska iela 23, Rīga', 57.0315916, 24.1094022],
  ['ziepniekkalns', 'Ziepniekkalns', 'Dižozolu iela 19, Rīga', 56.90316, 24.0971365],
  ['zolitude', 'Zolitūde', 'Zolitūdes iela 34, Rīga', 56.9489486, 23.9999593],
  ['agenskalns', 'Āgenskalns', 'Mazā Nometņu iela 30, Rīga', 56.934915, 24.0724071],
  ['teika', 'Teika', 'Brīvības iela 235, Rīga', 56.9767054, 24.1773092],
] as const;
olybetLocations.forEach(([slug, branch, address, lat, lng]) => add({
  id: `olybet-${slug}`, name: `OlyBet Sports Bar ${branch}`, kind: 'sporta bārs', address, lat, lng,
  sourceUrl: 'https://olybetsportsbar.com/lv/en/drinks/', sourceLabel: 'OlyBet Sports Bar official current drinks menu', sourceType: official,
  beerPrices: olybetBeers, hours: daily('00:00-24:00', 'https://olybetsportsbar.com/lv/en/locations/'),
  evidenceNotes: 'Official network-wide drinks page and official Riga location directory. The Voodoo-only restriction appears on food pages, not the drinks page.',
}));

add({
  id: 'flames-cocktail-hookah-lounge', name: 'Flames Cocktail & Hookah Lounge', kind: 'ūdenspīpju un kokteiļu lounge bārs', address: 'Lāčplēša iela 14, Rīga, LV-1011', lat: 56.9557143, lng: 24.1221378,
  sourceUrl: 'https://flames.choiceqr.com/menu/section:alkoholiskie-dzerieni', sourceLabel: 'Flames official live ChoiceQR digital menu', sourceType: official,
  beerPrices: [{ name: 'Bauskas gaišais alus', volumeMl: 500, price: 5 }, { name: 'Corona Extra', volumeMl: 330, price: 5 }, { name: 'Madonas nefiltrētais alus', volumeMl: 500, price: 6 }, { name: 'Lielvārdes ķiršu alus', volumeMl: 500, price: 6 }, { name: 'Valmiermuižas gaišais alus', volumeMl: 500, price: 6.5 }],
  hours: { mon: ['14:00-00:00'], tue: ['14:00-00:00'], wed: ['14:00-00:00'], thu: ['14:00-00:00'], fri: ['14:00-02:00'], sat: ['16:00-02:00'], sun: ['16:00-00:00'], sourceUrl: 'https://flames.choiceqr.com/menu/feedback' }, evidenceNotes: 'Owner-controlled live digital menu identifies Flames as a cocktail and hookah bar, publishes its exact address, coordinates and hours, and explicitly disables ordering, so these are venue prices rather than delivery prices. All listed beers were transcribed; cider was excluded.',
});
add({
  id: 'calliano-lounge', name: 'Calliano Lounge', kind: 'ūdenspīpju un kokteiļu lounge bārs', address: 'Blaumaņa iela 27, Rīga, LV-1011', lat: 56.9519567, lng: 24.1261429,
  sourceUrl: 'https://callianolounge.eu/data/menu-data.json', sourceLabel: 'Calliano Lounge official live menu data', sourceType: official,
  beerPrices: [{ name: 'Tērvetes Oriģinālais', volumeMl: 500, price: 5 }, { name: 'Tērvetes Senču', volumeMl: 500, price: 5 }, { name: 'Užavas tumšais', volumeMl: 500, price: 5 }, { name: 'Užavas gaišais', volumeMl: 500, price: 5 }, { name: 'Valmiermuižas tumšais', volumeMl: 500, price: 5 }, { name: 'Valmiermuižas gaišais', volumeMl: 500, price: 5 }, { name: 'Madonas nefiltrētais', volumeMl: 500, price: 5 }, { name: 'Madonas lageris', volumeMl: 500, price: 5 }, { name: 'Corona Extra', volumeMl: 330, price: 5 }, { name: 'Leffe (draft)', volumeMl: 500, price: 7 }, { name: 'Hoegaarden (draft)', volumeMl: 500, price: 7 }, { name: 'Valmiermuiža (draft)', volumeMl: 500, price: 6.5 }, { name: 'Bezalkoholiskais alus', volumeMl: 330, price: 3.5 }],
  hours: { mon: ['11:00-00:00'], tue: ['11:00-00:00'], wed: ['11:00-00:00'], thu: ['11:00-00:00'], fri: ['11:00-01:00'], sat: ['12:00-01:00'], sun: ['12:00-00:00'], sourceUrl: 'https://callianolounge.eu/data/working-hours.json' }, evidenceNotes: 'Official Calliano website identifies the venue as Hookah & Cocktails and loads these live first-party menu and hours files. Beer and draft-beer sections were transcribed in full; combined alternatives were split into individual rows at the published shared price.',
});
add({
  id: 'tribe-social-hub-riga', name: 'TRIBE Social Hub Riga', kind: 'viesnīcas social-hub bārs', address: 'Krišjāņa Valdemāra iela 23, Rīga, LV-1010', lat: 56.95715, lng: 24.11454,
  sourceUrl: 'https://www.ahstatic.com/pdf/b831_rsr001_01_t_x_gb.pdf', sourceLabel: 'TRIBE Riga City Centre official drinks menu', sourceType: official,
  beerPrices: [{ name: 'Valmiermuiža Gaišais / Amber Lager', volumeMl: 330, price: 4.9 }, { name: 'Valmiermuiža Gaišais / Amber Lager', volumeMl: 500, price: 5.9 }, { name: 'Valmiermuiža Tumšais / Dark Lager', volumeMl: 330, price: 5.5 }, { name: 'Kokmuiža Gaišais / Mexican Lager', volumeMl: 330, price: 4.5 }, { name: 'Kokmuiža IPA 0.0', volumeMl: 330, price: 4.5 }],
  hours: daily('00:00-24:00', 'https://all.accor.com/hotel/B831/index.en.shtml'), evidenceNotes: 'Official Accor property page identifies Social Hub as a 24-hour bar and links the property drinks menu; official current editorial confirms its local Valmiermuiža beer service.',
});
add({
  id: 'kitschen-lounge-bar', name: 'KITSCHen Lounge Bar', kind: 'viesnīcas jumta lounge bārs', address: 'Brīvības iela 48/50, Rīga, LV-1011', lat: 56.9554801, lng: 24.120316,
  sourceUrl: 'https://www.astonhotelriga.com/wp-content/uploads/sites/551/2025/06/kitschen-menu-lat-print-4.06.pdf', sourceLabel: 'Aston Hotel Riga official KITSCHen drinks menu', sourceType: official,
  beerPrices: [{ name: 'Complot IPA 6.6%', volumeMl: 330, price: 5 }, { name: 'Heineken 0.0%', volumeMl: 330, price: 4 }, { name: 'Madonas Nefiltrēts', volumeMl: 500, price: 6 }, { name: 'Malquerida 5%', volumeMl: 250, price: 3.5 }, { name: 'Madonas Nefiltrēts (draft)', volumeMl: null, price: 5.5 }, { name: 'Birra Moretti Lager (draft)', volumeMl: null, price: 5.5 }],
  hours: { mon: ['12:00-16:00'], tue: ['12:00-16:00'], wed: ['12:00-21:00'], thu: ['12:00-21:00'], fri: ['12:00-23:00'], sat: ['14:00-23:00'], sun: null, sourceUrl: 'https://www.astonhotelriga.com/restorans-un-lobija-bars/' }, evidenceNotes: 'Current official hotel page presents KITSCHen as its rooftop restaurant and lounge bar, links this menu, and publishes current hours.',
});

export const verifiedVenueData150 = { venues };
