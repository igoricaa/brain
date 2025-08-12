import { formatDistanceToNow } from 'date-fns';
import { FileText, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Deal, Industry, DualUseSignal } from '@/lib/types/deals';

// Company cell with processing status and time
export function CompanyCell({ deal }: { deal: Deal }) {
    const timeAgo = formatDistanceToNow(new Date(deal.created_at), { addSuffix: true });

    return (
        <div className="flex items-center gap-3">
            {deal.has_processing_deck ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground truncate">
                    <a href={`/deals/${deal.uuid}/`} className="hover:underline">
                        {deal.company.name}
                    </a>
                </div>
                <div className="text-sm text-muted-foreground">{timeAgo}</div>
            </div>
        </div>
    );
}

// Fundraising cell with target and stage
export function FundraisingCell({ deal }: { deal: Deal }) {
    const formatAmount = (amount?: number) => {
        if (!amount) return null;
        if (amount >= 1_000_000) {
            return `$${(amount / 1_000_000).toFixed(1)}M`;
        } else if (amount >= 1_000) {
            return `$${(amount / 1_000).toFixed(0)}K`;
        } else {
            return `$${amount.toLocaleString()}`;
        }
    };

    return (
        <div className="space-y-1">
            {deal.funding_target && (
                <div className="text-sm font-medium">{formatAmount(deal.funding_target)}</div>
            )}
            {deal.funding_stage && (
                <div className="text-xs text-muted-foreground">{deal.funding_stage.name}</div>
            )}
            {!deal.funding_target && !deal.funding_stage && (
                <div className="text-sm text-muted-foreground">—</div>
            )}
        </div>
    );
}

// Color palette for industries
const industryColors = [
    { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' }, // Amber
    { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' }, // Blue
    { bg: '#D1FAE5', text: '#059669', border: '#10B981' }, // Emerald
    { bg: '#FCE7F3', text: '#BE185D', border: '#EC4899' }, // Pink
    { bg: '#EDE9FE', text: '#6D28D9', border: '#8B5CF6' }, // Purple
    { bg: '#FEE2E2', text: '#DC2626', border: '#EF4444' }, // Red
    { bg: '#F0FDF4', text: '#16A34A', border: '#22C55E' }, // Green
    { bg: '#FFF7ED', text: '#C2410C', border: '#F97316' }, // Orange
    { bg: '#F0F9FF', text: '#0369A1', border: '#0EA5E9' }, // Sky
    { bg: '#F3E8FF', text: '#7C2D12', border: '#A855F7' }, // Violet
    { bg: '#ECFDF5', text: '#047857', border: '#059669' }, // Teal
    { bg: '#FDF2F8', text: '#BE1365', border: '#EC4899' }, // Rose
];

// Get consistent color for industry based on hash of name
function getIndustryColor(industryName: string) {
    const hash = industryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return industryColors[hash % industryColors.length];
}

// Industries cell with colored tags
export function IndustriesCell({ industries }: { industries: Industry[] }) {
    if (!industries?.length) {
        return <div className="text-sm text-muted-foreground">—</div>;
    }

    return (
        <div className="flex flex-wrap gap-1">
            {industries.map((industry) => {
                const colors = getIndustryColor(industry.name);
                return (
                    <Badge
                        key={industry.uuid}
                        variant="outline"
                        style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderColor: colors.border,
                        }}
                        className="text-xs px-2 py-0.5 font-medium"
                    >
                        {industry.name}
                    </Badge>
                );
            })}
        </div>
    );
}

// Dual-use signals cell with category tags
export function DualUseSignalsCell({ signals }: { signals: DualUseSignal[] }) {
    if (!signals?.length) {
        return <div className="text-sm text-muted-foreground">—</div>;
    }

    // Group by category and handle uncategorized
    const categorizedSignals = signals.reduce(
        (acc, signal) => {
            const categoryName = signal.category?.name || 'Other';
            if (!acc[categoryName]) {
                acc[categoryName] = {
                    category: signal.category || {
                        uuid: 'other',
                        name: 'Other',
                        code: 'other',
                        bg_color: '#6B7280',
                        text_color: '#FFFFFF',
                    },
                    signals: [],
                };
            }
            acc[categoryName].signals.push(signal);
            return acc;
        },
        {} as Record<
            string,
            {
                category:
                    | DualUseSignal['category']
                    | {
                          uuid: string;
                          name: string;
                          code: string;
                          bg_color: string;
                          text_color: string;
                      };
                signals: DualUseSignal[];
            }
        >,
    );

    return (
        <div className="flex flex-wrap gap-1">
            {Object.entries(categorizedSignals).map(([categoryName, { category, signals }]) => (
                <Badge
                    key={categoryName}
                    variant="outline"
                    style={{
                        backgroundColor: category.bg_color,
                        color: category.text_color,
                        borderColor: category.bg_color,
                    }}
                    className="text-xs px-2 py-0.5"
                    title={signals.map((s) => s.name).join(', ')}
                >
                    {categoryName}
                    {signals.length > 1 && (
                        <span className="ml-1 opacity-75">({signals.length})</span>
                    )}
                </Badge>
            ))}
        </div>
    );
}

// Grants cell with count and pluralization
export function GrantsCell({ deal }: { deal: Deal }) {
    const grantsCount = deal.grants_count || 0;

    if (grantsCount === 0) {
        return <div className="text-sm text-muted-foreground">—</div>;
    }

    const pluralizedText = grantsCount === 1 ? '1 grant' : `${grantsCount} grants`;

    return <div className="text-sm font-medium">{pluralizedText}</div>;
}
