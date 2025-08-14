import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import FormRenderer, { type FormFieldDef } from '../components/forms/FormRenderer';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { Separator } from '../components/ui/separator';
import { ExternalLink, Building, FileText, Filter } from 'lucide-react';
import { useCompanyData } from '../hooks/useCompanyData';
import {
    useLibrarySources,
    useCompanyLibraryFiles,
    getLibraryFileDisplayName,
} from '../hooks/useLibrary';
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
        <>
            <div className="flex items-center gap-2 mb-4">
                <Building className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">About</h3>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Website</dt>
                            <dd className="text-sm text-gray-900">
                                {company.website ? (
                                    <a
                                        href={company.website}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                    >
                                        {company.website}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                ) : (
                                    '-'
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Headquarters</dt>
                            <dd className="text-sm text-gray-900">{location || '-'}</dd>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Founded</dt>
                            <dd className="text-sm text-gray-900">{company.year_founded ?? '-'}</dd>
                        </div>
                    </div>
                </div>

                {company.summary && (
                    <>
                        <Separator />
                        <div>
                            <dt className="text-sm font-medium text-gray-500 mb-2">Summary</dt>
                            <dd className="text-sm text-gray-900 leading-relaxed">
                                {stripTemplateArtifacts(company.summary)}
                            </dd>
                        </div>
                    </>
                )}
            </div>
        </>
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

// Use TanStack Query hook for library files
function useLibraryFilesWrapper(
    companyUuid: string,
    page: number,
    pageSize: number,
    source?: string | null,
) {
    const {
        data,
        isLoading: loading,
        error: queryError,
    } = useCompanyLibraryFiles(companyUuid, page, pageSize, source);
    const error = queryError ? String(queryError) : null;
    return { data: data || {}, loading, error };
}

// Use TanStack Query hook for sources
function useLibrarySourcesWrapper() {
    const { data } = useLibrarySources();
    return data || [];
}

// Use the imported getLibraryFileDisplayName function

function CompanyLibraryPanel({ uuid }: { uuid: string }) {
    const { params } = useQueryParams();
    const lAll = params.get('l_all');
    const page = parseInt(params.get('l_page') || '1', 10);
    const size = lAll ? 100 : parseInt(params.get('l_size') || '5', 10);
    const source = params.get('l_source');
    const { data, loading, error } = useLibraryFilesWrapper(uuid, page, size, source);
    const sources = useLibrarySourcesWrapper();

    const prevLink = data.previous ? buildMergedLink({ l_page: String(page - 1) }) : null;
    const nextLink = data.next ? buildMergedLink({ l_page: String(page + 1) }) : null;
    const viewAllLink = buildMergedLink({ l_all: '1', l_size: null, l_page: null });

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Library Documents</h3>
                </div>
                <div className="flex items-center gap-2">
                    <a href={viewAllLink} className="text-xs text-blue-600 hover:text-blue-800">
                        View all
                    </a>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <label className="text-sm font-medium text-gray-500">Source</label>
                    <select
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
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

                {loading && <div className="text-sm text-gray-500">Loading documents…</div>}
                {error && <div className="text-sm text-red-600">{error}</div>}
                {!loading && !error && (
                    <div className="space-y-3">
                        {data.results && data.results.length ? (
                            data.results.map((f) => (
                                <div key={f.uuid} className="border-l-4 border-blue-200 pl-4">
                                    {f.file || f.src_url ? (
                                        <a
                                            href={(f.file as string) || (f.src_url as string)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                        >
                                            {getLibraryFileDisplayName(f)}
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    ) : (
                                        <span className="text-sm font-medium text-gray-900">
                                            {getLibraryFileDisplayName(f)}
                                        </span>
                                    )}
                                    {f.source?.name && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {f.source.name}
                                        </p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500">No documents found.</p>
                        )}

                        {typeof data.count === 'number' && data.results && data.results.length && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                <p className="text-xs text-gray-600">
                                    Showing {(page - 1) * size + 1}-
                                    {(page - 1) * size + data.results.length} of {data.count}
                                </p>
                                <div className="flex items-center gap-2">
                                    {prevLink ? (
                                        <a
                                            href={prevLink}
                                            className="inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            Prev
                                        </a>
                                    ) : (
                                        <span className="inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-400">
                                            Prev
                                        </span>
                                    )}
                                    {nextLink ? (
                                        <a
                                            href={nextLink}
                                            className="inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            Next
                                        </a>
                                    ) : (
                                        <span className="inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-400">
                                            Next
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
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
        const { company, loading, errors } = useCompanyData(uuid);
        const error = errors.company;
        if (loading) return <div className="text-muted small">Loading…</div>;
        if (error) return <div className="text-danger small">{error}</div>;
        if (!company) return null;
        return <CompanyAbout company={company} />;
    }
    root.render(
        <QueryClientProvider client={queryClient}>
            <AboutShell uuid={uuid} />
        </QueryClientProvider>,
    );
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
    root.render(
        <QueryClientProvider client={queryClient}>
            <CompanyLibraryPanel uuid={uuid} />
        </QueryClientProvider>,
    );
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
