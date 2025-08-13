import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import Markdown from '@/components/common/Markdown';
import { ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

export type Paper = {
    id: number | string;
    title: string;
    authors?: string;
    year?: number;
    citations?: number;
    abstract?: string;
    evaluation?: string;
    url?: string;
};

export default function PapersList({
    title = 'Key Research Papers',
    subtitle = 'Top papers analyzed by the research agent',
    papers,
}: {
    title?: string;
    subtitle?: string;
    papers: Paper[];
}) {
    const [expandedId, setExpandedId] = React.useState<number | string | null>(null);
    const toggle = (id: number | string) => setExpandedId((cur) => (cur === id ? null : id));

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
            </CardHeader>
            <CardContent>
                <div className="divide-y divide-border">
                    {papers.map((paper, idx) => (
                        <div key={paper.id} className={idx === 0 ? 'pt-0 pb-4' : 'py-4'}>
                            <div className="space-y-3">
                                <div>
                                    <h3 className="mb-1">{paper.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {paper.authors}
                                        {paper.year ? ` • ${paper.year}` : ''}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2">
                                        {typeof paper.citations === 'number' && (
                                            <Badge variant="secondary">
                                                {paper.citations} citations
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
                                {paper.abstract && <p className="text-sm">{paper.abstract}</p>}

                                {paper.evaluation && (
                                    <Collapsible>
                                        <CollapsibleTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-auto px-0"
                                                onClick={() => toggle(paper.id)}
                                                aria-expanded={expandedId === paper.id}
                                            >
                                                <ChevronRight
                                                    className={`mr-1 h-4 w-4 transition-transform ${expandedId === paper.id ? 'rotate-90' : ''}`}
                                                />
                                                View Analysis
                                            </Button>
                                        </CollapsibleTrigger>
                                        {expandedId === paper.id && (
                                            <CollapsibleContent className="mt-3">
                                                <Separator className="mb-3" />
                                                <Markdown content={paper.evaluation} />
                                            </CollapsibleContent>
                                        )}
                                    </Collapsible>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
