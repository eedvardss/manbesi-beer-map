import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const workspaceStart = page.indexOf('<section className="workspace">');
const sidebarStart = page.indexOf('<aside className={`sidebar');
const scrimStart = page.indexOf('{mobileListOpen && <button className="mobile-scrim"');

assert(workspaceStart !== -1, 'Workspace markup is missing');
assert(sidebarStart !== -1, 'Sidebar markup is missing');
assert(scrimStart > workspaceStart && scrimStart < sidebarStart,
  'Mobile scrim must be inside the workspace and behind the sidebar');
assert.match(page, /offset: mobileMarkerOffset\(detailHeight\)/,
  'Mobile marker selection must account for the expanded marker dimensions');

console.log('Mobile interaction layering and centering checks passed.');
