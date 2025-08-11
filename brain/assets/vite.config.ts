import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Root is this directory (brain/assets)
// OutDir is collected by Django staticfiles (settings.STATICFILES_DIRS includes assets/dist)
export default defineConfig(({ mode }) => ({
  root: __dirname,
  plugins: [react()],
  base: '/static/',
  build: {
    outDir: 'assets/dist',
    manifest: true,
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main.tsx'),
        deals_dashboard: resolve(__dirname, 'src/pages/deals_dashboard.tsx'),
        deal_detail: resolve(__dirname, 'src/pages/deal_detail.tsx'),
        company_detail: resolve(__dirname, 'src/pages/company_detail.tsx'),
        du_dashboard: resolve(__dirname, 'src/pages/du_dashboard.tsx'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
}))

