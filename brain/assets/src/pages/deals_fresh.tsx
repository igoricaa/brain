import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { DealsList } from '@/components/deals';
import { Toaster } from '@/components/ui/sonner';

function FreshDealsPage() {
    // Extract search query from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearchQuery = urlParams.get('q') || '';

    // Handle search query changes by updating URL
    const handleSearchChange = (query: string) => {
        const url = new URL(window.location.href);
        if (query.trim()) {
            url.searchParams.set('q', query.trim());
        } else {
            url.searchParams.delete('q');
        }

        // Update URL without reload
        window.history.replaceState({}, '', url.toString());
    };

    // Handle deal selection (navigate to deal detail)
    const handleDealSelect = (dealId: string) => {
        window.location.href = `/deals/${dealId}/`;
    };

    return (
        <QueryClientProvider client={queryClient}>
            <div className="container mx-auto py-6">
                <DealsList
                    searchQuery={initialSearchQuery}
                    onSearchChange={handleSearchChange}
                    onDealSelect={handleDealSelect}
                    viewMode="table"
                    enableColumnSort={true}
                />
            </div>
            <Toaster />
        </QueryClientProvider>
    );
}

// Mount the component when DOM is ready
function mountFreshDealsPage() {
    const rootElement = document.getElementById('deals-fresh-root');

    if (!rootElement) {
        console.error('Fresh deals root element not found');
        return;
    }

    const root = createRoot(rootElement);
    root.render(
        <StrictMode>
            <FreshDealsPage />
        </StrictMode>,
    );
}

// Export the initialize function for main.tsx
export function initialize() {
    mountFreshDealsPage();
}

// Export the component for potential reuse
export { FreshDealsPage };

// Only auto-mount if not in single entry mode (for backwards compatibility)
if (!window.__SINGLE_ENTRY_MODE__) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountFreshDealsPage);
    } else {
        mountFreshDealsPage();
    }
}
