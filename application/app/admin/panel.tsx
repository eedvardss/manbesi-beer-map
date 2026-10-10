'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';

type Suggestion = {
  id: string;
  servingId: string;
  venueName: string;
  beerName: string;
  volumeMl: number | null;
  packageCount: number;
  priceIsFrom: boolean;
  oldCents: number;
  proposedCents: number;
  currentCents: number;
  note: string;
  evidenceUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  revision: number;
  actionable: boolean;
  canRevert: boolean;
  createdAt: string;
};
type Queue = {
  suggestions: Suggestion[];
  counts: { pending: number; approved: number; rejected: number };
  nextCursor: string | null;
};
type View = 'pending' | 'history';
type ApiError = Error & { status?: number };
const currency = new Intl.NumberFormat('lv-LV', {
  style: 'currency',
  currency: 'EUR',
});
const submittedAt = new Intl.DateTimeFormat('lv-LV', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const money = (cents: number) => currency.format(cents / 100);
async function api(
  path: string,
  body?: object,
  method = body ? 'POST' : 'GET',
  signal?: AbortSignal,
) {
  let response: Response;
  try {
    response = await fetch(`/api/price-review/${path}`, {
      method,
      cache: 'no-store',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
      ...(body
        ? {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        : {}),
    });
  } catch {
    throw new Error('Neizdevās sasniegt serveri. Mēģini vēlreiz.');
  }
  const data = (await response.json()) as Queue & { error?: string };
  if (!response.ok)
    throw Object.assign(new Error(data.error), { status: response.status });
  return data;
}
const statusLabels = {
  pending: 'Gaida pārbaudi',
  approved: 'Apstiprināts',
  rejected: 'Noraidīts',
};

function ReviewCard({
  item,
  onSaved,
  onExpired,
  disabled,
}: {
  item: Suggestion;
  onSaved: (action: string) => Promise<void>;
  onExpired: (message?: string) => void;
  disabled: boolean;
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
      await onSaved(decision);
    } catch (error) {
      if ([401, 403].includes((error as ApiError).status ?? 0)) onExpired((error as Error).message);
      else setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <article
      className="admin-report"
      data-suggestion-id={item.id}
      aria-busy={busy}
    >
      <div className="admin-report-summary">
        <div className="admin-report-title">
          <span className={`admin-status is-${item.status}`}>
            {statusLabels[item.status]}
          </span>
          <time dateTime={item.createdAt}>
            {submittedAt.format(new Date(item.createdAt))}
          </time>
        </div>
        <h2>{item.venueName}</h2>
        <p className="admin-serving">
          {item.beerName} ·{' '}
          {item.volumeMl
            ? `${item.packageCount > 1 ? `${item.packageCount} × ` : ''}${item.volumeMl} ml`
            : 'Tilpums nav norādīts'}
        </p>
        <div className="admin-price-comparison">
          <div>
            <span>Iesniegšanas brīdī</span>
            <strong>
              {item.priceIsFrom ? 'no ' : ''}
              {money(item.oldCents)}
            </strong>
          </div>
          <span aria-hidden="true">→</span>
          <div>
            <span>Ieteiktā cena</span>
            <strong>
              {item.priceIsFrom ? 'no ' : ''}
              {money(item.proposedCents)}
            </strong>
          </div>
        </div>
        {item.currentCents !== item.oldCents && (
          <p className="admin-current">
            Šobrīd kartē:{' '}
            <strong>
              {item.priceIsFrom ? 'no ' : ''}
              {money(item.currentCents)}
            </strong>
          </p>
        )}
        {item.note && <p className="admin-note">{item.note}</p>}
        {item.evidenceUrl && (
          <a
            className="admin-source"
            href={item.evidenceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Iesniegtais cenu avots ↗
          </a>
        )}
      </div>
      <div className="admin-report-decision">
        {item.status === 'pending' ? (
          <>
            <h3>Pārbaudīt un publicēt</h3>
            {!item.actionable && (
              <p className="price-error">
                Cena jau mainījusies. Šo ieteikumu nevar apstiprināt; lūdz jaunu
                ieteikumu.
              </p>
            )}
            <label htmlFor={`source-${item.id}`}>Pārbaudītais cenu avots</label>
            <input
              id={`source-${item.id}`}
              type="url"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              maxLength={1000}
              disabled={busy || disabled}
              placeholder="https://…"
            />
            <label htmlFor={`date-${item.id}`}>Avota pārbaudes datums</label>
            <input
              id={`date-${item.id}`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              disabled={busy || disabled}
            />
            <p className="price-help">
              Pārbaudi izvēlētās porcijas cenu. Apstiprinot tā uzreiz kļūs par
              publisko cenu.
            </p>
            <div className="admin-decision-actions">
              <button
                className="price-primary"
                disabled={
                  busy || disabled || !item.actionable || !source || !date
                }
                onClick={() => void action('approve')}
              >
                <Check size={16} aria-hidden="true" />
                Apstiprināt
              </button>
              <button
                className="admin-secondary"
                disabled={busy || disabled}
                onClick={() => void action('reject')}
              >
                Noraidīt
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>{item.canRevert ? 'Publicētā cena' : 'Ieteikums izskatīts'}</h3>
            <p className="admin-history-description">
              {item.canRevert
                ? 'Šī izmaiņa pašlaik ir redzama kartē.'
                : item.status === 'approved'
                  ? 'Apstiprinājums saglabāts vēsturē. Pašreizējā cena var būt mainīta vēlāk.'
                  : 'Ieteikums noraidīts. Tas nemainīja publisko cenu.'}
            </p>
            {item.canRevert && (
              <button
                className="admin-secondary"
                disabled={busy || disabled}
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
          </>
        )}
        {error && (
          <p className="price-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}

export default function AdminPanel({
  signOut,
}: {
  signOut: () => Promise<void>;
}) {
  const [auth, setAuth] = useState<'checking' | 'out' | 'in' | 'unavailable'>(
    'checking',
  );
  const [queue, setQueue] = useState<Queue | null>(null);
  const [view, setView] = useState<View>('pending');
  const [cursor, setCursor] = useState<string | null>(null);
  const [previous, setPrevious] = useState<(string | null)[]>([]);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  const expired = (reason = 'Sesija beigusies. Pieslēdzies vēlreiz.') => {
    request.current?.abort();
    setBusy(false);
    setAuth('out');
    setQueue(null);
    setMessage('');
    setError(reason);
  };
  const load = async (
    nextView = view,
    nextCursor = cursor,
    nextSearch = appliedSearch,
  ) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    const query = new URLSearchParams({ view: nextView, search: nextSearch });
    if (nextCursor) query.set('cursor', nextCursor);
    try {
      const data = await api(
        `suggestions?${query}`,
        undefined,
        'GET',
        controller.signal,
      );
      if (controller.signal.aborted) return false;
      setQueue(data);
      setAuth('in');
      setView(nextView);
      setCursor(nextCursor);
      setAppliedSearch(nextSearch);
      return true;
    } catch (error) {
      if (!controller.signal.aborted) {
        if ([401, 403].includes((error as ApiError).status ?? 0)) expired((error as Error).message);
        else setError((error as Error).message);
      }
      return false;
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    void api('suggestions?view=pending', undefined, 'GET', controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setQueue(data);
          setAuth('in');
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setAuth(error.status === 401 ? 'out' : 'unavailable');
          if (error.status !== 401) setError(error.message);
        }
      });
    return () => request.current?.abort();
  }, []);
  const logout = async () => {
    request.current?.abort();
    setQueue(null);
    setAuth('out');
    await signOut();
  };
  const saved = async (action: string) => {
    setMessage(
      action === 'approve'
        ? 'Cena apstiprināta un publicēta kartē.'
        : action === 'reject'
          ? 'Ieteikums noraidīts.'
          : 'Iepriekšējā cena atjaunota.',
    );
    setPrevious([]);
    await load(view, null);
  };
  const switchView = async (next: View) => {
    if (await load(next, null, '')) {
      setPrevious([]);
      setSearch('');
    }
  };
  return (
    <main className="admin-shell">
      <div className="admin-container">
        <nav className="admin-navigation" aria-label="Administrēšana">
          <Link href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Rīgas alus karte
          </Link>
          <span>
            <ShieldCheck size={16} aria-hidden="true" />
            Administrēšana
          </span>
          {auth === 'in' && (
            <button
              className="admin-secondary"
              onClick={() => void logout()}
              disabled={busy}
            >
              <LogOut size={16} aria-hidden="true" />
              Iziet
            </button>
          )}
        </nav>
        {auth === 'checking' ? (
          <output className="admin-loading">Pārbauda pieslēgšanos…</output>
        ) : auth === 'unavailable' ? (
          <section className="admin-login">
            <ShieldCheck size={28} aria-hidden="true" />
            <h1>Administrēšana nav pieejama</h1>
            <p className="price-error" role="alert">
              {error}
            </p>
            <button
              className="price-primary"
              onClick={() => void load('pending', null, '')}
            >
              Mēģināt vēlreiz
            </button>
          </section>
        ) : auth === 'out' ? (
          <section className="admin-login">
            <h1>Pieslēdzies vēlreiz</h1>
            <p role="alert">{error}</p>
            <button className="price-primary" onClick={() => void logout()}>
              Pieslēgties ar paroli un autentifikatora kodu
            </button>
          </section>
        ) : (
          <>
            <header className="admin-heading">
              <div>
                <p className="admin-eyebrow">ADMINISTRATORA PANELIS</p>
                <h1>Cenu ieteikumi</h1>
                <p>Lietotāji iesaka. Tu pārbaudi un publicē.</p>
              </div>
              <button
                className="admin-secondary"
                onClick={() => void load()}
                disabled={busy}
                aria-label="Atjaunot ieteikumus"
              >
                <RefreshCw size={16} aria-hidden="true" />
                {busy ? 'Atjauno…' : 'Atjaunot'}
              </button>
            </header>
            {message && (
              <output className="admin-notice">
                <Check size={16} aria-hidden="true" />
                {message}
              </output>
            )}
            {error && (
              <p className="price-error" role="alert">
                {error}
              </p>
            )}
            <div className="admin-toolbar">
              <fieldset
                className="admin-view-buttons"
                aria-label="Ieteikumu skats"
              >
                <button
                  aria-pressed={view === 'pending'}
                  disabled={busy}
                  onClick={() => void switchView('pending')}
                >
                  Gaida pārbaudi <span>{queue?.counts.pending ?? 0}</span>
                </button>
                <button
                  aria-pressed={view === 'history'}
                  disabled={busy}
                  onClick={() => void switchView('history')}
                >
                  Vēsture{' '}
                  <span>
                    {(queue?.counts.approved ?? 0) +
                      (queue?.counts.rejected ?? 0)}
                  </span>
                </button>
              </fieldset>
              <form
                className="admin-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  void load(view, null, search.trim()).then((ok) => {
                    if (ok) setPrevious([]);
                  });
                }}
              >
                <Search size={16} aria-hidden="true" />
                <input
                  aria-label="Meklēt ieteikumus"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Bārs vai alus…"
                  maxLength={100}
                />
                <button type="submit" disabled={busy}>
                  Meklēt
                </button>
              </form>
            </div>
            <section
              className="admin-queue"
              aria-label={
                view === 'pending'
                  ? 'Ieteikumi pārbaudei'
                  : 'Izskatīto ieteikumu vēsture'
              }
              aria-busy={busy}
            >
              {!queue ? (
                <div className="admin-empty">
                  <h2>Ieteikumi nav ielādēti</h2>
                  <p>Atjauno sarakstu, lai mēģinātu vēlreiz.</p>
                </div>
              ) : queue.suggestions.length ? (
                queue.suggestions.map((item) => (
                  <ReviewCard
                    key={`${item.id}:${item.status}:${item.revision}`}
                    item={item}
                    onSaved={saved}
                    onExpired={expired}
                    disabled={busy}
                  />
                ))
              ) : (
                <div className="admin-empty">
                  <ShieldCheck size={30} aria-hidden="true" />
                  <h2>
                    {appliedSearch
                      ? 'Nekas netika atrasts'
                      : view === 'pending'
                        ? 'Visi ieteikumi izskatīti'
                        : 'Vēsture vēl ir tukša'}
                  </h2>
                  <p>
                    {appliedSearch
                      ? 'Pamēģini citu bāra vai alus nosaukumu.'
                      : view === 'pending'
                        ? 'Jauni lietotāju ieteikumi parādīsies šeit.'
                        : 'Apstiprinātie un noraidītie ieteikumi parādīsies šeit.'}
                  </p>
                  {appliedSearch && (
                    <button
                      className="admin-secondary"
                      disabled={busy}
                      onClick={() =>
                        void load(view, null, '').then((ok) => {
                          if (ok) {
                            setSearch('');
                            setPrevious([]);
                          }
                        })
                      }
                    >
                      Notīrīt meklēšanu
                    </button>
                  )}
                </div>
              )}
            </section>
            {(previous.length > 0 || queue?.nextCursor) && (
              <nav className="admin-pagination" aria-label="Ieteikumu lapas">
                <button
                  className="admin-secondary"
                  disabled={busy || previous.length === 0}
                  onClick={() =>
                    void load(view, previous.at(-1) ?? null).then((ok) => {
                      if (ok) setPrevious((values) => values.slice(0, -1));
                    })
                  }
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Iepriekšējā
                </button>
                <span>Lapa {previous.length + 1}</span>
                <button
                  className="admin-secondary"
                  disabled={busy || !queue?.nextCursor}
                  onClick={() => {
                    const next = queue?.nextCursor;
                    if (next)
                      void load(view, next).then((ok) => {
                        if (ok) setPrevious((values) => [...values, cursor]);
                      });
                  }}
                >
                  Nākamā
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
