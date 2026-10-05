'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- the fixed cursor requires a scroll-driven custom slider */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';
import { ArrowDownWideNarrow, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { darkRigaStyle } from './map-style';
import { consumeMapRetry, saveMapRetry } from './map-retry';
import { formatClockTime, getRigaClock, isVenueOpenAt, type RigaClock } from './opening-hours';
import {
  timelineContentWidth,
  timelineMaxMinutes,
  timelineStepMinutes,
  timelineStepPixels,
  timelineTickLabel,
  timelineTickPosition,
  timelineTicks,
} from './time-slider.mjs';
import { checkedAt, isPricedVenue, mapVenues, pricePerLitre, venueBeerPrices, type MapVenue } from './venues';
import { markerAmount, markerTone } from './price-presentation';

import { createVenueQuery, type PriceBand, type SortMode } from './beer-query';
const queryCatalog = createVenueQuery(mapVenues);
const venueCameraEvent = { preserveVenueSelection: true };
type FilterToolInput = { query?: string; priceBand?: PriceBand; sortMode?: SortMode };
const sortLabels: Record<SortMode, string> = { price: 'Lētākā glāze', litre: 'Lētākais litrs', name: 'Nosaukums A–Z' };
const priceBandOptions = [
  { value: 'all', label: 'Visas' },
  { value: 'under5', label: 'zem 5 €' },
  { value: 'fiveToSix', label: '5–6 €' },
  { value: 'over6', label: 'virs 6 €' },
] as const;
const mobileMarkerOffset = (detailHeight: number, map: MapLibreMap): [number, number] => {
  const bounds = map.getContainer().getBoundingClientRect();
  const controlsTop = document.querySelector('.mobile-results')?.getBoundingClientRect().top ?? window.innerHeight;
  const centeredBottom = bounds.top + bounds.height / 2 + detailHeight / 2;
  const clearance = Math.min(0, controlsTop - 16 - centeredBottom);
  return [-37, 34 - detailHeight / 2 + clearance];
};
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

const currencyFormatter = new Intl.NumberFormat('lv-LV', { style: 'currency', currency: 'EUR' });
const euro = (value: number) => currencyFormatter.format(value);

function BeerMark({ className = '' }: { className?: string }) {
  return <Image className={className} src="/beer-mark.svg" width={28} height={28} alt="" aria-hidden="true" />;
}

const VenueCard = memo(function VenueCard({ venue, selected, openState, onSelect }: { venue: MapVenue; selected: boolean; openState: boolean | null; onSelect: (venue: MapVenue) => void }) {
  const priced = isPricedVenue(venue);
  return (
    <article className={`venue-card${selected ? ' is-selected' : ''}${openState === false ? ' is-closed' : ''}`} data-venue-id={venue.id}>
      <button className="venue-card-target" onClick={() => onSelect(venue)} aria-label={`Parādīt kartē: ${venue.name}`} />
      <div className="venue-card-main">
        <span className="venue-copy">
          <a className="venue-name" href={venue.sourceUrl} target="_blank" rel="noreferrer" title={venue.sourceLabel}>{venue.name}</a>
          <span className="beer-name">{priced ? `${venue.beer}${venue.volumeMl ? ` · ${venue.packageCount ? `${venue.packageCount} × ` : ''}${venue.volumeMl} ml` : ''}` : venue.kind}</span>
          <span className="venue-address">{venue.address}</span>
        </span>
        {priced ? (
          <span className="card-price">
            <strong>{venue.priceIsFrom ? 'no ' : ''}{euro(venue.price)}</strong>
            <small>{pricePerLitre(venue) === null ? 'Tilpums nav norādīts' : `${venue.priceIsFrom ? 'no ' : ''}${euro(pricePerLitre(venue)!)} /l`}</small>
          </span>
        ) : <span className="unpriced-label">nav cenu</span>}
      </div>
    </article>
  );
});

function createMarkerNode(venue: MapVenue, active: boolean, sort: SortMode) {
  const priced = isPricedVenue(venue);
  const root = document.createElement('div');
  root.className = `marker-node${active ? ' is-open' : ''}`;
  root.dataset.tone = priced ? markerTone(venue, sort) : 'unpriced';
  root.dataset.priceMetric = sort === 'litre' ? 'litre' : 'serving';

  const priceButton = document.createElement('button');
  priceButton.type = 'button';
  priceButton.setAttribute('aria-expanded', String(active));
  if (priced) {
    const amount = markerAmount(venue, sort);
    const unit = sort === 'litre' ? ' /l' : '';
    priceButton.className = `price-marker ${markerTone(venue, sort)}${active ? ' active' : ''}`;
    priceButton.setAttribute('aria-label', `${venue.name}, ${amount === null ? 'tilpums nav norādīts' : `${venue.priceIsFrom ? 'no ' : ''}${euro(amount)}${unit}`}`);
    if (venue.priceIsFrom && amount !== null) {
      const from = document.createElement('small');
      from.textContent = 'no';
      priceButton.appendChild(from);
    }
    priceButton.appendChild(document.createTextNode(amount === null ? '— €/l' : `${amount.toFixed(2).replace('.', ',')} €${unit}`));
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
  if (priced) {
    const footer = document.createElement('div');
    footer.className = 'marker-detail-footer';
    const source = document.createElement('a');
    source.href = venue.sourceUrl;
    source.target = '_blank';
    source.rel = 'noreferrer';
    source.textContent = 'Cenu avots ↗';
    source.title = `${venue.sourceLabel} · pārbaudīts ${checkedAt}`;
    const directions = document.createElement('a');
    directions.href = `https://maps.apple.com/?daddr=${venue.lat},${venue.lng}&dirflg=w`;
    directions.target = '_blank';
    directions.rel = 'noreferrer';
    directions.textContent = 'Maršruts ↗';
    const share = document.createElement('button');
    share.type = 'button';
    share.textContent = 'Kopēt saiti';
    share.addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('venue', venue.id);
      void navigator.clipboard.writeText(url.href).then(() => {
        share.textContent = 'Saite nokopēta';
      }).catch(() => { share.textContent = 'Neizdevās nokopēt'; });
    });
    [source, directions, share].forEach((child) => footer.appendChild(child));
    detail.appendChild(footer);
  }
  ['click', 'dblclick', 'mousedown', 'pointerdown', 'touchstart', 'wheel'].forEach((eventName) => {
    detail.addEventListener(eventName, (event) => event.stopPropagation());
  });
  root.appendChild(detail);
  return root;
}

