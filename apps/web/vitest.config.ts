// Vitest config (kept separate from vite.config.ts to avoid a dual-Vite
// type collision — see vite.config.ts header comment). Vitest auto-detects
// vitest.config.ts by name, so no wiring is required beyond this file.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
