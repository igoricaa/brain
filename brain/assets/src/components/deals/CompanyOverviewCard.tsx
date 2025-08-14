import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Building2, MapPin, Calendar, Users, DollarSign, TrendingUp } from 'lucide-react';
import { formatCompactCurrency, formatStandardDate } from '@/lib/utils/deals';
import type { Company } from '@/hooks/useCompanyData';

interface CompanyOverviewCardProps {
    company: Company | null;
    loading: boolean;
    error?: string;
    totalGrantFunding?: number;
    foundersCount?: number;
    patentsCount?: number;
    clinicalTrialsCount?: number;
}

function LoadingSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                            <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                    <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 mt-2" />
                </div>
            </CardContent>
        </Card>
    );
}

function ErrorState({ error }: { error: string }) {
    return (
        <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
                <div className="flex items-center text-red-700">
                    <Building2 className="h-5 w-5 mr-2" />
                    <span className="text-sm">Failed to load company data: {error}</span>
                </div>
            </CardContent>
        </Card>
    );
}

export function CompanyOverviewCard({ 
    company, 
    loading, 
    error, 
    totalGrantFunding = 0,
    foundersCount = 0,
    patentsCount = 0,
    clinicalTrialsCount = 0
}: CompanyOverviewCardProps) {
    if (loading) {
        return <LoadingSkeleton />;
    }

    if (error) {
        return <ErrorState error={error} />;
    }

    if (!company) {
        return (
            <Card className="border-gray-200 bg-gray-50">
                <CardContent className="p-6">
                    <div className="flex items-center text-gray-500">
                        <Building2 className="h-5 w-5 mr-2" />
                        <span className="text-sm">No company data available</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-gray-600" />
                        <span>{company.name || 'Unnamed Company'}</span>
                        {company.status && (
                            <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                                {company.status}
                            </Badge>
                        )}
                    </div>
                    {company.website && (
                        <Button variant="ghost" size="sm" asChild>
                            <a 
                                href={company.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Website
                            </a>
                        </Button>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                    {/* Founded Year */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                            <Calendar className="h-3 w-3" />
                            Founded
                        </div>
                        <div className="text-sm font-medium">
                            {company.founded_year || 'N/A'}
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                            <MapPin className="h-3 w-3" />
                            Location
                        </div>
                        <div className="text-sm font-medium">
                            {company.headquarters_location || 'N/A'}
                        </div>
                    </div>

                    {/* Employees */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                            <Users className="h-3 w-3" />
                            Employees
                        </div>
                        <div className="text-sm font-medium">
                            {company.employee_count ? company.employee_count.toLocaleString() : 'N/A'}
                        </div>
                    </div>

                    {/* Total Funding */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                            <DollarSign className="h-3 w-3" />
                            Total Funding
                        </div>
                        <div className="text-sm font-medium">
                            {formatCompactCurrency(company.total_funding)}
                        </div>
                    </div>

                    {/* Valuation */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                            <TrendingUp className="h-3 w-3" />
                            Valuation
                        </div>
                        <div className="text-sm font-medium">
                            {formatCompactCurrency(company.latest_valuation)}
                        </div>
                    </div>

                    {/* Grant Funding */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                            <DollarSign className="h-3 w-3" />
                            Grant Funding
                        </div>
                        <div className="text-sm font-medium text-green-600">
                            {formatCompactCurrency(totalGrantFunding)}
                        </div>
                    </div>
                </div>

                {/* Additional metrics as badges */}
                <div className="flex items-center gap-2 mb-4">
                    {foundersCount > 0 && (
                        <Badge variant="secondary">
                            {foundersCount} Founder{foundersCount !== 1 ? 's' : ''}
                        </Badge>
                    )}
                    {patentsCount > 0 && (
                        <Badge variant="secondary">
                            {patentsCount} Patent{patentsCount !== 1 ? 's' : ''}
                        </Badge>
                    )}
                    {clinicalTrialsCount > 0 && (
                        <Badge variant="secondary">
                            {clinicalTrialsCount} Clinical Trial{clinicalTrialsCount !== 1 ? 's' : ''}
                        </Badge>
                    )}
                </div>

                {/* Description */}
                {company.description && (
                    <div className="pt-4 border-t">
                        <div className="text-xs font-medium text-gray-500 mb-2">Description</div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {company.description}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}