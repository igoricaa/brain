import { Badge } from '@/components/ui/badge';

interface ExternalDataSummaryStripProps {
    foundersCount: number;
    advisorsCount?: number;
    grantsCount: number;
    patentsCount: number;
    clinicalTrialsCount: number;
    loading?: boolean;
}

export function ExternalDataSummaryStrip({
    foundersCount,
    advisorsCount = 0,
    grantsCount,
    patentsCount,
    clinicalTrialsCount,
    loading = false,
}: ExternalDataSummaryStripProps) {
    if (loading) {
        return (
            <div className="flex flex-wrap items-center gap-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-6 w-24 animate-pulse rounded bg-gray-200" />
                ))}
            </div>
        );
    }

    const items = [
        { label: 'Founders', count: foundersCount },
        { label: 'Advisors', count: advisorsCount },
        { label: 'Grants', count: grantsCount },
        { label: 'Patents', count: patentsCount },
        { label: 'Clinical Trials', count: clinicalTrialsCount },
    ];

    return (
        <div className="flex flex-wrap items-center gap-2">
            {items.map(({ label, count }) => (
                <Badge key={label} variant="secondary" className="text-xs">
                    {label} ({count})
                </Badge>
            ))}
        </div>
    );
}