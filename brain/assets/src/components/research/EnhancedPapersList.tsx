import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import Markdown from '@/components/common/Markdown';
import {
    ExternalLink,
    ChevronRight,
    FileText,
    Search,
    Star,
    TrendingUp,
    AlertCircle,
} from 'lucide-react';

export type EnhancedPaper = {
    id: number | string;
    title: string;
    authors?: string;
    year?: number;
    citations?: number;
    abstract?: string;
    evaluation?: string;
    url?: string;
    relevance: 'high' | 'medium' | 'low';
    impact: 'significant' | 'moderate' | 'limited';
    technicalMerit: 'excellent' | 'good' | 'average';
};

export default function EnhancedPapersList({
    title = 'Research Papers Analysis',
    subtitle = 'Key papers analyzed with investment implications',
    papers,
}: {
    title?: string;
    subtitle?: string;
    papers: EnhancedPaper[];
}) {
    const [expandedId, setExpandedId] = useState<number | string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRelevance, setFilterRelevance] = useState<'all' | 'high' | 'medium' | 'low'>(
        'all',
    );

    const toggle = (id: number | string) => setExpandedId((cur) => (cur === id ? null : id));

    // Filter papers based on search and relevance
    const filteredPapers = papers.filter((paper) => {
        const matchesSearch =
            !searchQuery ||
            paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            paper.authors?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterRelevance === 'all' || paper.relevance === filterRelevance;
        return matchesSearch && matchesFilter;
    });

    // Sort by relevance then impact
    const sortedPapers = [...filteredPapers].sort((a, b) => {
        const relevanceOrder = { high: 3, medium: 2, low: 1 };
        const impactOrder = { significant: 3, moderate: 2, limited: 1 };

        if (a.relevance !== b.relevance) {
            return relevanceOrder[b.relevance] - relevanceOrder[a.relevance];
        }
        return impactOrder[b.impact] - impactOrder[a.impact];
    });

    const getRelevanceColor = (relevance: string) => {
        switch (relevance) {
            case 'high':
                return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
            case 'medium':
                return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
            default:
                return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
        }
    };

    const getImpactIcon = (impact: string) => {
        switch (impact) {
            case 'significant':
                return <TrendingUp className="h-4 w-4 text-green-600" />;
            case 'moderate':
                return <Star className="h-4 w-4 text-blue-600" />;
            default:
                return <AlertCircle className="h-4 w-4 text-gray-500" />;
        }
    };

    const getMeritBadge = (merit: string) => {
        const colors = {
            excellent: 'bg-green-100 text-green-700 border-green-200',
            good: 'bg-blue-100 text-blue-700 border-blue-200',
            average: 'bg-gray-100 text-gray-700 border-gray-200',
        };
        return (
            <Badge variant="outline" size="sm" className={colors[merit]}>
                {merit.toUpperCase()}
            </Badge>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    {title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{subtitle}</p>

                {/* Search and Filter Controls */}
                <div className="flex flex-col gap-3 pt-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Search papers and authors..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {(['all', 'high', 'medium', 'low'] as const).map((relevance) => (
                            <Button
                                key={relevance}
                                variant={filterRelevance === relevance ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilterRelevance(relevance)}
                            >
                                {relevance === 'all' ? 'All Papers' : `${relevance} Relevance`}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {sortedPapers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No papers found matching your criteria</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {sortedPapers.map((paper, idx) => {
                            const relevanceColors = getRelevanceColor(paper.relevance);
                            return (
                                <div key={paper.id} className={idx === 0 ? 'pt-0 pb-6' : 'py-6'}>
                                    <div className="space-y-4">
                                        {/* Paper Header */}
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 leading-snug mb-2">
                                                        {paper.title}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground mb-3">
                                                        {paper.authors}
                                                        {paper.year ? ` • ${paper.year}` : ''}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {getImpactIcon(paper.impact)}
                                                </div>
                                            </div>

                                            {/* Metrics Row */}
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <Badge
                                                    variant="outline"
                                                    className={`${relevanceColors.bg} ${relevanceColors.text} ${relevanceColors.border}`}
                                                >
                                                    {paper.relevance.toUpperCase()} RELEVANCE
                                                </Badge>

                                                {getMeritBadge(paper.technicalMerit)}

                                                <Badge variant="outline" size="sm">
                                                    {paper.impact.toUpperCase()} IMPACT
                                                </Badge>

                                                {typeof paper.citations === 'number' && (
                                                    <Badge variant="secondary">
                                                        {paper.citations.toLocaleString()} citations
                                                    </Badge>
                                                )}

                                                {paper.url && (
                                                    <Button asChild variant="outline" size="sm">
                                                        <a
                                                            href={paper.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <ExternalLink className="mr-1 h-3 w-3" />
                                                            View Paper
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Abstract */}
                                        {paper.abstract && (
                                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">
                                                    Abstract
                                                </h4>
                                                <p className="text-sm text-gray-600 leading-relaxed">
                                                    {paper.abstract}
                                                </p>
                                            </div>
                                        )}

                                        {/* Investment Analysis Toggle */}
                                        {paper.evaluation && (
                                            <div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-auto px-0 text-blue-600 hover:text-blue-800"
                                                    onClick={() => toggle(paper.id)}
                                                    aria-expanded={expandedId === paper.id}
                                                >
                                                    <ChevronRight
                                                        className={`mr-1 h-4 w-4 transition-transform ${expandedId === paper.id ? 'rotate-90' : ''}`}
                                                    />
                                                    {expandedId === paper.id ? 'Hide' : 'Show'}{' '}
                                                    Investment Analysis
                                                </Button>

                                                {expandedId === paper.id && (
                                                    <div className="mt-4 pl-5">
                                                        <Separator className="mb-4" />
                                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                            <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                                                <TrendingUp className="h-4 w-4" />
                                                                Investment Implications
                                                            </h4>
                                                            <div className="prose prose-sm max-w-none">
                                                                <Markdown
                                                                    content={paper.evaluation}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
