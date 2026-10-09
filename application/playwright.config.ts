import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: fileURLToPath(new URL('../playwright', import.meta.url)),
  testMatch: '**/*.spec.mjs',
  outputDir: fileURLToPath(new URL('./output/playwright/test-results', import.meta.url)),
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 10_000 },
  use: { viewport: { width: 1280, height: 900 }, trace: 'on', screenshot: 'only-on-failure' },
});
