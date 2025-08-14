import { useState } from 'react';
import {
    useLibrarySources,
    useCompanyLibraryFiles,
    getLibraryFileDisplayName,
    type LibraryFile,
    type LibrarySource,
} from '../../hooks/useLibrary';

type ApiList<T> = {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: T[];
};

// Use TanStack Query hooks instead of manual fetch
function useSourcesWrapper() {
    const { data } = useLibrarySources();
    return data || [];
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
    } = useCompanyLibraryFiles(companyUuid || null, page, pageSize, source);
    const error = queryError ? String(queryError) : null;
    return { data: data || {}, loading, error };
}

function useQueryParams() {
    const [params, setParams] = useState(() => new URLSearchParams(window.location.search));

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

export function RelatedDocumentsPanel({
    companyUuid,
    paramPrefix = 'dl_',
    title = 'Related Documents',
}: {
    companyUuid?: string | null;
    paramPrefix?: string;
    title?: string;
}) {
    const { params, update } = useQueryParams();
    const pageParam = `${paramPrefix}page`;
    const sizeParam = `${paramPrefix}size`;
    const allParam = `${paramPrefix}all`;
    const sourceParam = `${paramPrefix}source`;

    const lAll = params.get(allParam);
    const page = parseInt(params.get(pageParam) || '1', 10);
    const size = lAll ? 100 : parseInt(params.get(sizeParam) || '30', 10); // Match API default page size
    const source = params.get(sourceParam);

    const { data, loading, error } = useLibraryFilesWrapper(
        companyUuid || '',
        page,
        size,
        source || undefined,
    );
    const sources = useSourcesWrapper();

    const showingRange = (() => {
        if (!data.results || typeof data.count !== 'number') return null;
        const start = (page - 1) * size + 1;
        const end = Math.min(page * size, data.count);
        return { start, end, total: data.count };
    })();

    if (!companyUuid) {
        return (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-base font-semibold text-gray-900">{title}</h3>
                <div className="text-sm text-gray-500">No company linked to this deal.</div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600">Source</label>
                    <select
                        className="block rounded-md border-gray-300 py-1 pl-2 pr-8 text-sm focus:border-blue-500 focus:ring-blue-500"
                        value={source || ''}
                        onChange={(e) => {
                            const v = e.target.value || null;
                            update((p) => {
                                if (v === null) p.delete(sourceParam);
                                else p.set(sourceParam, v);
                                p.set(pageParam, '1');
                            });
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
            </div>

            {loading && <div className="text-sm text-gray-500">Loading…</div>}
            {error && <div className="text-sm text-red-600">{error}</div>}
            {!loading && !error && (
                <>
                    <ul className="divide-y divide-gray-100">
                        {data.results && data.results.length ? (
                            data.results.map((f) => {
                                const href = (f.file as string) || (f.src_url as string) || '';
                                return (
                                    <li key={f.uuid} className="py-2 text-sm">
                                        {href ? (
                                            <a
                                                href={href}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="break-all text-blue-600 hover:text-blue-700"
                                            >
                                                {getLibraryFileDisplayName(f)}
                                            </a>
                                        ) : (
                                            <span>{getLibraryFileDisplayName(f)}</span>
                                        )}
                                        {f.source?.name ? (
                                            <span className="ml-2 text-xs text-gray-500">
                                                {f.source.name}
                                            </span>
                                        ) : null}
                                    </li>
                                );
                            })
                        ) : (
                            <li className="py-2 text-sm text-gray-500">No documents found.</li>
                        )}
                    </ul>

                    {showingRange && (
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                            <span>
                                Showing {showingRange.start}–{showingRange.end} of{' '}
                                {showingRange.total}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    className={`rounded-md border px-2 py-1 ${
                                        data.previous
                                            ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                            : 'cursor-not-allowed border-gray-200 text-gray-400'
                                    }`}
                                    disabled={!data.previous}
                                    onClick={() =>
                                        update((p) =>
                                            p.set(pageParam, String(Math.max(1, page - 1))),
                                        )
                                    }
                                >
                                    Prev
                                </button>
                                <button
                                    className={`rounded-md border px-2 py-1 ${
                                        data.next
                                            ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                            : 'cursor-not-allowed border-gray-200 text-gray-400'
                                    }`}
                                    disabled={!data.next}
                                    onClick={() =>
                                        update((p) => p.set(pageParam, String(page + 1)))
                                    }
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default RelatedDocumentsPanel;
