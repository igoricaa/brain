import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Edit2, ExternalLink, Plus, UserCheck } from 'lucide-react';

// For now, using a simplified Advisor type based on the CompanyAdvisor relationship
interface Advisor {
    uuid: string;
    name?: string | null;
    bio?: string | null;
    linkedin_url?: string | null;
    website?: string | null;
    country?: string | null;
    location?: string | null;
    created_at?: string;
    updated_at?: string;
}

interface AdvisorsAccordionProps {
    advisors: Advisor[];
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
                    <UserCheck className="h-5 w-5 mr-2" />
                    <span className="text-sm">Failed to load advisors: {error}</span>
                </div>
            </CardContent>
        </Card>
    );
}

function AdvisorCard({ advisor }: { advisor: Advisor }) {
    return (
        <div className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="h-4 w-4 text-gray-400" />
                        <h4 className="font-medium text-gray-900">
                            {advisor.name || 'Unnamed Advisor'}
                        </h4>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                        {advisor.location && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Location:</span>
                                <span>{advisor.location}</span>
                            </div>
                        )}

                        {advisor.bio && (
                            <div className="mt-3">
                                <div className="font-medium text-gray-900 mb-1">Bio:</div>
                                <p className="text-gray-700">{advisor.bio}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="ml-4 flex flex-col gap-2">
                    {advisor.linkedin_url && (
                        <Button variant="ghost" size="sm" asChild>
                            <a
                                href={advisor.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                            >
                                <ExternalLink className="h-3 w-3" />
                                LinkedIn
                            </a>
                        </Button>
                    )}
                    {advisor.website && (
                        <Button variant="ghost" size="sm" asChild>
                            <a
                                href={advisor.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                            >
                                <ExternalLink className="h-3 w-3" />
                                Website
                            </a>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function AdvisorsAccordion({
    advisors,
    loading = false,
    error,
    autoExpand = true,
    onEdit,
}: AdvisorsAccordionProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Auto-expand when data exists and autoExpand is true
    useEffect(() => {
        if (autoExpand && advisors.length > 0) {
            setIsOpen(true);
        }
    }, [autoExpand, advisors.length]);

    if (loading) {
        return <LoadingSkeleton />;
    }

    if (error) {
        return <ErrorState error={error} />;
    }

    return (
        <Card>
            <Collapsible defaultOpen={autoExpand && advisors.length > 0}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setIsOpen(!isOpen)}>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {isOpen ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                                <UserCheck className="h-5 w-5 text-gray-600" />
                                <span>Advisors ({advisors.length})</span>
                                {advisors.length > 0 && (
                                    <Badge variant="secondary">{advisors.length}</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit?.();
                                    }}
                                    title="Edit advisors"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardTitle>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent>
                        {advisors.length > 0 ? (
                            <div className="space-y-4">
                                {advisors.map((advisor) => (
                                    <AdvisorCard key={advisor.uuid} advisor={advisor} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <div className="text-gray-500 text-sm mb-2">
                                    No advisors data available
                                </div>
                                <Button variant="outline" size="sm" onClick={onEdit}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Advisor
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
