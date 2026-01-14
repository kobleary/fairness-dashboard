import { defineConfig } from 'vite';

export default defineConfig({
  base: '/fairness-dashboard/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  }
});
