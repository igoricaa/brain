import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Markdown from '@/components/common/Markdown';
import {
    FileText,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';

export type ResearchInsight = {
    type: 'positive' | 'neutral' | 'risk';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
};

export type ResearchAnalysisData = {
    executiveSummary: string;
    keyInsights: ResearchInsight[];
    recommendation: string;
    fullAnalysis: string;
};

export default function EnhancedResearchAnalysis({
    title = 'Investment Research Analysis',
    data,
}: {
    title?: string;
    data: ResearchAnalysisData;
}) {
    const [showFullAnalysis, setShowFullAnalysis] = useState(false);

    const getInsightIcon = (type: ResearchInsight['type']) => {
        switch (type) {
            case 'positive':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'risk':
                return <AlertCircle className="h-4 w-4 text-red-600" />;
            default:
                return <TrendingUp className="h-4 w-4 text-blue-600" />;
        }
    };

    const getInsightColors = (type: ResearchInsight['type']) => {
        switch (type) {
            case 'positive':
                return { bg: 'bg-green-50', border: 'border-green-200' };
            case 'risk':
                return { bg: 'bg-red-50', border: 'border-red-200' };
            default:
                return { bg: 'bg-blue-50', border: 'border-blue-200' };
        }
    };

    const getImpactBadge = (impact: ResearchInsight['impact']) => {
        const colors = {
            high: 'bg-red-100 text-red-700 border-red-200',
            medium: 'bg-orange-100 text-orange-700 border-orange-200',
            low: 'bg-blue-100 text-blue-700 border-blue-200',
        };
        return (
            <Badge variant="outline" className={`${colors[impact]} text-xs`}>
                {impact.toUpperCase()} IMPACT
            </Badge>
        );
    };

    return (
        <Card className="h-fit">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Executive Summary */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Executive Summary
                    </h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {data.executiveSummary}
                        </p>
                    </div>
                </div>

                {/* Key Insights */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
                    <div className="space-y-3">
                        {data.keyInsights.map((insight, idx) => {
                            const colors = getInsightColors(insight.type);
                            return (
                                <div
                                    key={idx}
                                    className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}
                                >
                                    <div className="flex items-start gap-3">
                                        {getInsightIcon(insight.type)}
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-gray-900">
                                                    {insight.title}
                                                </h4>
                                                {getImpactBadge(insight.impact)}
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                {insight.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Investment Recommendation */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Investment Recommendation
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-gray-700 font-medium">{data.recommendation}</p>
                    </div>
                </div>

                <Separator />

                {/* Full Analysis Toggle */}
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                        className="flex items-center gap-2 px-0 h-auto text-blue-600 hover:text-blue-800"
                    >
                        {showFullAnalysis ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                        {showFullAnalysis ? 'Hide' : 'Show'} Detailed Analysis
                    </Button>

                    {showFullAnalysis && (
                        <div className="mt-4">
                            <ScrollArea className="max-h-[400px] pr-4">
                                <div className="prose prose-sm max-w-none">
                                    <Markdown content={data.fullAnalysis} />
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
