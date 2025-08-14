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
import { 
    FileText, 
    Plus, 
    Trash2, 
    Calendar, 
    DollarSign, 
    Building, 
    ExternalLink 
} from 'lucide-react';
import { formatCompactCurrency, formatStandardDate } from '@/lib/utils/deals';
import type { Grant } from '@/hooks/useCompanyData';

// Validation schemas
const GrantFormSchema = z.object({
    name: z.string().min(1, 'Grant name is required').max(255, 'Name too long'),
    amount_awarded: z.coerce.number().min(0).optional().or(z.literal('')),
    potential_amount: z.coerce.number().min(0).optional().or(z.literal('')),
    program_name: z.string().max(255, 'Program name too long').optional().or(z.literal('')),
    phase: z.string().max(50, 'Phase too long').optional().or(z.literal('')),
    award_date: z.string().optional().or(z.literal('')),
    description: z.string().max(2000, 'Description too long').optional().or(z.literal('')),
    url: z.string().url('Invalid URL').optional().or(z.literal('')),
    branch: z.string().max(100, 'Branch too long').optional().or(z.literal('')),
    solicitation_year: z.coerce.number().min(1900).max(2100).optional().or(z.literal('')),
});

type GrantFormData = z.infer<typeof GrantFormSchema>;

interface GrantsEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyUuid: string;
    grants: Grant[];
}

