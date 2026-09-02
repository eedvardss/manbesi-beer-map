'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibreModule from 'maplibre-gl';
import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';
import { ArrowDownWideNarrow, Beer, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { darkRigaStyle } from './map-style';
import { isPricedVenue, mapVenues, pricePerLitre, venueBeerPrices, type MapVenue } from './venues';

type PriceBand = 'all' | 'under5' | 'fiveToSix' | 'over6';
type SortMode = 'price' | 'litre' | 'name';
type FilterToolInput = { query?: string; priceBand?: PriceBand; sortMode?: SortMode };
const sortLabels: Record<SortMode, string> = { price: 'Lētākā glāze', litre: 'Lētākais litrs', name: 'Nosaukums A–Z' };
type ModelContext = {
  registerTool: (tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: object;
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
    execute: (input: unknown) => unknown;
  }, options?: { signal?: AbortSignal }) => void | Promise<void>;
};

const euro = (value: number) => value.toLocaleString('lv-LV', { style: 'currency', currency: 'EUR' });
const normalizeSearch = (value: string) => value
  .toLocaleLowerCase('lv')
  .normalize('NFD')
  .replace(/\p{M}+/gu, '');

const markerTone = (price: number) => {
  if (price < 4) return 'cheap';
  if (price <= 5) return 'mid';
  if (price <= 6) return 'warm';
  return 'high';
};

type MapLibreRuntime = {
  Map: typeof import('maplibre-gl').Map;
  Marker: typeof import('maplibre-gl').Marker;
  NavigationControl: typeof import('maplibre-gl').NavigationControl;
};

const getMapLibreRuntime = (module: unknown) => {
  const globalRuntime = (window as Window & { maplibregl?: MapLibreRuntime }).maplibregl;
  return globalRuntime
    ?? (module as { default?: MapLibreRuntime }).default
    ?? (module as MapLibreRuntime);
};

function VenueCard({ venue, selected, onSelect }: { venue: MapVenue; selected: boolean; onSelect: () => void }) {
  const priced = isPricedVenue(venue);
  return (
    <article className={`venue-card ${selected ? 'is-selected' : ''}`} data-venue-id={venue.id}>
      <button className="venue-card-target" onClick={onSelect} aria-label={`Parādīt kartē: ${venue.name}`} />
      <div className="venue-card-main">
        <span className="venue-copy">
          <a className="venue-name" href={venue.sourceUrl} target="_blank" rel="noreferrer" title={venue.sourceLabel}>{venue.name}</a>
          <span className="beer-name">{priced ? `${venue.beer}${venue.volumeMl ? ` · ${venue.packageCount ? `${venue.packageCount} × ` : ''}${venue.volumeMl} ml` : ''}` : venue.kind}</span>
          <span className="venue-address">{venue.address}</span>
        </span>
        {priced ? (
          <span className="card-price">
            <strong>{venue.priceIsFrom ? 'no ' : ''}{euro(venue.price)}</strong>
            <small>{euro(pricePerLitre(venue))}/l</small>
          </span>
        ) : <span className="unpriced-label">nav cenu</span>}
      </div>
    </article>
  );
}

function createMarkerNode(venue: MapVenue, active: boolean) {
  const priced = isPricedVenue(venue);
  const root = document.createElement('div');
  root.className = `marker-node${active ? ' is-open' : ''}`;
  root.dataset.tone = priced ? markerTone(venue.price) : 'unpriced';

  const priceButton = document.createElement('button');
  priceButton.type = 'button';
  if (priced) {
    priceButton.className = `price-marker ${markerTone(venue.price)}${active ? ' active' : ''}`;
    priceButton.setAttribute('aria-label', `${venue.name}, ${euro(venue.price)}`);
    if (venue.priceIsFrom) {
      const from = document.createElement('small');
      from.textContent = 'no';
      priceButton.appendChild(from);
    }
    priceButton.appendChild(document.createTextNode(`${venue.price.toFixed(2).replace('.', ',')} €`));
  } else {
    priceButton.className = `candidate-marker${active ? ' active' : ''}`;
    priceButton.setAttribute('aria-label', `${venue.name}, cenas vēl nav pārbaudītas`);
  }
  root.appendChild(priceButton);

  if (!active) return root;

  const detail = document.createElement('section');
  detail.className = 'marker-detail';
  detail.setAttribute('aria-label', `${venue.name} alus cenas`);

  const header = document.createElement('div');
  header.className = 'marker-detail-head';
  const heading = document.createElement('strong');
  heading.textContent = venue.name;
  const address = document.createElement('span');
  address.textContent = venue.address;
  const headingGroup = document.createElement('div');
  headingGroup.appendChild(heading);
  headingGroup.appendChild(address);
  header.appendChild(headingGroup);

  const list = document.createElement('div');
  list.className = 'marker-beer-list';
  list.tabIndex = 0;
  list.setAttribute('aria-label', `${venue.name} alus cenu saraksts`);
  if (!priced) {
    const pending = document.createElement('div');
    pending.className = 'marker-price-pending';
    pending.textContent = 'Alus cenas vēl nav pārbaudītas';
    list.appendChild(pending);
  } else [...venueBeerPrices(venue)].sort((a, b) => a.price - b.price).forEach((beer) => {
    const row = document.createElement('div');
    row.className = 'marker-beer-row';
    const beerInfo = document.createElement('div');
    const beerName = document.createElement('strong');
    beerName.textContent = beer.name;
    beerInfo.appendChild(beerName);
    if (beer.volumeMl) {
      const volume = document.createElement('span');
      volume.textContent = `${beer.packageCount ? `${beer.packageCount} × ` : ''}${beer.volumeMl} ml`;
      beerInfo.appendChild(volume);
    }
    const price = document.createElement('strong');
    price.className = 'marker-beer-price';
    price.textContent = `${beer.priceIsFrom ? 'no ' : ''}${euro(beer.price)}`;
    row.appendChild(beerInfo);
    row.appendChild(price);
    list.appendChild(row);
  });

  detail.appendChild(header);
  detail.appendChild(list);
  ['click', 'dblclick', 'mousedown', 'pointerdown', 'touchstart', 'wheel'].forEach((eventName) => {
    detail.addEventListener(eventName, (event) => event.stopPropagation());
  });
  root.appendChild(detail);
  return root;
}

