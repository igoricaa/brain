import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import Markdown from '@/components/common/Markdown';
import { ChevronDown, ChevronRight } from 'lucide-react';

export type TeamMember = {
  id: number | string;
  name: string;
  role?: string;
  background?: string;
  analysis?: string;
};

export default function TeamMembersList({ title = 'Team Members', subtitle = 'Individual analysis of key team members', members, }: {
  title?: string;
  subtitle?: string;
  members: TeamMember[];
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
          {members.map((m, idx) => (
            <div key={m.id} className={idx === 0 ? 'pt-0 pb-4' : 'py-4'}>
              <div className="space-y-3">
                <div>
                  <h3 className="mb-1">{m.name}</h3>
                  {m.role && (
                    <p className="text-sm text-muted-foreground">{m.role}</p>
                  )}
                  {m.background && (
                    <p className="mt-1 text-sm">{m.background}</p>
                  )}
                </div>
                {m.analysis && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-0"
                        onClick={() => toggle(m.id)}
                        aria-expanded={expandedId === m.id}
                      >
                        <ChevronRight
                          className={`mr-1 h-4 w-4 transition-transform ${expandedId === m.id ? 'rotate-90' : ''}`}
                        />
                        View Analysis
                      </Button>
                    </CollapsibleTrigger>
                    {expandedId === m.id && (
                      <CollapsibleContent className="mt-3">
                        <Separator className="mb-3" />
                        <Markdown content={m.analysis} />
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
