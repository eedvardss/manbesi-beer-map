import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig(({ mode }) => ({
  build: { sourcemap: false },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [vinext(), ...(mode === 'docker' ? [] : [cloudflare({ viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] } })])],
}));
