import { createRoot } from 'react-dom/client';
import { useEffect, useMemo, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import FormRenderer, { type FormFieldDef } from '../components/forms/FormRenderer';
import { http } from '../lib/http';

type Assessment = {
    uuid?: string;
    deal: { uuid: string } | string;
    quality_percentile?: string | null;
    investment_rationale?: string | null;
    pros?: string | null;
    cons?: string | null;
};

type ApiList<T> = { count?: number; results?: T[] } | T[];

function useLatestAssessment(dealUuid: string) {
    const [data, setData] = useState<Assessment | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function run() {
            setLoading(true);
            setError(null);
            try {
                const resp = await http.get(`/deals/assessments/`, {
                    params: { deal: dealUuid, ordering: '-created_at', page_size: 1 },
                });
                const json = resp.data as ApiList<Assessment>;
                const item = Array.isArray(json) ? json[0] : (json.results || [])[0];
                if (!cancelled) setData(item || null);
            } catch (e: unknown) {
                if (!cancelled)
                    setError(e instanceof Error ? e.message : 'Failed to load assessment');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        run();
        return () => {
            cancelled = true;
        };
    }, [dealUuid]);

    return { data, loading, error };
}

function SuccessBanner({ dealUuid, onClose }: { dealUuid: string; onClose: () => void }) {
    return (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <div className="flex items-start justify-between">
                <p>Assessment saved. You can return to the deal details.</p>
                <button onClick={onClose} className="ml-4 text-green-700 hover:text-green-900">
                    ×
                </button>
            </div>
            <div className="mt-3">
                <a
                    href={`/deals/${dealUuid}/`}
                    className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                >
                    Back to Deal Details
                </a>
            </div>
        </div>
    );
}

function DealAssessmentApp({ dealUuid }: { dealUuid: string }) {
    const { data: latest, loading, error } = useLatestAssessment(dealUuid);
    const [saved, setSaved] = useState(false);

    const fields = useMemo<FormFieldDef[]>(
        () => [
            {
                name: 'quality_percentile',
                label: 'Quality Percentile',
                type: 'select',
                required: false,
                options: [
                    { label: 'Most interesting (Top 1%)', value: 'top 1%' },
                    { label: 'Very interesting (Top 5%)', value: 'top 5%' },
                    { label: 'Interesting (Top 10%)', value: 'top 10%' },
                    { label: 'Potentially interesting (Top 20%)', value: 'top 20%' },
                    { label: 'Not interesting (Top 50%)', value: 'top 50%' },
                ],
            },
            {
                name: 'investment_rationale',
                label: 'Investment Rationale',
                type: 'textarea',
                required: false,
            },
            { name: 'pros', label: 'Pros', type: 'textarea', required: false },
            { name: 'cons', label: 'Cons', type: 'textarea', required: false },
            {
                name: 'send_to_affinity',
                label: 'Send to Affinity',
                type: 'checkbox',
                required: false,
            },
        ],
        [],
    );

    const defaults = useMemo(() => {
        const base: Record<string, unknown> = {};
        if (latest) {
            base.quality_percentile = latest.quality_percentile || '';
            base.investment_rationale = latest.investment_rationale || '';
            base.pros = latest.pros || '';
            base.cons = latest.cons || '';
        }
        base.send_to_affinity = false;
        return base;
    }, [latest]);

    async function onSubmit(values: Record<string, unknown>) {
        // Separate the send_to_affinity toggle
        const { send_to_affinity, ...assessmentValues } = values as Record<string, unknown> & {
            send_to_affinity?: boolean;
        };

        // Upsert assessment
        if (latest?.uuid) {
            await http.patch(`/deals/assessments/${latest.uuid}/`, {
                deal: dealUuid,
                ...assessmentValues,
            });
        } else {
            await http.post(`/deals/assessments/`, {
                deal: dealUuid,
                ...assessmentValues,
            });
        }

        // Send to Affinity toggle
        if (send_to_affinity) {
            await http.patch(`/deals/deals/${dealUuid}/`, { sent_to_affinity: true });
        }

        setSaved(true);
    }

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-lg font-semibold text-gray-900">Deal Assessment</h2>
                <p className="text-sm text-gray-500">
                    Finalize your assessment. You can optionally send it to Affinity.
                </p>
            </div>

            {saved && <SuccessBanner dealUuid={dealUuid} onClose={() => setSaved(false)} />}

            {loading ? (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    Loading…
                </div>
            ) : error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <FormRenderer
                        fields={fields}
                        defaultValues={defaults}
                        onSubmitData={onSubmit}
                        submitLabel="Save"
                        cancelHref={`/deals/${dealUuid}/`}
                        cancelLabel="Cancel"
                    />
                </div>
            )}
        </div>
    );
}

export function initialize() {
    const mount = document.getElementById('deal-assessment-root') as HTMLDivElement | null;
    if (!mount) return;
    const dealUuid = mount.dataset.uuid || '';
    if (!dealUuid) return;
    const root = createRoot(mount);
    root.render(
        <QueryClientProvider client={queryClient}>
            <DealAssessmentApp dealUuid={dealUuid} />
        </QueryClientProvider>,
    );
}

if (!window.__SINGLE_ENTRY_MODE__) {
    initialize();
}
