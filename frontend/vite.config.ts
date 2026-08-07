/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Strength Guider',
        short_name: 'Strength Guider',
        description: 'Evidence-based training blocks, planned by you',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/v1\//],
        runtimeCaching: [
          {
            // API responses are per-user and must never be served from cache:
            // the cache outlives logout, so the next account on the device
            // would read the previous one's data, and a cached 200 also hides
            // the "can't reach server" banner while showing hours-old state.
            urlPattern: /\/v1\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // The build output is a copy of src; without this every test runs twice
    exclude: ['node_modules', 'dist'],
    // Pinned, and deliberately not UTC. Dates here are built from local parts
    // because a block started on a weekday evening west of UTC must not be
    // dated tomorrow, and a suite running in UTC cannot tell the difference
    // between that and the toISOString it replaced. CI runs in UTC, so
    // without this the timezone tests pass by accident.
    env: { TZ: 'America/Los_Angeles' },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
