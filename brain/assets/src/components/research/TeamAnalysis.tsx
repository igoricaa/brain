import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Markdown from '@/components/common/Markdown';
import { Users } from 'lucide-react';

export default function TeamAnalysis({ title = 'Team Analysis', content, height = 600 }: {
  title?: string;
  content: string;
  height?: number;
}) {
  const inner = Math.max(0, height - 80);
  return (
    <Card style={{ height }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent style={{ height: inner }}>
        <ScrollArea className="h-full pr-4">
          <Markdown content={content} />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

