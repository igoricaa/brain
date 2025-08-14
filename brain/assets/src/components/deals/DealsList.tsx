import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DealsTableV2 } from './DealsTableV2';
import { useSearchDeals } from '@/hooks/useDeals';
import { useDebounce } from '@/hooks/useDebounce';
import type { DealsListProps } from '@/lib/types/deals';

export function DealsList({
    searchQuery = '',
    onSearchChange,
    onDealSelect,
}: Pick<DealsListProps, 'searchQuery' | 'onSearchChange' | 'onDealSelect'>) {
    // Local state for immediate UI updates
    const [inputValue, setInputValue] = useState(searchQuery);

    // Debounce the search query with 300ms delay
    const debouncedSearchQuery = useDebounce(inputValue, 300);

    // Search parameters
    const searchParams = {
        q: debouncedSearchQuery,
        status: 'new' as const,
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
    const handleSearchChange = (value: string) => {
        setInputValue(value);
    };

    // Handle clear search
    const handleClearSearch = () => {
        setInputValue('');
    };

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
            {/* Simple Page Header - matching screenshot 2 */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">New Deals</h1>
                        <p className="text-sm text-gray-600">
                            New deals submitted but not yet sorted
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-orange-600">0 Pending</span>
                        <Button variant="outline" size="sm">
                            Filter
                        </Button>
                        <Button asChild size="sm">
                            <a href="/deals/upload/">New Deal</a>
                        </Button>
                    </div>
                </div>

                {/* Standalone Search Input - matching screenshot 2 */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        data-search-input
                        type="search"
                        placeholder="Search by company name..."
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
            <DealsTableV2
                deals={deals}
                loading={loading}
                onDealSelect={onDealSelect}
                onDealsChange={refetch}
            />

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
        </div>
    );
}
