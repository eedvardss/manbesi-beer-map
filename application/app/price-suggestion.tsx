'use client';
import { useEffect, useRef, useState } from 'react';
import { parsePrice } from '../lib/price-input';
import type { BeerPrice } from './venue-model';

export type SuggestionTarget = { venueName: string; beer: BeerPrice };
const format = (price: number) =>
  new Intl.NumberFormat('lv-LV', { style: 'currency', currency: 'EUR' }).format(
    price,
  );
export default function PriceSuggestion({
  target,
  onClose,
  onRefresh,
}: {
  target: SuggestionTarget;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submission = useRef<{ signature: string; id: string } | null>(null);
  const [beer, setBeer] = useState(target.beer);
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [source, setSource] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const prepare = async () => {
    try {
      const response = await fetch('/api/prices/session', {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Unavailable');
      setReady(true);
      setError('');
    } catch {
      setError('Ieteikumus neizdevās ielādēt. Mēģini vēlreiz.');
    }
  };
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    const controller = new AbortController();
    void fetch('/api/prices/session', {
      cache: 'no-store',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    })
      .then((response) => {
        if (!response.ok) throw new Error('Unavailable');
        setReady(true);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Ieteikumus neizdevās ielādēt. Mēģini vēlreiz.');
      });
    return () => {
      controller.abort();
      element.close();
    };
  }, []);
  const submit = async () => {
    setError('');
    try {
      parsePrice(price);
    } catch (error) {
      setError((error as Error).message);
      return;
    }
    const fields = {
      servingId: beer.id,
      revision: beer.revision ?? 0,
      price,
      note,
      evidenceUrl: source,
    };
    const signature = JSON.stringify(fields);
    if (submission.current?.signature !== signature)
      submission.current = { signature, id: crypto.randomUUID() };
    setBusy(true);
    try {
      const response = await fetch('/api/prices/suggestions', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, requestId: submission.current.id }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        if (response.status === 409) {
          await onRefresh();
          const latest = await fetch('/api/venues', {
            cache: 'no-store',
            signal: AbortSignal.timeout(15000),
          });
          if (latest.ok) {
            const data = (await latest.json()) as {
              venues: { beers: BeerPrice[] }[];
            };
            const current = data.venues
              .flatMap((v) => v.beers)
              .find((b) => b.id === beer.id);
            if (current) setBeer(current);
          }
        }
        throw new Error(result.error ?? 'Neizdevās saglabāt.');
      }
      setSaved(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Neizdevās saglabāt. Mēģini vēlreiz.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="price-dialog"
      aria-labelledby="price-heading"
      onCancel={onClose}
      onClose={onClose}
    >
      <div className="price-dialog-head">
        <h2 id="price-heading">Ieteikt cenu</h2>
        <button
          type="button"
          className="price-close"
          aria-label="Aizvērt cenas ieteikumu"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="price-target">
        <strong>{target.venueName}</strong>
        <span>
          {beer.name} ·{' '}
          {beer.volumeMl
            ? `${beer.packageCount ?? 1} × ${beer.volumeMl} ml`
            : 'Tilpums nav norādīts'}
        </span>
      </p>
      {saved ? (
        <div className="price-success">
          <output>
            <strong>Ieteikums saglabāts</strong>
          </output>
          <p>
            Pēc avota pārbaudes jaunā cena parādīsies kartē. Pašreizējā cena
            līdz tam nemainās.
          </p>
          <button className="price-primary" onClick={onClose}>
            Gatavs
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <p className="price-current">
            Pašreizējā cena:{' '}
            <strong>
              {beer.priceIsFrom ? 'no ' : ''}
              {format(beer.price)}
            </strong>
          </p>
          <label htmlFor="suggested-price">Jaunā cena, EUR</label>
          <input
            id="suggested-price"
            inputMode="decimal"
            placeholder="Piemēram, 4,50"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            maxLength={7}
            required
            autoFocus
            disabled={busy}
          />
          <label htmlFor="price-source">
            Cenu avota saite <small>(ja pieejama)</small>
          </label>
          <input
            id="price-source"
            type="url"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            maxLength={1000}
            placeholder="https://…"
            disabled={busy}
          />
          <label htmlFor="price-note">
            Piezīme <small>(nav obligāta)</small>
          </label>
          <textarea
            id="price-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Kur un kad redzēji šo cenu?"
            disabled={busy}
          />
          <p className="price-help">
            Ieteikumu pārbaudīsim pirms cenas maiņas. Norādi cenu par izvēlēto
            porciju.
          </p>
          {error && (
            <p className="price-error" role="alert">
              {error}
            </p>
          )}
          {!ready && error && (
            <button type="button" onClick={() => void prepare()}>
              Mēģināt vēlreiz
            </button>
          )}
          <button
            className="price-primary"
            type="submit"
            disabled={busy || !ready}
          >
            {busy ? 'Saglabā…' : 'Nosūtīt ieteikumu'}
          </button>
        </form>
      )}
    </dialog>
  );
}
