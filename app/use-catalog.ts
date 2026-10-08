'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCatalog, type CatalogSnapshot } from './catalog-client';

export function useCatalog() {
  const [snapshot, setSnapshot] = useState<CatalogSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const current = useRef<CatalogSnapshot | null>(null);
  const request = useRef<AbortController | null>(null);
  const lastRefresh = useRef(0);

  const refresh = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    const timeout = window.setTimeout(() => controller.abort(new Error('Catalog request timed out')), 15000);
    try {
      const next = await fetchCatalog(current.current, controller.signal);
      if (request.current !== controller) return;
      current.current = next;
      lastRefresh.current = Date.now();
      setSnapshot(next);
      setFailed(false);
    } catch {
      if (request.current === controller) setFailed(true);
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh.current > 30000) void refresh();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      const active = request.current;
      request.current = null;
      active?.abort();
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);
  return { catalog: snapshot?.catalog ?? null, loading, failed, refresh };
}
