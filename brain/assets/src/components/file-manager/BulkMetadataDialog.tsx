import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Save, X, Plus, FileText, AlertCircle } from 'lucide-react';
import type { FileTableData } from './FileTable';
import type { UpdateFileRequest } from '@/hooks/useFileManagement';

const bulkMetadataSchema = z.object({
    category: z.string().optional(),
    document_type: z.string().optional(),
    proprietary: z.boolean().optional(),
    tldr: z.string().max(500, 'Summary must be less than 500 characters').optional(),
    tags: z.array(z.string()).optional(),
    // Additional fields for library files
    is_public: z.boolean().optional(),
    source: z.string().optional(),
});

type BulkMetadataFormData = z.infer<typeof bulkMetadataSchema>;

export interface BulkMetadataDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedFiles: FileTableData[];
    mode: 'deal' | 'library';
    onSubmit: (data: UpdateFileRequest) => Promise<void>;
    isSubmitting?: boolean;
}

const FILE_CATEGORIES = [
    { value: 'pitch_deck', label: 'Pitch Deck' },
    { value: 'financials', label: 'Financial Documents' },
    { value: 'legal', label: 'Legal Documents' },
    { value: 'technical', label: 'Technical Documentation' },
    { value: 'market_research', label: 'Market Research' },
    { value: 'other', label: 'Other' },
] as const;

const DOCUMENT_TYPES = [
    'Pitch Deck',
    'Executive Summary',
    'Financial Model',
    'Financial Statements',
    'Cap Table',
    'Term Sheet',
    'Articles of Incorporation',
    'Operating Agreement',
    'Patent Documentation',
    'Technical Specifications',
    'Product Demo',
    'Market Analysis',
    'Competitive Analysis',
    'Business Plan',
    'Research Paper',
    'White Paper',
    'Case Study',
    'Other',
];

