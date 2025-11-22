'use client';

import { useState, useEffect } from 'react';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useIdToken } from '@/lib/auth/hooks';
import { apiRequest } from '@/lib/utils/api';
import { Target } from '@/types/firestore';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatNumber } from '@/lib/utils/date';
import { Loader2, Target as TargetIcon, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { SalesData } from '@/types/bigquery';

// Helper to calculate progress
const calculateProgress = (actual: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((actual / target) * 100, 100);
};

export default function TargetsPage() {
    const { selectedClientId, dateRange } = useDashboard();
    const getIdToken = useIdToken();
    const [targets, setTargets] = useState<Target[]>([]);
    const [loading, setLoading] = useState(true);
    const [salesData, setSalesData] = useState<SalesData | null>(null);

    // Fetch targets
    useEffect(() => {
        async function fetchData() {
            if (!selectedClientId) return;
            setLoading(true);
            try {
                const idToken = await getIdToken();

                // Fetch targets
                const targetsResponse = await apiRequest<Target[]>(
                    `/api/admin/clients/${selectedClientId}/targets`,
                    {},
                    idToken || undefined
                );

                if (targetsResponse.success && targetsResponse.data) {
                    setTargets(targetsResponse.data);
                }

                // Fetch current sales data to compare
                // We use the dashboard context date range, but ideally we should fetch data matching the target periods.
                // For this overview, let's just fetch the standard dashboard data and try to match.
                // A better approach for a dedicated reporting page is to fetch data specifically for each active target's period.
                // However, that might require multiple API calls.
                // For now, let's just fetch the dashboard data and show targets that overlap with the selected date range.

                const salesResponse = await apiRequest<SalesData>(
                    `/api/sales/overview?clientId=${selectedClientId}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
                    {},
                    idToken || undefined
                );

                if (salesResponse.success && salesResponse.data) {
                    setSalesData(salesResponse.data);
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [selectedClientId, dateRange, getIdToken]);

    if (!selectedClientId) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900">No Client Selected</h3>
                    <p className="mt-2 text-gray-600">Please select a client to view targets</p>
                </div>
            </div>
        );
    }

    // Filter targets that are relevant to the current view (e.g. active now or overlapping with selected date range)
    // For simplicity, let's show all targets sorted by date
    const sortedTargets = [...targets].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <PageHeader
                    title="Targets Performance"
                    description="Track your performance against set targets"
                />
                <Link href="/targets/manage">
                    <Button variant="outline">
                        Manage Targets
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            ) : targets.length === 0 ? (
                <Card className="flex h-64 flex-col items-center justify-center text-center p-6">
                    <div className="rounded-full bg-gray-100 p-3 mb-4">
                        <TargetIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No targets set</h3>
                    <p className="mt-1 text-sm text-gray-500 max-w-sm">
                        Set targets to track your progress and performance goals.
                    </p>
                    <Link href="/targets/manage" className="mt-4">
                        <Button>Set First Target</Button>
                    </Link>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {sortedTargets.map((target) => {
                        // This is a simplified view. 
                        // Ideally we need actual data for the SPECIFIC period of the target.
                        // Since we only fetched data for the global dateRange, we can only accurately show progress
                        // if the target period matches or is within the global dateRange.
                        // Or we would need to fetch data for each target individually (which might be expensive).

                        // For this MVP, let's just display the target details and a placeholder for progress 
                        // unless it matches the current view.

                        const isMatchingPeriod =
                            new Date(target.startDate) >= new Date(dateRange.startDate) &&
                            new Date(target.endDate) <= new Date(dateRange.endDate);

                        // If we have salesData and it matches the period (roughly), we can show something.
                        // But really, this page should probably trigger fetches for active targets.

                        // Let's just show the target card with its definition for now, 
                        // and maybe a "View Report" button that sets the dashboard date range to this target's period?

                        return (
                            <Card key={target.id} className="p-6 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{target.periodName || target.granularity}</h3>
                                        <p className="text-sm text-gray-500 capitalize">{target.metric}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-gray-900">
                                            {target.metric === 'revenue' || target.metric === 'cpa'
                                                ? formatCurrency(target.value)
                                                : formatNumber(target.value)}
                                        </div>
                                        <div className="text-xs text-gray-500">Target</div>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 mb-4">
                                    {target.startDate} — {target.endDate}
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-100">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Website: {target.websiteId === 'all_combined' ? 'All' : target.websiteId}</span>
                                        {/* 
                      Here we could add a button to "Focus Dashboard" on this target 
                      which would redirect to /sales with the date range set to this target's start/end 
                    */}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
