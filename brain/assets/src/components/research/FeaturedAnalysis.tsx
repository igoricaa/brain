import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Markdown from '@/components/common/Markdown';
import { FileText } from 'lucide-react';

export default function FeaturedAnalysis({
    title = 'Research Analysis',
    content,
}: {
    title?: string;
    content: string;
}) {
    return (
        <Card className="h-fit">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
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