function GrantCard({ 
    grant, 
    onDelete 
}: { 
    grant: Grant; 
    onDelete: (grantId: string) => void;
}) {
    const amount = grant.amount_awarded || grant.potential_amount;
    const isAwarded = !!grant.amount_awarded;
    
    return (
        <Card className="relative">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span>{grant.name || 'Unnamed Grant'}</span>
                        {amount && (
                            <Badge variant="outline" className={isAwarded ? 'text-green-600 border-green-200' : 'text-blue-600 border-blue-200'}>
                                {formatCompactCurrency(amount)} {isAwarded ? 'Awarded' : 'Potential'}
                            </Badge>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(grant.uuid)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </CardTitle>
                {grant.program_name && (
                    <p className="text-sm text-gray-600 mt-1">{grant.program_name}</p>
                )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                    {grant.phase && (
                        <div className="flex items-center gap-2">
                            <span className="font-medium">Phase:</span>
                            <Badge variant="secondary" className="text-xs">
                                {grant.phase}
                            </Badge>
                        </div>
                    )}
                    
                    {grant.award_date && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span>Awarded: {formatStandardDate(grant.award_date)}</span>
                        </div>
                    )}
                    
                    {grant.solicitation_year && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span>Year: {grant.solicitation_year}</span>
                        </div>
                    )}
                    
                    {grant.branch && (
                        <div className="flex items-center gap-2">
                            <Building className="h-3 w-3 text-gray-400" />
                            <span>{grant.branch}</span>
                        </div>
                    )}
                </div>
                
                {grant.description && (
                    <div className="mt-3">
                        <div className="font-medium mb-1">Description:</div>
                        <p className="text-gray-700 text-xs">
                            {grant.description}
                        </p>
                    </div>
                )}
                
                {grant.url && (
                    <div className="mt-2">
                        <a 
                            href={grant.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                        >
                            <ExternalLink className="h-3 w-3" />
                            View Grant Details
                        </a>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function GrantForm({
    onSubmit,
    isSubmitting,
    onCancel,
}: {
    onSubmit: (data: GrantFormData) => void;
    isSubmitting: boolean;
    onCancel: () => void;
}) {
    const [formData, setFormData] = useState<GrantFormData>({
        name: '',
        amount_awarded: '',
        potential_amount: '',
        program_name: '',
        phase: '',
        award_date: '',
        description: '',
        url: '',
        branch: '',
        solicitation_year: '',
    });
    
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        try {
            const validated = GrantFormSchema.parse(formData);
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

    const handleInputChange = (field: keyof GrantFormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="name">Grant Name *</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter grant name or title"
                    className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
            </div>
            
            <div>
                <Label htmlFor="program_name">Program Name</Label>
                <Input
                    id="program_name"
                    value={formData.program_name}
                    onChange={(e) => handleInputChange('program_name', e.target.value)}
                    placeholder="e.g., SBIR, STTR, NIH, NSF"
                    className={errors.program_name ? 'border-red-500' : ''}
                />
                {errors.program_name && <p className="text-sm text-red-600 mt-1">{errors.program_name}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="amount_awarded">Amount Awarded ($)</Label>
                    <Input
                        id="amount_awarded"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.amount_awarded}
                        onChange={(e) => handleInputChange('amount_awarded', e.target.value)}
                        placeholder="0.00"
                        className={errors.amount_awarded ? 'border-red-500' : ''}
                    />
                    {errors.amount_awarded && <p className="text-sm text-red-600 mt-1">{errors.amount_awarded}</p>}
                </div>
                
                <div>
                    <Label htmlFor="potential_amount">Potential Amount ($)</Label>
                    <Input
                        id="potential_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.potential_amount}
                        onChange={(e) => handleInputChange('potential_amount', e.target.value)}
                        placeholder="0.00"
                        className={errors.potential_amount ? 'border-red-500' : ''}
                    />
                    {errors.potential_amount && <p className="text-sm text-red-600 mt-1">{errors.potential_amount}</p>}
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label htmlFor="phase">Phase</Label>
                    <Input
                        id="phase"
                        value={formData.phase}
                        onChange={(e) => handleInputChange('phase', e.target.value)}
                        placeholder="I, II, III"
                        className={errors.phase ? 'border-red-500' : ''}
                    />
                    {errors.phase && <p className="text-sm text-red-600 mt-1">{errors.phase}</p>}
                </div>
                
                <div>
                    <Label htmlFor="award_date">Award Date</Label>
                    <Input
                        id="award_date"
                        type="date"
                        value={formData.award_date}
                        onChange={(e) => handleInputChange('award_date', e.target.value)}
                        className={errors.award_date ? 'border-red-500' : ''}
                    />
                    {errors.award_date && <p className="text-sm text-red-600 mt-1">{errors.award_date}</p>}
                </div>
                
                <div>
                    <Label htmlFor="solicitation_year">Solicitation Year</Label>
                    <Input
                        id="solicitation_year"
                        type="number"
                        min="1900"
                        max="2100"
                        value={formData.solicitation_year}
                        onChange={(e) => handleInputChange('solicitation_year', e.target.value)}
                        placeholder="2024"
                        className={errors.solicitation_year ? 'border-red-500' : ''}
                    />
                    {errors.solicitation_year && <p className="text-sm text-red-600 mt-1">{errors.solicitation_year}</p>}
                </div>
            </div>
            
            <div>
                <Label htmlFor="branch">Branch/Department</Label>
                <Input
                    id="branch"
                    value={formData.branch}
                    onChange={(e) => handleInputChange('branch', e.target.value)}
                    placeholder="e.g., Army, Navy, Air Force, NIH"
                    className={errors.branch ? 'border-red-500' : ''}
                />
                {errors.branch && <p className="text-sm text-red-600 mt-1">{errors.branch}</p>}
            </div>
            
            <div>
                <Label htmlFor="url">Grant URL</Label>
                <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => handleInputChange('url', e.target.value)}
                    placeholder="https://..."
                    className={errors.url ? 'border-red-500' : ''}
                />
                {errors.url && <p className="text-sm text-red-600 mt-1">{errors.url}</p>}
            </div>
            
            <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter grant description, objectives, or summary..."
                    rows={4}
                    className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
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
                    {isSubmitting ? 'Saving...' : 'Add Grant'}
                </Button>
            </div>
        </form>
    );
}

export function GrantsEditModal({ 
    isOpen, 
    onClose, 
    companyUuid,
    grants 
}: GrantsEditModalProps) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // Calculate total funding
    const totalFunding = grants.reduce((total, grant) => {
        const amount = grant.amount_awarded || grant.potential_amount || 0;
        return total + amount;
    }, 0);

    // Close add form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setShowAddForm(false);
        }
    }, [isOpen]);

    // Add grant mutation
    const addGrantMutation = useMutation({
        mutationFn: async (data: GrantFormData) => {
            // Transform data for API
            const apiData = {
                company: companyUuid,
                name: data.name,
                amount_awarded: data.amount_awarded ? Number(data.amount_awarded) : undefined,
                potential_amount: data.potential_amount ? Number(data.potential_amount) : undefined,
                program_name: data.program_name || undefined,
                phase: data.phase || undefined,
                award_date: data.award_date || undefined,
                description: data.description || undefined,
                url: data.url || undefined,
                branch: data.branch || undefined,
                solicitation_year: data.solicitation_year ? Number(data.solicitation_year) : undefined,
            };

            const response = await http.post('/companies/grants/', apiData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-grants', companyUuid] });
            toast.success('Grant added successfully');
            setShowAddForm(false);
        },
        onError: (error) => {
            const { formError } = normalizeDrfErrors(error);
            toast.error(formError || 'Failed to add grant');
        },
    });

    // Delete grant mutation
    const deleteGrantMutation = useMutation({
        mutationFn: async (grantId: string) => {
            await http.delete(`/companies/grants/${grantId}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-grants', companyUuid] });
            toast.success('Grant removed successfully');
            setDeleteConfirm(null);
        },
        onError: (error) => {
            const { formError } = normalizeDrfErrors(error);
            toast.error(formError || 'Failed to remove grant');
        },
    });

    const handleAddGrant = (data: GrantFormData) => {
        addGrantMutation.mutate(data);
    };

    const handleDeleteGrant = (grantId: string) => {
        setDeleteConfirm(grantId);
    };

    const confirmDelete = () => {
        if (deleteConfirm) {
            deleteGrantMutation.mutate(deleteConfirm);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Edit Grants ({grants.length})
                            {totalFunding > 0 && (
                                <Badge variant="outline" className="ml-2 text-green-600 border-green-200">
                                    {formatCompactCurrency(totalFunding)} total
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Manage government grants and funding for this company.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-6">
                        {/* Existing Grants */}
                        {grants.length > 0 && (
                            <div>
                                <h3 className="font-medium mb-3">Current Grants</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {grants.map((grant) => (
                                        <GrantCard
                                            key={grant.uuid}
                                            grant={grant}
                                            onDelete={handleDeleteGrant}
                                        />
                                    ))}
                                </div>
                                
                                {totalFunding > 0 && (
                                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-900">Total Grant Funding:</span>
                                            <span className="font-bold text-green-600 text-xl">
                                                {formatCompactCurrency(totalFunding)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Add New Grant */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-medium">Add New Grant</h3>
                                {!showAddForm && (
                                    <Button
                                        onClick={() => setShowAddForm(true)}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Grant
                                    </Button>
                                )}
                            </div>

                            {showAddForm && (
                                <Card>
                                    <CardContent className="pt-6">
                                        <GrantForm
                                            onSubmit={handleAddGrant}
                                            isSubmitting={addGrantMutation.isPending}
                                            onCancel={() => setShowAddForm(false)}
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {grants.length === 0 && !showAddForm && (
                                <div className="text-center py-8 text-gray-500">
                                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p className="mb-4">No grants added yet</p>
                                    <Button
                                        onClick={() => setShowAddForm(true)}
                                        variant="outline"
                                        className="gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add First Grant
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
                        <AlertDialogTitle>Remove Grant</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this grant? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteGrantMutation.isPending}
                        >
                            {deleteGrantMutation.isPending ? 'Removing...' : 'Remove'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}