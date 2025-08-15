// Minimal bootstrap for hybrid setup. Avoid external deps to keep repo install-light.
import './styles/tailwind.css';

// Extend window for single-entry mode flag and React refresh runtime
declare global {
    interface Window {
        __SINGLE_ENTRY_MODE__?: boolean;
        $RefreshReg$?: (type: unknown, id: string) => void;
        $RefreshSig$?: () => (type: unknown) => unknown;
    }
}

// Page modules registry - lazy loaded for code splitting
const pageModules = {
    '_company-detail': () => import('./pages/company_detail'),
    '_grant-create': () => import('./pages/company_detail'),
    // Future migrations:
    '_deals-dashboard': () => import('./pages/deals_dashboard'),
    '_deals-list': () => import('./pages/deals_list'),
    '_deals-fresh': () => import('./pages/deals_fresh'),
    '_deals-reviewed': () => import('./pages/deals_reviewed'),
    '_deal-detail': () => import('./pages/deal_detail'),
    '_deal-assessment': () => import('./pages/deal_assessment'),
    '_deal-upload': () => import('./pages/deal_upload'),
    '_du-dashboard': () => import('./pages/du_dashboard'),
    '_founders-list': () => import('./pages/founders'),
    '_advisors-list': () => import('./pages/advisors'),
    '_research-agent': () => import('./pages/research_agent'),
    _library: () => import('./pages/library'),
    '_library-new': () => import('./pages/library_new'),
} as const;

// Page initialization system
async function initializePage() {
    const bodyId = document.body.id;

    if (bodyId && bodyId in pageModules) {
        try {
            const module = await pageModules[bodyId as keyof typeof pageModules]();

            if (module.initialize && typeof module.initialize === 'function') {
                module.initialize();
            }
        } catch (error) {
            console.error(`Failed to load page module ${bodyId}:`, error);
        }
    }
}

// Initialize basic helpers (e.g., auto-hide site messages if present)
function initializeGlobalFeatures() {
    const toasts = Array.from(document.querySelectorAll<HTMLElement>('.toast.site-message'));
    toasts.forEach((el) => {
        // Fallback: simple auto-hide without Bootstrap dependency
        el.style.opacity = '1';
        setTimeout(() => {
            el.style.transition = 'opacity 0.5s';
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 600);
        }, 6000);
    });
}

// Set global flag to prevent legacy self-execution in page modules
window.__SINGLE_ENTRY_MODE__ = true;

// Initialize React refresh runtime for development
// Vite injects import.meta.env in the browser
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (import.meta.env?.DEV) {
    window.$RefreshReg$ = window.$RefreshReg$ || (() => {});
    window.$RefreshSig$ = window.$RefreshSig$ || (() => (type: unknown) => type);
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    initializeGlobalFeatures();
    initializePage();
});

// Export nothing; this is an entry file.
