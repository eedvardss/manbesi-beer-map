import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig(({ command, mode }) => ({
  build: { sourcemap: false },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [
    vinext(),
    ...(mode === 'docker'
      ? []
      : [
          cloudflare({
            viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
            // wrangler.jsonc sets run_worker_first so production can blank the public
            // hostnames. In `vite dev` that would route Vite's own CSS/JS/public files
            // through the Worker, which 404s them, so let Vite serve them locally.
            ...(command === 'serve' ? { config: (config) => ({ assets: { ...config.assets, run_worker_first: false } }) } : {}),
          }),
        ]),
  ],
}));
