import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    FileText,
    Tag,
    X,
    Save,
    AlertCircle,
    Calendar,
    Globe,
    Lock,
    ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { LibraryFile } from '@/hooks/useFileManagement';
import { formatDistanceToNow } from 'date-fns';

interface LibraryCategory {
    uuid: string;
    name: string;
    code: string;
    description?: string;
}

interface LibrarySource {
    uuid: string;
    name: string;
    code: string;
    description?: string;
    website?: string;
}

interface DocumentType {
    uuid: string;
    name: string;
    code: string;
    description?: string;
}

interface FileMetadataModalProps {
    file: LibraryFile | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (fileId: string, data: any) => Promise<void>;
    categories: LibraryCategory[];
    sources: LibrarySource[];
    documentTypes: DocumentType[];
    isLoading?: boolean;
}

// Validation schema
const fileMetadataSchema = z.object({
    file_name: z.string().min(1, 'File name is required'),
    categories: z.array(z.string()).optional(),
    source: z.string().optional(),
    document_types: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    tldr: z.string().optional(),
    is_public: z.boolean().optional(),
    src_url: z.string().url().optional().or(z.literal('')),
    src_download_url: z.string().url().optional().or(z.literal('')),
});

type FileMetadataFormData = z.infer<typeof fileMetadataSchema>;

const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('text')) return '📃';
    return '📁';
};

