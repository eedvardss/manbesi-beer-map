/** Screen-space groups match the real 74×34 price capsules and 64×44 count buttons.
 * Run on settled zoom/resize or result changes; panning only translates the groups.
 * A count represents venues, never an estimated or averaged price.
 */
export type MarkerPoint = { id: string; x: number; y: number };
export type MarkerGroup = { ids: string[]; x: number; y: number; protected: boolean };
const dimensions = (group: MarkerGroup) => group.ids.length === 1 ? [74, 34] : [64, 44];
export function markerGroupsOverlap(a: MarkerGroup, b: MarkerGroup): boolean {
  const [aw, ah] = dimensions(a);
  const [bw, bh] = dimensions(b);
  // Eight pixels of separation also leaves room for hover/focus outlines.
  return Math.abs(a.x - b.x) < (aw + bw) / 2 + 8
    && Math.abs(a.y - b.y) < (ah + bh) / 2 + 8;
}

export function layoutMarkerGroups(points: readonly MarkerPoint[], retainedIds: ReadonlySet<string> = new Set()): MarkerGroup[] {
  // Source IDs make membership independent of price/name sort and input order.
  const groups: MarkerGroup[] = [...points].sort((a, b) => a.id.localeCompare(b.id)).map((point) => ({
    ids: [point.id], x: point.x, y: point.y, protected: retainedIds.has(point.id),
  }));
  let merged = true;
  while (merged) {
    merged = false;
    // Each pass removes one group. Recheck after moving its weighted centroid;
    // a newly merged count can collide with a previously separate capsule.
    outer: for (let i = 0; i < groups.length; i++) {
      const a = groups[i];
      if (a.protected) continue;
      for (let j = i + 1; j < groups.length; j++) {
        const b = groups[j];
        if (b.protected || !markerGroupsOverlap(a, b)) continue;
        const count = a.ids.length + b.ids.length;
        a.x = (a.x * a.ids.length + b.x * b.ids.length) / count;
        a.y = (a.y * a.ids.length + b.y * b.ids.length) / count;
        a.ids.push(...b.ids);
        groups.splice(j, 1);
        merged = true;
        break outer;
      }
    }
  }
  for (const group of groups) group.ids.sort();
  return groups;
}
