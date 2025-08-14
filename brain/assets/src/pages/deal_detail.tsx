import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { http } from '@/lib/http';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Edit, Edit2, ExternalLink, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import RelatedDocumentsPanel from '../components/library/RelatedDocumentsPanel';
import { FileManagementModal } from '../components/deals/FileManagementModal';
import { CompanyOverviewCard } from '../components/deals/CompanyOverviewCard';
import { ExternalDataBadges } from '../components/deals/ExternalDataBadges';
import { FoundersAccordion } from '../components/deals/FoundersAccordion';
import { AdvisorsAccordion } from '../components/deals/AdvisorsAccordion';
import { GrantsAccordion } from '../components/deals/GrantsAccordion';
import { PatentsAccordion } from '../components/deals/PatentsAccordion';
import { ClinicalTrialsAccordion } from '../components/deals/ClinicalTrialsAccordion';
import { ActionsBar } from '../components/deals/ActionsBar';
import { FoundersEditModal } from '../components/deals/FoundersEditModal';
import { AdvisorsEditModal } from '../components/deals/AdvisorsEditModal';
import { GrantsEditModal } from '../components/deals/GrantsEditModal';
import { IndustriesEditModal } from '../components/deals/IndustriesEditModal';
import { DualUseSignalsEditModal } from '../components/deals/DualUseSignalsEditModal';
import { useCompanyData } from '../hooks/useCompanyData';
import { isNewSinceLastAssessment } from '../lib/utils/deals';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

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
    last_assessment_created_at?: string;
    // External data counts (will be populated from API calls)
    founders_count?: number;
    grants_count?: number;
    patents_count?: number;
    clinical_trials_count?: number;
};

type DealAssessment = {
    uuid?: string;
    // Manual fields
    problem_solved?: string | null;
    solution?: string | null;
    thesis_fit_evaluation?: string | null;
    thesis_fit_score?: number | null;
    customer_traction?: string | null;
    intellectual_property?: string | null;
    business_model?: string | null;
    tam?: string | null;
    competition?: string | null;
    quality_percentile?: string | null;
    recommendation?: string | null;
    investment_rationale?: string | null;
    pros?: string | null;
    cons?: string | null;
    // AI (auto) fields
    auto_problem_solved?: string | null;
    auto_solution?: string | null;
    auto_thesis_fit_evaluation?: string | null;
    auto_thesis_fit_score?: number | null;
    auto_customer_traction?: string | null;
    auto_intellectual_property?: string | null;
    auto_business_model?: string | null;
    auto_tam?: string | null;
    auto_competition?: string | null;
    auto_quality_percentile?: string | null;
    auto_recommendation?: string | null;
    auto_investment_rationale?: string | null;
    auto_pros?: string | null;
    auto_cons?: string | null;
    created_at?: string;
    updated_at?: string;
};

type ApiList<T> = {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: T[];
};

type ResearchAgent = {
    final_assessment: string;
    team_assessment: string;
    search_queries: string[];
};

type DealFile = {
    uuid: string;
    file?: string | null; // URL
    src_url?: string | null;
    mime_type?: string | null;
    created_at?: string;
    deal?: { uuid: string };
};

// Mock research agent data for now (backend not ready)
const mockResearchAgent: ResearchAgent = {
    final_assessment: `# Technical Assessment

This company shows strong technical capabilities in their core AI/ML infrastructure. The team has demonstrated:

- Advanced neural network architectures
- Scalable deployment pipeline
- Strong engineering practices

## Key Findings
- Patent portfolio covers core IP
- Strong customer validation
- Competitive moat established`,
    team_assessment: `# Team Assessment

## Leadership
Strong technical leadership with proven track record at major tech companies.

## Technical Team
- 5 PhD-level researchers
- 15 engineers with relevant experience
- Strong advisory board

## Concerns
- Limited go-to-market experience
- Need stronger business development capability`,
    search_queries: [
        'neural networks startup funding',
        'AI infrastructure patents',
        'machine learning team assessment',
    ],
};

