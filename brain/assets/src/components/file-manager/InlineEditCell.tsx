import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Check, X, Edit, Plus, Tag } from 'lucide-react';
import type { FileTableData } from './FileTable';

export type EditableField = 'category' | 'document_type' | 'proprietary' | 'tldr' | 'tags';

interface InlineEditCellProps {
    file: FileTableData;
    field: EditableField;
    value: any;
    onSave: (fileId: string, field: EditableField, value: any) => Promise<void>;
    disabled?: boolean;
    className?: string;
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

// Field-specific schemas
const schemas = {
    category: z.string().min(1, 'Category is required'),
    document_type: z.string().optional(),
    proprietary: z.boolean(),
    tldr: z.string().max(500, 'Summary must be less than 500 characters').optional(),
    tags: z.array(z.string()),
};

export default function InlineEditCell({
    file,
    field,
    value,
    onSave,
    disabled = false,
    className,
}: InlineEditCellProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const form = useForm({
        resolver: zodResolver(z.object({ [field]: schemas[field] })),
        defaultValues: {
            [field]: value,
        },
    });

    // Reset form when value changes or editing starts
    useEffect(() => {
        if (isEditing) {
            form.setValue(field, value);
            setError(null);
        }
    }, [isEditing, value, field, form]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (field === 'tldr' && inputRef.current instanceof HTMLTextAreaElement) {
                inputRef.current.select();
            } else if (inputRef.current instanceof HTMLInputElement) {
                inputRef.current.select();
            }
        }
    }, [isEditing, field]);

    const handleSave = async () => {
        const formData = form.getValues();
        const newValue = formData[field];

        // Don't save if value hasn't changed
        if (JSON.stringify(newValue) === JSON.stringify(value)) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await onSave(file.uuid, field, newValue);
            setIsEditing(false);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
            setError(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        form.setValue(field, value);
        setIsEditing(false);
        setError(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.handleSubmit(handleSave)();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    // Tags-specific handlers
    const addTag = (tag: string) => {
        if (!tag.trim()) return;

        const currentTags = (form.getValues('tags') as string[]) || [];
        if (!currentTags.includes(tag.trim())) {
            form.setValue('tags', [...currentTags, tag.trim()]);
        }
    };

    const removeTag = (tagIndex: number) => {
        const currentTags = (form.getValues('tags') as string[]) || [];
        const newTags = currentTags.filter((_, index) => index !== tagIndex);
        form.setValue('tags', newTags);
    };

    // Render different cell types based on field
    const renderDisplayValue = () => {
        switch (field) {
            case 'category':
                return (
                    <Badge
                        variant="outline"
                        className="capitalize cursor-pointer hover:bg-muted/50"
                    >
                        {value ? value.replace('_', ' ') : 'No category'}
                    </Badge>
                );

            case 'document_type':
                return (
                    <span className="text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                        {value || 'No type'}
                    </span>
                );

            case 'proprietary':
                return (
                    <div className="flex items-center cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                        <Checkbox checked={value} className="pointer-events-none" />
                        <span className="ml-2 text-sm">{value ? 'Yes' : 'No'}</span>
                    </div>
                );

            case 'tldr':
                return (
                    <span
                        className="text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded block max-w-[200px] truncate"
                        title={value || 'Click to add summary'}
                    >
                        {value || 'No summary'}
                    </span>
                );

            case 'tags':
                return (
                    <div className="flex flex-wrap gap-1 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                        {value && value.length > 0 ? (
                            value.slice(0, 2).map((tag: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                </Badge>
                            ))
                        ) : (
                            <span className="text-sm text-muted-foreground">No tags</span>
                        )}
                        {value && value.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                                +{value.length - 2}
                            </Badge>
                        )}
                    </div>
                );

            default:
                return <span className="text-sm">{String(value || '')}</span>;
        }
    };

    const renderEditForm = () => {
        switch (field) {
            case 'category':
                return (
                    <FormField
                        control={form.control}
                        name={field}
                        render={({ field: formField }) => (
                            <FormItem>
                                <Select onValueChange={formField.onChange} value={formField.value}>
                                    <FormControl>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {FILE_CATEGORIES.map((category) => (
                                            <SelectItem key={category.value} value={category.value}>
                                                {category.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'document_type':
                return (
                    <FormField
                        control={form.control}
                        name={field}
                        render={({ field: formField }) => (
                            <FormItem>
                                <Select
                                    onValueChange={formField.onChange}
                                    value={formField.value || ''}
                                >
                                    <FormControl>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Select document type" />
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
                );

            case 'proprietary':
                return (
                    <FormField
                        control={form.control}
                        name={field}
                        render={({ field: formField }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={formField.value}
                                        onCheckedChange={formField.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <span className="text-sm">Proprietary Information</span>
                                </div>
                            </FormItem>
                        )}
                    />
                );

            case 'tldr':
                return (
                    <FormField
                        control={form.control}
                        name={field}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormControl>
                                    <Textarea
                                        {...formField}
                                        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                                        placeholder="Brief summary of the file contents"
                                        rows={3}
                                        className="w-[300px] resize-none"
                                        onKeyDown={handleKeyDown}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'tags':
                const currentTags = (form.watch('tags') as string[]) || [];
                return (
                    <div className="w-[250px] space-y-2">
                        <div className="flex flex-wrap gap-1">
                            {currentTags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
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
                        <div className="flex gap-1">
                            <Input
                                ref={inputRef as React.RefObject<HTMLInputElement>}
                                placeholder="Add tag"
                                className="text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const input = e.target as HTMLInputElement;
                                        addTag(input.value);
                                        input.value = '';
                                    } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        handleCancel();
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
                                    ).parentElement?.querySelector('input') as HTMLInputElement;
                                    if (input) {
                                        addTag(input.value);
                                        input.value = '';
                                    }
                                }}
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                        {form.formState.errors.tags && (
                            <p className="text-sm text-red-600">
                                {form.formState.errors.tags.message}
                            </p>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    if (disabled) {
        return <div className={className}>{renderDisplayValue()}</div>;
    }

    return (
        <Popover open={isEditing} onOpenChange={setIsEditing}>
            <PopoverTrigger asChild>
                <div
                    className={`relative group ${className}`}
                    onClick={() => !isEditing && setIsEditing(true)}
                >
                    {renderDisplayValue()}
                    {!isEditing && (
                        <div className="absolute inset-0 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                            <Edit className="h-3 w-3 text-muted-foreground" />
                        </div>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent
                ref={popoverRef}
                className="w-auto p-4"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSave)} className="space-y-3">
                        {renderEditForm()}

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        <div className="flex items-center gap-2">
                            <Button type="submit" size="sm" disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Check className="h-3 w-3 mr-1 animate-pulse" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-3 w-3 mr-1" />
                                        Save
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCancel}
                                disabled={isSaving}
                            >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Form>
            </PopoverContent>
        </Popover>
    );
}
