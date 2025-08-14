import { useEffect, useRef, useCallback, useState, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DealsTable } from '@/components/deals';
import { useSearchDeals } from '@/hooks/useDeals';
import { useDebounce } from '@/hooks/useDebounce';

// Create a new QueryClient instance for this page
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000, // 30 seconds
            retry: 1,
        },
    },
});

function ReviewedDealsPage() {
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
                <ReviewedDealsList
                    searchQuery={initialSearchQuery}
                    onSearchChange={handleSearchChange}
                    onDealSelect={handleDealSelect}
                />
            </div>
        </QueryClientProvider>
    );
}

// Custom ReviewedDealsList component following Fresh Deals pattern
function ReviewedDealsList({
    searchQuery = '',
    onSearchChange,
    onDealSelect,
}: {
    searchQuery: string;
    onSearchChange?: (query: string) => void;
    onDealSelect?: (dealId: string) => void;
}) {
    // Local state for immediate UI updates
    const [inputValue, setInputValue] = useState(searchQuery);

    // Debounce the search query with 300ms delay
    const debouncedSearchQuery = useDebounce(inputValue, 300);

    // Search parameters - using 'active' status for reviewed deals
    const searchParams = {
        q: debouncedSearchQuery,
        status: 'active' as const, // Reviewed deals typically have 'active' status
    };

    const { deals, loading, error, hasMore, loadMore, clearFilters, refetch } =
        useSearchDeals(searchParams);

    const observerRef = useRef<HTMLDivElement>(null);

    // Update input value when external searchQuery prop changes
    useEffect(() => {
        setInputValue(searchQuery);
    }, [searchQuery]);

    // Update URL when debounced search query changes
    useEffect(() => {
        onSearchChange?.(debouncedSearchQuery);
    }, [debouncedSearchQuery, onSearchChange]);

    // Handle search input changes (immediate UI update, debounced API call)
    const handleSearchChange = useCallback((value: string) => {
        setInputValue(value);
    }, []);

    // Handle clear search
    const handleClearSearch = useCallback(() => {
        setInputValue('');
    }, []);

    // Infinite scroll with Intersection Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first.isIntersecting && hasMore && !loading) {
                    loadMore();
                }
            },
            { threshold: 0.1 },
        );

        const currentRef = observerRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [hasMore, loading, loadMore]);

    // Handle keyboard shortcut for search focus
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector(
                    '[data-search-input]',
                ) as HTMLInputElement;
                searchInput?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-600 mb-4">Error loading deals: {error}</p>
                <Button onClick={() => refetch()} variant="outline">
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header - customized for reviewed deals */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Past Deals</h1>
                        <p className="text-sm text-gray-600">
                            Deals that have been reviewed and processed
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-green-600">✓ Reviewed</span>
                        <Button variant="outline" size="sm">
                            Filter
                        </Button>
                        <Button variant="outline" size="sm">
                            Export
                        </Button>
                    </div>
                </div>

                {/* Search Input */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        data-search-input
                        type="search"
                        placeholder="Search reviewed deals by company name..."
                        value={inputValue}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    {loading && (
                        <div className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                    )}
                    {inputValue && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                            onClick={handleClearSearch}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Deals Table */}
            <DealsTable deals={deals} loading={loading} onDealSelect={onDealSelect} />

            {/* Load More / Infinite Scroll Trigger */}
            {hasMore && (
                <div ref={observerRef} className="py-4">
                    <div className="text-center">
                        {loading ? (
                            <p className="text-gray-500">Loading more deals...</p>
                        ) : (
                            <Button variant="outline" onClick={loadMore} className="min-w-32">
                                Load More
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* No more results */}
            {!hasMore && deals.length > 0 && (
                <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No more deals to load</p>
                </div>
            )}

            {/* Empty state */}
            {!loading && deals.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">
                        {debouncedSearchQuery
                            ? `No reviewed deals found matching "${debouncedSearchQuery}"`
                            : 'No reviewed deals found'}
                    </p>
                </div>
            )}
        </div>
    );
}

// Mount the component when DOM is ready
function mountReviewedDealsPage() {
    const rootElement = document.getElementById('deals-reviewed-root');

    if (!rootElement) {
        console.error('Reviewed deals root element not found');
        return;
    }

    const root = createRoot(rootElement);
    root.render(
        <StrictMode>
            <ReviewedDealsPage />
        </StrictMode>,
    );
}

// Export the initialize function for main.tsx
export function initialize() {
    mountReviewedDealsPage();
}

// Export the component for potential reuse
export { ReviewedDealsPage };

// Only auto-mount if not in single entry mode (for backwards compatibility)
if (!window.__SINGLE_ENTRY_MODE__) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountReviewedDealsPage);
    } else {
        mountReviewedDealsPage();
    }
}
