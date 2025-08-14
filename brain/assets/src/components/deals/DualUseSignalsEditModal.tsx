import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

// Types
type DualUseSignal = {
    uuid: string;
    name: string;
    code?: string | null;
    category?: {
        uuid: string;
        name: string;
    };
};

interface DualUseSignalsEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    dealUuid: string;
    currentSignals: DualUseSignal[];
}

export function DualUseSignalsEditModal({
    isOpen,
    onClose,
    dealUuid,
    currentSignals,
}: DualUseSignalsEditModalProps) {
    const queryClient = useQueryClient();
    const [selectedSignalUuids, setSelectedSignalUuids] = useState<string[]>([]);

    // Fetch all available dual-use signals
    const { data: availableSignals = [] } = useQuery<DualUseSignal[]>({
        queryKey: ['dual-use-signals'],
        queryFn: async () => {
            const response = await http.get('/deals/du-signals/');
            const data = response.data;
            return Array.isArray(data) ? data : data.results || [];
        },
        enabled: isOpen,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });

    // Initialize selected signals when modal opens
    useEffect(() => {
        if (isOpen && currentSignals) {
            setSelectedSignalUuids(currentSignals.map((s) => s.uuid));
        }
    }, [currentSignals, isOpen]);

    // Save dual-use signals mutation
    const saveMutation = useMutation({
        mutationFn: async (signalUuids: string[]) => {
            const response = await http.patch(`/deals/deals/${dealUuid}/`, {
                dual_use_signals: signalUuids,
            });
            return response.data;
        },
        onSuccess: (updatedDeal) => {
            queryClient.setQueryData(['deal', dealUuid], updatedDeal);
            queryClient.invalidateQueries({ queryKey: ['deal', dealUuid] });
            queryClient.invalidateQueries({ queryKey: ['deals'] });
            toast.success('Dual-use signals updated successfully');
            onClose();
        },
        onError: (error) => {
            const { formError } = normalizeDrfErrors(error);
            toast.error(formError || 'Failed to update dual-use signals');
        },
    });

    const handleSave = () => {
        saveMutation.mutate(selectedSignalUuids);
    };

    const hasChanges = () => {
        const current = new Set(selectedSignalUuids);
        const original = new Set(currentSignals.map((s) => s.uuid));

        if (current.size !== original.size) return true;

        for (const uuid of current) {
            if (!original.has(uuid)) return true;
        }

        return false;
    };

    // Convert signals to MultiSelect options, grouped by category
    const signalOptions = availableSignals.map((signal) => ({
        label: signal.name + (signal.code ? ` (${signal.code})` : ''),
        value: signal.uuid,
    }));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Edit Dual-Use Signals ({selectedSignalUuids.length})
                    </DialogTitle>
                    <DialogDescription>
                        Select dual-use signals that indicate this company can serve both government
                        and civilian markets.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <MultiSelect
                        options={signalOptions}
                        onValueChange={setSelectedSignalUuids}
                        defaultValue={selectedSignalUuids}
                        placeholder="Select dual-use signals..."
                        variant="secondary"
                        animation={2}
                        maxCount={3}
                        className="w-full"
                    />

                    {/* Category breakdown if we have data */}
                    {selectedSignalUuids.length > 0 && availableSignals.some((s) => s.category) && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium mb-2">Categories:</p>
                            <div className="flex flex-wrap gap-1">
                                {Array.from(
                                    new Set(
                                        selectedSignalUuids
                                            .map(
                                                (uuid) =>
                                                    availableSignals.find((s) => s.uuid === uuid)
                                                        ?.category?.name,
                                            )
                                            .filter(Boolean),
                                    ),
                                ).map((category) => (
                                    <Badge key={category} variant="outline" className="text-xs">
                                        {category}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saveMutation.isPending || !hasChanges()}>
                        {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
