'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
type Suggestion = {
  id: string;
  servingId: string;
  venueName: string;
  beerName: string;
  volumeMl: number | null;
  packageCount: number;
  oldCents: number;
  proposedCents: number;
  note: string;
  evidenceUrl: string;
  status: string;
  revision: number;
  actionable: boolean;
  canRevert: boolean;
  createdAt: string;
};
const money = (cents: number) =>
  new Intl.NumberFormat('lv-LV', { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
async function api(
  path: string,
  body?: object,
  method = body ? 'POST' : 'GET',
) {
  const response = await fetch(`/api/price-review/${path}`, {
    method,
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
    ...(body
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = (await response.json()) as {
    error?: string;
    suggestions: Suggestion[];
  };
  if (!response.ok)
    throw Object.assign(new Error(data.error), { status: response.status });
  return data;
}
function ReviewCard({
  item,
  onSaved,
}: {
  item: Suggestion;
  onSaved: () => Promise<void>;
}) {
  const [source, setSource] = useState(item.evidenceUrl);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const action = async (decision: string) => {
    setBusy(true);
    setError('');
    try {
      await api('action', {
        action: decision,
        id: item.id,
        servingId: item.servingId,
        revision: item.revision,
        evidenceUrl: source,
        observedOn: date,
      });
      await onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="review-card" data-suggestion-id={item.id}>
      <header>
        <h2>{item.venueName}</h2>
        <span className="review-status">
          {item.status === 'pending'
            ? 'Gaida pārbaudi'
            : item.status === 'approved'
              ? 'Apstiprināts'
              : 'Noraidīts'}
        </span>
      </header>
      <p>
        {item.beerName} ·{' '}
        {item.volumeMl
          ? `${item.packageCount} × ${item.volumeMl} ml`
          : 'Tilpums nav norādīts'}
      </p>
      <p className="review-price">
        {money(item.oldCents)} → <strong>{money(item.proposedCents)}</strong>
      </p>
      {item.note && <p>{item.note}</p>}
      {item.evidenceUrl && (
        <a href={item.evidenceUrl} target="_blank" rel="noreferrer">
          Iesniegtais avots ↗
        </a>
      )}
      {item.status === 'pending' && (
        <>
          {!item.actionable && (
            <p className="price-error">
              Cena jau mainījusies. Šo ieteikumu nevar automātiski apstiprināt.
            </p>
          )}
          <label htmlFor={`source-${item.id}`}>Pārbaudītais cenu avots</label>
          <input
            id={`source-${item.id}`}
            type="url"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            maxLength={1000}
            disabled={busy}
          />
          <label htmlFor={`date-${item.id}`}>Avota pārbaudes datums</label>
          <input
            id={`date-${item.id}`}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            disabled={busy}
          />
          <p className="price-help">
            Apstiprini tikai pēc izvēlētās porcijas cenas pārbaudes avotā.
          </p>
          <div className="review-actions">
            <button
              className="price-primary"
              disabled={busy || !item.actionable || !source || !date}
              onClick={() => void action('approve')}
            >
              Apstiprināt
            </button>
            <button disabled={busy} onClick={() => void action('reject')}>
              Noraidīt
            </button>
          </div>
        </>
      )}
      {item.canRevert && (
        <button
          disabled={busy}
          onClick={() => {
            if (
              window.confirm(
                'Atjaunot cenu pirms šīs izmaiņas? Darbība tiks saglabāta vēsturē.',
              )
            )
              void action('revert');
          }}
        >
          Atjaunot iepriekšējo cenu
        </button>
      )}
      {error && (
        <p className="price-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
export default function PriceReview() {
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = async () => {
    const data = await api('suggestions');
    setItems(data.suggestions);
  };
  useEffect(() => {
    void api('suggestions')
      .then((data) => setItems(data.suggestions))
      .catch((error) => {
        if (error.status !== 401) setError(error.message);
      });
  }, []);
  const login = async () => {
    setBusy(true);
    setError('');
    try {
      await api('session', { password });
      setPassword('');
      await load();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const saved = async () => {
    await load();
    setMessage('Izmaiņa saglabāta.');
  };
  return (
    <main className="price-review-shell">
      <Link href="/">← Atpakaļ uz karti</Link>
      <header className="review-heading">
        <div>
          <h1>Cenu ieteikumu pārbaude</h1>
          <p>Pārbaudi avotu pirms cenas publicēšanas.</p>
        </div>
        {items && (
          <button
            onClick={() =>
              void api('session', undefined, 'DELETE')
                .then(() => {
                  setItems(null);
                  setMessage('');
                })
                .catch((error) => setError(error.message))
            }
          >
            Iziet
          </button>
        )}
      </header>
      {!items ? (
        <form
          className="review-login"
          onSubmit={(event) => {
            event.preventDefault();
            void login();
          }}
        >
          <label htmlFor="review-password">Pārbaudītāja parole</label>
          <input
            id="review-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            maxLength={256}
          />
          <button className="price-primary" disabled={busy}>
            {busy ? 'Pieslēdzas…' : 'Pieslēgties'}
          </button>
        </form>
      ) : (
        <>
          <button
            onClick={() =>
              void load().catch((error) => {
                setError(error.message);
                if (error.status === 401) setItems(null);
              })
            }
          >
            Atjaunot ieteikumus
          </button>
          {message && <output>{message}</output>}
          {!items.length && <p>Nav iesniegtu ieteikumu.</p>}
          {items.map((item) => (
            <ReviewCard
              key={`${item.id}:${item.status}:${item.revision}`}
              item={item}
              onSaved={saved}
            />
          ))}
        </>
      )}
      {error && (
        <p className="price-error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
