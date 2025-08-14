import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Plus, ExternalLink, Shield, Calendar, User, FileText } from 'lucide-react';
import { formatStandardDate, getPatentStatusColor, truncateText } from '@/lib/utils/deals';
import type { PatentApplication } from '@/hooks/useCompanyData';

interface PatentsAccordionProps {
    patents: PatentApplication[];
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
                    <Shield className="h-5 w-5 mr-2" />
                    <span className="text-sm">Failed to load patents: {error}</span>
                </div>
            </CardContent>
        </Card>
    );
}

function PatentCard({ patent }: { patent: PatentApplication }) {
    const [showFullAbstract, setShowFullAbstract] = useState(false);
    const isGranted = patent.patent_number || patent.status_description?.toLowerCase().includes('granted');
    
    return (
        <div className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-start gap-2 mb-3">
                        <Shield className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-2">
                                {patent.invention_title || 'Unnamed Patent Application'}
                            </h4>
                            {patent.status_description && (
                                <div className="mb-2">
                                    <span
                                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getPatentStatusColor(patent.status_description)}`}
                                    >
                                        {patent.status_description}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        {/* Application Number */}
                        {patent.application_number && (
                            <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    <span className="font-medium">App #:</span> {patent.application_number}
                                </span>
                            </div>
                        )}

                        {/* Patent Number (if granted) */}
                        {patent.patent_number && (
                            <div className="flex items-center gap-2">
                                <Shield className="h-3 w-3 text-green-600" />
                                <span className="text-sm text-gray-600">
                                    <span className="font-medium">Patent #:</span> {patent.patent_number}
                                </span>
                            </div>
                        )}

                        {/* Inventor */}
                        {patent.first_inventor_name && (
                            <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    <span className="font-medium">Inventor:</span> {patent.first_inventor_name}
                                </span>
                            </div>
                        )}

                        {/* Filing Date */}
                        {patent.filing_date && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    <span className="font-medium">Filed:</span> {formatStandardDate(patent.filing_date)}
                                </span>
                            </div>
                        )}

                        {/* Publication Date */}
                        {patent.publication_date && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    <span className="font-medium">Published:</span> {formatStandardDate(patent.publication_date)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Abstract */}
                    {patent.abstract && (
                        <div className="mt-3">
                            <div className="font-medium text-gray-900 text-sm mb-1">Abstract:</div>
                            <div className="text-sm text-gray-700 leading-relaxed">
                                {showFullAbstract ? (
                                    <>
                                        <p>{patent.abstract}</p>
                                        <button
                                            onClick={() => setShowFullAbstract(false)}
                                            className="text-blue-600 hover:underline mt-1 text-xs"
                                        >
                                            Show less
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p>{truncateText(patent.abstract, 200)}</p>
                                        {patent.abstract.length > 200 && (
                                            <button
                                                onClick={() => setShowFullAbstract(true)}
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
                    {/* Add USPTO or patent office link if we have application number */}
                    {patent.application_number && (
                        <Button variant="ghost" size="sm" asChild>
                            <a 
                                href={`https://appft.uspto.gov/netacgi/nph-Parser?Sect1=PTO1&Sect2=HITOFF&d=PG01&p=1&u=%2Fnetahtml%2FPTO%2Fsrchnum.html&r=1&f=G&l=50&s1=${patent.application_number}.PGNR.`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                            >
                                <ExternalLink className="h-3 w-3" />
                                USPTO
                            </a>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function PatentsAccordion({ 
    patents, 
    loading = false, 
    error,
    autoExpand = true 
}: PatentsAccordionProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Count granted vs pending patents
    const grantedCount = patents.filter(p => 
        p.patent_number || p.status_description?.toLowerCase().includes('granted')
    ).length;
    const pendingCount = patents.length - grantedCount;

    // Auto-expand when data exists and autoExpand is true
    useEffect(() => {
        if (autoExpand && patents.length > 0) {
            setIsOpen(true);
        }
    }, [autoExpand, patents.length]);

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
                                <Shield className="h-5 w-5 text-gray-600" />
                                <span>Patent Applications ({patents.length})</span>
                                {patents.length > 0 && (
                                    <Badge variant="secondary">
                                        {patents.length}
                                    </Badge>
                                )}
                                {grantedCount > 0 && (
                                    <Badge variant="outline" className="text-green-600 border-green-200">
                                        {grantedCount} granted
                                    </Badge>
                                )}
                                {pendingCount > 0 && (
                                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                                        {pendingCount} pending
                                    </Badge>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Implement add patent functionality
                                }}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </CardTitle>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent>
                        {patents.length > 0 ? (
                            <div className="space-y-4">
                                {patents.map((patent) => (
                                    <PatentCard key={patent.uuid} patent={patent} />
                                ))}
                                {(grantedCount > 0 || pendingCount > 0) && (
                                    <div className="pt-4 border-t">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium text-gray-900">Patent Portfolio:</span>
                                            <div className="flex gap-4">
                                                {grantedCount > 0 && (
                                                    <span className="text-green-600">
                                                        {grantedCount} Granted
                                                    </span>
                                                )}
                                                {pendingCount > 0 && (
                                                    <span className="text-blue-600">
                                                        {pendingCount} Pending
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <div className="text-gray-500 text-sm mb-2">No patent applications data available</div>
                                <Button variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Patent
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}