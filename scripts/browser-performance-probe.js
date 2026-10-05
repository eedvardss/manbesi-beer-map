/* Local profiling only; injected by serve-browser-performance.mjs, never imported by the app. */
(() => {
  const limit = 1000;
  const probe = window.__beerMapPerf = {
    version: 2, checkpoints: [], longTasks: [], events: [], inputs: [], actions: [], lcp: [], frameWindows: [],
    supported: PerformanceObserver.supportedEntryTypes,
  };
  const keep = (list, value) => { if (list.length < limit) list.push(value); };
  for (const type of ['longtask', 'event', 'largest-contentful-paint']) {
    if (!probe.supported.includes(type)) continue;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (type === 'longtask') keep(probe.longTasks, { start: entry.startTime, duration: entry.duration });
        if (type === 'event') keep(probe.events, {
          name: entry.name, start: entry.startTime, duration: entry.duration,
          processingStart: entry.processingStart, processingEnd: entry.processingEnd, interactionId: entry.interactionId,
        });
        if (type === 'largest-contentful-paint') keep(probe.lcp, { start: entry.startTime, size: entry.size, tag: entry.element?.tagName });
      }
    }).observe(type === 'event' ? { type, buffered: true, durationThreshold: 16 } : { type, buffered: true });
  }
  const state = () => ({
    count: document.querySelector('.result-tools strong')?.textContent,
    markers: document.querySelectorAll('.price-marker').length,
    detail: document.querySelector('.marker-detail-head strong')?.textContent,
  });
  const marked = new Set();
  const mark = (name) => {
    if (marked.has(name)) return;
    marked.add(name);
    const detected = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => keep(probe.checkpoints, { name, detected, frameOpportunity: performance.now() })));
  };
  const inspect = () => {
    if (state().count === '165 vietas' && document.querySelector('input[aria-label="Meklēt vietas"]')) mark('server-content');
    if (document.querySelector('.mobile-time-dock')) mark('client-controls');
    if (state().markers === 165) mark('prices-attached');
    if (document.querySelector('.marker-detail-footer')) mark('venue-detail');
    // Retain the original all-prices + loading-complete endpoint for comparison.
    if (state().markers === 165 && !document.querySelector('.map-load-state')) mark('price-markers');
  };
  const mutations = new MutationObserver(() => {
    inspect();
    if (marked.has('price-markers')) mutations.disconnect();
  });
  mutations.observe(document, { childList: true, subtree: true });
  inspect();
  document.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.type !== 'text') return;
    const start = performance.now();
    const value = event.target.value;
    requestAnimationFrame(() => requestAnimationFrame(() => keep(probe.inputs, {
      value, start, frameOpportunity: performance.now(), latency: performance.now() - start, ...state(), trusted: event.isTrusted,
    })));
  }, true);
  document.addEventListener('click', (event) => {
    const control = event.target instanceof Element ? event.target.closest('button,[role="option"]') : null;
    if (!control) return;
    const start = performance.now();
    const label = control.getAttribute('aria-label') || control.textContent?.trim();
    requestAnimationFrame(() => requestAnimationFrame(() => keep(probe.actions, {
      label, start, frameOpportunity: performance.now(), latency: performance.now() - start, ...state(), trusted: event.isTrusted,
    })));
  }, true);
  // Only bounded gesture windows; rAF opportunities are not compositor-delivered frames.
  let gesture;
  document.addEventListener('pointerdown', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('.map')) return;
    gesture = { start: performance.now(), end: null, gaps: [], deadline: performance.now() + 2500 };
    keep(probe.frameWindows, gesture);
    let previous;
    const window = gesture;
    const sample = (time) => {
      if (time > window.deadline) return;
      if (previous !== undefined) keep(window.gaps, time - previous);
      previous = time;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, true);
  document.addEventListener('pointerup', () => {
    if (!gesture) return;
    gesture.end = performance.now();
    gesture.deadline = Math.min(gesture.deadline, gesture.end + 900);
    gesture = undefined;
  }, true);
  probe.read = () => ({
    version: probe.version, checkpoints: probe.checkpoints, longTasks: probe.longTasks,
    events: probe.events, inputs: probe.inputs, actions: probe.actions, lcp: probe.lcp, frameWindows: probe.frameWindows,
    supported: probe.supported, state: state(), now: performance.now(),
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    runtime: { userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency, visibility: document.visibilityState },
    nav: performance.getEntriesByType('navigation').map((entry) => ({
      responseStart: entry.responseStart, responseEnd: entry.responseEnd, domContentLoaded: entry.domContentLoadedEventEnd,
      load: entry.loadEventEnd, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize,
    })),
    paint: performance.getEntriesByType('paint').map((entry) => ({ name: entry.name, start: entry.startTime })),
    resources: performance.getEntriesByType('resource').map((entry) => ({
      url: entry.name, initiator: entry.initiatorType, start: entry.startTime, duration: entry.duration,
      transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize,
    })),
  });
  probe.save = async (label, extra = {}) => {
    const response = await fetch('/_beer-map-performance/report', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-beer-map-probe': '__BEER_MAP_PROBE_TOKEN__' },
      body: JSON.stringify({ label, measurement: probe.read(), extra }),
    });
    if (!response.ok) throw new Error(`Local report failed: ${response.status}`);
    return response.json();
  };
})();
