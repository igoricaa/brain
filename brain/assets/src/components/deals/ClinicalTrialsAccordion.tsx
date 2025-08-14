import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Plus, ExternalLink, Microscope, Calendar, Building, Activity } from 'lucide-react';
import { formatStandardDate, getClinicalTrialStatusColor, truncateText } from '@/lib/utils/deals';
import type { ClinicalStudy } from '@/hooks/useCompanyData';

interface ClinicalTrialsAccordionProps {
    clinicalTrials: ClinicalStudy[];
    loading?: boolean;
    error?: string;
    autoExpand?: boolean;
}

function LoadingSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
                    <div className="h-8 w-8 animate-pulse rounded bg-gray-200" />
                </div>
            </CardHeader>
        </Card>
    );
}

function ErrorState({ error }: { error: string }) {
    return (
        <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
                <div className="flex items-center text-red-700">
                    <Microscope className="h-5 w-5 mr-2" />
                    <span className="text-sm">Failed to load clinical trials: {error}</span>
                </div>
            </CardContent>
        </Card>
    );
}

function ClinicalTrialCard({ trial }: { trial: ClinicalStudy }) {
    const [showFullSummary, setShowFullSummary] = useState(false);
    
    return (
        <div className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-start gap-2 mb-3">
                        <Microscope className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-2">
                                {trial.title || 'Unnamed Clinical Trial'}
                            </h4>
                            <div className="flex items-center gap-2 mb-2">
                                {trial.status && (
                                    <span
                                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getClinicalTrialStatusColor(trial.status)}`}
                                    >
                                        {trial.status}
                                    </span>
                                )}
                                {trial.phase && (
                                    <Badge variant="outline" className="text-xs">
                                        Phase {trial.phase}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        {/* Lead Sponsor */}
                        {trial.lead_sponsor_name && (
                            <div className="flex items-center gap-2">
                                <Building className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    <span className="font-medium">Sponsor:</span> {trial.lead_sponsor_name}
                                </span>
                            </div>
                        )}

                        {/* Primary Purpose */}
                        {trial.primary_purpose && (
                            <div className="flex items-center gap-2">
                                <Activity className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    <span className="font-medium">Purpose:</span> {trial.primary_purpose}
                                </span>
                            </div>
                        )}

                        {/* Start Date */}
                        {trial.start_date_str && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    <span className="font-medium">Started:</span> {formatStandardDate(trial.start_date_str)}
                                </span>
                            </div>
                        )}

                        {/* Completion Date */}
                        {trial.completion_date_str && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    <span className="font-medium">Completed:</span> {formatStandardDate(trial.completion_date_str)}
                                </span>
                            </div>
                        )}

                        {/* Intervention Type */}
                        {trial.intervention_type && (
                            <div className="flex items-center gap-2">
                                <Activity className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    <span className="font-medium">Intervention:</span> {trial.intervention_type}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Brief Summary */}
                    {trial.brief_summary && (
                        <div className="mt-3">
                            <div className="font-medium text-gray-900 text-sm mb-1">Summary:</div>
                            <div className="text-sm text-gray-700 leading-relaxed">
                                {showFullSummary ? (
                                    <>
                                        <p>{trial.brief_summary}</p>
                                        <button
                                            onClick={() => setShowFullSummary(false)}
                                            className="text-blue-600 hover:underline mt-1 text-xs"
                                        >
                                            Show less
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p>{truncateText(trial.brief_summary, 250)}</p>
                                        {trial.brief_summary.length > 250 && (
                                            <button
                                                onClick={() => setShowFullSummary(true)}
                                                className="text-blue-600 hover:underline mt-1 text-xs"
                                            >
                                                Show more
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="ml-4 flex flex-col gap-2">
                    {/* Link to ClinicalTrials.gov if we can construct it */}
                    <Button variant="ghost" size="sm" asChild>
                        <a 
                            href={`https://clinicaltrials.gov/ct2/results?cond=&term=${encodeURIComponent(trial.title || '')}&cntry=&state=&city=&dist=`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                        >
                            <ExternalLink className="h-3 w-3" />
                            ClinicalTrials.gov
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function ClinicalTrialsAccordion({ 
    clinicalTrials, 
    loading = false, 
    error,
    autoExpand = true 
}: ClinicalTrialsAccordionProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Count by status
    const statusCounts = clinicalTrials.reduce((acc, trial) => {
        const status = trial.status?.toLowerCase() || 'unknown';
        if (status.includes('completed')) {
            acc.completed++;
        } else if (status.includes('recruiting') || status.includes('active')) {
            acc.active++;
        } else if (status.includes('terminated') || status.includes('withdrawn')) {
            acc.terminated++;
        } else {
            acc.other++;
        }
        return acc;
    }, { completed: 0, active: 0, terminated: 0, other: 0 });

    // Auto-expand when data exists and autoExpand is true
    useEffect(() => {
        if (autoExpand && clinicalTrials.length > 0) {
            setIsOpen(true);
        }
    }, [autoExpand, clinicalTrials.length]);

    if (loading) {
        return <LoadingSkeleton />;
    }

    if (error) {
        return <ErrorState error={error} />;
    }

    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {isOpen ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                                <Microscope className="h-5 w-5 text-gray-600" />
                                <span>Clinical Trials ({clinicalTrials.length})</span>
                                {clinicalTrials.length > 0 && (
                                    <Badge variant="secondary">
                                        {clinicalTrials.length}
                                    </Badge>
                                )}
                                {statusCounts.completed > 0 && (
                                    <Badge variant="outline" className="text-green-600 border-green-200">
                                        {statusCounts.completed} completed
                                    </Badge>
                                )}
                                {statusCounts.active > 0 && (
                                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                                        {statusCounts.active} active
                                    </Badge>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Implement add clinical trial functionality
                                }}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </CardTitle>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent>
                        {clinicalTrials.length > 0 ? (
                            <div className="space-y-4">
                                {clinicalTrials.map((trial) => (
                                    <ClinicalTrialCard key={trial.uuid} trial={trial} />
                                ))}
                                {clinicalTrials.length > 0 && (
                                    <div className="pt-4 border-t">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium text-gray-900">Trial Summary:</span>
                                            <div className="flex gap-4">
                                                {statusCounts.completed > 0 && (
                                                    <span className="text-green-600">
                                                        {statusCounts.completed} Completed
                                                    </span>
                                                )}
                                                {statusCounts.active > 0 && (
                                                    <span className="text-blue-600">
                                                        {statusCounts.active} Active
                                                    </span>
                                                )}
                                                {statusCounts.terminated > 0 && (
                                                    <span className="text-red-600">
                                                        {statusCounts.terminated} Terminated
                                                    </span>
                                                )}
                                                {statusCounts.other > 0 && (
                                                    <span className="text-gray-600">
                                                        {statusCounts.other} Other
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Microscope className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <div className="text-gray-500 text-sm mb-2">No clinical trials data available</div>
                                <Button variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Clinical Trial
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}