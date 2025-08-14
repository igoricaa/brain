import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Plus, ExternalLink, FileText, DollarSign, Calendar, Building, Edit } from 'lucide-react';
import { formatCompactCurrency, formatStandardDate } from '@/lib/utils/deals';
import type { Grant } from '@/hooks/useCompanyData';

interface GrantsAccordionProps {
    grants: Grant[];
    loading?: boolean;
    error?: string;
    autoExpand?: boolean;
    onEdit?: () => void;
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
                    <FileText className="h-5 w-5 mr-2" />
                    <span className="text-sm">Failed to load grants: {error}</span>
                </div>
            </CardContent>
        </Card>
    );
}

function GrantCard({ grant }: { grant: Grant }) {
    const amount = grant.amount_awarded || grant.potential_amount;
    const isAwarded = !!grant.amount_awarded;

    return (
        <div className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-start gap-2 mb-3">
                        <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-gray-900 mb-1">
                                {grant.name || 'Unnamed Grant'}
                            </h4>
                            {grant.program_name && (
                                <div className="text-sm text-gray-600 mb-2">
                                    {grant.program_name}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        {/* Amount */}
                        {amount && (
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-3 w-3 text-green-600" />
                                <span className="text-sm">
                                    <span className="font-medium text-green-600">
                                        {formatCompactCurrency(amount)}
                                    </span>
                                    <span className="text-gray-500 ml-1">
                                        ({isAwarded ? 'Awarded' : 'Potential'})
                                    </span>
                                </span>
                            </div>
                        )}

                        {/* Award Date */}
                        {grant.award_date && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    <span className="font-medium">Awarded:</span> {formatStandardDate(grant.award_date)}
                                </span>
                            </div>
                        )}

                        {/* Phase */}
                        {grant.phase && (
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                    Phase {grant.phase}
                                </Badge>
                            </div>
                        )}

                        {/* Solicitation Year */}
                        {grant.solicitation_year && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    <span className="font-medium">Year:</span> {grant.solicitation_year}
                                </span>
                            </div>
                        )}

                        {/* Branch */}
                        {grant.branch && (
                            <div className="flex items-center gap-2">
                                <Building className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    <span className="font-medium">Branch:</span> {grant.branch}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {grant.description && (
                        <div className="mt-3">
                            <div className="font-medium text-gray-900 text-sm mb-1">Description:</div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                {grant.description}
                            </p>
                        </div>
                    )}
                </div>

                <div className="ml-4 flex flex-col gap-2">
                    {grant.url && (
                        <Button variant="ghost" size="sm" asChild>
                            <a 
                                href={grant.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                            >
                                <ExternalLink className="h-3 w-3" />
                                View
                            </a>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function GrantsAccordion({ 
    grants, 
    loading = false, 
    error,
    autoExpand = true,
    onEdit
}: GrantsAccordionProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Calculate total funding
    const totalFunding = grants.reduce((total, grant) => {
        const amount = grant.amount_awarded || grant.potential_amount || 0;
        return total + amount;
    }, 0);

    // Auto-expand when data exists and autoExpand is true
    useEffect(() => {
        if (autoExpand && grants.length > 0) {
            setIsOpen(true);
        }
    }, [autoExpand, grants.length]);

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
                                <FileText className="h-5 w-5 text-gray-600" />
                                <span>Grants ({grants.length})</span>
                                {grants.length > 0 && (
                                    <Badge variant="secondary">
                                        {grants.length}
                                    </Badge>
                                )}
                                {totalFunding > 0 && (
                                    <Badge variant="outline" className="text-green-600 border-green-200">
                                        {formatCompactCurrency(totalFunding)} total
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {onEdit && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit();
                                        }}
                                        title="Edit grants"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit?.();
                                    }}
                                    title="Add grant"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardTitle>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent>
                        {grants.length > 0 ? (
                            <div className="space-y-4">
                                {grants.map((grant) => (
                                    <GrantCard key={grant.uuid} grant={grant} />
                                ))}
                                {totalFunding > 0 && (
                                    <div className="pt-4 border-t">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium text-gray-900">Total Grant Funding:</span>
                                            <span className="font-bold text-green-600 text-lg">
                                                {formatCompactCurrency(totalFunding)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <div className="text-gray-500 text-sm mb-2">No grants data available</div>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={onEdit}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Grant
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}