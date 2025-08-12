import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
// import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import Markdown from '@/components/common/Markdown';
import { Users, ChevronRight, Award, Building2, GraduationCap, TrendingUp } from 'lucide-react';

export type EnhancedTeamMember = {
    id: number | string;
    name: string;
    role?: string;
    background?: string;
    analysis?: string;
    rating: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-';
    experience: number; // years
    publications?: number;
    patents?: number;
    previousExits?: number;
    keyStrengths: string[];
    riskFactors: string[];
};

export default function EnhancedTeamMembersList({
    title = 'Key Team Members',
    subtitle = 'Individual analysis of leadership team',
    members,
}: {
    title?: string;
    subtitle?: string;
    members: EnhancedTeamMember[];
}) {
    const [expandedId, setExpandedId] = useState<number | string | null>(null);
    const toggle = (id: number | string) => setExpandedId((cur) => (cur === id ? null : id));

    const getRatingColor = (rating: string) => {
        if (rating.startsWith('A'))
            return { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' };
        if (rating.startsWith('B'))
            return { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' };
        return { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' };
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase();
    };

    const getExperienceLevel = (years: number) => {
        if (years >= 15) return { label: 'Senior', color: 'text-green-600', score: 90 };
        if (years >= 10) return { label: 'Experienced', color: 'text-blue-600', score: 75 };
        if (years >= 5) return { label: 'Mid-Level', color: 'text-orange-600', score: 60 };
        return { label: 'Junior', color: 'text-gray-600', score: 40 };
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-600" />
                    {title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {members.map((member) => {
                        const ratingColors = getRatingColor(member.rating);
                        const experienceLevel = getExperienceLevel(member.experience);

                        return (
                            <div
                                key={member.id}
                                className="border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition-shadow"
                            >
                                {/* Member Header */}
                                <div className="flex items-start gap-4 mb-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-600 text-white font-semibold text-lg">
                                            {getInitials(member.name)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {member.name}
                                            </h3>
                                            <Badge
                                                className={`${ratingColors.bg} ${ratingColors.text} ${ratingColors.border} font-bold px-3 py-1`}
                                            >
                                                {member.rating}
                                            </Badge>
                                        </div>

                                        {member.role && (
                                            <p className="text-sm font-medium text-blue-600 mb-1">
                                                {member.role}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                                            <span
                                                className={`font-medium ${experienceLevel.color}`}
                                            >
                                                {member.experience}+ years experience •{' '}
                                                {experienceLevel.label}
                                            </span>
                                        </div>

                                        {member.background && (
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                {member.background}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Key Metrics */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    {typeof member.publications === 'number' && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                                                <GraduationCap className="h-4 w-4 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {member.publications}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Publications
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {typeof member.patents === 'number' && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                                                <Award className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {member.patents}
                                                </p>
                                                <p className="text-xs text-gray-500">Patents</p>
                                            </div>
                                        </div>
                                    )}

                                    {typeof member.previousExits === 'number' &&
                                        member.previousExits > 0 && (
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                                                    <Building2 className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {member.previousExits}
                                                    </p>
                                                    <p className="text-xs text-gray-500">Exits</p>
                                                </div>
                                            </div>
                                        )}

                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                                            <TrendingUp className="h-4 w-4 text-orange-600" />
                                        </div>
                                        <div>
                                            <p
                                                className={`text-sm font-semibold ${experienceLevel.color}`}
                                            >
                                                {experienceLevel.score}%
                                            </p>
                                            <p className="text-xs text-gray-500">Experience</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Strengths and Risk Factors Quick View */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                            <Award className="h-3 w-3 text-green-600" />
                                            Key Strengths
                                        </h4>
                                        <div className="space-y-1">
                                            {member.keyStrengths
                                                .slice(0, 2)
                                                .map((strength, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded"
                                                    >
                                                        {strength}
                                                    </div>
                                                ))}
                                            {member.keyStrengths.length > 2 && (
                                                <div className="text-xs text-gray-500">
                                                    +{member.keyStrengths.length - 2} more strengths
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                                            Risk Factors
                                        </h4>
                                        <div className="space-y-1">
                                            {member.riskFactors.slice(0, 2).map((risk, idx) => (
                                                <div
                                                    key={idx}
                                                    className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded"
                                                >
                                                    {risk}
                                                </div>
                                            ))}
                                            {member.riskFactors.length > 2 && (
                                                <div className="text-xs text-gray-500">
                                                    +{member.riskFactors.length - 2} more factors
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Analysis Toggle */}
                                {member.analysis && (
                                    <div>
                                        <Separator className="mb-4" />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto px-0 text-blue-600 hover:text-blue-800"
                                            onClick={() => toggle(member.id)}
                                            aria-expanded={expandedId === member.id}
                                        >
                                            <ChevronRight
                                                className={`mr-1 h-4 w-4 transition-transform ${expandedId === member.id ? 'rotate-90' : ''}`}
                                            />
                                            {expandedId === member.id ? 'Hide' : 'Show'} Detailed
                                            Analysis
                                        </Button>

                                        {expandedId === member.id && (
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                    <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4" />
                                                        Leadership Assessment
                                                    </h4>
                                                    <div className="prose prose-sm max-w-none">
                                                        <Markdown content={member.analysis} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
