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
import { showSubmitAreaErrorToast } from '@/utils/customToast';
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
    onFormChange?: (data: DraftDealFormData) => void;
    initialData?: Partial<DraftDealFormData>;
    isSubmitting?: boolean;
    isDraftSaving?: boolean;
    formRef?: React.RefObject<{ getValues: () => DraftDealFormData }>;
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
    onFormChange,
    initialData,
    isSubmitting = false,
    isDraftSaving = false,
    formRef,
}: FileMetadataFormProps) {
    // DEBUG: Log initialization
    console.log('🚀 FileMetadataForm INITIALIZATION', {
        hasInitialData: !!initialData,
        initialData: initialData,
        filesCount: files.length,
        timestamp: new Date().toISOString(),
    });

    // Create form with proper default values
    const formDefaultValues = React.useMemo(() => {
        const values = {
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
        };

        console.log('🔧 Form default values computed', {
            values,
            hasInitialData: !!initialData,
            initialDataSource: initialData,
        });

        return values;
    }, [initialData, files]);

    const form = useForm<DraftDealFormData>({
        resolver: zodResolver(draftDealSchema),
        mode: 'onSubmit', // Only validate on submit
        reValidateMode: 'onChange', // Re-validate on change after first submit
        defaultValues: formDefaultValues,
    });

    console.log('📋 Form created with default values', {
        formDefaultValues: form.getValues(),
        initialDataWasUsed: !!initialData,
        timestamp: new Date().toISOString(),
    });

    const { fields: fileFields, update: updateFileField } = useFieldArray({
        control: form.control,
        name: 'files',
    });

    // Track initialData prop changes - DEBUGGING
    useEffect(() => {
        console.log('📥 INITIAL DATA PROP CHANGED', {
            hasInitialData: !!initialData,
            initialData: initialData,
            timestamp: new Date().toISOString(),
        });
    }, [initialData]);

    // Expose form methods through ref
    useEffect(() => {
        if (formRef) {
            formRef.current = {
                getValues: () => form.getValues(),
            };
        }
    }, [form, formRef]);

    // Update form when initialData changes (e.g., when loading draft) - ENHANCED DEBUGGING & FIX
    useEffect(() => {
        console.log('📝 FORM INITIAL DATA EFFECT TRIGGERED', {
            hasInitialData: !!initialData,
            initialDataKeys: initialData ? Object.keys(initialData) : [],
            initialData: initialData,
            currentFormValues: form.getValues(),
            formState: {
                isDirty: form.formState.isDirty,
                isValid: form.formState.isValid,
                errors: form.formState.errors,
            },
        });

        if (initialData) {
            console.log('🔄 Resetting form with initial data...');

            const resetData = {
                name: initialData.name || '',
                description: initialData.description || '',
                website: initialData.website || '',
                fundingTarget: initialData.fundingTarget || '',
                files: form.getValues('files'), // Keep existing file data
            };

            console.log('📋 Form reset data prepared', resetData);

            try {
                // Reset the entire form state
                form.reset(resetData, { keepDefaultValues: false });
                console.log('✅ Form reset successful with keepDefaultValues: false');

                // Force field updates using setValue as backup
                form.setValue('name', resetData.name, {
                    shouldValidate: false,
                    shouldDirty: false,
                });
                form.setValue('description', resetData.description, {
                    shouldValidate: false,
                    shouldDirty: false,
                });
                form.setValue('website', resetData.website, {
                    shouldValidate: false,
                    shouldDirty: false,
                });
                form.setValue('fundingTarget', resetData.fundingTarget, {
                    shouldValidate: false,
                    shouldDirty: false,
                });

                console.log('✅ Backup setValue calls completed');

                // Verify form state after reset
                setTimeout(() => {
                    const newValues = form.getValues();
                    console.log('🔍 Form values after reset', {
                        newValues,
                        fieldMatches: {
                            name: newValues.name === (initialData.name || ''),
                            description: newValues.description === (initialData.description || ''),
                            website: newValues.website === (initialData.website || ''),
                            fundingTarget:
                                newValues.fundingTarget === (initialData.fundingTarget || ''),
                        },
                    });

                    // If fields still don't match, force a re-render
                    if (
                        newValues.name !== (initialData.name || '') ||
                        newValues.description !== (initialData.description || '') ||
                        newValues.website !== (initialData.website || '') ||
                        newValues.fundingTarget !== (initialData.fundingTarget || '')
                    ) {
                        console.log("⚠️ Form values still don't match, forcing re-render...");
                        // Trigger a form state update
                        form.trigger();
                    }
                }, 100);
            } catch (error) {
                console.error('❌ Form reset failed', error);
            }
        } else {
            console.log('ℹ️ No initial data to reset with');
        }
    }, [initialData, form]);

    // Manual form change handler (removed automatic watching to prevent infinite loops)
    const handleManualFormChange = useCallback(() => {
        if (onFormChange) {
            const currentData = form.getValues();
            onFormChange(currentData);
        }
    }, [form, onFormChange]);

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
        async (data: DraftDealFormData) => {
            // Only validate form fields - file upload will happen during submission
            onSubmit(data);
        },
        [onSubmit],
    );

    const handleSaveDraft = useCallback(() => {
        const data = form.getValues();
        onSaveDraft(data);
        // Also trigger form change for persistence
        handleManualFormChange();
        // Toast will be shown by FileManager based on justSaved state
    }, [form, onSaveDraft, handleManualFormChange]);

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
            <form
                onSubmit={form.handleSubmit(handleSubmit, (errors) => {
                    // Focus first error field
                    const firstErrorField = Object.keys(errors)[0];
                    if (firstErrorField === 'files') {
                        // Handle file-specific errors
                        const fileErrors = errors.files;
                        if (Array.isArray(fileErrors)) {
                            const firstFileError = fileErrors.findIndex((err) => err !== undefined);
                            if (firstFileError !== -1) {
                                const errorField = Object.keys(fileErrors[firstFileError] || {})[0];
                                if (errorField) {
                                    form.setFocus(`files.${firstFileError}.${errorField}` as any);
                                }
                            }
                        }
                    } else if (firstErrorField) {
                        form.setFocus(firstErrorField as any);
                    }

                    // Show error toast
                    showSubmitAreaErrorToast('Please fill in all required fields');
                })}
                className="space-y-6"
            >
                {/* Deal Information */}
                <Card className="shadow-sm">
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
                            render={({ field }) => {
                                // Debug field value
                                console.log('🏷️ DEAL NAME FIELD RENDER', {
                                    fieldValue: field.value,
                                    watchValue: form.watch('name'),
                                    formValue: form.getValues('name'),
                                    hasInitialData: !!initialData,
                                    initialName: initialData?.name,
                                });

                                return (
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
                                );
                            }}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => {
                                // Debug field value
                                console.log('📝 DESCRIPTION FIELD RENDER', {
                                    fieldValue: field.value,
                                    watchValue: form.watch('description'),
                                    formValue: form.getValues('description'),
                                    hasInitialData: !!initialData,
                                    initialDescription: initialData?.description,
                                });

                                return (
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
                                );
                            }}
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
                <Card className="shadow-sm">
                    <CardHeader className="border-b border-gray-300">
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
                                <Card key={field.id} className="shadow-sm">
                                    <CardContent className="p-6 space-y-6">
                                        <div className="flex items-start justify-between">
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
                                                    <FormItem className="space-y-2.5">
                                                        <FormLabel className="block text-sm font-medium">
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
                                                    <FormItem className="space-y-2.5">
                                                        <FormLabel className="block text-sm font-medium">
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
                                                <FormItem className="space-y-2.5">
                                                    <FormLabel className="block">
                                                        Summary (TLDR)
                                                    </FormLabel>
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
                                                <FormItem className="space-y-4">
                                                    <div className="flex items-center space-x-3">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={formField.value}
                                                                onCheckedChange={formField.onChange}
                                                                className="h-5 w-5 rounded-full border-2 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                            />
                                                        </FormControl>
                                                        <div className="space-y-1 leading-none">
                                                            <FormLabel className="text-sm font-medium">
                                                                Proprietary Information
                                                            </FormLabel>
                                                            <FormDescription>
                                                                This document contains sensitive or
                                                                proprietary information
                                                            </FormDescription>
                                                        </div>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />

                                        {/* Tags */}
                                        <div className="space-y-2.5">
                                            <FormLabel className="block text-sm font-medium">
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

                {/* Add bottom padding to prevent overlap with sticky bar */}
                <div className="pb-24"></div>

                {/* Sticky Bottom Action Bar */}
                <div className="fixed bottom-0 left-64 right-0 bg-white shadow-lg z-50">
                    <div className="max-w-7xl mx-auto p-4">
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
                                    onClick={onCancel}
                                    className="h-11 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>

                                <Button
                                    type="button"
                                    onClick={handleSaveDraft}
                                    disabled={isDraftSaving}
                                    className="h-11 px-6 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
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

                                <Button type="submit" disabled={isSubmitting} className="h-11 px-8">
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
                    </div>
                </div>
            </form>
        </Form>
    );
}
