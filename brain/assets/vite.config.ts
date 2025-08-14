import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// Root is this directory (brain/assets)
// OutDir is collected by Django staticfiles (settings.STATICFILES_DIRS includes assets/dist)
export default defineConfig(({ mode }) => ({
    root: __dirname,
    plugins: [
        react({
            babel: {
                plugins: [
                    [
                        'babel-plugin-react-compiler',
                        {
                            // Switch to infer mode for automatic optimization
                            // Compiler automatically detects components/hooks by naming patterns
                            mode: 'infer',
                        },
                    ],
                ],
            },
        }),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    base: '/static/',
    build: {
        outDir: 'assets/dist',
        manifest: true,
        emptyOutDir: false,
        rollupOptions: {
            input: {
                // Single entry point approach - only main.tsx is needed
                main: resolve(__dirname, 'src/main.tsx'),
                // TODO: Remove these after migrating all pages to single-entry
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
}));
