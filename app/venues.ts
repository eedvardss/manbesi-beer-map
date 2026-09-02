export type Venue = {
  id: string;
  name: string;
  kind: string;
  address: string;
  lat: number;
  lng: number;
  beer: string;
  volumeMl: number;
  price: number;
  priceIsFrom?: boolean;
  sourceUrl: string;
  sourceLabel: string;
  sourceType: 'Oficiālā ēdienkarte' | 'Verificēta aktuālā alus karte';
};

export const checkedAt = '02.09.2026';

export const venues: Venue[] = [
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

export const pricePerLitre = (venue: Venue) => venue.price / (venue.volumeMl / 1000);

