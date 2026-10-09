import { chromium } from '@playwright/test';
import { mapInteractions } from './map-interactions.mjs';
const headed = process.argv.includes('--headed');
const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 350 : 0 });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await mapInteractions(page, process.env.BEER_MAP_TEST_URL ?? (headed ? 'http://127.0.0.1:3010/' : 'http://localhost:3000/'));
} finally { await browser.close(); }
