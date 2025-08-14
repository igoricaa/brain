import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useDebouncedCallback } from 'use-debounce';
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
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, X, Plus, Building2, Search } from 'lucide-react';

// Types
type Industry = {
    uuid: string;
    name: string;
};

type Deal = {
    uuid: string;
    industries?: Industry[];
};

interface IndustriesEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    deal: Deal;
}

export function IndustriesEditModal({ 
    isOpen, 
    onClose, 
    deal 
}: IndustriesEditModalProps) {
    const [selectedIndustries, setSelectedIndustries] = useState<Industry[]>(deal.industries || []);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
    const [newIndustryName, setNewIndustryName] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);

    const queryClient = useQueryClient();

    // Debounced search handler
    const debouncedSetSearch = useDebouncedCallback((value: string) => {
        setDebouncedSearchValue(value);
    }, 300);

    // Handle search input change
    const handleSearchChange = (value: string) => {
        setSearchValue(value);
        debouncedSetSearch(value);
    };

    // Reset selected industries when deal changes
    useEffect(() => {
        setSelectedIndustries(deal.industries || []);
    }, [deal.industries]);

    // Fetch available industries for search
    const { data: availableIndustries = [], isLoading: industriesLoading } = useQuery({
        queryKey: ['industries', debouncedSearchValue],
        queryFn: async (): Promise<Industry[]> => {
            const params = new URLSearchParams({
                page_size: '50',
                ...(debouncedSearchValue && { q: debouncedSearchValue }), // Use 'q' parameter as per API settings
            });
            const response = await http.get(`/companies/industries/?${params.toString()}`);
            const data = response.data;
            return Array.isArray(data) ? data : data.results || [];
        },
        enabled: isOpen,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Update deal industries mutation
    const updateIndustriesMutation = useMutation({
        mutationFn: async (industries: string[]) => {
            const response = await http.patch(`/deals/deals/${deal.uuid}/`, {
                industries: industries,
            });
            return response.data;
        },
        onSuccess: (updatedDeal) => {
            queryClient.setQueryData(['deal', deal.uuid], updatedDeal);
            queryClient.invalidateQueries({ queryKey: ['deal', deal.uuid] });
            toast.success('Industries updated successfully');
        },
        onError: (error) => {
            const { formError } = normalizeDrfErrors(error);
            toast.error(formError || 'Failed to update industries');
        },
    });

    // Create new industry mutation
    const createIndustryMutation = useMutation({
        mutationFn: async (name: string): Promise<Industry> => {
            const response = await http.post('/companies/industries/', { name });
            return response.data;
        },
        onSuccess: (newIndustry) => {
            queryClient.invalidateQueries({ queryKey: ['industries'] });
            setSelectedIndustries(prev => [...prev, newIndustry]);
            setNewIndustryName('');
            setShowCreateForm(false);
            toast.success('New industry created and added');
        },
        onError: (error) => {
            const { formError } = normalizeDrfErrors(error);
            toast.error(formError || 'Failed to create industry');
        },
    });

    const handleToggleIndustry = (industry: Industry) => {
        setSelectedIndustries(prev => {
            const exists = prev.find(i => i.uuid === industry.uuid);
            if (exists) {
                return prev.filter(i => i.uuid !== industry.uuid);
            } else {
                return [...prev, industry];
            }
        });
    };

    const handleRemoveIndustry = (industryUuid: string) => {
        setSelectedIndustries(prev => prev.filter(i => i.uuid !== industryUuid));
    };

    const handleSave = () => {
        const industryUuids = selectedIndustries.map(i => i.uuid);
        updateIndustriesMutation.mutate(industryUuids);
    };

    const handleCreateIndustry = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIndustryName.trim()) return;
        createIndustryMutation.mutate(newIndustryName.trim());
    };

    const filteredIndustries = availableIndustries.filter(industry => 
        !selectedIndustries.find(selected => selected.uuid === industry.uuid)
    );

    const hasChanges = () => {
        const current = new Set(selectedIndustries.map(i => i.uuid));
        const original = new Set((deal.industries || []).map(i => i.uuid));
        
        if (current.size !== original.size) return true;
        
        for (const uuid of current) {
            if (!original.has(uuid)) return true;
        }
        
        return false;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Edit Industries ({selectedIndustries.length})
                    </DialogTitle>
                    <DialogDescription>
                        Select industries that describe this company's focus areas and business activities.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6">
                    {/* Selected Industries */}
                    <div>
                        <Label className="text-base font-medium mb-3 block">
                            Selected Industries ({selectedIndustries.length})
                        </Label>
                        
                        {selectedIndustries.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {selectedIndustries.map((industry) => (
                                    <Badge 
                                        key={industry.uuid} 
                                        variant="secondary" 
                                        className="text-sm py-1 px-3 flex items-center gap-2"
                                    >
                                        {industry.name}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveIndustry(industry.uuid)}
                                            className="h-4 w-4 p-0 hover:bg-transparent"
                                        >
                                            <X className="h-3 w-3 text-gray-500 hover:text-red-600" />
                                        </Button>
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No industries selected</p>
                            </div>
                        )}
                    </div>

                    {/* Add Industries */}
                    <div>
                        <Label className="text-base font-medium mb-3 block">
                            Add Industries
                        </Label>
                        
                        <div className="space-y-4">
                            {/* Industry Search/Select */}
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        placeholder="Search industries..."
                                        value={searchValue}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                
                                {searchValue && (
                                    <div className="border rounded-lg max-h-48 overflow-y-auto bg-white">
                                        {filteredIndustries.length > 0 ? (
                                            <div className="p-1">
                                                {filteredIndustries.slice(0, 10).map((industry: Industry) => (
                                                    <button
                                                        key={industry.uuid}
                                                        onClick={() => {
                                                            handleToggleIndustry(industry);
                                                            setSearchValue('');
                                                        }}
                                                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-gray-50 rounded text-sm"
                                                    >
                                                        <Check
                                                            className={`h-4 w-4 ${
                                                                selectedIndustries.find(i => i.uuid === industry.uuid)
                                                                    ? "opacity-100 text-green-600"
                                                                    : "opacity-0"
                                                            }`}
                                                        />
                                                        {industry.name}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 text-sm text-gray-500 text-center">
                                                <p>No industries found for "{searchValue}"</p>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setNewIndustryName(searchValue);
                                                        setShowCreateForm(true);
                                                        setSearchValue('');
                                                    }}
                                                    className="mt-2 text-blue-600 hover:text-blue-700"
                                                >
                                                    Create "{searchValue}"
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Create New Industry Form */}
                            {showCreateForm && (
                                <div className="border rounded-lg p-4 bg-gray-50">
                                    <h4 className="font-medium mb-3">Create New Industry</h4>
                                    <form onSubmit={handleCreateIndustry} className="space-y-3">
                                        <div>
                                            <Label htmlFor="new-industry">Industry Name</Label>
                                            <Input
                                                id="new-industry"
                                                value={newIndustryName}
                                                onChange={(e) => setNewIndustryName(e.target.value)}
                                                placeholder="Enter industry name"
                                                required
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setShowCreateForm(false);
                                                    setNewIndustryName('');
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={createIndustryMutation.isPending || !newIndustryName.trim()}
                                            >
                                                {createIndustryMutation.isPending ? 'Creating...' : 'Create & Add'}
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Create Industry Button */}
                            {!showCreateForm && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCreateForm(true)}
                                    className="gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Create New Industry
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                    <div className="text-sm text-gray-500">
                        {hasChanges() && 'You have unsaved changes'}
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={onClose}
                            disabled={updateIndustriesMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSave}
                            disabled={updateIndustriesMutation.isPending || !hasChanges()}
                            className="min-w-[100px]"
                        >
                            {updateIndustriesMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}