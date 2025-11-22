'use client';

import { useState, useEffect } from 'react';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useIdToken } from '@/lib/auth/hooks';
import { apiRequest } from '@/lib/utils/api';
import { Target } from '@/types/firestore';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { TargetForm } from '@/components/targets/target-form';
import { formatCurrency, formatNumber } from '@/lib/utils/date';
import { Badge } from '@/components/ui/badge';

export default function TargetsManagePage() {
    const { selectedClientId } = useDashboard();
    const getIdToken = useIdToken();
    const [targets, setTargets] = useState<Target[]>([]);
    const [websites, setWebsites] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingTarget, setEditingTarget] = useState<Target | null>(null);
    const [deletingTarget, setDeletingTarget] = useState<Target | null>(null);

    // Fetch websites for the form
    useEffect(() => {
        async function fetchWebsites() {
            if (!selectedClientId) return;
            try {
                const idToken = await getIdToken();
                const response = await apiRequest<{ id: string; websiteName: string }[]>(
                    `/api/admin/clients/${selectedClientId}/websites`,
                    {},
                    idToken || undefined
                );
                if (response.success && response.data) {
                    setWebsites(response.data.map(w => ({ id: w.id, name: w.websiteName })));
                }
            } catch (error) {
                console.error('Error fetching websites:', error);
            }
        }
        fetchWebsites();
    }, [selectedClientId, getIdToken]);

    // Fetch targets
    const fetchTargets = async () => {
        if (!selectedClientId) return;
        setLoading(true);
        try {
            const idToken = await getIdToken();
            const response = await apiRequest<Target[]>(
                `/api/admin/clients/${selectedClientId}/targets`,
                {},
                idToken || undefined
            );
            if (response.success && response.data) {
                setTargets(response.data);
            }
        } catch (error) {
            console.error('Error fetching targets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTargets();
    }, [selectedClientId, getIdToken]);

    const handleCreate = async (data: any) => {
        if (!selectedClientId) return;
        try {
            const idToken = await getIdToken();
            await apiRequest(
                `/api/admin/clients/${selectedClientId}/targets`,
                {
                    method: 'POST',
                    body: JSON.stringify(data),
                },
                idToken || undefined
            );
            setIsCreateOpen(false);
            fetchTargets();
        } catch (error) {
            console.error('Error creating target:', error);
        }
    };

    const handleUpdate = async (data: any) => {
        if (!selectedClientId || !editingTarget) return;
        try {
            const idToken = await getIdToken();
            await apiRequest(
                `/api/admin/clients/${selectedClientId}/targets/${editingTarget.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(data),
                },
                idToken || undefined
            );
            setEditingTarget(null);
            fetchTargets();
        } catch (error) {
            console.error('Error updating target:', error);
        }
    };

    const handleDelete = async () => {
        if (!selectedClientId || !deletingTarget) return;
        try {
            const idToken = await getIdToken();
            await apiRequest(
                `/api/admin/clients/${selectedClientId}/targets/${deletingTarget.id}`,
                {
                    method: 'DELETE',
                },
                idToken || undefined
            );
            setDeletingTarget(null);
            fetchTargets();
        } catch (error) {
            console.error('Error deleting target:', error);
        }
    };

    if (!selectedClientId) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900">No Client Selected</h3>
                    <p className="mt-2 text-gray-600">Please select a client to manage targets</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <PageHeader
                    title="Manage Targets"
                    description="Set and manage performance targets for your websites"
                />
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Target
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Create New Target</DialogTitle>
                            <DialogDescription>
                                Set a new performance target. Choose the metric, period, and value.
                            </DialogDescription>
                        </DialogHeader>
                        <TargetForm
                            websites={websites}
                            onSubmit={handleCreate}
                            onCancel={() => setIsCreateOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : targets.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-gray-100 p-3 mb-4">
                            <Plus className="h-6 w-6 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No targets yet</h3>
                        <p className="mt-1 text-sm text-gray-500 max-w-sm">
                            Get started by creating your first target to track performance against your goals.
                        </p>
                        <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                            Create Target
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Period Name</TableHead>
                                <TableHead>Metric</TableHead>
                                <TableHead>Website</TableHead>
                                <TableHead>Dates</TableHead>
                                <TableHead className="text-right">Target Value</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {targets
                                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                                .map((target) => (
                                    <TableRow key={target.id}>
                                        <TableCell className="font-medium">
                                            {target.periodName || target.granularity}
                                        </TableCell>
                                        <TableCell className="capitalize">{target.metric}</TableCell>
                                        <TableCell>
                                            {target.websiteId === 'all_combined'
                                                ? 'All Websites'
                                                : websites.find((w) => w.id === target.websiteId)?.name || target.websiteId}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {target.startDate} — {target.endDate}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {target.metric === 'revenue' || target.metric === 'cpa'
                                                ? formatCurrency(target.value)
                                                : formatNumber(target.value)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setEditingTarget(target)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => setDeletingTarget(target)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Edit Dialog */}
            <Dialog open={!!editingTarget} onOpenChange={(open) => !open && setEditingTarget(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Target</DialogTitle>
                        <DialogDescription>
                            Update the target details.
                        </DialogDescription>
                    </DialogHeader>
                    {editingTarget && (
                        <TargetForm
                            initialData={editingTarget}
                            websites={websites}
                            onSubmit={handleUpdate}
                            onCancel={() => setEditingTarget(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Alert */}
            <AlertDialog open={!!deletingTarget} onOpenChange={(open) => !open && setDeletingTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the target.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
