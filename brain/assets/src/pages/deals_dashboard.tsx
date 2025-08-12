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
        const resp = await fetch(`/deals/dash/data/${qs.toString() ? `?${qs.toString()}` : ''}`, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
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
        borderColor: 'rgba(47, 75, 124, 1.0)',
        backgroundColor: 'rgba(47, 75, 124, 0.2)',
        tension: 0.3,
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
        backgroundColor: top.map((_, i) => colorPalette[i % colorPalette.length]),
      },
    ],
  };
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-3 bg-white rounded border">
      <div className="text-muted small">{label}</div>
      <div className="h5 m-0">{value}</div>
    </div>
  );
}

function InlineLegend({ labels, colors }: { labels: string[]; colors: string[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0' }}>
      {labels.map((l, i) => (
        <li key={`${l}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: colors[i % colors.length] }} />
          <span className="small text-muted">{l}</span>
        </li>
      ))}
    </ul>
  );
}

function DealsDashboardApp() {
  const { data, loading, error, params, update } = useDashboardData();

  const dateFrom = params.get('date_from') || (data?.date_from ?? '');
  const dateTo = params.get('date_to') || (data?.date_to ?? '');

  const trendData = useMemo(() => (data ? toLineData(data.date_count_trend, 'Deals per day') : null), [data]);
  const fundingData = useMemo(() => (data ? toPieData(data.funding_stage_count) : null), [data]);
  const duData = useMemo(() => (data ? toPieData(data.du_signal_count) : null), [data]);
  const industryData = useMemo(() => (data ? toBarData(data.industry_count, 10) : null), [data]);

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap align-items-end gap-3 mb-3">
        <div>
          <label className="small text-muted">From</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={dateFrom}
            onChange={(e) => update((p) => p.set('date_from', e.target.value))}
          />
        </div>
        <div>
          <label className="small text-muted">To</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={dateTo}
            onChange={(e) => update((p) => p.set('date_to', e.target.value))}
          />
        </div>
      </div>

      {loading && <div className="text-muted small">Loading…</div>}
      {error && <div className="text-danger small">{error}</div>}

      {!loading && data && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-sm-6 col-lg-3"><Metric label="Total" value={data.total_count} /></div>
            <div className="col-sm-6 col-lg-3"><Metric label="Today" value={data.today_count} /></div>
            <div className="col-sm-6 col-lg-3"><Metric label="This month" value={data.current_month_count} /></div>
            <div className="col-sm-6 col-lg-3"><Metric label="This year" value={data.current_year_count} /></div>
          </div>

          <div className="row g-4">
            <div className="col-lg-6">
              <div className="p-3 bg-white rounded border">
                <div className="mb-2 fw-semibold">Deals per day</div>
                {trendData && <Line data={trendData} options={{ ...simpleLineOptions, scales: { x: { ticks: { autoSkip: true } } } }} />}
              </div>
            </div>

            <div className="col-lg-6">
              <div className="p-3 bg-white rounded border">
                <div className="mb-2 fw-semibold">Funding stage</div>
                {fundingData && (
                  <>
                    <Pie data={fundingData} options={simplePieOptions} />
                    <InlineLegend labels={fundingData.labels as string[]} colors={colorPalette} />
                  </>
                )}
              </div>
            </div>

            <div className="col-lg-6">
              <div className="p-3 bg-white rounded border">
                <div className="mb-2 fw-semibold">Industries (top 10)</div>
                {industryData && <Bar data={industryData} options={simpleBarOptions} />}
              </div>
            </div>

            <div className="col-lg-6">
              <div className="p-3 bg-white rounded border">
                <div className="mb-2 fw-semibold">Dual-use signals</div>
                {duData && (
                  <>
                    <Pie data={duData} options={simplePieOptions} />
                    <InlineLegend labels={duData.labels as string[]} colors={colorPalette} />
                  </>
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

