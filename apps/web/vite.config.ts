// Vitest's `test` config lives in vitest.config.ts (sibling file) because
// vitest@2 bundles Vite 5 internally; mixing vitest/config types with our
// Vite 8 `defineConfig` produces a dual-vite-version type clash. Keeping the
// two configs separate avoids the conflict entirely.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // /api/* is routed to the Hono Worker (apps/api) in dev.
      // Staging Pages calls the deployed staging Worker directly when no
      // VITE_API_BASE_URL is configured; this proxy only preserves local
      // same-origin /api behavior during development.
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
