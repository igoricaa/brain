import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Edit, ExternalLink, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import RelatedDocumentsPanel from '../components/library/RelatedDocumentsPanel';
import { FileManagementModal } from '../components/deals/FileManagementModal';
import { Toaster } from '@/components/ui/sonner';

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

type Founder = {
    uuid: string;
    founder: {
        uuid: string;
        name?: string | null;
        email?: string | null;
    };
    title?: string | null;
    age_at_founding?: number | null;
    past_significant_employments?: string | null;
};

type CompanyAdvisor = {
    uuid: string;
    name?: string | null;
    title?: string | null;
    email?: string | null;
};

type Grant = {
    uuid: string;
    name?: string | null;
    potential_amount?: number | null;
    program_name?: string | null;
    phase?: string | null;
    branch?: string | null;
    award_date?: string | null;
};

type PatentApplication = {
    uuid: string;
    invention_title?: string | null;
    first_inventor_name?: string | null;
    status_description?: string | null;
    filing_date?: string | null;
};

type ClinicalStudy = {
    uuid: string;
    title?: string | null;
    lead_sponsor_name?: string | null;
    status?: string | null;
    start_date_str?: string | null;
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

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

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

function useDeal(uuid: string | null, reloadKey = 0) {
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
    }, [uuid, reloadKey]);

    return { data, loading, error };
}

function useDealFiles(
    kind: 'decks' | 'papers' | 'files',
    dealUuid: string | null,
    pageSize = 10,
    reloadKey = 0,
) {
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
    }, [kind, dealUuid, pageSize, reloadKey]);

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

