import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Pie, Bar } from 'react-chartjs-2';
import { colorPalette, simplePieOptions, simpleBarOptions } from '../lib/charts';

type CountByName = { name: string; count: number };

type SummaryData = {
    hq_country_company_count: CountByName[];
    hq_state_company_count: CountByName[];
    hq_city_company_count: CountByName[];
    tech_type_company_count: CountByName[];
    industries_company_count: CountByName[];
    year_founded_company_count: CountByName[];
    founders_count_company_count: CountByName[];
};

function useQueryParams() {
    const [params, setParams] = useState(() => new URLSearchParams(window.location.search));
    useEffect(() => {
        const onPop = () => setParams(new URLSearchParams(window.location.search));
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);
    const update = (updater: (p: URLSearchParams) => void) => {
        const next = new URLSearchParams(params.toString());
        updater(next);
        const qs = next.toString();
        const href = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
        window.history.replaceState({}, '', href);
        setParams(next);
    };
    return { params, update };
}

async function fetchCategories(): Promise<string[]> {
    try {
        const resp = await fetch('/api/deals/du-signals/?page_size=500', {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        });
        if (!resp.ok) return [];
        const data = await resp.json();
        const results: any[] = Array.isArray(data.results) ? data.results : data;
        const names = new Set<string>();
        for (const sig of results) {
            const name = sig?.category?.name;
            if (typeof name === 'string' && name.trim()) names.add(name.trim());
        }
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    } catch {
        return [];
    }
}

function useSummaryData() {
    const { params, update } = useQueryParams();
    const categoryName = params.get('category_name') || '';
    const hqCountry = params.get('hq_country') || '';
    const [data, setData] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        let cancelled = false;
        fetchCategories().then((cats) => !cancelled && setCategories(cats));
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function run() {
            setLoading(true);
            setError(null);
            try {
                const qs = new URLSearchParams();
                if (categoryName) qs.set('category_name', categoryName);
                if (hqCountry) qs.set('hq_country', hqCountry);
                const resp = await fetch(
                    `/api/dual-use/summary/${qs.toString() ? `?${qs.toString()}` : ''}`,
                    {
                        credentials: 'same-origin',
                        headers: { Accept: 'application/json' },
                    },
                );
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const json = (await resp.json()) as SummaryData;
                if (!cancelled) setData(json);
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Failed to load summary';
                if (!cancelled) setError(message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        run();
        return () => {
            cancelled = true;
        };
    }, [categoryName, hqCountry]);

    return { data, loading, error, params, update, categories };
}

function toPieData(rows: CountByName[]) {
    const labels = rows.map((r) => r.name || 'Unknown');
    const data = rows.map((r) => r.count);
    return {
        labels,
        datasets: [
            {
                data,
                backgroundColor: labels.map((_, i) => colorPalette[i % colorPalette.length]),
            },
        ],
    };
}

function toBarData(rows: CountByName[], topN = 10) {
    const top = rows.slice(0, topN);
    return {
        labels: top.map((r) => String(r.name || 'Unknown')),
        datasets: [
            {
                label: 'Count',
                data: top.map((r) => r.count),
                backgroundColor: top.map((_, i) => colorPalette[i % colorPalette.length]),
            },
        ],
    };
}

function InlineLegend({ labels, colors }: { labels: string[]; colors: string[] }) {
    return (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0' }}>
            {labels.map((l, i) => (
                <li
                    key={`${l}-${i}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
                >
                    <span
                        style={{
                            display: 'inline-block',
                            width: 10,
                            height: 10,
                            background: colors[i % colors.length],
                        }}
                    />
                    <span className="small text-muted">{l}</span>
                </li>
            ))}
        </ul>
    );
}

function DuDashboardApp() {
    const { data, loading, error, params, update, categories } = useSummaryData();
    const categoryName = params.get('category_name') || '';
    const hqCountry = params.get('hq_country') || '';

    const hqCountryData = useMemo(
        () => (data ? toPieData(data.hq_country_company_count) : null),
        [data],
    );
    const hqStateData = useMemo(
        () => (data ? toPieData(data.hq_state_company_count) : null),
        [data],
    );
    const hqCityData = useMemo(() => (data ? toPieData(data.hq_city_company_count) : null), [data]);
    const techTypeData = useMemo(
        () => (data ? toBarData(data.tech_type_company_count, 12) : null),
        [data],
    );
    const industriesData = useMemo(
        () => (data ? toBarData(data.industries_company_count, 12) : null),
        [data],
    );
    const yearFoundedData = useMemo(
        () => (data ? toBarData(data.year_founded_company_count, 20) : null),
        [data],
    );
    const foundersCountData = useMemo(
        () => (data ? toBarData(data.founders_count_company_count, 10) : null),
        [data],
    );

    return (
        <div className="container-fluid">
            <div className="d-flex flex-wrap align-items-end gap-3 mb-3">
                <div>
                    <label className="small text-muted">DU Category</label>
                    <select
                        className="form-select form-select-sm"
                        value={categoryName}
                        onChange={(e) =>
                            update((p) => {
                                if (e.target.value) p.set('category_name', e.target.value);
                                else p.delete('category_name');
                            })
                        }
                    >
                        <option value="">All</option>
                        {categories.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="small text-muted">HQ Country</label>
                    <input
                        type="text"
                        placeholder="US"
                        className="form-control form-control-sm"
                        value={hqCountry}
                        onChange={(e) =>
                            update((p) => {
                                const v = e.target.value.toUpperCase();
                                if (v) p.set('hq_country', v);
                                else p.delete('hq_country');
                            })
                        }
                    />
                </div>
            </div>

            {loading && <div className="text-muted small">Loading…</div>}
            {error && <div className="text-danger small">{error}</div>}

            {!loading && data && (
                <>
                    <div className="p-3 bg-white rounded border mb-4">
                        <div className="mb-2 fw-semibold">Top HQ countries</div>
                        {hqCountryData && (
                            <>
                                <Pie data={hqCountryData} options={simplePieOptions} />
                                <InlineLegend
                                    labels={hqCountryData.labels as string[]}
                                    colors={colorPalette}
                                />
                            </>
                        )}
                    </div>

                    <div className="row g-4">
                        <div className="col-lg-6">
                            <div className="p-3 bg-white rounded border">
                                <div className="mb-2 fw-semibold">Top HQ states</div>
                                {hqStateData && (
                                    <>
                                        <Pie data={hqStateData} options={simplePieOptions} />
                                        <InlineLegend
                                            labels={hqStateData.labels as string[]}
                                            colors={colorPalette}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <div className="p-3 bg-white rounded border">
                                <div className="mb-2 fw-semibold">Top HQ cities</div>
                                {hqCityData && (
                                    <>
                                        <Pie data={hqCityData} options={simplePieOptions} />
                                        <InlineLegend
                                            labels={hqCityData.labels as string[]}
                                            colors={colorPalette}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="row g-4 mt-1">
                        <div className="col-lg-6">
                            <div className="p-3 bg-white rounded border">
                                <div className="mb-2 fw-semibold">Technology type</div>
                                {techTypeData && (
                                    <Bar data={techTypeData} options={simpleBarOptions} />
                                )}
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <div className="p-3 bg-white rounded border">
                                <div className="mb-2 fw-semibold">Industries</div>
                                {industriesData && (
                                    <Bar data={industriesData} options={simpleBarOptions} />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="row g-4 mt-1">
                        <div className="col-lg-6">
                            <div className="p-3 bg-white rounded border">
                                <div className="mb-2 fw-semibold">Companies founded by year</div>
                                {yearFoundedData && (
                                    <Bar data={yearFoundedData} options={simpleBarOptions} />
                                )}
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <div className="p-3 bg-white rounded border">
                                <div className="mb-2 fw-semibold">Number of founders</div>
                                {foundersCountData && (
                                    <Bar data={foundersCountData} options={simpleBarOptions} />
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function mount() {
    const el = document.getElementById('du-dashboard-root');
    if (!el) return;
    const root = createRoot(el);
    root.render(<DuDashboardApp />);
}

export function initialize() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
}
