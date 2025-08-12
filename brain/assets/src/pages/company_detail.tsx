import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import FormRenderer, { type FormFieldDef } from '../components/forms/FormRenderer';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
// API helpers used by FormRenderer internally

type Company = {
    uuid: string;
    name: string;
    website?: string | null;
    hq_country?: string | null;
    hq_state_name?: string | null;
    hq_city_name?: string | null;
    year_founded?: number | null;
    summary?: string | null;
    founders?: Founder[];
    advisors?: Advisor[];
};

type Founder = {
    uuid: string;
    name: string;
    title?: string | null;
    linkedin_url?: string | null;
};

type Advisor = {
    uuid: string;
    name: string;
    title?: string | null;
    linkedin_url?: string | null;
};

type ApiList<T> = {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: T[];
};

// Types for grants/patents/papers retained in API layer; unused here

type LibraryFile = {
    uuid: string;
    file?: string | null;
    mime_type?: string | null;
    source?: { uuid: string; name: string; code?: string | null } | null;
    src_url?: string | null;
    created_at?: string;
};

type LibrarySource = { uuid: string; name: string; code?: string | null };

function joinLocation(country?: string | null, state?: string | null, city?: string | null) {
    return [city, state, country].filter(Boolean).join(', ');
}

function useCompany(uuid: string | null) {
    const [data, setData] = useState<Company | null>(null);
    const [loading, setLoading] = useState<boolean>(!!uuid);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function run() {
            if (!uuid) return;
            setLoading(true);
            setError(null);
            try {
                const resp = await fetch(`/api/companies/companies/${uuid}/`, {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json' },
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const json = (await resp.json()) as Company;
                if (!cancelled) setData(json);
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Failed to load company';
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

function stripTemplateArtifacts(input?: string | null): string {
    if (!input) return '';
    // Remove Django template tags/variables and collapse excessive blank lines
    try {
        // Remove {% ... %} and {{ ... }} and {# ... #}
        const withoutTags = input
            .replace(/\{#([\s\S]*?)#\}/g, '')
            .replace(/\{%([\s\S]*?)%\}/g, '')
            .replace(/\{\{([\s\S]*?)\}\}/g, '')
            .trim();
        // Collapse multiple blank lines to a single newline
        return withoutTags.replace(/\n{3,}/g, '\n\n');
    } catch {
        return input;
    }
}

function CompanyAbout({ company }: { company: Company }) {
    const location = useMemo(
        () => joinLocation(company.hq_country, company.hq_state_name, company.hq_city_name),
        [company.hq_country, company.hq_state_name, company.hq_city_name],
    );
    return (
        <div className="card mt-3">
            <div className="card-header">About</div>
            <div className="card-body">
                <div className="mb-2">
                    <strong>Website:</strong>{' '}
                    {company.website ? (
                        <a href={company.website} target="_blank" rel="noreferrer">
                            {company.website}
                        </a>
                    ) : (
                        <span>-</span>
                    )}
                </div>
                <div className="mb-2">
                    <strong>HQ:</strong> <span>{location || '-'}</span>
                </div>
                <div className="mb-2">
                    <strong>Founded:</strong> <span>{company.year_founded ?? '-'}</span>
                </div>
                {company.summary && (
                    <div className="mb-0">
                        <strong>Summary:</strong>
                        <div>{stripTemplateArtifacts(company.summary)}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------- Library (company-scoped) ----------
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

function buildMergedLink(merge: Record<string, string | null>) {
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(merge)) {
        if (v === null) params.delete(k);
        else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
}

function useLibraryFiles(
    companyUuid: string,
    page: number,
    pageSize: number,
    source?: string | null,
) {
    const [data, setData] = useState<ApiList<LibraryFile>>({});
    const [loading, setLoading] = useState<boolean>(!!companyUuid);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function run() {
            if (!companyUuid) return;
            setLoading(true);
            setError(null);
            try {
                const sp = new URLSearchParams();
                sp.set('company', companyUuid);
                sp.set('page', String(page));
                sp.set('page_size', String(pageSize));
                if (source) sp.set('source', source);
                const resp = await fetch(`/api/library/files/?${sp.toString()}`, {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json' },
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const json = (await resp.json()) as ApiList<LibraryFile> | LibraryFile[];
                const normalized: ApiList<LibraryFile> = Array.isArray(json)
                    ? { count: (json as LibraryFile[]).length, results: json as LibraryFile[] }
                    : (json as ApiList<LibraryFile>);
                if (!cancelled) setData(normalized);
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
    }, [companyUuid, page, pageSize, source]);
    return { data, loading, error };
}

function useLibrarySources() {
    const [data, setData] = useState<LibrarySource[]>([]);
    useEffect(() => {
        let cancelled = false;
        async function run() {
            try {
                const resp = await fetch('/api/library/sources/', {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json' },
                });
                if (!resp.ok) return;
                const json = (await resp.json()) as ApiList<LibrarySource> | LibrarySource[];
                const items = Array.isArray(json) ? json : json.results || [];
                if (!cancelled) setData(items);
    } catch (_) {
        // noop
    }
        }
        run();
        return () => {
            cancelled = true;
        };
    }, []);
    return data;
}

function fileDisplayName(f: LibraryFile) {
    if (f.src_url) return f.src_url;
    if (f.file) {
        try {
            const url = new URL(f.file, window.location.origin);
            const parts = url.pathname.split('/');
            return parts[parts.length - 1] || f.file;
        } catch {
            return f.file;
        }
    }
    return f.uuid;
}

function CompanyLibraryPanel({ uuid }: { uuid: string }) {
    const { params } = useQueryParams();
    const lAll = params.get('l_all');
    const page = parseInt(params.get('l_page') || '1', 10);
    const size = lAll ? 100 : parseInt(params.get('l_size') || '5', 10);
    const source = params.get('l_source');
    const { data, loading, error } = useLibraryFiles(uuid, page, size, source);
    const sources = useLibrarySources();

    const prevLink = data.previous ? buildMergedLink({ l_page: String(page - 1) }) : null;
    const nextLink = data.next ? buildMergedLink({ l_page: String(page + 1) }) : null;
    const viewAllLink = buildMergedLink({ l_all: '1', l_size: null, l_page: null });

    return (
        <div className="card mt-3">
            <div className="card-header d-flex align-items-center justify-content-between">
                <span>Library Documents</span>
                <span className="small">
                    <a className="text-decoration-none" href={viewAllLink}>
                        View all
                    </a>
                </span>
            </div>
            <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-3">
                    <label className="small text-muted">Source</label>
                    <select
                        className="form-select form-select-sm w-auto"
                        value={source || ''}
                        onChange={(e) => {
                            const value = e.target.value || null;
                            const link = buildMergedLink({ l_source: value, l_page: '1' });
                            window.location.href = link;
                        }}
                    >
                        <option value="">All</option>
                        {sources.map((s) => (
                            <option key={s.uuid} value={s.uuid}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>

                {loading && <div className="text-muted small">Loading…</div>}
                {error && <div className="text-danger small">{error}</div>}
                {!loading && !error && (
                    <>
                        <ul className="mb-2">
                            {data.results && data.results.length ? (
                                data.results.map((f) => (
                                    <li key={f.uuid}>
                                        {f.file || f.src_url ? (
                                            <a
                                                href={(f.file as string) || (f.src_url as string)}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {fileDisplayName(f)}
                                            </a>
                                        ) : (
                                            <span>{fileDisplayName(f)}</span>
                                        )}
                                        {f.source?.name ? (
                                            <span className="text-muted small ms-2">
                                                {f.source.name}
                                            </span>
                                        ) : null}
                                    </li>
                                ))
                            ) : (
                                <span className="text-secondary">No documents found.</span>
                            )}
                        </ul>
                        {typeof data.count === 'number' && data.results && data.results.length ? (
                            <div className="d-flex align-items-center justify-content-end gap-2 small">
                                <span className="text-muted">
                                    Showing {(page - 1) * size + 1}-
                                    {(page - 1) * size + data.results.length} of {data.count}
                                </span>
                                <div className="btn-group btn-group-sm" role="group">
                                    {prevLink ? (
                                        <a className="btn btn-outline-secondary" href={prevLink}>
                                            Prev
                                        </a>
                                    ) : (
                                        <span className="btn btn-outline-secondary disabled">
                                            Prev
                                        </span>
                                    )}
                                    {nextLink ? (
                                        <a className="btn btn-outline-secondary" href={nextLink}>
                                            Next
                                        </a>
                                    ) : (
                                        <span className="btn btn-outline-secondary disabled">
                                            Next
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}

// ---------- Mount points ----------
function mountAbout() {
    const el = document.getElementById('company-about-root');
    if (!el) return;
    const uuid = el.getAttribute('data-uuid');
    if (!uuid) return;
    // Prefer a proper component mount to leverage hooks
    const root = createRoot(el);
    function AboutShell({ uuid }: { uuid: string }) {
        const { data, loading, error } = useCompany(uuid);
        if (loading) return <div className="text-muted small">Loading…</div>;
        if (error) return <div className="text-danger small">{error}</div>;
        if (!data) return null;
        return <CompanyAbout company={data} />;
    }
    root.render(<AboutShell uuid={uuid} />);
}

function mountGrantForm() {
    const el = document.getElementById('grant-form-root') as HTMLDivElement | null;
    if (!el) return;
    // Legacy action preserved for backward compat but unused in API mode
    const csrf = el.dataset.csrf || null;
    const initial = el.dataset.initial ? JSON.parse(el.dataset.initial) : {};
    const fields: FormFieldDef[] = el.dataset.fields ? JSON.parse(el.dataset.fields) : [];
    const cancelHref = el.dataset.cancel || null;
    const apiEndpoint = el.dataset.apiEndpoint || '/companies/grants/';
    const company = el.dataset.company || undefined;

    const root = createRoot(el);
    root.render(
        <QueryClientProvider client={queryClient}>
            <FormRenderer
                csrfToken={csrf}
                fields={fields}
                defaultValues={initial}
                submitLabel="Save"
                cancelHref={cancelHref}
                api={{
                    endpoint: apiEndpoint,
                    method: 'post',
                    payload: (values) => ({ ...values, ...(company ? { company } : {}) }),
                    headers: {},
                }}
                nextUrl={cancelHref || undefined}
            />
        </QueryClientProvider>,
    );
}

function mountLibrary() {
    const el = document.getElementById('company-library-root');
    if (!el) return;
    const uuid = el.getAttribute('data-uuid');
    if (!uuid) return;
    const root = createRoot(el);
    root.render(<CompanyLibraryPanel uuid={uuid} />);
}

function mountAll() {
    mountAbout();
    mountGrantForm();
    mountLibrary();
}

// Export for single-entry pattern (called by main.tsx router)
export function initialize() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountAll);
    } else {
        mountAll();
    }
}