// External Data Accordion Component
function ExternalDataAccordion({
    deal,
    founders = [],
    grants = [],
    patents = [],
    clinicalTrials = [],
}: {
    deal: Deal;
    founders?: Founder[];
    grants?: Grant[];
    patents?: PatentApplication[];
    clinicalTrials?: ClinicalStudy[];
}) {
    const [openSections, setOpenSections] = useState<Set<string>>(new Set());

    const toggleSection = (section: string) => {
        const newOpenSections = new Set(openSections);
        if (newOpenSections.has(section)) {
            newOpenSections.delete(section);
        } else {
            newOpenSections.add(section);
        }
        setOpenSections(newOpenSections);
    };

    // Auto-expand sections with data
    useEffect(() => {
        const sectionsWithData = new Set<string>();
        if (founders.length > 0) sectionsWithData.add('founders');
        if (grants.length > 0) sectionsWithData.add('grants');
        if (patents.length > 0) sectionsWithData.add('patents');
        if (clinicalTrials.length > 0) sectionsWithData.add('clinical');
        setOpenSections(sectionsWithData);
    }, [founders.length, grants.length, patents.length, clinicalTrials.length]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>External Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {/* Founders */}
                <Collapsible
                    open={openSections.has('founders')}
                    onOpenChange={() => toggleSection('founders')}
                >
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-2 text-left hover:bg-gray-50 rounded">
                        <span className="flex items-center gap-2">
                            {openSections.has('founders') ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                            Founders ({founders.length})
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-6 pb-2">
                        {founders.length > 0 ? (
                            <div className="space-y-2">
                                {founders.map((founder) => (
                                    <div key={founder.uuid} className="border rounded p-3 text-sm">
                                        <div className="font-medium">
                                            {founder.founder.name || 'Unnamed'}
                                        </div>
                                        <div className="text-gray-600">
                                            {founder.title || 'No title'}
                                        </div>
                                        {founder.age_at_founding && (
                                            <div className="text-gray-500">
                                                Age at founding: {founder.age_at_founding}
                                            </div>
                                        )}
                                        {founder.past_significant_employments && (
                                            <div className="text-gray-500 mt-1">
                                                {founder.past_significant_employments}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-sm">No founders data available</div>
                        )}
                    </CollapsibleContent>
                </Collapsible>

                {/* Grants */}
                <Collapsible
                    open={openSections.has('grants')}
                    onOpenChange={() => toggleSection('grants')}
                >
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-2 text-left hover:bg-gray-50 rounded">
                        <span className="flex items-center gap-2">
                            {openSections.has('grants') ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                            Grants ({grants.length})
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-6 pb-2">
                        {grants.length > 0 ? (
                            <div className="space-y-2">
                                {grants.map((grant) => (
                                    <div key={grant.uuid} className="border rounded p-3 text-sm">
                                        <div className="font-medium">
                                            {grant.name || 'Unnamed Grant'}
                                        </div>
                                        <div className="text-gray-600">{grant.program_name}</div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>{formatCurrency(grant.potential_amount)}</span>
                                            <span>{formatDate(grant.award_date)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-sm">No grants data available</div>
                        )}
                    </CollapsibleContent>
                </Collapsible>

                {/* Clinical Trials */}
                <Collapsible
                    open={openSections.has('clinical')}
                    onOpenChange={() => toggleSection('clinical')}
                >
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-2 text-left hover:bg-gray-50 rounded">
                        <span className="flex items-center gap-2">
                            {openSections.has('clinical') ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                            Clinical Trials ({clinicalTrials.length})
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-6 pb-2">
                        {clinicalTrials.length > 0 ? (
                            <div className="space-y-2">
                                {clinicalTrials.map((trial) => (
                                    <div key={trial.uuid} className="border rounded p-3 text-sm">
                                        <div className="font-medium">
                                            {trial.title || 'Unnamed Trial'}
                                        </div>
                                        <div className="text-gray-600">
                                            {trial.lead_sponsor_name}
                                        </div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>{trial.status}</span>
                                            <span>{formatDate(trial.start_date_str)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-sm">
                                No clinical trials data available
                            </div>
                        )}
                    </CollapsibleContent>
                </Collapsible>

                {/* Patent Applications */}
                <Collapsible
                    open={openSections.has('patents')}
                    onOpenChange={() => toggleSection('patents')}
                >
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-2 text-left hover:bg-gray-50 rounded">
                        <span className="flex items-center gap-2">
                            {openSections.has('patents') ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                            Patent Applications ({patents.length})
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-6 pb-2">
                        {patents.length > 0 ? (
                            <div className="space-y-2">
                                {patents.map((patent) => (
                                    <div key={patent.uuid} className="border rounded p-3 text-sm">
                                        <div className="font-medium">
                                            {patent.invention_title || 'Unnamed Patent'}
                                        </div>
                                        <div className="text-gray-600">
                                            {patent.first_inventor_name}
                                        </div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>{patent.status_description}</span>
                                            <span>{formatDate(patent.filing_date)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-sm">
                                No patent applications data available
                            </div>
                        )}
                    </CollapsibleContent>
                </Collapsible>
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

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debounced save for auto-save functionality
    const debouncedSave = useCallback(
        async (field: string, value: string) => {
            if (saving) return;
            setSaving(true);
            setError(null);
            try {
                await onSave({ [field]: value });
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Failed to save');
            } finally {
                setSaving(false);
            }
        },
        [onSave, saving],
    );

    // Auto-save handlers with debounce
    const [saveTimeouts, setSaveTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());

    const handleFieldChange = useCallback(
        (field: string, value: string, setter: (value: string) => void) => {
            setter(value);

            // Clear existing timeout for this field
            const existingTimeout = saveTimeouts.get(field);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }

            // Set new timeout
            const timeoutId = setTimeout(() => {
                debouncedSave(field, value);
                setSaveTimeouts((prev) => {
                    const next = new Map(prev);
                    next.delete(field);
                    return next;
                });
            }, 1000);

            setSaveTimeouts((prev) => {
                const next = new Map(prev);
                next.set(field, timeoutId);
                return next;
            });
        },
        [debouncedSave, saveTimeouts],
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

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            saveTimeouts.forEach((timeout) => clearTimeout(timeout));
        };
    }, [saveTimeouts]);

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
                        {saving && <span>Auto-saving...</span>}
                        {assessment?.updated_at && (
                            <span>Updated {new Date(assessment.updated_at).toLocaleString()}</span>
                        )}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        {error}
                    </div>
                )}

                {/* Basic fields grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {basicFields.map((field) => (
                        <div key={field.key} className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600">
                                {field.label}
                            </label>
                            <Textarea
                                value={field.value}
                                onChange={(e) =>
                                    handleFieldChange(field.key, e.target.value, field.setter)
                                }
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
                        </label>
                        <Textarea
                            value={rationale}
                            onChange={(e) =>
                                handleFieldChange(
                                    'investment_rationale',
                                    e.target.value,
                                    setRationale,
                                )
                            }
                            className="min-h-[8rem] resize-none text-sm"
                            placeholder="Enter investment rationale..."
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-2">
                            Pros
                        </label>
                        <Textarea
                            value={pros}
                            onChange={(e) => handleFieldChange('pros', e.target.value, setPros)}
                            className="min-h-[8rem] resize-none text-sm"
                            placeholder="Enter pros..."
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-2">
                            Cons
                        </label>
                        <Textarea
                            value={cons}
                            onChange={(e) => handleFieldChange('cons', e.target.value, setCons)}
                            className="min-h-[8rem] resize-none text-sm"
                            placeholder="Enter cons..."
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-2">
                            Recommendation
                        </label>
                        <select
                            value={quality}
                            onChange={(e) =>
                                handleFieldChange('quality_percentile', e.target.value, setQuality)
                            }
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
                            onChange={(e) =>
                                handleFieldChange(
                                    'recommendation',
                                    e.target.value,
                                    setRecommendation,
                                )
                            }
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

// Sticky Actions Bar Component
function ActionsBar({ deal, onEditFiles }: { deal: Deal; onEditFiles: () => void }) {
    return (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-10">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
                <div className="flex items-center gap-2">
                    <Button variant="default">Send to Affinity</Button>
                    <Button variant="outline">Reassess</Button>
                    <Button variant="outline" onClick={onEditFiles}>
                        Edit Files
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost">View History</Button>
                    <Button variant="ghost">Archive</Button>
                    <Button variant="destructive">Delete</Button>
                </div>
            </div>
        </div>
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
    const [reloadKey] = useState(0);
    const { data: deal, loading, error } = useDeal(uuid, reloadKey);
    const { data: decks, loading: decksLoading } = useDealFiles('decks', uuid, 10, reloadKey);
    const { data: papers, loading: papersLoading } = useDealFiles('papers', uuid, 10, reloadKey);
    const { data: files, loading: filesLoading } = useDealFiles('files', uuid, 50, reloadKey);

    const [assessment, setAssessment] = useState<DealAssessment | null>(null);
    const [assessLoading, setAssessLoading] = useState<boolean>(true);
    const [assessError, setAssessError] = useState<string | null>(null);
    const [isFileModalOpen, setIsFileModalOpen] = useState(false);

    // External data state
    const [founders, setFounders] = useState<Founder[]>([]);
    const [grants, setGrants] = useState<Grant[]>([]);
    const [patents, setPatents] = useState<PatentApplication[]>([]);
    const [clinicalTrials, setClinicalTrials] = useState<ClinicalStudy[]>([]);
    const [externalDataLoading, setExternalDataLoading] = useState(false);

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

    // Load external data when company UUID is available
    useEffect(() => {
        if (!deal?.company?.uuid) return;

        let cancel = false;
        async function loadExternalData() {
            setExternalDataLoading(true);
            try {
                const companyUuid = deal.company!.uuid;

                // Load all external data in parallel
                const [foundersResp, grantsResp, patentsResp, clinicalResp] =
                    await Promise.allSettled([
                        fetch(`/api/companies/founders/?company=${companyUuid}`, {
                            credentials: 'same-origin',
                            headers: { Accept: 'application/json' },
                        }),
                        fetch(`/api/companies/grants/?company=${companyUuid}`, {
                            credentials: 'same-origin',
                            headers: { Accept: 'application/json' },
                        }),
                        fetch(`/api/companies/patent-applications/?company=${companyUuid}`, {
                            credentials: 'same-origin',
                            headers: { Accept: 'application/json' },
                        }),
                        fetch(`/api/companies/clinical-studies/?company=${companyUuid}`, {
                            credentials: 'same-origin',
                            headers: { Accept: 'application/json' },
                        }),
                    ]);

                if (!cancel) {
                    // Process founders
                    if (foundersResp.status === 'fulfilled' && foundersResp.value.ok) {
                        const foundersData = await foundersResp.value.json();
                        setFounders(
                            Array.isArray(foundersData) ? foundersData : foundersData.results || [],
                        );
                    }

                    // Process grants
                    if (grantsResp.status === 'fulfilled' && grantsResp.value.ok) {
                        const grantsData = await grantsResp.value.json();
                        setGrants(
                            Array.isArray(grantsData) ? grantsData : grantsData.results || [],
                        );
                    }

                    // Process patents
                    if (patentsResp.status === 'fulfilled' && patentsResp.value.ok) {
                        const patentsData = await patentsResp.value.json();
                        setPatents(
                            Array.isArray(patentsData) ? patentsData : patentsData.results || [],
                        );
                    }

                    // Process clinical trials
                    if (clinicalResp.status === 'fulfilled' && clinicalResp.value.ok) {
                        const clinicalData = await clinicalResp.value.json();
                        setClinicalTrials(
                            Array.isArray(clinicalData) ? clinicalData : clinicalData.results || [],
                        );
                    }
                }
            } catch (e) {
                console.error('Failed to load external data:', e);
            } finally {
                if (!cancel) setExternalDataLoading(false);
            }
        }

        loadExternalData();
        return () => {
            cancel = true;
        };
    }, [deal?.company?.uuid]);

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
    if (error) return <ErrorBox message={error} />;
    if (!deal) return null;

    return (
        <div className="space-y-6 pb-20">
            {' '}
            {/* Bottom padding for sticky actions bar */}
            {/* Row 1: Basic Info */}
            <BasicInfoCard deal={deal} />
            {/* Row 2: External Data and Research Agent */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ExternalDataAccordion
                    deal={deal}
                    founders={founders}
                    grants={grants}
                    patents={patents}
                    clinicalTrials={clinicalTrials}
                />
                <ResearchAgentSection />
            </div>
            {/* Row 3: Stacked Assessments */}
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
            {/* Row 4: Industries and Signals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Industries items={deal.industries} />
                <Signals items={deal.dual_use_signals} />
            </div>
            {/* Row 5: Summary */}
            <Summary deal={deal} />
            {/* Row 6: Files */}
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
            {/* Row 7: Related Documents */}
            <RelatedDocumentsPanel
                companyUuid={deal.company?.uuid || null}
                paramPrefix="dl_"
                title="Related Documents"
            />
            {/* Sticky Actions Bar */}
            <ActionsBar deal={deal} onEditFiles={() => setIsFileModalOpen(true)} />
            {/* File Management Modal */}
            <FileManagementModal
                isOpen={isFileModalOpen}
                onClose={() => setIsFileModalOpen(false)}
                dealUuid={deal.uuid}
                dealName={deal.name || 'Unnamed Deal'}
                lastAssessmentDate={deal.last_assessment_created_at}
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
