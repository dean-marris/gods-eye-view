// Build the prototype alongside the original globe without changing its config.
import { defineConfig, mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import base from './server/standalone/vite.config.js';

export default defineConfig(async (environment) =>
  mergeConfig(
    typeof base === 'function' ? await base(environment) : await base,
    {
      build: {
        rollupOptions: {
          input: {
            globe: fileURLToPath(new URL('./index.html', import.meta.url)),
            seeo: fileURLToPath(new URL('./seeo-demo.html', import.meta.url)),
            loading: fileURLToPath(new URL('./loading-comparison.html', import.meta.url)),
            comparison: fileURLToPath(new URL('./dispatch-comparison.html', import.meta.url)),
          },
        },
      },
    },
  ),
);