export default function Home() {
  const mapNodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapRuntimeRef = useRef<typeof import('./map-runtime') | null>(null);
  const pendingVenueRef = useRef<MapVenue | null>(null);
  const markerRefs = useRef<Map<string, MapLibreMarker>>(new Map());
  const markerStates = useRef<Map<string, { venue: MapVenue; active: boolean; sort: SortMode }>>(new Map());
  const venueListRef = useRef<HTMLDivElement>(null);
  const venueGliderRef = useRef<HTMLDivElement>(null);
  const hoveredVenueIdRef = useRef<string | null>(null);
  const timeScrollerRef = useRef<HTMLDivElement>(null);
  const ignoreTimelineScrollRef = useRef(false);
  const timelineFrameRef = useRef<number | null>(null);
  const restoredTimelineRef = useRef<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [basemapReady, setBasemapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [priceBand, setPriceBand] = useState<PriceBand>('all');
  const [sortMode, setSortMode] = useState<SortMode>('price');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [rigaClock, setRigaClock] = useState<RigaClock | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState(0);
  const [timeIsLive, setTimeIsLive] = useState(true);

  useEffect(() => {
    const syncClock = () => {
      const clock = getRigaClock();
      setRigaClock(clock);
      if (timeIsLive) setSelectedMinutes(clock.minutes);
    };
    syncClock();
    const interval = window.setInterval(syncClock, 30_000);
    return () => window.clearInterval(interval);
  }, [timeIsLive]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('mapRetry') !== '1') return;
    url.searchParams.delete('mapRetry');
    window.history.replaceState(window.history.state, '', url);
    try {
      const context = consumeMapRetry(window.sessionStorage);
      if (!context) return;
      // oxlint-disable-next-line react/react-compiler -- One-shot external recovery must follow the server's empty initial state.
      setQuery(context.query);
      setPriceBand(context.priceBand);
      setSortMode(context.sortMode);
      pendingVenueRef.current = mapVenues.find((venue) => venue.id === context.venueId) ?? null;
      setMobileListOpen(context.mobileListOpen);
      if (!context.timeIsLive) {
        restoredTimelineRef.current = context.selectedMinutes;
        setTimeIsLive(false);
        setSelectedMinutes(context.selectedMinutes);
      }
    } catch { /* Storage can be unavailable; the venue URL still recovers. */ }
  }, []);

  const retryMap = () => {
    const url = new URL(window.location.href);
    const venueId = pendingVenueRef.current?.id ?? selectedId ?? url.searchParams.get('venue');
    if (venueId) url.searchParams.set('venue', venueId);
    url.searchParams.set('mapRetry', '1');
    try {
      saveMapRetry(window.sessionStorage, { query, priceBand, sortMode, venueId, selectedMinutes, timeIsLive, mobileListOpen });
    } catch { /* Keep explicit retry usable when session storage is disabled. */ }
    window.history.replaceState(window.history.state, '', url);
    window.location.reload();
  };

  const selectedDayOffset = Math.floor(selectedMinutes / (24 * 60));
  const selectedMinuteOfDay = selectedMinutes % (24 * 60);
  const selectedDayIndex = rigaClock ? (rigaClock.dayIndex + selectedDayOffset) % 7 : null;
  const openStates = useMemo(() => new Map(mapVenues.map((venue) => [
    venue.id,
    selectedDayIndex === null ? null : isVenueOpenAt(venue.id, { dayIndex: selectedDayIndex, minutes: selectedMinuteOfDay }),
  ])), [selectedDayIndex, selectedMinuteOfDay]);
  const venueOpenState = (venueId: string) => openStates.get(venueId) ?? null;

  useEffect(() => {
    if (!rigaClock || !timeScrollerRef.current) return;
    const minutes = timeIsLive ? rigaClock.minutes : restoredTimelineRef.current;
    if (minutes === null) return;
    restoredTimelineRef.current = null;
    ignoreTimelineScrollRef.current = true;
    timeScrollerRef.current.scrollTo({
      left: (minutes / timelineStepMinutes) * timelineStepPixels,
      behavior: 'auto',
    });
    const release = window.setTimeout(() => {
      ignoreTimelineScrollRef.current = false;
    }, 50);
    return () => window.clearTimeout(release);
  }, [rigaClock, timeIsLive]);

  useEffect(() => () => {
    if (timelineFrameRef.current !== null) window.cancelAnimationFrame(timelineFrameRef.current);
  }, []);

  const setTimelineFromScroll = () => {
    if (ignoreTimelineScrollRef.current || !timeScrollerRef.current) return;
    if (timelineFrameRef.current !== null) window.cancelAnimationFrame(timelineFrameRef.current);
    timelineFrameRef.current = window.requestAnimationFrame(() => {
      const nextMinutes = Math.max(0, Math.min(
        timelineMaxMinutes,
        Math.round(timeScrollerRef.current!.scrollLeft / timelineStepPixels) * timelineStepMinutes,
      ));
      setTimeIsLive(false);
      setSelectedMinutes(nextMinutes);
      timelineFrameRef.current = null;
    });
  };

  const moveTimeline = (minutes: number) => {
    const nextMinutes = Math.max(0, Math.min(timelineMaxMinutes, minutes));
    setTimeIsLive(false);
    setSelectedMinutes(nextMinutes);
    timeScrollerRef.current?.scrollTo({
      left: (nextMinutes / timelineStepMinutes) * timelineStepPixels,
      behavior: 'smooth',
    });
  };

  const filtered = useMemo(() => queryCatalog(query, priceBand, sortMode), [priceBand, query, sortMode]);

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
        const matches = queryCatalog(nextQuery, nextBand, nextSort);
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
    const states = markerStates.current;

    let resizeTimer: number | undefined;
    void import('./map-runtime').then((runtime) => {
      if (cancelled || !mapNodeRef.current) return;
      mapRuntimeRef.current = runtime;
      const linkedId = new URLSearchParams(window.location.search).get('venue');
      const linkedVenue = pendingVenueRef.current ?? mapVenues.find((venue) => venue.id === linkedId);
      const map = new runtime.Map({
        container: mapNodeRef.current,
        style: darkRigaStyle,
        center: linkedVenue ? [linkedVenue.lng, linkedVenue.lat] : [24.116, 56.9515],
        zoom: linkedVenue ? 16 : 13,
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
      map.addControl(new runtime.NavigationControl({ showCompass: false }), 'bottom-right');
      map.on('click', () => setSelectedId(null));
      map.on('zoomstart', (event) => {
        if (!('preserveVenueSelection' in event && event.preserveVenueSelection === true)) setSelectedId(null);
      });
      void map.once('load', () => {
        if (!cancelled) setBasemapReady(true);
      });
      map.on('error', (event) => console.error('MapLibre:', event.error));
      mapRef.current = map;
      pendingVenueRef.current = null;
      if (linkedVenue) setSelectedId(linkedVenue.id);
      // DOM prices and menus need the map transform, not downloaded tiles/glyphs.
      setMapReady(true);
      resizeTimer = window.setTimeout(() => map.resize(), 100);
    }).catch((error) => {
      if (cancelled) return;
      mapInstance?.remove();
      mapInstance = null;
      mapRef.current = null;
      console.error('MapLibre initialization:', error);
      setMapReady(false);
      setBasemapReady(false);
      setMapFailed(true);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(resizeTimer);
      mapInstance?.remove();
      mapRef.current = null;
      mapRuntimeRef.current = null;
      markers.clear();
      states.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const runtime = mapRuntimeRef.current;
    if (!map || !runtime || !mapReady) return;

    let mobileCenterFrame: number | null = null;
    const visibleIds = new Set(filtered.map(venue => venue.id));
    markerRefs.current.forEach((marker, id) => {
      if (!visibleIds.has(id)) { marker.remove(); markerRefs.current.delete(id); markerStates.current.delete(id); }
    });

    filtered.forEach((venue) => {
      const active = venue.id === selectedId;
      const existing = markerRefs.current.get(venue.id);
      const previous = markerStates.current.get(venue.id);
      if (existing && previous?.venue === venue && previous.active === active && previous.sort === sortMode) return;
      const fresh = createMarkerNode(venue, active, sortMode);
      const element = existing?.getElement() ?? fresh;
      if (existing) {
        const button = element.querySelector('button')!;
        const nextButton = fresh.querySelector('button')!;
        button.className = nextButton.className;
        button.setAttribute('aria-label', nextButton.getAttribute('aria-label')!);
        button.setAttribute('aria-expanded', String(active));
        button.replaceChildren(...Array.from(nextButton.childNodes));
        element.classList.toggle('is-open', active);
        element.dataset.tone = fresh.dataset.tone;
        element.dataset.priceMetric = fresh.dataset.priceMetric;
        element.querySelector('.marker-detail')?.remove();
        const detail = fresh.querySelector('.marker-detail');
        if (detail) element.appendChild(detail);
      }
      markerStates.current.set(venue.id, { venue, active, sort: sortMode });
      element.style.zIndex = active ? '2000' : isPricedVenue(venue) ? '1000' : '0';
      if (!existing) element.addEventListener('click', (event) => {
        event.stopPropagation();
        if (element.classList.contains('is-open')) {
          setSelectedId(null);
          return;
        }
        setSelectedId(venue.id);
        if (!window.matchMedia('(max-width: 720px)').matches) {
          map.easeTo({ center: [venue.lng, venue.lat], duration: 350, essential: true }, venueCameraEvent);
        }
      });
      const marker = existing ?? new runtime.Marker({ element, anchor: 'bottom-left' })
        .setLngLat([venue.lng, venue.lat])
        .addTo(map);
      markerRefs.current.set(venue.id, marker);

      if (active && window.matchMedia('(max-width: 720px)').matches) {
        mobileCenterFrame = window.requestAnimationFrame(() => {
          const detailHeight = element.querySelector<HTMLElement>('.marker-detail')?.getBoundingClientRect().height ?? 34;
          const centerExpandedMarker = () => map.easeTo({
            center: [venue.lng, venue.lat],
            offset: mobileMarkerOffset(detailHeight, map!),
            duration: 350,
            essential: true,
          }, venueCameraEvent);
          if (map.isMoving()) void map.once('moveend', centerExpandedMarker);
          else centerExpandedMarker();
        });
      }
    });

    return () => {
      if (mobileCenterFrame !== null) window.cancelAnimationFrame(mobileCenterFrame);
    };
  }, [filtered, mapReady, selectedId, sortMode]);

  useEffect(() => {
    if (!mapReady) return;
    markerRefs.current.forEach((marker, venueId) => {
      marker.getElement().classList.toggle('is-closed', openStates.get(venueId) === false);
    });
  }, [filtered, mapReady, openStates, selectedId]);

  const chooseVenue = useCallback((venue: MapVenue) => {
    const map = mapRef.current;
    if (!mapReady) pendingVenueRef.current = venue;
    const mobile = window.matchMedia('(max-width: 720px)').matches;
    const detailHeight = mobile ? markerRefs.current.get(venue.id)?.getElement()
      .querySelector<HTMLElement>('.marker-detail')?.getBoundingClientRect().height : undefined;
    if (mobile) setMobileListOpen(false);
    setSelectedId(venue.id);
    // An already-open panel needs its offset in this camera command: selecting
    // the same ID does not trigger the marker effect to centre it again.
    map?.flyTo({ center: [venue.lng, venue.lat], zoom: 16, duration: 650, essential: true,
      ...(detailHeight ? { offset: mobileMarkerOffset(detailHeight, map!) } : {}) }, venueCameraEvent);
  }, [mapReady]);

  const clearFilters = () => {
    setQuery('');
    setPriceBand('all');
  };

  const hideVenueGlider = () => {
    hoveredVenueIdRef.current = null;
    venueGliderRef.current?.classList.remove('is-visible');
  };

  const moveVenueGlider = (target: EventTarget | null) => {
    if (window.matchMedia('(max-width: 720px)').matches || !(target instanceof Element)) return;
    const list = venueListRef.current;
    const glider = venueGliderRef.current;
    const card = target.closest<HTMLElement>('.venue-card');
    if (!list || !glider || !card || !list.contains(card)) return;
    const venueId = card.dataset.venueId ?? null;
    if (hoveredVenueIdRef.current === venueId) return;
    hoveredVenueIdRef.current = venueId;
    glider.style.height = `${card.offsetHeight}px`;
    glider.style.transform = `translate3d(0, ${card.offsetTop}px, 0)`;
    glider.classList.add('is-visible');
  };

  const priceBandIndex = priceBandOptions.findIndex((option) => option.value === priceBand);

  return (
    <main className="app-shell">
      <section className="workspace">
        {mobileListOpen && <button className="mobile-scrim" onClick={() => setMobileListOpen(false)} aria-label="Aizvērt vietu sarakstu" />}
        <aside className={`sidebar ${mobileListOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-head">
            <div className="panel-title">
              <div className="brand-lockup"><BeerMark className="brand-mark" /><strong>Rīgas alus</strong></div>
              <button className="mobile-close" onClick={() => setMobileListOpen(false)} aria-label="Aizvērt vietu sarakstu"><X size={18} /></button>
            </div>

            <label className="search-box">
              <Search size={17} />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Meklē bāru, alu vai ielu…" aria-label="Meklēt vietas" />
              {query && <button onClick={() => setQuery('')} aria-label="Notīrīt meklēšanu"><X size={15} /></button>}
            </label>

            <div className="price-filter" aria-label="Cenas filtrs">
              <div className="price-filter-caption"><span>Cena par porciju</span><strong>{priceBandOptions[priceBandIndex].label}</strong></div>
              <Slider
                value={[priceBandIndex]}
                min={0}
                max={priceBandOptions.length - 1}
                step={1}
                aria-label="Cenas diapazons"
                onValueChange={(value) => {
                  const index = Array.isArray(value) ? value[0] : value;
                  setPriceBand(priceBandOptions[Math.round(index)]?.value ?? 'all');
                }}
              />
              <div className="price-filter-labels" aria-hidden="true">
                {priceBandOptions.map((option) => <span key={option.value}>{option.label}</span>)}
              </div>
            </div>

            <div className="filter-row" aria-label="Cenas filtrs">
              {priceBandOptions.map(({ value, label }) => (
                <Button
                  key={value}
                  size="sm"
                  variant={priceBand === value ? 'default' : 'outline'}
                  aria-pressed={priceBand === value}
                  onClick={() => setPriceBand(value)}
                >
                  {label}
                </Button>
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

          <div
            ref={venueListRef}
            className="venue-list"
            onPointerMove={(event) => moveVenueGlider(event.target)}
            onPointerLeave={hideVenueGlider}
            onFocusCapture={(event) => moveVenueGlider(event.target)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) hideVenueGlider();
            }}
          >
            <div ref={venueGliderRef} className="venue-hover-glider" aria-hidden="true" />
            {filtered.length ? filtered.map((venue) => (
              <VenueCard key={venue.id} venue={venue} selected={selectedId === venue.id} openState={venueOpenState(venue.id)} onSelect={chooseVenue} />
            )) : (
              <div className="empty-state"><BeerMark className="empty-mark" /><strong>Nekas neatradās</strong><span>Pamēģini citu vārdu vai cenu diapazonu.</span><Button variant="outline" onClick={clearFilters}>Notīrīt filtrus</Button></div>
            )}
          </div>
        </aside>

        <div className="map-wrap">
          <div ref={mapNodeRef} className="map" aria-label="Rīgas alus cenu karte" />
          {!basemapReady && <div className={`map-load-state${mapReady ? ' is-background-loading' : ''}`} role={mapFailed ? 'alert' : 'status'}>
            <span>{mapFailed ? 'Karti neizdevās ielādēt.' : mapReady ? 'Ielādē kartes fonu…' : 'Ielādē karti…'}</span>
            {mapFailed && <Button variant="outline" onClick={retryMap}>Mēģināt vēlreiz</Button>}
          </div>}
          <Button className="mobile-results" onClick={() => setMobileListOpen(true)}><BeerMark className="results-mark" /> {filtered.length} vietas</Button>
          {rigaClock && (
            <section className="mobile-time-dock" aria-label="Kartes laiks">
              <div className="time-dock-label">
                <span>{timeIsLive ? 'Tagad' : selectedDayOffset ? 'Rīt' : 'Šodien'}</span>
                <strong>{formatClockTime(selectedMinuteOfDay)}</strong>
                {!timeIsLive && <button onClick={() => setTimeIsLive(true)}>Tagad</button>}
              </div>
              <div className="time-slider-wrap">
                {/* A native range cannot keep its thumb fixed while the scale scrolls beneath it. */}
                <div
                  ref={timeScrollerRef}
                  className="time-slider-scroller"
                  role="slider"
                  tabIndex={0}
                  aria-label="Izvēlēties laiku"
                  aria-valuemin={0}
                  aria-valuemax={timelineMaxMinutes}
                  aria-valuenow={selectedMinutes}
                  aria-valuetext={`${selectedDayOffset ? 'Rīt' : 'Šodien'} ${formatClockTime(selectedMinuteOfDay)}`}
                  onScroll={setTimelineFromScroll}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                    event.preventDefault();
                    moveTimeline(selectedMinutes + (event.key === 'ArrowRight' ? timelineStepMinutes : -timelineStepMinutes));
                  }}
                >
                  <div
                    className="time-slider-content"
                    style={{ width: timelineContentWidth }}
                    aria-hidden="true"
                  >
                    {timelineTicks.map((minutes, index) => (
                      <i
                        key={minutes}
                        className={minutes % 60 === 0 ? 'is-hour' : ''}
                        data-label={timelineTickLabel(minutes)}
                        style={{ left: timelineTickPosition(index) }}
                      />
                    ))}
                  </div>
                </div>
                <span className="time-slider-cursor" aria-hidden="true" />
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
