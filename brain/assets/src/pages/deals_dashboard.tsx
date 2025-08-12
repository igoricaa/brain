import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { colorPalette, simpleLineOptions, simpleBarOptions, simplePieOptions } from '../lib/charts';

type CountByName = { name: string; count: number };
type DateCount = { date: string; count: number };

type DashboardData = {
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

function useDashboardData() {
    const { params, update } = useQueryParams();
    const dateFrom = params.get('date_from');
    const dateTo = params.get('date_to');
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function run() {
            setLoading(true);
            setError(null);
            try {
                const qs = new URLSearchParams();
                if (dateFrom) qs.set('date_from', dateFrom);
                if (dateTo) qs.set('date_to', dateTo);
                const resp = await fetch(
                    `/deals/dash/data/${qs.toString() ? `?${qs.toString()}` : ''}`,
                    {
                        credentials: 'same-origin',
                        headers: { Accept: 'application/json' },
                    },
                );
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const json = (await resp.json()) as DashboardData;
                if (!cancelled) setData(json);
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Failed to load dashboard';
                if (!cancelled) setError(message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        run();
        return () => {
            cancelled = true;
        };
    }, [dateFrom, dateTo]);

    return { data, loading, error, params, update };
}

function toLineData(series: DateCount[], label: string) {
    return {
        labels: series.map((d) => d.date),
        datasets: [
            {
                label,
                data: series.map((d) => d.count),
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
        ],
    };
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
                borderWidth: 0,
            },
        ],
    };
}

function toBarData(rows: CountByName[], topN = 10) {
    const top = rows.slice(0, topN);
    return {
        labels: top.map((r) => r.name || 'Unknown'),
        datasets: [
            {
                label: 'Count',
                data: top.map((r) => r.count),
                backgroundColor: '#3B82F6',
                borderRadius: 4,
            },
        ],
    };
}

function MetricCard({
    label,
    value,
    period,
    icon,
    iconBg,
}: {
    label: string;
    value: number | string;
    period: string;
    icon: string;
    iconBg: string;
}) {
    return (
        <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="flex items-center">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconBg}`}>
                    <span className="text-2xl">{icon}</span>
                </div>
                <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500">{label}</p>
                    <p className="text-2xl font-semibold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-400">{period}</p>
                </div>
            </div>
        </div>
    );
}

function ChartCard({
    title,
    children,
    action,
}: {
    title: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                {action}
            </div>
            {children}
        </div>
    );
}

function RecentActivity() {
    const activities = [
        {
            id: 1,
            type: 'deal',
            title: 'New deal submitted: Senira',
            subtitle: 'Fintech • $2M seed',
            time: '5 days ago',
            icon: '🟢',
        },
        {
            id: 2,
            type: 'assessment',
            title: 'Assessment completed: Croptell',
            subtitle: 'AI/ML • $1M late seed',
            time: '6 days ago',
            icon: '🔵',
        },
    ];

    return (
        <div className="rounded-lg bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h3>
            <p className="mb-4 text-sm text-gray-500">Latest updates and deal submissions</p>

            <div className="space-y-4">
                {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                        <span className="text-xl">{activity.icon}</span>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                            <p className="text-xs text-gray-500">
                                {activity.subtitle} • {activity.time}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DealsDashboardApp() {
    const { data, loading, error } = useDashboardData();

    const trendData = useMemo(
        () => (data ? toLineData(data.date_count_trend, 'Deals per day') : null),
        [data],
    );
    const fundingData = useMemo(() => (data ? toPieData(data.funding_stage_count) : null), [data]);

    const chartOptions = {
        ...simpleLineOptions,
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    autoSkip: true,
                    maxTicksLimit: 7,
                },
            },
            y: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                },
                beginAtZero: true,
            },
        },
        plugins: {
            legend: {
                display: false,
            },
        },
    };

    const pieOptions = {
        ...simplePieOptions,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    padding: 15,
                    usePointStyle: true,
                    pointStyle: 'circle',
                },
            },
        },
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-gray-500">Loading dashboard data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-800">Error loading dashboard: {error}</p>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Metrics Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    label="Today"
                    value={data.today_count}
                    period={`Yesterday: ${data.yesterday_count}`}
                    icon="📊"
                    iconBg="bg-blue-100"
                />
                <MetricCard
                    label="This Week"
                    value={data.current_week_count}
                    period={`Last Week: ${data.previous_week_count}`}
                    icon="📈"
                    iconBg="bg-red-100"
                />
                <MetricCard
                    label="This Month"
                    value={data.current_month_count}
                    period={`Last Month: ${data.previous_month_count}`}
                    icon="📅"
                    iconBg="bg-orange-100"
                />
                <MetricCard
                    label="Total Deals"
                    value={data.total_count}
                    period={`This Year: ${data.current_year_count}`}
                    icon="🎯"
                    iconBg="bg-green-100"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ChartCard
                    title="Deal Flow Trend"
                    action={
                        <button className="text-sm text-blue-600 hover:text-blue-700">
                            View Details
                        </button>
                    }
                >
                    <p className="mb-4 text-sm text-gray-500">
                        Daily received deals over the past month
                    </p>
                    {trendData && (
                        <div className="h-64">
                            <Line data={trendData} options={chartOptions} />
                        </div>
                    )}
                </ChartCard>

                <ChartCard title="Funding Stages">
                    <p className="mb-4 text-sm text-gray-500">
                        Distribution of deals by funding stage
                    </p>
                    {fundingData && (
                        <div className="h-64">
                            <Pie data={fundingData} options={pieOptions} />
                        </div>
                    )}
                </ChartCard>
            </div>

            {/* Recent Activity */}
            <RecentActivity />
        </div>
    );
}

function mount() {
    const el = document.getElementById('deals-dashboard-root');
    if (!el) return;
    const root = createRoot(el);
    root.render(<DealsDashboardApp />);
}

export function initialize() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
}
