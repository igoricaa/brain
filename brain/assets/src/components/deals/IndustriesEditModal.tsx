import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { http, normalizeDrfErrors } from '@/lib/http';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { Building2 } from 'lucide-react';

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

export function IndustriesEditModal({ isOpen, onClose, deal }: IndustriesEditModalProps) {
    const [selectedIndustryUuids, setSelectedIndustryUuids] = useState<string[]>(
        deal.industries?.map((i) => i.uuid) || [],
    );

    const queryClient = useQueryClient();

    // Reset selected industries when deal changes
    useEffect(() => {
        setSelectedIndustryUuids(deal.industries?.map((i) => i.uuid) || []);
    }, [deal.industries]);

    // Fetch all available industries
    const { data: availableIndustries = [] } = useQuery({
        queryKey: ['industries'],
        queryFn: async (): Promise<Industry[]> => {
            const response = await http.get('/companies/industries/');
            const data = response.data;
            return Array.isArray(data) ? data : data.results || [];
        },
        enabled: isOpen,
        staleTime: 10 * 60 * 1000, // 10 minutes
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
            queryClient.invalidateQueries({ queryKey: ['deals'] });
            toast.success('Industries updated successfully');
            onClose();
        },
        onError: (error) => {
            const { formError } = normalizeDrfErrors(error);
            toast.error(formError || 'Failed to update industries');
        },
    });

    const handleSave = () => {
        updateIndustriesMutation.mutate(selectedIndustryUuids);
    };

    const hasChanges = () => {
        const current = new Set(selectedIndustryUuids);
        const original = new Set((deal.industries || []).map((i) => i.uuid));

        if (current.size !== original.size) return true;

        for (const uuid of current) {
            if (!original.has(uuid)) return true;
        }

        return false;
    };

    // Convert industries to MultiSelect options
    const industryOptions = availableIndustries.map((industry) => ({
        label: industry.name,
        value: industry.uuid,
    }));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Edit Industries ({selectedIndustryUuids.length})
                    </DialogTitle>
                    <DialogDescription>
                        Select industries that describe this company's focus areas and business
                        activities.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <MultiSelect
                        options={industryOptions}
                        onValueChange={setSelectedIndustryUuids}
                        defaultValue={selectedIndustryUuids}
                        placeholder="Select industries..."
                        variant="secondary"
                        animation={2}
                        maxCount={3}
                        className="w-full"
                    />
                </div>

                <DialogFooter>
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
                    >
                        {updateIndustriesMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
