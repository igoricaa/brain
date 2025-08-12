import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Markdown from '@/components/common/Markdown';
import {
    Users,
    Star,
    TrendingUp,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Award,
    Building,
    DollarSign,
} from 'lucide-react';

export type TeamStrength = {
    category: string;
    score: number; // 0-100
    description: string;
};

export type TeamHighlight = {
    icon: 'award' | 'building' | 'dollar' | 'star';
    title: string;
    value: string;
    description: string;
};

export type TeamAnalysisData = {
    overallRating: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-';
    overallDescription: string;
    strengths: TeamStrength[];
    highlights: TeamHighlight[];
    riskFactors: string[];
    recommendation: string;
    fullAnalysis: string;
};

export default function EnhancedTeamAnalysis({
    title = 'Team Analysis',
    data,
}: {
    title?: string;
    data: TeamAnalysisData;
}) {
    const [showFullAnalysis, setShowFullAnalysis] = useState(false);

    const getRatingColor = (rating: string) => {
        if (rating.startsWith('A'))
            return { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' };
        if (rating.startsWith('B'))
            return { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' };
        return { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' };
    };

    const getHighlightIcon = (icon: TeamHighlight['icon']) => {
        switch (icon) {
            case 'award':
                return <Award className="h-5 w-5" />;
            case 'building':
                return <Building className="h-5 w-5" />;
            case 'dollar':
                return <DollarSign className="h-5 w-5" />;
            default:
                return <Star className="h-5 w-5" />;
        }
    };

    const ratingColors = getRatingColor(data.overallRating);

    return (
        <Card className="h-fit">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Overall Team Rating */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">Overall Rating</h3>
                        <Badge
                            className={`${ratingColors.bg} ${ratingColors.text} ${ratingColors.border} text-xl font-bold px-3 py-1`}
                        >
                            {data.overallRating}
                        </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{data.overallDescription}</p>
                </div>

                {/* Team Strengths with Progress Bars */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Team Capabilities
                    </h3>
                    <div className="space-y-4">
                        {data.strengths.map((strength, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">
                                        {strength.category}
                                    </span>
                                    <span className="text-sm text-gray-500">{strength.score}%</span>
                                </div>
                                <Progress value={strength.score} className="h-2" />
                                <p className="text-xs text-gray-500">{strength.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Key Highlights */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Highlights</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {data.highlights.map((highlight, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                                    <div className="text-green-600">
                                        {getHighlightIcon(highlight.icon)}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-medium text-gray-900">
                                            {highlight.title}
                                        </p>
                                        <Badge variant="secondary" className="text-xs">
                                            {highlight.value}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600">{highlight.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Risk Factors */}
                {data.riskFactors.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            Growth Areas
                        </h3>
                        <div className="space-y-2">
                            {data.riskFactors.map((risk, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg"
                                >
                                    <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-gray-700">{risk}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendation */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Investment Implication
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
                        {showFullAnalysis ? 'Hide' : 'Show'} Detailed Team Analysis
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
