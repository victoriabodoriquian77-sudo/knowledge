import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// En GitHub Pages la app vive en /knowledge/, así que las rutas de los
// archivos se prefijan solo en ese build. En local sigue en la raíz.
const base = process.env.PAGES_BASE || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'KNOWLEDGE — aprender se siente bien',
        short_name: 'Knowledge',
        description: 'Plataforma de estudio activo: tarjetas, juegos, repaso espaciado y progreso real.',
        lang: 'es',
        theme_color: '#6a51c4',
        background_color: '#faf8f2',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { target: 'es2020', chunkSizeWarningLimit: 1600 },
})
