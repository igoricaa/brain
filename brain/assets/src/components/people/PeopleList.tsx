import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PeopleTable } from './PeopleTable';
import { useAdvisors, useFounders } from '@/hooks/usePeople';
import { useDebounce } from '@/hooks/useDebounce';

interface PeopleListProps {
    variant: 'founders' | 'advisors';
    initialQuery?: string;
    initialPage?: number;
    pageSize?: number; // default to DRF 30
}

export function PeopleList({
    variant,
    initialQuery = '',
    initialPage = 1,
    pageSize = 30,
}: PeopleListProps) {
    const [inputValue, setInputValue] = useState(initialQuery);
    const [page, setPage] = useState(initialPage);

    const debouncedQuery = useDebounce(inputValue, 300);

    const searchParams = {
        q: debouncedQuery || undefined,
        page,
        page_size: pageSize,
        ordering: '-created_at',
    };

    const query = variant === 'founders' ? useFounders(searchParams) : useAdvisors(searchParams);

    // Keep URL in sync with q and page
    useEffect(() => {
        const url = new URL(window.location.href);
        if (debouncedQuery) url.searchParams.set('q', debouncedQuery);
        else url.searchParams.delete('q');
        if (page > 1) url.searchParams.set('page', String(page));
        else url.searchParams.delete('page');
        window.history.replaceState({}, '', url.toString());
    }, [debouncedQuery, page]);

    // When query changes, reset to page 1
    useEffect(() => {
        setPage(1);
    }, [debouncedQuery]);

    const handleClearSearch = () => setInputValue('');

    const total = query.data?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const hasPrev = page > 1;
    const hasNext = page < totalPages;

    // Keyboard shortcut: Cmd/Ctrl+K focuses search (match deals UX)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                const el = document.querySelector('[data-search-input]') as HTMLInputElement | null;
                el?.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            {variant === 'founders' ? 'Founders' : 'Advisors'}
                        </h1>
                        <p className="text-sm text-gray-600">
                            Directory sourced from company relationships
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                            {total.toLocaleString()} results
                        </span>
                        <Button variant="outline" size="sm">
                            Filter
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        data-search-input
                        type="search"
                        placeholder={`Search ${variant} by name...`}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    {query.isFetching && (
                        <div className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
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

            {/* Table */}
            <PeopleTable
                people={query.data?.results ?? []}
                loading={query.isFetching && !query.data?.results?.length}
                variant={variant}
            />

            {/* Pagination */}
            <div className="flex items-center justify-between py-2">
                <div className="text-sm text-gray-600">
                    {total.toLocaleString()} results · Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        disabled={!hasPrev}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        disabled={!hasNext}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
