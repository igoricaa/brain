import { createRoot } from 'react-dom/client';
import { useEffect, useMemo, useState } from 'react';

type Related = { uuid: string; name?: string | null };
type RelatedSignal = { uuid: string; name: string; code?: string | null };

type Deal = {
  uuid: string;
  name?: string | null;
  description?: string | null;
  website?: string | null;
  company?: Related | null;
  industries?: Related[];
  dual_use_signals?: RelatedSignal[];
  funding_stage?: Related | null;
  funding_target?: number | null;
  funding_raised?: number | null;
  investors_names?: string[];
  partners_names?: string[];
  customers_names?: string[];
  sent_to_affinity?: boolean | null;
  created_at?: string;
};

type ApiList<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

type DealFile = {
  uuid: string;
  file?: string | null; // URL
  src_url?: string | null;
  mime_type?: string | null;
  created_at?: string;
  deal?: { uuid: string };
};

function useDeal(uuid: string | null) {
  const [data, setData] = useState<Deal | null>(null);
  const [loading, setLoading] = useState<boolean>(!!uuid);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!uuid) return;
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`/api/deals/deals/${uuid}/`, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = (await resp.json()) as Deal;
        if (!cancelled) setData(json);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to load deal';
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [uuid]);

  return { data, loading, error };
}

function useDealFiles(kind: 'decks' | 'papers', dealUuid: string | null, pageSize = 10) {
  const [data, setData] = useState<DealFile[]>([]);
  const [loading, setLoading] = useState<boolean>(!!dealUuid);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!dealUuid) return;
      setLoading(true);
      setError(null);
      try {
        const sp = new URLSearchParams({ deal: dealUuid, page_size: String(pageSize) });
        const resp = await fetch(`/api/deals/${kind}/?${sp.toString()}`, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = (await resp.json()) as ApiList<DealFile> | DealFile[];
        const items = Array.isArray(json) ? json : json.results || [];
        if (!cancelled) setData(items);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to load documents';
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [kind, dealUuid, pageSize]);

  return { data, loading, error };
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-3 text-base font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

function Tag({ children, color = 'slate' as const }: { children: React.ReactNode; color?: 'slate' | 'blue' | 'green' | 'violet' | 'amber' }) {
  const palette: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/20',
    blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
    green: 'bg-green-50 text-green-700 ring-1 ring-green-600/20',
    violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20',
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${palette[color]}`}>{children}</span>;
}

function Summary({ deal }: { deal: Deal }) {
  const hasInvestors = (deal.investors_names || []).length > 0;
  const hasPartners = (deal.partners_names || []).length > 0;
  const hasCustomers = (deal.customers_names || []).length > 0;
  return (
    <SectionCard title="Summary">
      {deal.description ? (
        <p className="text-sm leading-6 text-gray-700 whitespace-pre-line">{deal.description}</p>
      ) : (
        <p className="text-sm text-gray-500">No description.</p>
      )}
      {(hasInvestors || hasPartners || hasCustomers) && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {hasInvestors && (
            <div>
              <div className="text-xs font-semibold text-gray-500">Investors</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {deal.investors_names!.map((n, i) => (
                  <Tag key={i}>{n}</Tag>
                ))}
              </div>
            </div>
          )}
          {hasPartners && (
            <div>
              <div className="text-xs font-semibold text-gray-500">Partners</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {deal.partners_names!.map((n, i) => (
                  <Tag key={i} color="blue">
                    {n}
                  </Tag>
                ))}
              </div>
            </div>
          )}
          {hasCustomers && (
            <div>
              <div className="text-xs font-semibold text-gray-500">Customers</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {deal.customers_names!.map((n, i) => (
                  <Tag key={i} color="green">
                    {n}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function Industries({ items }: { items: Related[] | undefined }) {
  return (
    <SectionCard title="Industries">
      {items && items.length ? (
        <div className="flex flex-wrap gap-1">
          {items.map((it) => (
            <Tag key={it.uuid} color="violet">
              {it.name || '—'}
            </Tag>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No industries.</div>
      )}
    </SectionCard>
  );
}

function Signals({ items }: { items: RelatedSignal[] | undefined }) {
  return (
    <SectionCard title="Dual-use Signals">
      {items && items.length ? (
        <div className="flex flex-wrap gap-1">
          {items.map((it) => (
            <Tag key={it.uuid} color="amber">
              {it.name}
            </Tag>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No signals.</div>
      )}
    </SectionCard>
  );
}

function FileList({ title, files }: { title: string; files: DealFile[] }) {
  return (
    <SectionCard title={title}>
      {files.length ? (
        <ul className="divide-y divide-gray-100">
          {files.map((f) => {
            const href = f.file || f.src_url || '#';
            const ext = f.mime_type || '';
            return (
              <li key={f.uuid} className="py-2 text-sm">
                <a className="text-blue-600 hover:text-blue-700 break-all" href={href} target="_blank" rel="noreferrer">
                  {href}
                </a>
                {ext && <span className="ml-2 text-xs text-gray-500">{ext}</span>}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-sm text-gray-500">No items.</div>
      )}
    </SectionCard>
  );
}

function LoadingBox({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
      <div className="mt-3 h-3 w-full max-w-md animate-pulse rounded bg-gray-200" />
      <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-gray-200" />
      <div className="sr-only">{label}</div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  );
}

function DealDetailApp({ uuid }: { uuid: string }) {
  const { data: deal, loading, error } = useDeal(uuid);
  const { data: decks, loading: decksLoading } = useDealFiles('decks', uuid, 10);
  const { data: papers, loading: papersLoading } = useDealFiles('papers', uuid, 10);

  const content = useMemo(() => {
    if (loading) return <LoadingBox />;
    if (error) return <ErrorBox message={error} />;
    if (!deal) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Summary deal={deal} />
          </div>
          <div className="sm:col-span-1 space-y-6">
            <Industries items={deal.industries} />
            <Signals items={deal.dual_use_signals} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {decksLoading ? <LoadingBox label="Loading decks…" /> : <FileList title="Decks" files={decks} />}
          {papersLoading ? <LoadingBox label="Loading papers…" /> : <FileList title="Papers" files={papers} />}
        </div>
      </div>
    );
  }, [loading, error, deal, decksLoading, papersLoading, decks, papers]);

  return content;
}

export function initialize() {
  if (window.__SINGLE_ENTRY_MODE__ === false) return; // respect single-entry flag if overridden
  const mount = document.getElementById('deal-detail-root') as HTMLDivElement | null;
  if (!mount) return;
  const uuid = mount.dataset.uuid || null;
  if (!uuid) return;
  const root = createRoot(mount);
  root.render(<DealDetailApp uuid={uuid} />);
}

// Self-execute only in multi-entry builds (not used by default)
if (!window.__SINGLE_ENTRY_MODE__) {
  initialize();
}
