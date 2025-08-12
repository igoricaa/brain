import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Markdown from '@/components/common/Markdown';
import { Users } from 'lucide-react';

export default function TeamAnalysis({
    title = 'Team Analysis',
    content,
}: {
    title?: string;
    content: string;
}) {
    return (
        <Card className="h-fit">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="max-h-[600px] pr-4">
                    <Markdown content={content} />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
