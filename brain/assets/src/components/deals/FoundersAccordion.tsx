import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Plus, ExternalLink, User, Calendar, Briefcase, Edit } from 'lucide-react';
import { formatStandardDate } from '@/lib/utils/deals';
import type { Founder } from '@/hooks/useCompanyData';

interface FoundersAccordionProps {
    founders: Founder[];
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
                    <User className="h-5 w-5 mr-2" />
                    <span className="text-sm">Failed to load founders: {error}</span>
                </div>
            </CardContent>
        </Card>
    );
}

function FounderCard({ founder }: { founder: Founder }) {
    // Handle case where founder.founder might be null or undefined
    const founderData = founder?.founder || {};
    
    return (
        <div className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <h4 className="font-medium text-gray-900">
                            {founderData.name || 'Unnamed Founder'}
                        </h4>
                        {founder.title && (
                            <Badge variant="secondary" className="text-xs">
                                {founder.title}
                            </Badge>
                        )}
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                        {founderData.email && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Email:</span>
                                <a 
                                    href={`mailto:${founderData.email}`}
                                    className="text-blue-600 hover:underline"
                                >
                                    {founderData.email}
                                </a>
                            </div>
                        )}

                        {founder.age_at_founding && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>Age at founding: {founder.age_at_founding}</span>
                            </div>
                        )}

                        {(founder.start_date || founder.end_date) && (
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-3 w-3" />
                                <span>
                                    {formatStandardDate(founder.start_date)}
                                    {founder.end_date ? ` - ${formatStandardDate(founder.end_date)}` : ' - Present'}
                                </span>
                            </div>
                        )}

                        {founder.past_significant_employments && (
                            <div className="mt-3">
                                <div className="font-medium text-gray-900 mb-1">Past Experience:</div>
                                <p className="text-gray-700 whitespace-pre-line">
                                    {founder.past_significant_employments}
                                </p>
                            </div>
                        )}

                        {founderData.bio && (
                            <div className="mt-3">
                                <div className="font-medium text-gray-900 mb-1">Bio:</div>
                                <p className="text-gray-700">
                                    {founderData.bio}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="ml-4 flex flex-col gap-2">
                    {founderData.linkedin_url && (
                        <Button variant="ghost" size="sm" asChild>
                            <a 
                                href={founderData.linkedin_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                            >
                                <ExternalLink className="h-3 w-3" />
                                LinkedIn
                            </a>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function FoundersAccordion({ 
    founders, 
    loading = false, 
    error,
    autoExpand = true,
    onEdit
}: FoundersAccordionProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Auto-expand when data exists and autoExpand is true
    useEffect(() => {
        if (autoExpand && founders.length > 0) {
            setIsOpen(true);
        }
    }, [autoExpand, founders.length]);

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
                                <User className="h-5 w-5 text-gray-600" />
                                <span>Founders ({founders.length})</span>
                                {founders.length > 0 && (
                                    <Badge variant="secondary">
                                        {founders.length}
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
                                        title="Edit founders"
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
                                    title="Add founder"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardTitle>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent>
                        {founders.length > 0 ? (
                            <div className="space-y-4">
                                {founders.map((founder) => (
                                    <FounderCard key={founder.uuid} founder={founder} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <div className="text-gray-500 text-sm mb-2">No founders data available</div>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={onEdit}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Founder
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}