import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'وزن | گنجینه شعر فارسی',
        short_name: 'وزن',
        description: 'خوانش و جستجوی آفلاین شعر و ادب فارسی',
        theme_color: '#faf7f0',
        background_color: '#121214',
        display: 'standalone',
        start_url: './',
        scope: './',
        dir: 'rtl',
        lang: 'fa',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
});
