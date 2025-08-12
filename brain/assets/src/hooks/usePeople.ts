import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { Advisor, Founder, Paginated, PeopleSearchParams } from '@/lib/types/people';

const API_BASE = '/companies';

function buildQuery(params: PeopleSearchParams): string {
    const sp = new URLSearchParams();
    if (params.page) sp.set('page', String(params.page));
    if (params.page_size) sp.set('page_size', String(params.page_size));
    if (params.q) sp.set('q', params.q);
    if (params.ordering) sp.set('ordering', params.ordering);
    return sp.toString();
}

export function useFounders(params: PeopleSearchParams) {
    const query = buildQuery(params);
    return useQuery({
        queryKey: ['founders', query],
        queryFn: async () => {
            const url = `${API_BASE}/founders/${query ? `?${query}` : ''}`;
            const res = await http.get(url);
            return res.data as Paginated<Founder>;
        },
        keepPreviousData: true,
        staleTime: 30 * 1000,
    });
}

export function useAdvisors(params: PeopleSearchParams) {
    const query = buildQuery(params);
    return useQuery({
        queryKey: ['advisors', query],
        queryFn: async () => {
            const url = `${API_BASE}/advisors/${query ? `?${query}` : ''}`;
            const res = await http.get(url);
            return res.data as Paginated<Advisor>;
        },
        keepPreviousData: true,
        staleTime: 30 * 1000,
    });
}
