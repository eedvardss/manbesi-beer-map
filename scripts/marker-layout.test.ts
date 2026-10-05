import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutMarkerGroups, markerGroupsOverlap, type MarkerPoint } from '../app/marker-layout';
import { mapVenues } from '../app/venues';

await test('crowded labels become counts while isolated venues keep their exact identity', () => {
  const groups = layoutMarkerGroups([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 12, y: 5 }, { id: 'c', x: 300, y: 0 }]);
  assert.deepEqual(groups.map(g => g.ids), [['a', 'b'], ['c']]);
  assert.equal(groups[0].x, 6);
  assert.equal(groups[0].y, 2.5);
});

await test('membership is invariant under panning and source order', () => {
  const points = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 12, y: 5 }, { id: 'c', x: 300, y: 0 }];
  const expected = layoutMarkerGroups(points);
  const translated = layoutMarkerGroups([...points].reverse().map(p => ({ ...p, x: p.x + 1200, y: p.y - 400 })));
  assert.deepEqual(translated.map(g => g.ids), expected.map(g => g.ids));
  translated.forEach((g, i) => { assert.equal(g.x, expected[i].x + 1200); assert.equal(g.y, expected[i].y - 400); });
});

await test('selected and keyboard-focused venues remain individually reachable', () => {
  const groups = layoutMarkerGroups([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 1, y: 1 }, { id: 'c', x: 2, y: 2 }], new Set(['b']));
  assert.deepEqual(groups.map(g => g.ids), [['a', 'c'], ['b']]);
  assert.equal(groups[1].protected, true);
});

await test('zooming separates prices, while identical coordinates retain every venue', () => {
  const points = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 15, y: 0 }];
  assert.equal(layoutMarkerGroups(points).length, 1);
  assert.equal(layoutMarkerGroups(points.map(p => ({ ...p, x: p.x * 8 }))).length, 2);
  assert.deepEqual(layoutMarkerGroups(Array.from({ length: 40 }, (_, i) => ({ id: String(i), x: 0, y: 0 })))[0].ids.length, 40);
  assert.deepEqual(layoutMarkerGroups([]), []);
});

await test('real catalog groups preserve all IDs once and leave no overlapping settled labels', () => {
  // Mercator points at the product overview zoom, independent of viewport translation.
  for (const zoom of [10, 13, 16, 19]) {
    const scale = 512 * 2 ** zoom;
    const points: MarkerPoint[] = mapVenues.map(v => {
      const sin = Math.sin(v.lat * Math.PI / 180);
      return { id: v.id, x: (v.lng + 180) / 360 * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
    });
    const groups = layoutMarkerGroups(points);
    assert.deepEqual(groups.flatMap(g => g.ids).sort(), mapVenues.map(v => v.id).sort());
    groups.forEach((a, i) => groups.slice(i + 1).forEach(b => assert(!markerGroupsOverlap(a, b))));
    assert(groups.every(g => Number.isFinite(g.x) && Number.isFinite(g.y)));
  }
});