export default function Home() {
  const mapNodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Map<string, MapLibreMarker>>(new Map());
  const suppressNextZoomDismissRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [query, setQuery] = useState('');
  const [priceBand, setPriceBand] = useState<PriceBand>('all');
  const [sortMode, setSortMode] = useState<SortMode>('price');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim());
    const result = mapVenues.filter((venue) => {
      const beerNames = isPricedVenue(venue) ? venueBeerPrices(venue).map((beer) => beer.name).join(' ') : '';
      const matchesText = !q || normalizeSearch([venue.name, venue.address, beerNames, venue.kind].join(' ')).includes(q);
      const matchesPrice = priceBand === 'all'
        || (isPricedVenue(venue) && ((priceBand === 'under5' && venue.price < 5)
          || (priceBand === 'fiveToSix' && venue.price >= 5 && venue.price <= 6)
          || (priceBand === 'over6' && venue.price > 6)));
      return matchesText && matchesPrice;
    });
    return [...result].sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name, 'lv');
      if (sortMode === 'litre') return pricePerLitre(a) - pricePerLitre(b);
      return a.price - b.price || (b.volumeMl ?? 0) - (a.volumeMl ?? 0);
    });
  }, [priceBand, query, sortMode]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const allowedBands: PriceBand[] = ['all', 'under5', 'fiveToSix', 'over6'];
    const allowedSorts: SortMode[] = ['price', 'litre', 'name'];

    void Promise.resolve(context.registerTool({
      name: 'filter_beer_map',
      title: 'Filter the Riga beer map',
      description: 'Search the visible Riga beer venues and optionally restrict the displayed serving-price band or change sorting.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Bar, beer, type, or street name.' },
          priceBand: { type: 'string', enum: allowedBands },
          sortMode: { type: 'string', enum: allowedSorts },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Input must be an object.');
        const value = input as FilterToolInput;
        if (value.query !== undefined && typeof value.query !== 'string') throw new Error('query must be a string.');
        if (value.priceBand !== undefined && !allowedBands.includes(value.priceBand)) throw new Error('Unknown priceBand.');
        if (value.sortMode !== undefined && !allowedSorts.includes(value.sortMode)) throw new Error('Unknown sortMode.');
        const nextQuery = value.query ?? '';
        const nextBand = value.priceBand ?? 'all';
        const nextSort = value.sortMode ?? 'price';
        setQuery(nextQuery);
        setPriceBand(nextBand);
        setSortMode(nextSort);
        const normalized = normalizeSearch(nextQuery.trim());
        const matches = mapVenues.filter((venue) => {
          const beerNames = isPricedVenue(venue) ? venueBeerPrices(venue).map((beer) => beer.name).join(' ') : '';
          const text = normalizeSearch([venue.name, venue.address, beerNames, venue.kind].join(' '));
          return (!normalized || text.includes(normalized))
            && (nextBand === 'all'
              || (isPricedVenue(venue) && ((nextBand === 'under5' && venue.price < 5)
                || (nextBand === 'fiveToSix' && venue.price >= 5 && venue.price <= 6)
                || (nextBand === 'over6' && venue.price > 6))));
        });
        return { count: matches.length, venues: matches.slice(0, 10).map((venue) => venue.name) };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return;
    let cancelled = false;
    let mapInstance: MapLibreMap | null = null;
    const markers = markerRefs.current;

    const maplibre = getMapLibreRuntime(maplibreModule);
    const map = new maplibre.Map({
      container: mapNodeRef.current,
      style: darkRigaStyle,
      center: [24.116, 56.9515],
      zoom: 13,
      minZoom: 10,
      maxZoom: 19,
      attributionControl: { compact: true },
      fadeDuration: 120,
      pixelRatio: Math.min(window.devicePixelRatio, 1.5),
      renderWorldCopies: false,
      refreshExpiredTiles: false,
      pitchWithRotate: false,
      dragRotate: false,
    });
    mapInstance = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'bottom-right');
    map.on('click', () => setSelectedId(null));
    map.on('zoomstart', () => {
      if (suppressNextZoomDismissRef.current) {
        suppressNextZoomDismissRef.current = false;
        return;
      }
      setSelectedId(null);
    });
    void map.once('load', () => {
      if (!cancelled) setMapReady(true);
    });
    map.on('error', (event) => console.error('MapLibre:', event.error));
    mapRef.current = map;
    window.setTimeout(() => map.resize(), 100);

    return () => {
      cancelled = true;
      mapInstance?.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const maplibre = getMapLibreRuntime(maplibreModule);
    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current.clear();

    filtered.forEach((venue) => {
      const active = venue.id === selectedId;
      const element = createMarkerNode(venue, active);
      element.style.zIndex = active ? '2000' : isPricedVenue(venue) ? '1000' : '0';
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        setSelectedId((current) => current === venue.id ? null : venue.id);
        map.panTo([venue.lng, venue.lat], { duration: 300 });
      });
      const marker = new maplibre.Marker({ element, anchor: 'bottom-left' })
        .setLngLat([venue.lng, venue.lat])
        .addTo(map);
      markerRefs.current.set(venue.id, marker);
    });
  }, [filtered, mapReady, selectedId]);

  const chooseVenue = (venue: MapVenue) => {
    const map = mapRef.current;
    if (map && map.getZoom() !== 16) {
      suppressNextZoomDismissRef.current = true;
      void map.once('moveend', () => {
        suppressNextZoomDismissRef.current = false;
      });
    }
    setSelectedId(venue.id);
    map?.flyTo({ center: [venue.lng, venue.lat], zoom: 16, duration: 650, essential: true });
  };

  const clearFilters = () => {
    setQuery('');
    setPriceBand('all');
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className={`sidebar ${mobileListOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-head">
            <div className="panel-title">
              <div className="brand-lockup"><Beer size={18} strokeWidth={2.4} /><strong>Rīgas alus</strong></div>
              <button className="mobile-close" onClick={() => setMobileListOpen(false)} aria-label="Aizvērt vietu sarakstu"><X size={18} /></button>
            </div>

            <label className="search-box">
              <Search size={17} />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Meklē bāru, alu vai ielu…" aria-label="Meklēt vietas" />
              {query && <button onClick={() => setQuery('')} aria-label="Notīrīt meklēšanu"><X size={15} /></button>}
            </label>

            <div className="filter-row" aria-label="Cenas filtrs">
              {([
                ['all', 'Visas'], ['under5', 'zem 5 €'], ['fiveToSix', '5–6 €'], ['over6', 'virs 6 €'],
              ] as const).map(([value, label]) => (
                <Button key={value} size="sm" variant={priceBand === value ? 'default' : 'outline'} onClick={() => setPriceBand(value)}>{label}</Button>
              ))}
            </div>

            <div className="result-tools">
              <strong>{filtered.length} {filtered.length === 1 ? 'vieta' : 'vietas'}</strong>
              <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
                <SelectTrigger size="sm" aria-label="Kārtot vietas"><ArrowDownWideNarrow size={14} /><SelectValue>{sortLabels[sortMode]}</SelectValue></SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="price">Lētākā glāze</SelectItem>
                  <SelectItem value="litre">Lētākais litrs</SelectItem>
                  <SelectItem value="name">Nosaukums A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="venue-list">
            {filtered.length ? filtered.map((venue) => (
              <VenueCard key={venue.id} venue={venue} selected={selectedId === venue.id} onSelect={() => chooseVenue(venue)} />
            )) : (
              <div className="empty-state"><Beer size={26} /><strong>Nekas neatradās</strong><span>Pamēģini citu vārdu vai cenu diapazonu.</span><Button variant="outline" onClick={clearFilters}>Notīrīt filtrus</Button></div>
            )}
          </div>
        </aside>

        <div className="map-wrap">
          <div ref={mapNodeRef} className="map" aria-label="Rīgas alus cenu karte" />
          <Button className="mobile-results" onClick={() => setMobileListOpen(true)}><Beer size={16} /> {filtered.length} vietas</Button>
        </div>
      </section>

      {mobileListOpen && <button className="mobile-scrim" onClick={() => setMobileListOpen(false)} aria-label="Aizvērt vietu sarakstu" />}
    </main>
  );
}
