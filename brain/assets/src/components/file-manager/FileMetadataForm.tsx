import React, { useCallback, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    AlertCircle,
    Save,
    Upload,
    Plus,
    X,
    Building2,
    DollarSign,
    Globe,
    FileCheck,
    Clock,
    CheckCircle2,
    Archive,
    FileImage,
    FileSpreadsheet,
    Scale,
    Cpu,
    BarChart3,
} from 'lucide-react';
import { UploadFile } from './FileUpload';

// File metadata schema
const fileMetadataSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'File name is required'),
    category: z.enum(
        ['pitch_deck', 'financials', 'legal', 'technical', 'market_research', 'other'],
        {
            required_error: 'Category is required',
        },
    ),
    documentType: z.string().optional(),
    proprietary: z.boolean().default(false),
    tldr: z.string().max(500, 'Summary must be less than 500 characters').optional(),
    tags: z.array(z.string()).default([]),
});

// Category configuration with colors and icons
const CATEGORY_CONFIG = {
    pitch_deck: {
        label: 'Pitch Deck',
        icon: FileImage,
        color: 'bg-blue-50 text-blue-700',
    },
    financials: {
        label: 'Financial Documents',
        icon: FileSpreadsheet,
        color: 'bg-green-50 text-green-700',
    },
    legal: {
        label: 'Legal Documents',
        icon: Scale,
        color: 'bg-purple-50 text-purple-700',
    },
    technical: {
        label: 'Technical Documentation',
        icon: Cpu,
        color: 'bg-orange-50 text-orange-700',
    },
    market_research: {
        label: 'Market Research',
        icon: BarChart3,
        color: 'bg-cyan-50 text-cyan-700',
    },
    other: {
        label: 'Other',
        icon: Archive,
        color: 'bg-gray-50 text-gray-700',
    },
} as const;

// Draft deal metadata schema
const draftDealSchema = z.object({
    name: z.string().min(1, 'Deal name is required'),
    description: z.string().optional(),
    website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
    fundingTarget: z.string().optional(),
    files: z.array(fileMetadataSchema),
});

type FileMetadataFormData = z.infer<typeof fileMetadataSchema>;
type DraftDealFormData = z.infer<typeof draftDealSchema>;

export interface FileMetadataFormProps {
    files: UploadFile[];
    onSubmit: (data: DraftDealFormData) => void;
    onSaveDraft: (data: DraftDealFormData) => void;
    onCancel: () => void;
    initialData?: Partial<DraftDealFormData>;
    isSubmitting?: boolean;
    isDraftSaving?: boolean;
}

const FILE_CATEGORIES = Object.entries(CATEGORY_CONFIG).map(([value, config]) => ({
    value: value as keyof typeof CATEGORY_CONFIG,
    label: config.label,
    icon: config.icon,
}));

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
    'Other',
];

