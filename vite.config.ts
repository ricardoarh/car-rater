/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Base path.
 * ------------------------------------------------------------------
 * Default is './' (relative), which means the built app works from ANY
 * sub-path without configuration — GitHub Pages project sites included.
 * Routing is hash based for the same reason: no server rewrite rules.
 *
 * If you ever need an absolute base (e.g. `/car-rater/`), set it at build
 * time:  VITE_BASE=/car-rater/ npm run build
 */
const base = process.env.VITE_BASE ?? './';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Car Rater',
        short_name: 'Car Rater',
        description: 'Find the one that feels right. Rate and shortlist the cars you test drive.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF8F4',
        theme_color: '#174E45',
        categories: ['lifestyle', 'utilities', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // _headers is a host directive, not an app asset.
        globIgnores: ['**/_headers'],
        // Hash routing means every navigation resolves to index.html.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/blob-polyfill.ts', './src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
