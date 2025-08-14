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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, Plus, Trash2, ExternalLink } from 'lucide-react';
import { getNames, getCode } from 'country-list';

// Simplified Advisor type for editing
interface Advisor {
    uuid: string;
    advisor?: {
        uuid: string;
        name: string;
        bio?: string | null;
        linkedin_url?: string | null;
        website?: string | null;
        country?: string | null;
        location?: string | null;
    };
    created_at?: string;
    updated_at?: string;
}

// Validation schemas
const AdvisorFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
    country: z.string().length(2, 'Country is required'), // ISO 2-letter code
    bio: z.string().max(2000, 'Bio too long').optional().or(z.literal('')),
    linkedin_url: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
    website: z.string().url('Invalid website URL').optional().or(z.literal('')),
    location: z.string().max(255, 'Location too long').optional().or(z.literal('')),
});

type AdvisorFormData = z.infer<typeof AdvisorFormSchema>;

interface AdvisorsEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyUuid: string;
    advisors: Advisor[];
}

function AdvisorCard({
    advisor,
    onDelete,
}: {
    advisor: Advisor;
    onDelete: (advisorId: string) => void;
}) {
    const advisorData = advisor?.advisor || {};

    return (
        <Card className="relative">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-gray-500" />
                        <span>{advisorData.name || 'Unnamed Advisor'}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(advisor.uuid)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                {advisorData.location && (
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Location:</span>
                        <span className="text-gray-700">{advisorData.location}</span>
                    </div>
                )}

                {advisorData.bio && (
                    <div>
                        <div className="font-medium text-gray-900 mb-1">Bio:</div>
                        <p className="text-gray-700 text-sm leading-relaxed">{advisorData.bio}</p>
                    </div>
                )}

                <div className="flex gap-2 pt-2">
                    {advisorData.linkedin_url && (
                        <Button variant="outline" size="sm" asChild>
                            <a
                                href={advisorData.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                            >
                                <ExternalLink className="h-3 w-3" />
                                LinkedIn
                            </a>
                        </Button>
                    )}
                    {advisorData.website && (
                        <Button variant="outline" size="sm" asChild>
                            <a
                                href={advisorData.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                            >
                                <ExternalLink className="h-3 w-3" />
                                Website
                            </a>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function AdvisorForm({
    onSubmit,
    isSubmitting,
    onCancel,
}: {
    onSubmit: (data: AdvisorFormData) => void;
    isSubmitting: boolean;
    onCancel: () => void;
}) {
    const [formData, setFormData] = useState<AdvisorFormData>({
        name: '',
        country: '',
        bio: '',
        linkedin_url: '',
        website: '',
        location: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        try {
            const validated = AdvisorFormSchema.parse(formData);
            onSubmit(validated);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const fieldErrors: Record<string, string> = {};
                error.issues.forEach((err) => {
                    if (err.path.length > 0) {
                        fieldErrors[err.path[0] as string] = err.message;
                    }
                });
                setErrors(fieldErrors);
            } else {
                console.error('Validation error:', error);
                toast.error('Validation failed');
            }
        }
    };

    const handleInputChange = (field: keyof AdvisorFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
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
                        placeholder="Enter advisor name"
                        className={errors.name ? 'border-1 border-red-500' : ''}
                    />
                    {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div>
                    <Label htmlFor="country">Country *</Label>
                    <Select
                        value={formData.country}
                        onValueChange={(value) => handleInputChange('country', value)}
                    >
                        <SelectTrigger className={errors.country ? 'border-1 border-red-500' : ''}>
                            <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {getNames()
                                .sort()
                                .map((countryName) => {
                                    const code = getCode(countryName);
                                    return code ? (
                                        <SelectItem key={code} value={code}>
                                            {countryName}
                                        </SelectItem>
                                    ) : null;
                                })}
                        </SelectContent>
                    </Select>
                    {errors.country && (
                        <p className="text-sm text-red-600 mt-1">{errors.country}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="e.g., San Francisco, CA"
                        className={errors.location ? 'border-1 border-red-500' : ''}
                    />
                    {errors.location && (
                        <p className="text-sm text-red-600 mt-1">{errors.location}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                    <Input
                        id="linkedin_url"
                        type="url"
                        value={formData.linkedin_url}
                        onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className={errors.linkedin_url ? 'border-1 border-red-500' : ''}
                    />
                    {errors.linkedin_url && (
                        <p className="text-sm text-red-600 mt-1">{errors.linkedin_url}</p>
                    )}
                </div>
            </div>

            <div>
                <Label htmlFor="website">Website</Label>
                <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://..."
                    className={errors.website ? 'border-1 border-red-500' : ''}
                />
                {errors.website && <p className="text-sm text-red-600 mt-1">{errors.website}</p>}
            </div>

            <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Brief professional background and expertise..."
                    rows={3}
                    className={errors.bio ? 'border-1 border-red-500' : ''}
                />
                {errors.bio && <p className="text-sm text-red-600 mt-1">{errors.bio}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Adding...' : 'Add Advisor'}
                </Button>
            </div>
        </form>
    );
}

export function AdvisorsEditModal({
    isOpen,
    onClose,
    companyUuid,
    advisors,
}: AdvisorsEditModalProps) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const queryClient = useQueryClient();

    // Close add form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setShowAddForm(false);
        }
    }, [isOpen]);

    // Add advisor mutation
    const addAdvisorMutation = useMutation({
        mutationFn: async (data: AdvisorFormData) => {
            // Transform data for API - fields at root level per API schema
            const apiData = {
                company: companyUuid,
                name: data.name,
                country: data.country, // Required field
                bio: data.bio || undefined,
                linkedin_url: data.linkedin_url || undefined,
                website: data.website || undefined,
                location: data.location || undefined,
            };

            const response = await http.post('/companies/advisors/', apiData);
            return response.data;
        },
        onSuccess: () => {
            // Force complete cache clear and refetch
            queryClient.removeQueries({ queryKey: ['company-advisors', companyUuid] });
            queryClient.invalidateQueries({ queryKey: ['company-advisors', companyUuid] });
            queryClient.refetchQueries({ queryKey: ['company-advisors', companyUuid] });
            toast.success('Advisor added successfully');
            setShowAddForm(false);
        },
        onError: (error) => {
            const { formError } = normalizeDrfErrors(error);
            toast.error(formError || 'Failed to add advisor');
        },
    });

    // Delete advisor mutation
    const deleteAdvisorMutation = useMutation({
        mutationFn: async (advisorId: string) => {
            await http.delete(`/companies/advisors/${advisorId}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-advisors', companyUuid] });
            toast.success('Advisor removed successfully');
            setDeleteConfirm(null);
        },
        onError: (error) => {
            const { formError } = normalizeDrfErrors(error);
            toast.error(formError || 'Failed to remove advisor');
        },
    });

    const handleAddAdvisor = (data: AdvisorFormData) => {
        addAdvisorMutation.mutate(data);
    };

    const handleDeleteAdvisor = (advisorId: string) => {
        setDeleteConfirm(advisorId);
    };

    const confirmDelete = () => {
        if (deleteConfirm) {
            deleteAdvisorMutation.mutate(deleteConfirm);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5" />
                            Manage Advisors ({advisors.length})
                        </DialogTitle>
                        <DialogDescription>
                            Add or remove company advisors and their information.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-6">
                        {/* Current Advisors */}
                        {advisors.length > 0 && (
                            <div>
                                <h3 className="font-medium mb-4">
                                    Current Advisors ({advisors.length})
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {advisors.map((advisor) => (
                                        <AdvisorCard
                                            key={advisor.uuid}
                                            advisor={advisor}
                                            onDelete={handleDeleteAdvisor}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add New Advisor */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-medium">Add New Advisor</h3>
                                {!showAddForm && (
                                    <Button
                                        onClick={() => setShowAddForm(true)}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Advisor
                                    </Button>
                                )}
                            </div>

                            {showAddForm && (
                                <Card>
                                    <CardContent className="pt-6">
                                        <AdvisorForm
                                            onSubmit={handleAddAdvisor}
                                            isSubmitting={addAdvisorMutation.isPending}
                                            onCancel={() => setShowAddForm(false)}
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {advisors.length === 0 && !showAddForm && (
                                <div className="text-center py-8 text-gray-500">
                                    <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p className="mb-4">No advisors added yet</p>
                                    <Button
                                        onClick={() => setShowAddForm(true)}
                                        variant="outline"
                                        className="gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add First Advisor
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Advisor</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this advisor? This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={deleteAdvisorMutation.isPending}
                        >
                            {deleteAdvisorMutation.isPending ? 'Removing...' : 'Remove'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