export default function FileMetadataModal({
    file,
    isOpen,
    onClose,
    onSave,
    categories,
    sources,
    documentTypes,
    isLoading = false,
}: FileMetadataModalProps) {
    const [tagInput, setTagInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isDirty },
    } = useForm<FileMetadataFormData>({
        resolver: zodResolver(fileMetadataSchema),
        defaultValues: {
            file_name: '',
            categories: [],
            source: '',
            document_types: [],
            tags: [],
            tldr: '',
            is_public: false,
            src_url: '',
            src_download_url: '',
        },
    });

    const watchedCategories = watch('categories') || [];
    const watchedDocumentTypes = watch('document_types') || [];
    const watchedTags = watch('tags') || [];
    const watchedIsPublic = watch('is_public');

    // Reset form when file changes
    useEffect(() => {
        if (file) {
            reset({
                file_name: file.file_name || '',
                categories: file.categories?.map((c) => c.uuid) || [],
                source: file.source || '',
                document_types: file.document_types?.map((dt) => dt.uuid) || [],
                tags: file.tags || [],
                tldr: file.tldr || '',
                is_public: file.is_public || false,
                src_url: file.src_url || '',
                src_download_url: file.src_download_url || '',
            });
        }
    }, [file, reset]);

    // Handle category selection
    const handleCategoryChange = useCallback(
        (categoryId: string, checked: boolean) => {
            const currentCategories = watchedCategories;
            if (checked) {
                setValue('categories', [...currentCategories, categoryId], { shouldDirty: true });
            } else {
                setValue(
                    'categories',
                    currentCategories.filter((id) => id !== categoryId),
                    { shouldDirty: true },
                );
            }
        },
        [watchedCategories, setValue],
    );

    // Handle document type selection
    const handleDocumentTypeChange = useCallback(
        (typeId: string, checked: boolean) => {
            const currentTypes = watchedDocumentTypes;
            if (checked) {
                setValue('document_types', [...currentTypes, typeId], { shouldDirty: true });
            } else {
                setValue(
                    'document_types',
                    currentTypes.filter((id) => id !== typeId),
                    { shouldDirty: true },
                );
            }
        },
        [watchedDocumentTypes, setValue],
    );

    // Handle tag addition
    const handleAddTag = useCallback(() => {
        if (tagInput.trim() && !watchedTags.includes(tagInput.trim())) {
            setValue('tags', [...watchedTags, tagInput.trim()], { shouldDirty: true });
            setTagInput('');
        }
    }, [tagInput, watchedTags, setValue]);

    // Handle tag removal
    const handleRemoveTag = useCallback(
        (tagToRemove: string) => {
            setValue(
                'tags',
                watchedTags.filter((tag) => tag !== tagToRemove),
                { shouldDirty: true },
            );
        },
        [watchedTags, setValue],
    );

    // Handle form submission
    const handleFormSubmit = useCallback(
        async (data: FileMetadataFormData) => {
            if (!file) return;

            setIsSaving(true);
            try {
                await onSave(file.uuid, {
                    categories: data.categories,
                    source: data.source || null,
                    document_types: data.document_types,
                    tags: data.tags,
                    tldr: data.tldr,
                    is_public: data.is_public,
                    src_url: data.src_url || null,
                    src_download_url: data.src_download_url || null,
                });
                toast.success('File metadata updated successfully');
                onClose();
            } catch (error) {
                console.error('Error updating file metadata:', error);
                toast.error('Failed to update file metadata');
            } finally {
                setIsSaving(false);
            }
        },
        [file, onSave, onClose],
    );

    if (!file) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-2xl">{getFileIcon(file.mime_type || '')}</span>
                        File Metadata
                    </DialogTitle>
                    <DialogDescription>
                        Edit metadata and properties for {file.file_name}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                    <Tabs defaultValue="metadata" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="metadata">Metadata</TabsTrigger>
                            <TabsTrigger value="content">Content</TabsTrigger>
                            <TabsTrigger value="details">Details</TabsTrigger>
                        </TabsList>

                        <TabsContent value="metadata" className="space-y-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Basic Information</h3>

                                <div>
                                    <Label htmlFor="file_name">File Name</Label>
                                    <Input
                                        id="file_name"
                                        {...register('file_name')}
                                        className={errors.file_name ? 'border-red-500' : ''}
                                    />
                                    {errors.file_name && (
                                        <p className="text-sm text-red-500 mt-1">
                                            {errors.file_name.message}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="tldr">Description / TL;DR</Label>
                                    <Textarea
                                        id="tldr"
                                        {...register('tldr')}
                                        placeholder="Brief description of the file content..."
                                        rows={3}
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="is_public"
                                        checked={watchedIsPublic}
                                        onCheckedChange={(checked) =>
                                            setValue('is_public', checked as boolean, {
                                                shouldDirty: true,
                                            })
                                        }
                                    />
                                    <Label htmlFor="is_public" className="flex items-center gap-2">
                                        {watchedIsPublic ? (
                                            <Globe className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <Lock className="h-4 w-4 text-gray-600" />
                                        )}
                                        Make file publicly accessible
                                    </Label>
                                </div>
                            </div>

                            <Separator />

                            {/* Categories */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Categories</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {categories.map((category) => (
                                        <label
                                            key={category.uuid}
                                            className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                        >
                                            <Checkbox
                                                checked={watchedCategories.includes(category.uuid)}
                                                onCheckedChange={(checked) =>
                                                    handleCategoryChange(
                                                        category.uuid,
                                                        checked as boolean,
                                                    )
                                                }
                                            />
                                            <div>
                                                <span className="font-medium">{category.name}</span>
                                                {category.description && (
                                                    <p className="text-xs text-gray-500">
                                                        {category.description}
                                                    </p>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Source */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Source</h3>
                                <Select
                                    value={watch('source') || ''}
                                    onValueChange={(value) =>
                                        setValue('source', value, { shouldDirty: true })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">No source</SelectItem>
                                        {sources.map((source) => (
                                            <SelectItem key={source.uuid} value={source.uuid}>
                                                <div className="flex items-center gap-2">
                                                    <span>{source.name}</span>
                                                    {source.website && (
                                                        <ExternalLink className="h-3 w-3 text-gray-400" />
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator />

                            {/* Document Types */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Document Types</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {documentTypes.map((type) => (
                                        <label
                                            key={type.uuid}
                                            className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                        >
                                            <Checkbox
                                                checked={watchedDocumentTypes.includes(type.uuid)}
                                                onCheckedChange={(checked) =>
                                                    handleDocumentTypeChange(
                                                        type.uuid,
                                                        checked as boolean,
                                                    )
                                                }
                                            />
                                            <div>
                                                <span className="font-medium">{type.name}</span>
                                                {type.description && (
                                                    <p className="text-xs text-gray-500">
                                                        {type.description}
                                                    </p>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Tags */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Tags</h3>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <Input
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            placeholder="Add a tag..."
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddTag();
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleAddTag}
                                            disabled={!tagInput.trim()}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                    {watchedTags.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {watchedTags.map((tag, index) => (
                                                <Badge key={index} variant="secondary">
                                                    <Tag className="h-3 w-3 mr-1" />
                                                    {tag}
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-4 w-4 p-0 ml-1"
                                                        onClick={() => handleRemoveTag(tag)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="content" className="space-y-6">
                            {/* Source URLs */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Source Links</h3>

                                <div>
                                    <Label htmlFor="src_url">Source URL</Label>
                                    <Input
                                        id="src_url"
                                        {...register('src_url')}
                                        placeholder="https://example.com/document"
                                        className={errors.src_url ? 'border-red-500' : ''}
                                    />
                                    {errors.src_url && (
                                        <p className="text-sm text-red-500 mt-1">
                                            {errors.src_url.message}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="src_download_url">Download URL</Label>
                                    <Input
                                        id="src_download_url"
                                        {...register('src_download_url')}
                                        placeholder="https://example.com/download"
                                        className={errors.src_download_url ? 'border-red-500' : ''}
                                    />
                                    {errors.src_download_url && (
                                        <p className="text-sm text-red-500 mt-1">
                                            {errors.src_download_url.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Content Preview */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Content Preview</h3>
                                {file.text ? (
                                    <div className="p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                                        <p className="text-sm whitespace-pre-wrap">
                                            {file.text.substring(0, 1000)}
                                            {file.text.length > 1000 && '...'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
                                        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                        <p className="text-gray-500">No text content extracted</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="details" className="space-y-6">
                            {/* File Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">File Information</h3>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <Label className="text-gray-500">File Size</Label>
                                        <p className="font-medium">
                                            {file.file_size
                                                ? formatFileSize(file.file_size)
                                                : 'Unknown'}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-gray-500">MIME Type</Label>
                                        <p className="font-medium">{file.mime_type || 'Unknown'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-gray-500">Processing Status</Label>
                                        <Badge
                                            variant={
                                                file.processing_status === 'completed'
                                                    ? 'default'
                                                    : file.processing_status === 'failed'
                                                      ? 'destructive'
                                                      : 'secondary'
                                            }
                                        >
                                            {file.processing_status || 'pending'}
                                        </Badge>
                                    </div>
                                    <div>
                                        <Label className="text-gray-500">UUID</Label>
                                        <p className="font-mono text-xs">{file.uuid}</p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Timestamps */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Timestamps</h3>

                                <div className="grid grid-cols-1 gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        <Label className="text-gray-500">Created:</Label>
                                        <span className="font-medium">
                                            {formatDistanceToNow(new Date(file.created_at), {
                                                addSuffix: true,
                                            })}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                            ({new Date(file.created_at).toLocaleString()})
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        <Label className="text-gray-500">Modified:</Label>
                                        <span className="font-medium">
                                            {formatDistanceToNow(new Date(file.updated_at), {
                                                addSuffix: true,
                                            })}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                            ({new Date(file.updated_at).toLocaleString()})
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!isDirty || isSaving}
                            className="min-w-[100px]"
                        >
                            {isSaving ? (
                                <>
                                    <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
