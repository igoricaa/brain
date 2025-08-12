import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Shield, DollarSign, Target } from 'lucide-react';

export type InvestmentMetrics = {
    overallRating: {
        grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-';
        description: string;
    };
    recommendation: {
        type: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell';
        confidence: 'High' | 'Medium' | 'Low';
    };
    riskLevel: {
        level: 'Low' | 'Medium' | 'High';
        factors: string[];
    };
    marketOpportunity: {
        tam: string;
        growth: string;
        timeline: string;
    };
};

export default function MetricsHeader({ metrics }: { metrics: InvestmentMetrics }) {
    // Color mapping for different ratings and recommendations
    const getRatingColor = (grade: string) => {
        if (grade.startsWith('A'))
            return { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' };
        if (grade.startsWith('B'))
            return { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' };
        return { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' };
    };

    const getRecommendationColor = (type: string) => {
        if (type === 'Strong Buy')
            return { bg: 'bg-green-100', text: 'text-green-600', icon: 'text-green-600' };
        if (type === 'Buy')
            return { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'text-blue-600' };
        if (type === 'Hold')
            return { bg: 'bg-orange-100', text: 'text-orange-600', icon: 'text-orange-600' };
        return { bg: 'bg-red-100', text: 'text-red-600', icon: 'text-red-600' };
    };

    const getRiskColor = (level: string) => {
        if (level === 'Low')
            return { bg: 'bg-green-100', text: 'text-green-600', icon: 'text-green-600' };
        if (level === 'Medium')
            return { bg: 'bg-orange-100', text: 'text-orange-600', icon: 'text-orange-600' };
        return { bg: 'bg-red-100', text: 'text-red-600', icon: 'text-red-600' };
    };

    const ratingColors = getRatingColor(metrics.overallRating.grade);
    const recommendationColors = getRecommendationColor(metrics.recommendation.type);
    const riskColors = getRiskColor(metrics.riskLevel.level);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Overall Rating Card */}
            <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex items-center">
                        <div
                            className={`flex h-12 w-12 items-center justify-center rounded-lg ${ratingColors.bg}`}
                        >
                            <Target className={`h-6 w-6 ${ratingColors.icon}`} />
                        </div>
                        <div className="ml-4 flex-1">
                            <p className="text-sm font-medium text-gray-500">Overall Rating</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-2xl font-bold text-gray-900">
                                    {metrics.overallRating.grade}
                                </p>
                                <Badge
                                    variant="secondary"
                                    className={`${ratingColors.bg} ${ratingColors.text} border-0`}
                                >
                                    Excellent
                                </Badge>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                {metrics.overallRating.description}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Investment Recommendation Card */}
            <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex items-center">
                        <div
                            className={`flex h-12 w-12 items-center justify-center rounded-lg ${recommendationColors.bg}`}
                        >
                            <TrendingUp className={`h-6 w-6 ${recommendationColors.icon}`} />
                        </div>
                        <div className="ml-4 flex-1">
                            <p className="text-sm font-medium text-gray-500">Recommendation</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-lg font-semibold text-gray-900">
                                    {metrics.recommendation.type}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                <Badge variant="outline" size="sm">
                                    {metrics.recommendation.confidence} Confidence
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Risk Level Card */}
            <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex items-center">
                        <div
                            className={`flex h-12 w-12 items-center justify-center rounded-lg ${riskColors.bg}`}
                        >
                            <Shield className={`h-6 w-6 ${riskColors.icon}`} />
                        </div>
                        <div className="ml-4 flex-1">
                            <p className="text-sm font-medium text-gray-500">Risk Level</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-2xl font-semibold text-gray-900">
                                    {metrics.riskLevel.level}
                                </p>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                {metrics.riskLevel.factors.length} risk factors identified
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Market Opportunity Card */}
            <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                            <DollarSign className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-4 flex-1">
                            <p className="text-sm font-medium text-gray-500">Market Opportunity</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-xl font-bold text-gray-900">
                                    {metrics.marketOpportunity.tam}
                                </p>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                {metrics.marketOpportunity.growth} growth by{' '}
                                {metrics.marketOpportunity.timeline}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
