'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import { ArrowDownWideNarrow, ArrowUpRight, Beer, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pricePerLitre, venues, type Venue } from './venues';

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

const markerTone = (price: number) => {
  if (price < 4) return 'cheap';
  if (price <= 5) return 'mid';
  if (price <= 6) return 'warm';
  return 'high';
};

function VenueCard({ venue, selected, onSelect }: { venue: Venue; selected: boolean; onSelect: () => void }) {
  return (
    <article className={`venue-card ${selected ? 'is-selected' : ''}`} data-venue-id={venue.id}>
      <button className="venue-card-main" onClick={onSelect} aria-label={`Parādīt kartē: ${venue.name}`}>
        <span className="venue-copy">
          <strong className="venue-name">{venue.name}</strong>
          <span className="beer-name">{venue.beer} · {venue.volumeMl} ml</span>
          <span className="venue-address">{venue.address}</span>
        </span>
        <span className="card-price">
          <strong>{venue.priceIsFrom ? 'no ' : ''}{euro(venue.price)}</strong>
          <small>{euro(pricePerLitre(venue))}/l</small>
        </span>
      </button>
      <a className="source-link" href={venue.sourceUrl} target="_blank" rel="noreferrer" title={venue.sourceLabel}>
        Avots <ArrowUpRight size={12} />
      </a>
    </article>
  );
}

export default function Home() {
  const mapNodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRefs = useRef<Map<string, LeafletMarker>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [query, setQuery] = useState('');
  const [priceBand, setPriceBand] = useState<PriceBand>('all');
  const [sortMode, setSortMode] = useState<SortMode>('price');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('lv');
    const result = venues.filter((venue) => {
      const matchesText = !q || [venue.name, venue.address, venue.beer, venue.kind].join(' ').toLocaleLowerCase('lv').includes(q);
      const matchesPrice = priceBand === 'all'
        || (priceBand === 'under5' && venue.price < 5)
        || (priceBand === 'fiveToSix' && venue.price >= 5 && venue.price <= 6)
        || (priceBand === 'over6' && venue.price > 6);
      return matchesText && matchesPrice;
    });
    return [...result].sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name, 'lv');
      if (sortMode === 'litre') return pricePerLitre(a) - pricePerLitre(b);
      return a.price - b.price || b.volumeMl - a.volumeMl;
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
        const normalized = nextQuery.trim().toLocaleLowerCase('lv');
        const matches = venues.filter((venue) => {
          const text = [venue.name, venue.address, venue.beer, venue.kind].join(' ').toLocaleLowerCase('lv');
          return (!normalized || text.includes(normalized))
            && (nextBand === 'all'
              || (nextBand === 'under5' && venue.price < 5)
              || (nextBand === 'fiveToSix' && venue.price >= 5 && venue.price <= 6)
              || (nextBand === 'over6' && venue.price > 6));
        });
        return { count: matches.length, venues: matches.slice(0, 10).map((venue) => venue.name) };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return;
    let cancelled = false;
    let mapInstance: LeafletMap | null = null;
    const markers = markerRefs.current;

    void import('leaflet').then((L) => {
      if (cancelled || !mapNodeRef.current) return;
      const map = L.map(mapNodeRef.current, { zoomControl: false, minZoom: 10 }).setView([56.9515, 24.116], 13);
      mapInstance = map;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        className: 'base-tiles',
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapRef.current = map;
      setMapReady(true);
      window.setTimeout(() => map.invalidateSize(), 100);
    });

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

    void import('leaflet').then((L) => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current.clear();

      filtered.forEach((venue) => {
        const active = venue.id === selectedId;
        const icon = L.divIcon({
          className: 'price-marker-shell',
          html: `<button aria-label="${venue.name}, ${euro(venue.price)}" class="price-marker ${markerTone(venue.price)}${active ? ' active' : ''}">${venue.priceIsFrom ? '<small>no</small>' : ''}${venue.price.toFixed(2).replace('.', ',')} €</button>`,
          iconSize: [74, 36],
          iconAnchor: [37, 36],
        });
        const marker = L.marker([venue.lat, venue.lng], { icon, riseOnHover: true }).addTo(map);
        marker.on('click', () => {
          setSelectedId(venue.id);
          setMobileListOpen(true);
        });
        markerRefs.current.set(venue.id, marker);
      });
    });
  }, [filtered, mapReady, selectedId]);

  const chooseVenue = (venue: Venue) => {
    setSelectedId(venue.id);
    mapRef.current?.flyTo([venue.lat, venue.lng], 16, { duration: 0.65 });
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
