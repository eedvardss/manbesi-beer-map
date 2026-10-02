// Keep the renderer out of the page's hydration path. Load it after the
// useful search/list UI mounts, with the self-contained v6 worker.
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
setWorkerUrl(workerUrl);
export { Map, Marker, NavigationControl } from 'maplibre-gl';