function formatCurrency(amount: number | null | undefined): string {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    try {
        return new Date(dateStr).toLocaleDateString();
    } catch {
        return dateStr;
    }
}

const QUALITY_OPTIONS: { value: string; label: string }[] = [
    { value: 'top 1%', label: 'Most interesting (Top 1%)' },
    { value: 'top 5%', label: 'Very interesting (Top 5%)' },
    { value: 'top 10%', label: 'Interesting (Top 10%)' },
    { value: 'top 20%', label: 'Potentially interesting (Top 20%)' },
    { value: 'top 50%', label: 'Not interesting (Top 50%)' },
];

const RECOMMENDATION_OPTIONS: { value: string; label: string }[] = [
    { value: 'invest', label: 'Invest' },
    { value: 'monitor', label: 'Monitor' },
    { value: 'pass', label: 'Pass' },
];

// Zod validation schemas
const DealAssessmentPatchSchema = z.object({
    problem_solved: z.string().optional(),
    solution: z.string().optional(),
    thesis_fit_evaluation: z.string().optional(),
    thesis_fit_score: z.number().optional(),
    customer_traction: z.string().optional(),
    intellectual_property: z.string().optional(),
    business_model: z.string().optional(),
    tam: z.string().optional(),
    competition: z.string().optional(),
    quality_percentile: z.string().optional(),
    recommendation: z.string().optional(),
    investment_rationale: z.string().optional(),
    pros: z.string().optional(),
    cons: z.string().optional(),
});

const DealAssessmentSchema = DealAssessmentPatchSchema.extend({
    uuid: z.string().uuid().optional(),
    // AI fields
    auto_problem_solved: z.string().optional(),
    auto_solution: z.string().optional(),
    auto_thesis_fit_evaluation: z.string().optional(),
    auto_thesis_fit_score: z.number().optional(),
    auto_customer_traction: z.string().optional(),
    auto_intellectual_property: z.string().optional(),
    auto_business_model: z.string().optional(),
    auto_tam: z.string().optional(),
    auto_competition: z.string().optional(),
    auto_quality_percentile: z.string().optional(),
    auto_recommendation: z.string().optional(),
    auto_investment_rationale: z.string().optional(),
    auto_pros: z.string().optional(),
    auto_cons: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});

