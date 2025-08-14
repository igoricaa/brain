import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { http, normalizeDrfErrors } from '@/lib/http';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { User, Plus, Trash2, Calendar, Mail, ExternalLink, Briefcase } from 'lucide-react';
import type { Founder } from '@/hooks/useCompanyData';

// Validation schemas
const FounderFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    title: z.string().max(255, 'Title too long').optional().or(z.literal('')),
    linkedin_url: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
    bio: z.string().max(2000, 'Bio too long').optional().or(z.literal('')),
    age_at_founding: z.coerce.number().min(0).max(150).optional().or(z.literal('')),
    past_significant_employments: z.string().max(2000, 'Past employment too long').optional().or(z.literal('')),
});

type FounderFormData = z.infer<typeof FounderFormSchema>;

interface FoundersEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyUuid: string;
    founders: Founder[];
}

const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString();
    } catch {
        return dateStr || '';
    }
};

function FounderCard({ 
    founder, 
    onDelete 
}: { 
    founder: Founder; 
    onDelete: (founderId: string) => void;
}) {
    const founderData = founder?.founder || {};
    
    return (
        <Card className="relative">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>{founderData.name || 'Unnamed Founder'}</span>
                        {founder.title && (
                            <Badge variant="secondary" className="text-xs">
                                {founder.title}
                            </Badge>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(founder.uuid)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                {founderData.email && (
                    <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <a 
                            href={`mailto:${founderData.email}`}
                            className="text-blue-600 hover:underline"
                        >
                            {founderData.email}
                        </a>
                    </div>
                )}
                
                {founder.age_at_founding && (
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>Age at founding: {founder.age_at_founding}</span>
                    </div>
                )}
                
                {founderData.linkedin_url && (
                    <div className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3 text-gray-400" />
                        <a 
                            href={founderData.linkedin_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            LinkedIn
                        </a>
                    </div>
                )}
                
                {founder.past_significant_employments && (
                    <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span className="font-medium">Past Experience:</span>
                        </div>
                        <p className="text-gray-700 text-xs whitespace-pre-line ml-5">
                            {founder.past_significant_employments}
                        </p>
                    </div>
                )}
                
                {founderData.bio && (
                    <div className="mt-2">
                        <div className="font-medium mb-1">Bio:</div>
                        <p className="text-gray-700 text-xs">
                            {founderData.bio}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function FounderForm({
    onSubmit,
    isSubmitting,
    onCancel,
}: {
    onSubmit: (data: FounderFormData) => void;
    isSubmitting: boolean;
    onCancel: () => void;
}) {
    const [formData, setFormData] = useState<FounderFormData>({
        name: '',
        email: '',
        title: '',
        linkedin_url: '',
        bio: '',
        age_at_founding: '',
        past_significant_employments: '',
    });
    
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        try {
            const validated = FounderFormSchema.parse(formData);
            onSubmit(validated);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const fieldErrors: Record<string, string> = {};
                error.errors.forEach((err: z.ZodIssue) => {
                    if (err.path.length > 0) {
                        fieldErrors[err.path[0] as string] = err.message;
                    }
                });
                setErrors(fieldErrors);
            }
        }
    };

    const handleInputChange = (field: keyof FounderFormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter founder name"
                        className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                </div>
                
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter email address"
                        className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                </div>
                
                <div>
                    <Label htmlFor="title">Title/Role</Label>
                    <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="e.g., CEO, CTO, Co-founder"
                        className={errors.title ? 'border-red-500' : ''}
                    />
                    {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
                </div>
                
                <div>
                    <Label htmlFor="age_at_founding">Age at Founding</Label>
                    <Input
                        id="age_at_founding"
                        type="number"
                        min="0"
                        max="150"
                        value={formData.age_at_founding}
                        onChange={(e) => handleInputChange('age_at_founding', e.target.value)}
                        placeholder="Enter age"
                        className={errors.age_at_founding ? 'border-red-500' : ''}
                    />
                    {errors.age_at_founding && <p className="text-sm text-red-600 mt-1">{errors.age_at_founding}</p>}
                </div>
            </div>
            
            <div>
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                    id="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className={errors.linkedin_url ? 'border-red-500' : ''}
                />
                {errors.linkedin_url && <p className="text-sm text-red-600 mt-1">{errors.linkedin_url}</p>}
            </div>
            
            <div>
                <Label htmlFor="past_significant_employments">Past Employment</Label>
                <Textarea
                    id="past_significant_employments"
                    value={formData.past_significant_employments}
                    onChange={(e) => handleInputChange('past_significant_employments', e.target.value)}
                    placeholder="List previous significant roles and companies..."
                    rows={3}
                    className={errors.past_significant_employments ? 'border-red-500' : ''}
                />
                {errors.past_significant_employments && <p className="text-sm text-red-600 mt-1">{errors.past_significant_employments}</p>}
            </div>
            
            <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Enter founder bio..."
                    rows={4}
                    className={errors.bio ? 'border-red-500' : ''}
                />
                {errors.bio && <p className="text-sm text-red-600 mt-1">{errors.bio}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="min-w-[100px]"
                >
                    {isSubmitting ? 'Saving...' : 'Add Founder'}
                </Button>
            </div>
        </form>
    );
}

export function FoundersEditModal({ 
    isOpen, 
    onClose, 
    companyUuid,
    founders 
}: FoundersEditModalProps) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // Close add form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setShowAddForm(false);
        }
    }, [isOpen]);

    // Add founder mutation
    const addFounderMutation = useMutation({
        mutationFn: async (data: FounderFormData) => {
            // Transform data for API
            const apiData = {
                company: companyUuid,
                founder: {
                    name: data.name,
                    email: data.email || undefined,
                    bio: data.bio || undefined,
                    linkedin_url: data.linkedin_url || undefined,
                },
                title: data.title || undefined,
                age_at_founding: data.age_at_founding ? Number(data.age_at_founding) : undefined,
                past_significant_employments: data.past_significant_employments || undefined,
            };

            const response = await http.post('/companies/founders/', apiData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-founders', companyUuid] });
            toast.success('Founder added successfully');
            setShowAddForm(false);
        },
        onError: (error) => {
            const { formError } = normalizeDrfErrors(error);
            toast.error(formError || 'Failed to add founder');
        },
    });

    // Delete founder mutation
    const deleteFounderMutation = useMutation({
        mutationFn: async (founderId: string) => {
            await http.delete(`/companies/founders/${founderId}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-founders', companyUuid] });
            toast.success('Founder removed successfully');
            setDeleteConfirm(null);
        },
        onError: (error) => {
            const { formError } = normalizeDrfErrors(error);
            toast.error(formError || 'Failed to remove founder');
        },
    });

    const handleAddFounder = (data: FounderFormData) => {
        addFounderMutation.mutate(data);
    };

    const handleDeleteFounder = (founderId: string) => {
        setDeleteConfirm(founderId);
    };

    const confirmDelete = () => {
        if (deleteConfirm) {
            deleteFounderMutation.mutate(deleteConfirm);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Edit Founders ({founders.length})
                        </DialogTitle>
                        <DialogDescription>
                            Manage the founders and key personnel for this company.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-6">
                        {/* Existing Founders */}
                        {founders.length > 0 && (
                            <div>
                                <h3 className="font-medium mb-3">Current Founders</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {founders.map((founder) => (
                                        <FounderCard
                                            key={founder.uuid}
                                            founder={founder}
                                            onDelete={handleDeleteFounder}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add New Founder */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-medium">Add New Founder</h3>
                                {!showAddForm && (
                                    <Button
                                        onClick={() => setShowAddForm(true)}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Founder
                                    </Button>
                                )}
                            </div>

                            {showAddForm && (
                                <Card>
                                    <CardContent className="pt-6">
                                        <FounderForm
                                            onSubmit={handleAddFounder}
                                            isSubmitting={addFounderMutation.isPending}
                                            onCancel={() => setShowAddForm(false)}
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {founders.length === 0 && !showAddForm && (
                                <div className="text-center py-8 text-gray-500">
                                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p className="mb-4">No founders added yet</p>
                                    <Button
                                        onClick={() => setShowAddForm(true)}
                                        variant="outline"
                                        className="gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add First Founder
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation dialog */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Founder</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this founder? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteFounderMutation.isPending}
                        >
                            {deleteFounderMutation.isPending ? 'Removing...' : 'Remove'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}