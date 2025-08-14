import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { queryKeys } from '@/lib/queries/queryKeys';
import { queryOptions } from '@/lib/queries/queryOptions';

// Common types used across dashboards
export type CountByName = { name: string; count: number };
export type DateCount = { date: string; count: number };

// Deals Dashboard types
export type DashboardData = {
    date_count_trend: DateCount[];
    funding_stage_count: CountByName[];
    industry_count: CountByName[];
    du_signal_count: CountByName[];
    today_count: number;
    yesterday_count: number;
    current_week_count: number;
    previous_week_count: number;
    current_month_count: number;
    previous_month_count: number;
    total_count: number;
    current_year_count: number;
    deals_with_grant_count: number;
    deals_with_clinical_study_count: number;
    quality_percentile_count: { key: number | string; count: number }[];
    sent_to_affinity_count: DateCount[];
    date_from: string;
    date_to: string;
};

export type DashboardFilters = {
    date_from?: string;
    date_to?: string;
};

// Dual-Use Dashboard types
export type DualUseSummaryData = {
    hq_country_company_count: CountByName[];
    hq_state_company_count: CountByName[];
    hq_city_company_count: CountByName[];
    tech_type_company_count: CountByName[];
    industries_company_count: CountByName[];
    year_founded_company_count: CountByName[];
    founders_count_company_count: CountByName[];
};

export type DualUseFilters = {
    category_name?: string;
    hq_country?: string;
};

export type DualUseSignal = {
    uuid: string;
    name: string;
    code?: string | null;
    category?: {
        uuid: string;
        name: string;
    } | null;
};

export type DualUseSignalsResponse = {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results: DualUseSignal[];
};

/**
 * Hook to fetch deals dashboard data
 * @param filters - Date range filters
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useDashboardData(filters: DashboardFilters = {}, enabled = true) {
    return useQuery({
        queryKey: queryKeys.dashboardData(filters),
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams();
            if (filters.date_from) params.set('date_from', filters.date_from);
            if (filters.date_to) params.set('date_to', filters.date_to);

            // Note: This endpoint doesn't use the /api prefix - it's a regular Django view
            const url = `/deals/dash/data/${params.toString() ? `?${params.toString()}` : ''}`;
            const response = await http.get(url, { 
                signal,
                baseURL: '' // Override the /api baseURL for this non-API endpoint
            });

            return response.data as DashboardData;
        },
        enabled,
        ...queryOptions.common.dashboard,
    });
}

/**
 * Hook to fetch dual-use summary data
 * @param filters - Category and country filters
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useDualUseSummary(filters: DualUseFilters = {}, enabled = true) {
    return useQuery({
        queryKey: queryKeys.dualUseSummary(filters),
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams();
            if (filters.category_name) params.set('category_name', filters.category_name);
            if (filters.hq_country) params.set('hq_country', filters.hq_country);

            // This is a proper DRF API endpoint under /api/dual-use/
            const url = `/dual-use/summary/${params.toString() ? `?${params.toString()}` : ''}`;
            const response = await http.get(url, { signal });

            return response.data as DualUseSummaryData;
        },
        enabled,
        ...queryOptions.common.dashboard,
    });
}

/**
 * Hook to fetch dual-use signals (for categories dropdown)
 * @param pageSize - Number of signals to fetch (default: 500)
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useDualUseSignals(pageSize = 500, enabled = true) {
    return useQuery({
        queryKey: queryKeys.dualUseSignals({ page_size: pageSize }),
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams();
            params.set('page_size', String(pageSize));

            const response = await http.get(`/deals/du-signals/?${params.toString()}`, {
                signal,
            });

            return response.data as DualUseSignalsResponse;
        },
        enabled,
        ...queryOptions.common.reference,
        select: (data) => {
            // Extract unique category names from signals
            const names = new Set<string>();
            const results = Array.isArray(data.results) ? data.results : [];

            for (const signal of results) {
                const name = signal?.category?.name;
                if (typeof name === 'string' && name.trim()) {
                    names.add(name.trim());
                }
            }

            return {
                ...data,
                categories: Array.from(names).sort((a, b) => a.localeCompare(b)),
            };
        },
    });
}