function useDeal(uuid: string | null) {
    return useQuery({
        queryKey: ['deal', uuid],
        queryFn: async () => {
            if (!uuid) throw new Error('Deal UUID is required');
            const response = await http.get(`/deals/deals/${uuid}/`);
            return response.data as Deal;
        },
        enabled: !!uuid,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

function useDealFiles(kind: 'decks' | 'papers' | 'files', dealUuid: string | null, pageSize = 10) {
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

function Tag({
    children,
    color = 'slate' as const,
}: {
    children: React.ReactNode;
    color?: 'slate' | 'blue' | 'green' | 'violet' | 'amber';
}) {
    const palette: Record<string, string> = {
        slate: 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/20',
        blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
        green: 'bg-green-50 text-green-700 ring-1 ring-green-600/20',
        violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20',
        amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
    };
    return (
        <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${palette[color]}`}
        >
            {children}
        </span>
    );
}

// Basic Info Card Component
function BasicInfoCard({ deal }: { deal: Deal }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>{deal.name || 'Unnamed Deal'}</span>
                    <div className="flex items-center gap-2">
                        {deal.website && (
                            <Button variant="ghost" size="sm" asChild>
                                <a href={deal.website} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        )}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">Company:</span>
                        <span className="ml-2">{deal.company?.name || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Funding Stage:</span>
                        <span className="ml-2">{deal.funding_stage?.name || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Target:</span>
                        <span className="ml-2">{formatCurrency(deal.funding_target)}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Raised:</span>
                        <span className="ml-2">{formatCurrency(deal.funding_raised)}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Created:</span>
                        <span className="ml-2">{formatDate(deal.created_at)}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Sent to Affinity:</span>
                        <Badge variant={deal.sent_to_affinity ? 'default' : 'secondary'}>
                            {deal.sent_to_affinity ? 'Yes' : 'No'}
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Research Agent Section Component
function ResearchAgentSection({ data = mockResearchAgent }: { data?: ResearchAgent }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    Research Agent Analysis
                    <Button variant="outline" size="sm">
                        View Full Analysis
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-medium text-gray-900 mb-2">Final Assessment</h4>
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{data.final_assessment}</ReactMarkdown>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-900 mb-2">Team Assessment</h4>
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{data.team_assessment}</ReactMarkdown>
                        </div>
                    </div>
                </div>
                {data.search_queries.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                            Search Queries Used:
                        </h5>
                        <div className="flex flex-wrap gap-1">
                            {data.search_queries.map((query, index) => (
                                <Badge key={index} variant="secondary">
                                    {query}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// AI Assessment Component (Top Row - Read-only)
function AIAssessmentSection({
    assessment,
    loading,
    error,
}: {
    assessment: DealAssessment | null;
    loading: boolean;
    error: string | null;
}) {
    if (loading) return <LoadingBox label="Loading AI assessment…" />;
    if (error) return <ErrorBox message={error} />;
    if (!assessment) return null;

    const fields = [
        {
            label: 'Problem Solved',
            value: assessment.auto_problem_solved,
            key: 'auto_problem_solved',
        },
        { label: 'Solution', value: assessment.auto_solution, key: 'auto_solution' },
        {
            label: 'Customer Traction',
            value: assessment.auto_customer_traction,
            key: 'auto_customer_traction',
        },
        {
            label: 'IP',
            value: assessment.auto_intellectual_property,
            key: 'auto_intellectual_property',
        },
        {
            label: 'Business Model',
            value: assessment.auto_business_model,
            key: 'auto_business_model',
        },
        { label: 'TAM', value: assessment.auto_tam, key: 'auto_tam' },
        { label: 'Competition', value: assessment.auto_competition, key: 'auto_competition' },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    AI Assessment
                    <Badge variant="secondary">Auto-generated</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Basic fields grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {fields.map((field) => (
                        <div key={field.key} className="space-y-1">
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-semibold text-gray-500">
                                    {field.label}
                                </span>
                                <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                                    <Edit className="h-3 w-3" />
                                </Button>
                            </div>
                            <p className="text-sm text-gray-700 min-h-[2.5rem]">
                                {field.value || '—'}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Main assessment fields - aligned columns */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div>
                        <div className="text-xs font-semibold text-gray-500 mb-2">
                            Investment Rationale
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                            {assessment.auto_investment_rationale || '—'}
                        </p>
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-gray-500 mb-2">Pros</div>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                            {assessment.auto_pros || '—'}
                        </p>
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-gray-500 mb-2">Cons</div>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                            {assessment.auto_cons || '—'}
                        </p>
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-gray-500 mb-2">
                            Recommendation
                        </div>
                        <Badge variant="outline">
                            {assessment.auto_recommendation ||
                                assessment.auto_quality_percentile ||
                                '—'}
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Analyst Assessment Component (Bottom Row - Direct Editable)
function AnalystAssessmentSection({
    assessment,
    onSave,
}: {
    assessment: DealAssessment | null;
    onSave: (patch: Partial<DealAssessment>) => Promise<DealAssessment>;
}) {
    // State for all editable fields
    const [problemSolved, setProblemSolved] = useState(assessment?.problem_solved || '');
    const [solution, setSolution] = useState(assessment?.solution || '');
    const [customerTraction, setCustomerTraction] = useState(assessment?.customer_traction || '');
    const [intellectualProperty, setIntellectualProperty] = useState(
        assessment?.intellectual_property || '',
    );
    const [businessModel, setBusinessModel] = useState(assessment?.business_model || '');
    const [tam, setTam] = useState(assessment?.tam || '');
    const [competition, setCompetition] = useState(assessment?.competition || '');
    const [rationale, setRationale] = useState(assessment?.investment_rationale || '');
    const [pros, setPros] = useState(assessment?.pros || '');
    const [cons, setCons] = useState(assessment?.cons || '');
    const [recommendation, setRecommendation] = useState(assessment?.recommendation || '');
    const [quality, setQuality] = useState(assessment?.quality_percentile || '');

    // Saving state tracking
    const [savingFields, setSavingFields] = useState<Set<string>>(new Set());

    // Original values for dirty state comparison
    const originalValues = useMemo(
        () => ({
            problem_solved: assessment?.problem_solved || '',
            solution: assessment?.solution || '',
            customer_traction: assessment?.customer_traction || '',
            intellectual_property: assessment?.intellectual_property || '',
            business_model: assessment?.business_model || '',
            tam: assessment?.tam || '',
            competition: assessment?.competition || '',
            investment_rationale: assessment?.investment_rationale || '',
            pros: assessment?.pros || '',
            cons: assessment?.cons || '',
            recommendation: assessment?.recommendation || '',
            quality_percentile: assessment?.quality_percentile || '',
        }),
        [assessment],
    );

    // Current values for dirty state comparison
    const currentValues = useMemo(
        () => ({
            problem_solved: problemSolved,
            solution: solution,
            customer_traction: customerTraction,
            intellectual_property: intellectualProperty,
            business_model: businessModel,
            tam: tam,
            competition: competition,
            investment_rationale: rationale,
            pros: pros,
            cons: cons,
            recommendation: recommendation,
            quality_percentile: quality,
        }),
        [
            problemSolved,
            solution,
            customerTraction,
            intellectualProperty,
            businessModel,
            tam,
            competition,
            rationale,
            pros,
            cons,
            recommendation,
            quality,
        ],
    );

    // Save on blur handler
    const handleBlur = useCallback(
        async (field: string) => {
            // Check if field value has changed
            const currentValue = currentValues[field as keyof typeof currentValues];
            const originalValue = originalValues[field as keyof typeof originalValues];

            if (currentValue === originalValue) {
                return; // No change, don't save
            }

            // Check if already saving this field
            if (savingFields.has(field)) {
                return;
            }

            setSavingFields((prev) => new Set([...prev, field]));

            try {
                await onSave({ [field]: currentValue });
                toast.success('Changes saved successfully');
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to save';
                toast.error(`Failed to save: ${errorMessage}`);
            } finally {
                setSavingFields((prev) => {
                    const next = new Set(prev);
                    next.delete(field);
                    return next;
                });
            }
        },
        [currentValues, originalValues, savingFields, onSave],
    );

    // Sync state when data changes
    useEffect(() => {
        if (assessment) {
            setProblemSolved(assessment.problem_solved || '');
            setSolution(assessment.solution || '');
            setCustomerTraction(assessment.customer_traction || '');
            setIntellectualProperty(assessment.intellectual_property || '');
            setBusinessModel(assessment.business_model || '');
            setTam(assessment.tam || '');
            setCompetition(assessment.competition || '');
            setRationale(assessment.investment_rationale || '');
            setPros(assessment.pros || '');
            setCons(assessment.cons || '');
            setRecommendation(assessment.recommendation || '');
            setQuality(assessment.quality_percentile || '');
        }
    }, [assessment?.uuid]);

    const basicFields = [
        {
            label: 'Problem Solved',
            value: problemSolved,
            setter: setProblemSolved,
            key: 'problem_solved',
        },
        { label: 'Solution', value: solution, setter: setSolution, key: 'solution' },
        {
            label: 'Customer Traction',
            value: customerTraction,
            setter: setCustomerTraction,
            key: 'customer_traction',
        },
        {
            label: 'IP',
            value: intellectualProperty,
            setter: setIntellectualProperty,
            key: 'intellectual_property',
        },
        {
            label: 'Business Model',
            value: businessModel,
            setter: setBusinessModel,
            key: 'business_model',
        },
        { label: 'TAM', value: tam, setter: setTam, key: 'tam' },
        { label: 'Competition', value: competition, setter: setCompetition, key: 'competition' },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        Analyst Assessment
                        <Badge variant="outline">Editable</Badge>
                    </span>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        {savingFields.size > 0 && (
                            <span className="flex items-center gap-1">
                                <div className="inline-block h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent"></div>
                                Saving...
                            </span>
                        )}
                        {assessment?.updated_at && (
                            <span>Updated {new Date(assessment.updated_at).toLocaleString()}</span>
                        )}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Basic fields grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {basicFields.map((field) => (
                        <div key={field.key} className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600">
                                {field.label}
                                {savingFields.has(field.key) && (
                                    <span className="ml-1 text-blue-600">Saving...</span>
                                )}
                            </label>
                            <Textarea
                                value={field.value}
                                onChange={(e) => field.setter(e.target.value)}
                                onBlur={() => handleBlur(field.key)}
                                className="min-h-[4rem] resize-none text-sm"
                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                            />
                        </div>
                    ))}
                </div>

                {/* Main assessment fields - aligned columns */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-2">
                            Investment Rationale
                            {savingFields.has('investment_rationale') && (
                                <span className="ml-1 text-blue-600">Saving...</span>
                            )}
                        </label>
                        <Textarea
                            value={rationale}
                            onChange={(e) => setRationale(e.target.value)}
                            onBlur={() => handleBlur('investment_rationale')}
                            className="min-h-[8rem] resize-none text-sm"
                            placeholder="Enter investment rationale..."
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-2">
                            Pros
                            {savingFields.has('pros') && (
                                <span className="ml-1 text-blue-600">Saving...</span>
                            )}
                        </label>
                        <Textarea
                            value={pros}
                            onChange={(e) => setPros(e.target.value)}
                            onBlur={() => handleBlur('pros')}
                            className="min-h-[8rem] resize-none text-sm"
                            placeholder="Enter pros..."
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-2">
                            Cons
                            {savingFields.has('cons') && (
                                <span className="ml-1 text-blue-600">Saving...</span>
                            )}
                        </label>
                        <Textarea
                            value={cons}
                            onChange={(e) => setCons(e.target.value)}
                            onBlur={() => handleBlur('cons')}
                            className="min-h-[8rem] resize-none text-sm"
                            placeholder="Enter cons..."
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-2">
                            Recommendation
                            {(savingFields.has('quality_percentile') ||
                                savingFields.has('recommendation')) && (
                                <span className="ml-1 text-blue-600">Saving...</span>
                            )}
                        </label>
                        <select
                            value={quality}
                            onChange={(e) => setQuality(e.target.value)}
                            onBlur={() => handleBlur('quality_percentile')}
                            className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select...</option>
                            {QUALITY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={recommendation}
                            onChange={(e) => setRecommendation(e.target.value)}
                            onBlur={() => handleBlur('recommendation')}
                            className="w-full mt-2 rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select action...</option>
                            {RECOMMENDATION_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function Summary({ deal }: { deal: Deal }) {
    const hasInvestors = (deal.investors_names || []).length > 0;
    const hasPartners = (deal.partners_names || []).length > 0;
    const hasCustomers = (deal.customers_names || []).length > 0;
    return (
        <SectionCard title="Summary">
            {deal.description ? (
                <p className="text-sm leading-6 text-gray-700 whitespace-pre-line">
                    {deal.description}
                </p>
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

function Industries({ items, onEdit }: { items: Related[] | undefined; onEdit?: () => void }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">Industries</h3>
                {onEdit && (
                    <Button variant="ghost" size="sm" onClick={onEdit} title="Edit industries">
                        <Edit2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
            {items && items.length ? (
                <div className="flex flex-wrap gap-1">
                    {items.map((it, index) => (
                        <Tag key={it.uuid} color={['violet', 'blue', 'green', 'amber', 'slate'][index % 5] as any}>
                            {it.name || '—'}
                        </Tag>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4">
                    <div className="text-sm text-gray-500 mb-2">No industries.</div>
                    {onEdit && (
                        <Button variant="outline" size="sm" onClick={onEdit}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Industries
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

function Signals({ items, onEdit }: { items: RelatedSignal[] | undefined; onEdit: () => void }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">Dual-use Signals</h3>
                <Button variant="ghost" size="sm" onClick={onEdit} title="Edit dual-use signals">
                    <Edit2 className="h-4 w-4" />
                </Button>
            </div>
            {items && items.length ? (
                <div className="flex flex-wrap gap-1">
                    {items.map((it, index) => (
                        <Tag key={it.uuid} color={['amber', 'green', 'blue', 'violet', 'slate'][index % 5] as any}>
                            {it.name}
                        </Tag>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4">
                    <div className="text-sm text-gray-500 mb-2">No signals assigned</div>
                    <Button variant="outline" size="sm" onClick={onEdit}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Signals
                    </Button>
                </div>
            )}
        </div>
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
                                <a
                                    className="text-blue-600 hover:text-blue-700 break-all"
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                >
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
    const { data: deal, isLoading: loading, error } = useDeal(uuid);
    const { data: decks, loading: decksLoading } = useDealFiles('decks', uuid, 10);
    const { data: papers, loading: papersLoading } = useDealFiles('papers', uuid, 10);
    const { data: files, loading: filesLoading } = useDealFiles('files', uuid, 50);

    // Load company data using the new hook
    const {
        company,
        founders,
        advisors,
        grants,
        patents,
        clinicalTrials,
        loading: companyDataLoading,
        errors: companyDataErrors,
        counts: companyDataCounts,
    } = useCompanyData(deal?.company?.uuid || null, !!deal?.company?.uuid);

    const [assessment, setAssessment] = useState<DealAssessment | null>(null);
    const [assessLoading, setAssessLoading] = useState<boolean>(true);
    const [assessError, setAssessError] = useState<string | null>(null);
    const [isFileModalOpen, setIsFileModalOpen] = useState(false);
    const [isFoundersModalOpen, setIsFoundersModalOpen] = useState(false);
    const [isAdvisorsModalOpen, setIsAdvisorsModalOpen] = useState(false);
    const [isGrantsModalOpen, setIsGrantsModalOpen] = useState(false);
    const [isIndustriesModalOpen, setIsIndustriesModalOpen] = useState(false);
    const [isDualUseSignalsModalOpen, setIsDualUseSignalsModalOpen] = useState(false);

    // Calculate new files count for actions bar
    const newFilesCount = useMemo(() => {
        if (!deal?.last_assessment_created_at) return 0;

        const allFiles = [...decks, ...papers, ...files];
        return allFiles.filter((file) =>
            isNewSinceLastAssessment(file.created_at, deal.last_assessment_created_at),
        ).length;
    }, [decks, papers, files, deal?.last_assessment_created_at]);

    function getCookie(name: string) {
        const match = document.cookie.match(
            '(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\/\+^])/g, '\\$1') + '=([^;]*)',
        );
        return match ? decodeURIComponent(match[1]) : null;
    }

    // Load latest assessment
    useEffect(() => {
        let cancel = false;
        async function run() {
            if (!uuid) return;
            setAssessLoading(true);
            setAssessError(null);
            try {
                const sp = new URLSearchParams({
                    deal: uuid,
                    ordering: '-created_at',
                    page_size: '1',
                });
                const resp = await fetch(`/api/deals/assessments/?${sp.toString()}`, {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json' },
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const json = (await resp.json()) as
                    | { results?: DealAssessment[] }
                    | DealAssessment[];
                const item = Array.isArray(json) ? json[0] : (json.results?.[0] ?? null);
                if (!cancel) setAssessment(item || null);
            } catch (e: unknown) {
                if (!cancel)
                    setAssessError(e instanceof Error ? e.message : 'Failed to load assessment');
            } finally {
                if (!cancel) setAssessLoading(false);
            }
        }
        run();
        return () => {
            cancel = true;
        };
    }, [uuid]);

    async function saveAssessment(patch: Partial<DealAssessment>) {
        // Validate input data
        const validatedPatch = DealAssessmentPatchSchema.parse(patch);

        const token = getCookie('csrftoken');
        const headers: HeadersInit = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { 'X-CSRFToken': token } : {}),
        };
        const body = JSON.stringify({ ...validatedPatch, deal: uuid });

        if (assessment?.uuid) {
            const resp = await fetch(`/api/deals/assessments/${assessment.uuid}/`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers,
                body,
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = (await resp.json()) as DealAssessment;
            setAssessment(json);
            return json;
        } else {
            const resp = await fetch(`/api/deals/assessments/`, {
                method: 'POST',
                credentials: 'same-origin',
                headers,
                body,
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = (await resp.json()) as DealAssessment;
            setAssessment(json);
            return json;
        }
    }

    const initialLoading = loading && !deal;
    if (initialLoading) return <LoadingBox />;
    if (error)
        return (
            <ErrorBox message={error instanceof Error ? error.message : 'Failed to load deal'} />
        );
    if (!deal) return null;

    return (
        <div className="space-y-6 pb-20">
            {' '}
            {/* Bottom padding for sticky actions bar */}
            {/* Row 1: Company Overview */}
            <CompanyOverviewCard
                company={company}
                loading={companyDataLoading}
                error={companyDataErrors.company}
                totalGrantFunding={companyDataCounts.totalGrantFunding}
                foundersCount={companyDataCounts.founders}
                patentsCount={companyDataCounts.patents}
                clinicalTrialsCount={companyDataCounts.clinicalTrials}
            />
            {/* Row 2: External Data Summary */}
            <ExternalDataBadges
                foundersCount={companyDataCounts.founders}
                grantsCount={companyDataCounts.grants}
                patentsCount={companyDataCounts.patents}
                clinicalTrialsCount={companyDataCounts.clinicalTrials}
                totalGrantFunding={companyDataCounts.totalGrantFunding}
                loading={companyDataLoading}
            />
            {/* Row 3: Basic Deal Info */}
            <BasicInfoCard deal={deal} />
            {/* Row 4: External Data Accordions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <FoundersAccordion
                        founders={founders}
                        loading={companyDataLoading}
                        error={companyDataErrors.founders}
                        autoExpand={true}
                        onEdit={() => setIsFoundersModalOpen(true)}
                    />
                    <AdvisorsAccordion
                        advisors={advisors}
                        loading={companyDataLoading}
                        error={companyDataErrors.advisors}
                        autoExpand={true}
                        onEdit={() => setIsAdvisorsModalOpen(true)}
                    />
                    <GrantsAccordion
                        grants={grants}
                        loading={companyDataLoading}
                        error={companyDataErrors.grants}
                        autoExpand={true}
                        onEdit={() => setIsGrantsModalOpen(true)}
                    />
                </div>
                <div className="space-y-6">
                    <PatentsAccordion
                        patents={patents}
                        loading={companyDataLoading}
                        error={companyDataErrors.patents}
                        autoExpand={true}
                    />
                    <ClinicalTrialsAccordion
                        clinicalTrials={clinicalTrials}
                        loading={companyDataLoading}
                        error={companyDataErrors.clinicalTrials}
                        autoExpand={true}
                    />
                </div>
            </div>
            {/* Row 5: Research Agent */}
            <ResearchAgentSection />
            {/* Row 6: Stacked Assessments */}
            <div className="space-y-6">
                {/* AI Assessment (Top) */}
                <AIAssessmentSection
                    assessment={assessment}
                    loading={assessLoading}
                    error={assessError}
                />

                {/* Analyst Assessment (Bottom) */}
                <AnalystAssessmentSection assessment={assessment} onSave={saveAssessment} />
            </div>
            {/* Row 7: Industries and Signals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Industries items={deal.industries} onEdit={() => setIsIndustriesModalOpen(true)} />
                <Signals
                    items={deal.dual_use_signals}
                    onEdit={() => setIsDualUseSignalsModalOpen(true)}
                />
            </div>
            {/* Row 8: Summary */}
            <Summary deal={deal} />
            {/* Row 9: Files */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {decksLoading ? (
                    <LoadingBox label="Loading decks…" />
                ) : (
                    <FileList title="Decks" files={decks} />
                )}
                {papersLoading ? (
                    <LoadingBox label="Loading papers…" />
                ) : (
                    <FileList title="Papers" files={papers} />
                )}
                {filesLoading ? (
                    <LoadingBox label="Loading files…" />
                ) : (
                    <FileList title="Files" files={files} />
                )}
            </div>
            {/* Row 10: Related Documents */}
            <RelatedDocumentsPanel
                companyUuid={deal.company?.uuid || null}
                paramPrefix="dl_"
                title="Related Documents"
            />
            {/* Sticky Actions Bar */}
            <ActionsBar
                deal={deal}
                onEditFiles={() => setIsFileModalOpen(true)}
                newFilesCount={newFilesCount}
            />
            {/* File Management Modal */}
            <FileManagementModal
                isOpen={isFileModalOpen}
                onClose={() => setIsFileModalOpen(false)}
                dealUuid={deal.uuid}
                dealName={deal.name || 'Unnamed Deal'}
                lastAssessmentDate={deal.last_assessment_created_at}
            />
            {/* Edit Modals */}
            {deal.company?.uuid && (
                <>
                    <FoundersEditModal
                        isOpen={isFoundersModalOpen}
                        onClose={() => setIsFoundersModalOpen(false)}
                        companyUuid={deal.company.uuid}
                        founders={founders}
                    />

                    <GrantsEditModal
                        isOpen={isGrantsModalOpen}
                        onClose={() => setIsGrantsModalOpen(false)}
                        companyUuid={deal.company.uuid}
                        grants={grants}
                    />
                </>
            )}
            <IndustriesEditModal
                isOpen={isIndustriesModalOpen}
                onClose={() => setIsIndustriesModalOpen(false)}
                deal={deal}
            />
            <DualUseSignalsEditModal
                isOpen={isDualUseSignalsModalOpen}
                onClose={() => setIsDualUseSignalsModalOpen(false)}
                dealUuid={uuid}
                currentSignals={deal.dual_use_signals || []}
            />
            <AdvisorsEditModal
                isOpen={isAdvisorsModalOpen}
                onClose={() => setIsAdvisorsModalOpen(false)}
                companyUuid={deal.company?.uuid}
                advisors={advisors}
            />
        </div>
    );
}

// Create query client instance
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: false,
        },
    },
});

export function initialize() {
    if (window.__SINGLE_ENTRY_MODE__ === false) return; // respect single-entry flag if overridden
    const mount = document.getElementById('deal-detail-root') as HTMLDivElement | null;
    if (!mount) return;
    const uuid = mount.dataset.uuid || null;
    if (!uuid) return;
    const root = createRoot(mount);
    root.render(
        <QueryClientProvider client={queryClient}>
            <DealDetailApp uuid={uuid} />
            <Toaster />
        </QueryClientProvider>,
    );
}

// Self-execute only in multi-entry builds (not used by default)
if (!window.__SINGLE_ENTRY_MODE__) {
    initialize();
}