export default function BulkMetadataDialog({
    open,
    onOpenChange,
    selectedFiles,
    mode,
    onSubmit,
    isSubmitting = false,
}: BulkMetadataDialogProps) {
    const form = useForm<BulkMetadataFormData>({
        resolver: zodResolver(bulkMetadataSchema),
        defaultValues: {
            category: undefined,
            document_type: undefined,
            proprietary: undefined,
            tldr: undefined,
            tags: [],
            is_public: undefined,
            source: undefined,
        },
    });

    const { watch, setValue, resetField } = form;
    const watchedTags = watch('tags') || [];

    const handleSubmit = async (data: BulkMetadataFormData) => {
        // Only include fields that are actually set (not undefined)
        const updateData: UpdateFileRequest = {};

        if (data.category !== undefined) updateData.category = data.category;
        if (data.document_type !== undefined) updateData.document_type = data.document_type;
        if (data.proprietary !== undefined) updateData.proprietary = data.proprietary;
        if (data.tldr !== undefined && data.tldr.trim()) updateData.tldr = data.tldr.trim();
        if (data.tags !== undefined && data.tags.length > 0) updateData.tags = data.tags;

        // Library-specific fields
        if (mode === 'library') {
            if (data.is_public !== undefined) (updateData as any).is_public = data.is_public;
            if (data.source !== undefined && data.source.trim())
                (updateData as any).source = data.source.trim();
        }

        try {
            await onSubmit(updateData);
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error('Error updating files:', error);
        }
    };

    const addTag = (tag: string) => {
        if (!tag.trim()) return;

        const currentTags = watchedTags || [];
        if (!currentTags.includes(tag.trim())) {
            setValue('tags', [...currentTags, tag.trim()]);
        }
    };

    const removeTag = (tagIndex: number) => {
        const currentTags = watchedTags || [];
        const newTags = currentTags.filter((_, index) => index !== tagIndex);
        setValue('tags', newTags);
    };

    const clearField = (fieldName: keyof BulkMetadataFormData) => {
        resetField(fieldName);
    };

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            form.reset();
        }
    }, [open, form]);

    // Get unique values from selected files for reference
    const uniqueCategories = (() => {
        const categories = [...new Set(selectedFiles.map((f) => f.category))];
        return categories.filter(Boolean);
    })();

    const uniqueDocTypes = (() => {
        const docTypes = [...new Set(selectedFiles.map((f) => f.document_type).filter(Boolean))];
        return docTypes;
    })();

    const uniqueTags = (() => {
        const allTags = selectedFiles.flatMap((f) => f.tags || []);
        return [...new Set(allTags)];
    })();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Edit Metadata for {selectedFiles.length} Files
                    </DialogTitle>
                    <DialogDescription>
                        Update metadata for selected files. Only the fields you modify will be
                        changed.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-6">
                        {/* Selected Files Preview */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Selected Files</h4>
                            <div className="bg-muted rounded-lg p-3 max-h-32 overflow-y-auto">
                                <div className="space-y-1">
                                    {selectedFiles.slice(0, 5).map((file) => (
                                        <div
                                            key={file.uuid}
                                            className="text-xs text-muted-foreground flex items-center gap-2"
                                        >
                                            <FileText className="h-3 w-3" />
                                            <span className="truncate">{file.name}</span>
                                        </div>
                                    ))}
                                    {selectedFiles.length > 5 && (
                                        <div className="text-xs text-muted-foreground">
                                            + {selectedFiles.length - 5} more files
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Current Values Reference */}
                        {(uniqueCategories.length > 0 ||
                            uniqueDocTypes.length > 0 ||
                            uniqueTags.length > 0) && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">
                                    Current Values in Selected Files
                                </h4>
                                <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                                    {uniqueCategories.length > 0 && (
                                        <div>
                                            <span className="text-xs font-medium text-blue-800">
                                                Categories:{' '}
                                            </span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {uniqueCategories.map((cat) => (
                                                    <Badge
                                                        key={cat}
                                                        variant="secondary"
                                                        className="text-xs capitalize"
                                                    >
                                                        {cat.replace('_', ' ')}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {uniqueDocTypes.length > 0 && (
                                        <div>
                                            <span className="text-xs font-medium text-blue-800">
                                                Document Types:{' '}
                                            </span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {uniqueDocTypes.map((type) => (
                                                    <Badge
                                                        key={type}
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        {type}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {uniqueTags.length > 0 && (
                                        <div>
                                            <span className="text-xs font-medium text-blue-800">
                                                Tags:{' '}
                                            </span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {uniqueTags.slice(0, 10).map((tag) => (
                                                    <Badge
                                                        key={tag}
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        {tag}
                                                    </Badge>
                                                ))}
                                                {uniqueTags.length > 10 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        +{uniqueTags.length - 10} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <Separator />

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                                {/* Category */}
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel>Category</FormLabel>
                                                {field.value && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => clearField('category')}
                                                        className="h-6 px-2 text-xs"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value || ''}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select category (optional)" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {FILE_CATEGORIES.map((category) => (
                                                        <SelectItem
                                                            key={category.value}
                                                            value={category.value}
                                                        >
                                                            {category.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Leave empty to keep existing categories unchanged
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Document Type */}
                                <FormField
                                    control={form.control}
                                    name="document_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel>Document Type</FormLabel>
                                                {field.value && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => clearField('document_type')}
                                                        className="h-6 px-2 text-xs"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value || ''}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select document type (optional)" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {DOCUMENT_TYPES.map((type) => (
                                                        <SelectItem key={type} value={type}>
                                                            {type}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Proprietary */}
                                <FormField
                                    control={form.control}
                                    name="proprietary"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value === true}
                                                    onCheckedChange={(checked) => {
                                                        field.onChange(
                                                            checked === true ? true : undefined,
                                                        );
                                                    }}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Mark as Proprietary Information
                                                </FormLabel>
                                                <FormDescription>
                                                    Check to mark all selected files as containing
                                                    proprietary information
                                                </FormDescription>
                                            </div>
                                            {field.value !== undefined && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => clearField('proprietary')}
                                                    className="h-6 px-2 text-xs ml-auto"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </FormItem>
                                    )}
                                />

                                {/* TLDR */}
                                <FormField
                                    control={form.control}
                                    name="tldr"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel>Summary (TLDR)</FormLabel>
                                                {field.value && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => clearField('tldr')}
                                                        className="h-6 px-2 text-xs"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Brief summary to apply to all selected files (optional)"
                                                    rows={3}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Will replace the summary for all selected files (max
                                                500 characters)
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Tags */}
                                <FormField
                                    control={form.control}
                                    name="tags"
                                    render={() => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel>Tags</FormLabel>
                                                {watchedTags.length > 0 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => clearField('tags')}
                                                        className="h-6 px-2 text-xs"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {watchedTags.map((tag, index) => (
                                                    <Badge
                                                        key={index}
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        {tag}
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-auto p-0 ml-1"
                                                            onClick={() => removeTag(index)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </Badge>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Add tag"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const input =
                                                                e.target as HTMLInputElement;
                                                            addTag(input.value);
                                                            input.value = '';
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        const input = (
                                                            e.target as HTMLElement
                                                        ).parentElement?.querySelector(
                                                            'input',
                                                        ) as HTMLInputElement;
                                                        if (input) {
                                                            addTag(input.value);
                                                            input.value = '';
                                                        }
                                                    }}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <FormDescription>
                                                These tags will be added to all selected files
                                            </FormDescription>
                                        </FormItem>
                                    )}
                                />

                                {/* Library-specific fields */}
                                {mode === 'library' && (
                                    <>
                                        <Separator />

                                        <FormField
                                            control={form.control}
                                            name="is_public"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value === true}
                                                            onCheckedChange={(checked) => {
                                                                field.onChange(
                                                                    checked === true
                                                                        ? true
                                                                        : undefined,
                                                                );
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>Make Public</FormLabel>
                                                        <FormDescription>
                                                            Check to make all selected files
                                                            publicly accessible
                                                        </FormDescription>
                                                    </div>
                                                    {field.value !== undefined && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => clearField('is_public')}
                                                            className="h-6 px-2 text-xs ml-auto"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="source"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center justify-between">
                                                        <FormLabel>Source</FormLabel>
                                                        {field.value && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => clearField('source')}
                                                                className="h-6 px-2 text-xs"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Source or origin of these files (optional)"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Will set the source for all selected files
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </>
                                )}
                            </form>
                        </Form>
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        onClick={form.handleSubmit(handleSubmit)}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Save className="h-4 w-4 mr-2 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Update {selectedFiles.length} Files
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