export default function FileMetadataForm({
    files,
    onSubmit,
    onSaveDraft,
    onCancel,
    initialData,
    isSubmitting = false,
    isDraftSaving = false,
}: FileMetadataFormProps) {
    const form = useForm<DraftDealFormData>({
        resolver: zodResolver(draftDealSchema),
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            website: initialData?.website || '',
            fundingTarget: initialData?.fundingTarget || '',
            files: files.map((file) => ({
                id: file.id,
                name: file.name,
                category: 'other' as const,
                documentType: '',
                proprietary: false,
                tldr: '',
                tags: [],
            })),
        },
    });

    const { fields: fileFields, update: updateFileField } = useFieldArray({
        control: form.control,
        name: 'files',
    });

    // Update form when files change
    useEffect(() => {
        const currentFiles = form.getValues('files');
        const newFiles = files.filter((file) => !currentFiles.some((f) => f.id === file.id));

        if (newFiles.length > 0) {
            const updatedFiles = [
                ...currentFiles,
                ...newFiles.map((file) => ({
                    id: file.id,
                    name: file.name,
                    category: 'other' as const,
                    documentType: '',
                    proprietary: false,
                    tldr: '',
                    tags: [],
                })),
            ];
            form.setValue('files', updatedFiles);
        }

        // Remove files that are no longer in the upload list
        const filteredFiles = currentFiles.filter((formFile) =>
            files.some((file) => file.id === formFile.id),
        );
        if (filteredFiles.length !== currentFiles.length) {
            form.setValue('files', filteredFiles);
        }
    }, [files, form]);

    const handleSubmit = useCallback(
        (data: DraftDealFormData) => {
            onSubmit(data);
        },
        [onSubmit],
    );

    const handleSaveDraft = useCallback(() => {
        const data = form.getValues();
        onSaveDraft(data);
    }, [form, onSaveDraft]);

    const addTag = useCallback(
        (fileIndex: number, tag: string) => {
            if (!tag.trim()) return;

            const currentFile = form.getValues(`files.${fileIndex}`);
            const tags = currentFile.tags || [];

            if (!tags.includes(tag.trim())) {
                form.setValue(`files.${fileIndex}.tags`, [...tags, tag.trim()]);
            }
        },
        [form],
    );

    const removeTag = useCallback(
        (fileIndex: number, tagIndex: number) => {
            const currentFile = form.getValues(`files.${fileIndex}`);
            const tags = currentFile.tags || [];
            const newTags = tags.filter((_, index) => index !== tagIndex);
            form.setValue(`files.${fileIndex}.tags`, newTags);
        },
        [form],
    );

    const getFileFromUploadList = useCallback(
        (fileId: string) => {
            return files.find((f) => f.id === fileId);
        },
        [files],
    );


    if (files.length === 0) {
        return (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Please upload files before configuring metadata.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Deal Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
                                <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                            Deal Information
                            <Badge variant="secondary" className="ml-auto">
                                New Deal
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="space-y-2.5">
                                    <FormLabel className="block">Deal Name*</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter deal name"
                                            className="shadow-sm"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem className="space-y-2.5">
                                    <FormLabel className="block">Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Brief description of the deal"
                                            className="shadow-sm"
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="website"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                            <Globe className="h-4 w-4 text-muted-foreground" />
                                            Company Website
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://example.com"
                                                className="h-11"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="fundingTarget"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                                            Funding Target
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., $5M Series A"
                                                className="h-11"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* File Metadata */}
                <Card>
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
                                    <FileCheck className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold">File Details</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Configure metadata for {files.length} file
                                        {files.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                                {files.length} Files
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                        {fileFields.map((field, index) => {
                            // Use the file ID stored in the form field, not the useFieldArray generated ID
                            const formFileId = form.watch(`files.${index}.id`);
                            const uploadFile = getFileFromUploadList(formFileId);
                            
                            
                            if (!uploadFile) return null;

                            const categoryConfig =
                                CATEGORY_CONFIG[
                                    form.watch(
                                        `files.${index}.category`,
                                    ) as keyof typeof CATEGORY_CONFIG
                                ] || CATEGORY_CONFIG.other;
                            const CategoryIcon = categoryConfig.icon;

                            const getStatusBadge = (status: string) => {
                                switch (status) {
                                    case 'completed':
                                        return (
                                            <Badge className="bg-green-50 text-green-700 border-green-200">
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Completed
                                            </Badge>
                                        );
                                    case 'uploading':
                                        return (
                                            <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                                                <Clock className="h-3 w-3 mr-1 animate-spin" />
                                                Uploading
                                            </Badge>
                                        );
                                    case 'error':
                                        return (
                                            <Badge variant="destructive">
                                                <AlertCircle className="h-3 w-3 mr-1" />
                                                Error
                                            </Badge>
                                        );
                                    default:
                                        return (
                                            <Badge variant="secondary">
                                                <Clock className="h-3 w-3 mr-1" />
                                                Pending
                                            </Badge>
                                        );
                                }
                            };

                            return (
                                <Card
                                    key={field.id}
                                    className="border hover:border-gray-300 transition-colors"
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-start gap-3 flex-1">
                                                <div
                                                    className={`flex items-center justify-center w-10 h-10 rounded-lg ${categoryConfig.color}`}
                                                >
                                                    <CategoryIcon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-base mb-1 truncate">
                                                        {uploadFile.name}
                                                    </h4>
                                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                        <span>
                                                            {(
                                                                uploadFile.size /
                                                                1024 /
                                                                1024
                                                            ).toFixed(2)}{' '}
                                                            MB
                                                        </span>
                                                        <span>•</span>
                                                        <span className="capitalize">
                                                            {uploadFile.type.split('/')[1] ||
                                                                'file'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {getStatusBadge(uploadFile.status)}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name={`files.${index}.category`}
                                                render={({ field: formField }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-sm font-medium">
                                                            Category*
                                                        </FormLabel>
                                                        <Select
                                                            onValueChange={formField.onChange}
                                                            defaultValue={formField.value}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="h-11">
                                                                    <SelectValue placeholder="Select category" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {FILE_CATEGORIES.map((category) => {
                                                                    const CategoryIcon =
                                                                        category.icon;
                                                                    return (
                                                                        <SelectItem
                                                                            key={category.value}
                                                                            value={category.value}
                                                                            className="flex items-center gap-2"
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <CategoryIcon className="h-4 w-4" />
                                                                                {category.label}
                                                                            </div>
                                                                        </SelectItem>
                                                                    );
                                                                })}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name={`files.${index}.documentType`}
                                                render={({ field: formField }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-sm font-medium">
                                                            Document Type
                                                        </FormLabel>
                                                        <Select
                                                            onValueChange={formField.onChange}
                                                            defaultValue={formField.value}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="h-11">
                                                                    <SelectValue placeholder="Select type" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {DOCUMENT_TYPES.map((type) => (
                                                                    <SelectItem
                                                                        key={type}
                                                                        value={type}
                                                                    >
                                                                        {type}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name={`files.${index}.tldr`}
                                            render={({ field: formField }) => (
                                                <FormItem>
                                                    <FormLabel>Summary (TLDR)</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Brief summary of this document's contents"
                                                            rows={2}
                                                            {...formField}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Briefly describe what this document contains
                                                        (max 500 characters)
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name={`files.${index}.proprietary`}
                                            render={({ field: formField }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={formField.value}
                                                            onCheckedChange={formField.onChange}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>
                                                            Proprietary Information
                                                        </FormLabel>
                                                        <FormDescription>
                                                            This document contains sensitive or
                                                            proprietary information
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />

                                        {/* Tags */}
                                        <div className="space-y-3">
                                            <FormLabel className="text-sm font-medium">
                                                Tags
                                            </FormLabel>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {(form.watch(`files.${index}.tags`) || []).map(
                                                    (tag, tagIndex) => {
                                                        const colors = [
                                                            'bg-blue-50 text-blue-700 border-blue-200',
                                                            'bg-green-50 text-green-700 border-green-200',
                                                            'bg-purple-50 text-purple-700 border-purple-200',
                                                            'bg-orange-50 text-orange-700 border-orange-200',
                                                            'bg-pink-50 text-pink-700 border-pink-200',
                                                        ];
                                                        const colorClass =
                                                            colors[tagIndex % colors.length];

                                                        return (
                                                            <Badge
                                                                key={tagIndex}
                                                                className={`text-xs border ${colorClass} hover:shadow-sm transition-shadow`}
                                                            >
                                                                {tag}
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-auto p-0 ml-1 hover:bg-transparent"
                                                                    onClick={() =>
                                                                        removeTag(index, tagIndex)
                                                                    }
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </Badge>
                                                        );
                                                    },
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Add tag (press Enter)"
                                                    className="h-10"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const input =
                                                                e.target as HTMLInputElement;
                                                            addTag(index, input.value);
                                                            input.value = '';
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-10 px-3"
                                                    onClick={(e) => {
                                                        const input = (
                                                            e.target as HTMLElement
                                                        ).parentElement?.querySelector(
                                                            'input',
                                                        ) as HTMLInputElement;
                                                        if (input) {
                                                            addTag(index, input.value);
                                                            input.value = '';
                                                        }
                                                    }}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <Card className="border bg-gray-50/50">
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="space-y-1">
                                <h3 className="font-semibold text-lg">Ready to Submit?</h3>
                                <p className="text-sm text-muted-foreground">
                                    Review your deal information and file details before submitting
                                    for underwriting.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onCancel}
                                    className="h-11 px-6"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleSaveDraft}
                                    disabled={isDraftSaving}
                                    className="h-11 px-6"
                                >
                                    {isDraftSaving ? (
                                        <>
                                            <Save className="h-4 w-4 mr-2 animate-spin" />
                                            Saving Draft...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Save Draft
                                        </>
                                    )}
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={
                                        isSubmitting || files.some((f) => f.status !== 'completed')
                                    }
                                    className="h-11 px-8"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Upload className="h-4 w-4 mr-2 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Submit for Underwriting
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </Form>
    );
}
