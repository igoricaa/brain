import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Users, FileText, Shield, Microscope, DollarSign } from 'lucide-react';
import { formatCompactCurrency } from '@/lib/utils/deals';

interface ExternalDataBadgesProps {
    foundersCount: number;
    grantsCount: number;
    patentsCount: number;
    clinicalTrialsCount: number;
    totalGrantFunding: number;
    loading?: boolean;
}

function LoadingSkeleton() {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-6 w-20 animate-pulse rounded bg-gray-200" />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export function ExternalDataBadges({
    foundersCount,
    grantsCount,
    patentsCount,
    clinicalTrialsCount,
    totalGrantFunding,
    loading = false,
}: ExternalDataBadgesProps) {
    if (loading) {
        return <LoadingSkeleton />;
    }

    const badges = [
        {
            icon: Users,
            label: `${foundersCount} Founder${foundersCount !== 1 ? 's' : ''}`,
            count: foundersCount,
            variant: 'default' as const,
            color: 'bg-blue-50 text-blue-700 border-blue-200',
        },
        {
            icon: FileText,
            label: `${grantsCount} Grant${grantsCount !== 1 ? 's' : ''}`,
            count: grantsCount,
            variant: 'default' as const,
            color: 'bg-green-50 text-green-700 border-green-200',
        },
        {
            icon: Shield,
            label: `${patentsCount} Patent${patentsCount !== 1 ? 's' : ''}`,
            count: patentsCount,
            variant: 'default' as const,
            color: 'bg-purple-50 text-purple-700 border-purple-200',
        },
        {
            icon: Microscope,
            label: `${clinicalTrialsCount} Clinical Trial${clinicalTrialsCount !== 1 ? 's' : ''}`,
            count: clinicalTrialsCount,
            variant: 'default' as const,
            color: 'bg-orange-50 text-orange-700 border-orange-200',
        },
        {
            icon: DollarSign,
            label: `${formatCompactCurrency(totalGrantFunding)} Grant Funding`,
            count: totalGrantFunding,
            variant: 'default' as const,
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            showAlways: totalGrantFunding > 0,
        },
    ];

    // Filter badges to only show those with data or that should always show
    const visibleBadges = badges.filter(badge => badge.count > 0 || badge.showAlways);

    if (visibleBadges.length === 0) {
        return (
            <Card className="border-gray-200 bg-gray-50">
                <CardContent className="p-4">
                    <div className="flex items-center justify-center text-gray-500 text-sm">
                        No external data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 mr-2">External Data:</span>
                    {visibleBadges.map((badge, index) => {
                        const IconComponent = badge.icon;
                        return (
                            <div
                                key={index}
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium ${badge.color}`}
                            >
                                <IconComponent className="h-3 w-3" />
                                <span>{badge.label}</span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}