import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { http } from '@/lib/http';
import type {
    Deal,
    DealListResponse,
    DealSearchParams,
    DealFilters,
    UseDealsResult,
    UseSearchDealsResult,
} from '@/lib/types/deals';

// Base URL for deals API (without /api prefix since http client adds it)
const DEALS_API_BASE = '/deals/deals/';

// Fetch function for infinite deals
const fetchDeals = async ({
    pageParam = 1,
    queryKey,
}: {
    pageParam: number;
    queryKey: [string, DealSearchParams];
}): Promise<DealListResponse> => {
    const [, params] = queryKey;
    const searchParams = new URLSearchParams();

    // Add pagination
    searchParams.set('page', pageParam.toString());
    searchParams.set('page_size', (params.page_size || 20).toString());

    // Add search and filters
    if (params.q) searchParams.set('q', params.q);
    if (params.status) searchParams.set('status', params.status);
    if (params.ordering) searchParams.set('ordering', params.ordering);
    if (params.industries?.length) {
        params.industries.forEach((id) => searchParams.append('industries', id));
    }
    if (params.dual_use_categories?.length) {
        params.dual_use_categories.forEach((id) => searchParams.append('dual_use_categories', id));
    }
    if (params.funding_stage) searchParams.set('funding_stage', params.funding_stage);
    if (params.date_from) searchParams.set('date_from', params.date_from);
    if (params.date_to) searchParams.set('date_to', params.date_to);
    if (params.has_grants !== undefined)
        searchParams.set('has_grants', params.has_grants.toString());
    if (params.processing_status) searchParams.set('processing_status', params.processing_status);
    if (params.sent_to_affinity !== undefined)
        searchParams.set('sent_to_affinity', params.sent_to_affinity.toString());

    const url = `${DEALS_API_BASE}?${searchParams.toString()}`;
    const response = await http.get(url);
    return response.data;
};

// Hook for infinite deals loading
export function useInfiniteDeals(params: DealSearchParams = {}): UseDealsResult {
    const { data, fetchNextPage, hasNextPage, isFetching, error, refetch } = useInfiniteQuery({
        queryKey: ['deals', params],
        queryFn: fetchDeals,
        getNextPageParam: (lastPage) => {
            if (!lastPage.next) return undefined;
            // Extract page number from next URL
            const url = new URL(lastPage.next, window.location.origin);
            const page = url.searchParams.get('page');
            return page ? parseInt(page, 10) : undefined;
        },
        initialPageParam: 1,
        staleTime: 30 * 1000, // 30 seconds
    });

    const deals = useMemo(() => {
        return data?.pages.flatMap((page) => page.results) ?? [];
    }, [data]);

    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetching) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetching, fetchNextPage]);

    return {
        deals,
        loading: isFetching,
        error: error ? String(error) : null,
        hasMore: hasNextPage ?? false,
        loadMore,
        refetch,
    };
}

// Hook for search without internal debouncing (debouncing handled by components)
export function useSearchDeals(searchParams: DealSearchParams = {}): UseSearchDealsResult {
    const [filters, setFilters] = useState<DealFilters>(() => {
        const {
            q: _q,
            page: _page,
            page_size: _page_size,
            ordering: _ordering,
            ...filterParams
        } = searchParams;
        return filterParams;
    });

    // Combine external params with internal filters
    const finalParams = useMemo(
        () => ({
            ...filters,
            ...searchParams, // External params take precedence
            ordering: searchParams.ordering || '-created_at',
            page_size: searchParams.page_size || 20,
        }),
        [searchParams, filters],
    );

    const result = useInfiniteDeals(finalParams);

    const clearFilters = useCallback(() => {
        setFilters({});
    }, []);

    return {
        ...result,
        searchQuery: searchParams.q || '',
        setSearchQuery: () => {}, // No-op since search is controlled externally
        filters,
        setFilters,
        clearFilters,
    };
}

// Hook for single deal
export function useDeal(uuid: string) {
    return useQuery({
        queryKey: ['deal', uuid],
        queryFn: async () => {
            const response = await http.get(`${DEALS_API_BASE}${uuid}/`);
            return response.data as Deal;
        },
        enabled: !!uuid,
        staleTime: 60 * 1000, // 1 minute
    });
}

// Hook for deal columns configuration
export function useDealColumns() {
    return useMemo(
        () => [
            {
                key: 'company',
                label: 'Company',
                sortable: true,
                className: 'w-[280px]',
            },
            {
                key: 'fundraise',
                label: 'Fundraise',
                sortable: false,
                className: '',
            },
            {
                key: 'industries',
                label: 'Industries',
                sortable: false,
                className: '',
            },
            {
                key: 'dual_use_signal',
                label: 'Dual-use Signal',
                sortable: false,
                className: '',
            },
            {
                key: 'grants',
                label: 'Grants',
                sortable: false,
                className: '',
            },
            {
                key: 'actions',
                label: 'Actions',
                sortable: false,
                className: 'w-[100px]',
            },
        ],
        [],
    );
}

// Utility hook for URL state synchronization
export function useUrlParams() {
    const [params, setParams] = useState(() => new URLSearchParams(window.location.search));

    const updateParams = useCallback(
        (updater: (p: URLSearchParams) => void) => {
            const next = new URLSearchParams(params.toString());
            updater(next);
            const qs = next.toString();
            const href = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
            window.history.replaceState({}, '', href);
            setParams(next);
        },
        [params],
    );

    return { params, updateParams };
}
