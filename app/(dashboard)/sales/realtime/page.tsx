'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useIdToken } from '@/lib/auth/hooks';
import { apiRequest, buildQueryString } from '@/lib/utils/api';
import { formatCurrency, formatNumber, formatChartDate } from '@/lib/utils/date';
import { KPICard } from '@/components/dashboard/kpi-card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, BarChart } from '@tremor/react';
import { ShoppingBag, Package, TrendingUp, Clock, ArrowLeft, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChartTooltip } from '@/components/ui/chart-tooltip';
import { SalesData } from '@/types/bigquery';

// Animation variants
const motionContainer = {
    hidden: { opacity: 1 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
};

const motionItem = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

interface HourlySales {
    hourly: Array<{
        hour: number;
        total_orders: number;
        total_revenue: number;
    }>;
    peaks: {
        orders: { hour: number; total_orders: number };
        revenue: { hour: number; total_revenue: number };
    };
}

export default function RealtimeSalesPage() {
    const { selectedClientId, selectedWebsiteId } = useDashboard();
    const getIdToken = useIdToken();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [datasetId, setDatasetId] = useState<string | null>(null);

    // Data states
    const [salesData, setSalesData] = useState<SalesData | null>(null);
    const [hourlyData, setHourlyData] = useState<HourlySales | null>(null);
    const [topProducts, setTopProducts] = useState<any[]>([]);

    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const now = new Date();
        return now.toISOString().split('T')[0];
    };

    const today = getTodayDate();

    // Fetch client's BigQuery dataset ID
    useEffect(() => {
        async function fetchClientData() {
            if (!selectedClientId) return;

            try {
                const idToken = await getIdToken();
                const clientResponse = await apiRequest<{ id: string; bigQueryDatasetId: string }>(
                    `/api/admin/clients/${selectedClientId}`,
                    {},
                    idToken || undefined
                );

                if (clientResponse.success && clientResponse.data) {
                    setDatasetId(clientResponse.data.bigQueryDatasetId);
                }
            } catch (err) {
                console.error('Error fetching client data:', err);
            }
        }

        fetchClientData();
    }, [selectedClientId, getIdToken]);

    // Main data fetching function
    const fetchAllData = useCallback(async (isRefresh = false) => {
        if (!selectedClientId || !datasetId) return;

        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const idToken = await getIdToken();
            const websiteFilter = selectedWebsiteId === 'all_combined' ? 'all_combined' : selectedWebsiteId || 'all_combined';

            const commonParams = {
                dataset_id: datasetId,
                client_id: selectedClientId,
                website_id: websiteFilter,
                start_date: today,
                end_date: today,
            };

            // 1. Fetch Sales Overview
            const salesQuery = buildQueryString({
                ...commonParams,
                exclude_sample_orders: 'true',
            });

            const salesPromise = apiRequest<SalesData>(
                `/api/reports/sales-overview${salesQuery}`,
                {},
                idToken || undefined
            );

            // 2. Fetch Hourly Sales
            const hourlyQuery = buildQueryString(commonParams);
            const hourlyPromise = apiRequest<HourlySales>(
                `/api/reports/hourly-sales${hourlyQuery}`,
                {},
                idToken || undefined
            );

            // 3. Fetch Top Products
            const productsParams = new URLSearchParams({
                ...commonParams,
                limit: '5',
                sort_by: 'revenue',
            });

            const productsPromise = fetch(`/api/reports/top-products?${productsParams}`, {
                headers: { Authorization: `Bearer ${idToken}` },
            }).then(res => res.json());

            // Execute all requests in parallel
            const [salesRes, hourlyRes, productsRes] = await Promise.all([
                salesPromise,
                hourlyPromise,
                productsPromise
            ]);

            if (salesRes.success && salesRes.data) setSalesData(salesRes.data);
            if (hourlyRes.success && hourlyRes.data) setHourlyData(hourlyRes.data);
            if (productsRes.success && productsRes.data) setTopProducts(productsRes.data);

            setLastUpdated(new Date());
        } catch (err) {
            console.error('Error fetching realtime data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedClientId, datasetId, selectedWebsiteId, today, getIdToken]);

    // Initial fetch and interval setup
    useEffect(() => {
        if (datasetId) {
            fetchAllData();

            // Refresh every 60 seconds
            const intervalId = setInterval(() => {
                fetchAllData(true);
            }, 60000);

            return () => clearInterval(intervalId);
        }
    }, [datasetId, fetchAllData]);

    if (!selectedClientId) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900">No Client Selected</h3>
                </div>
            </div>
        );
    }

    if (loading && !salesData) {
        return <RealtimeSkeleton />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/sales">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            Realtime Sales
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Live data for today • Last updated: {lastUpdated.toLocaleTimeString()}
                        </p>
                    </div>
                </div>

                {refreshing && (
                    <div className="text-sm text-blue-600 animate-pulse flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Refreshing...
                    </div>
                )}
            </div>

            {salesData && (
                <motion.div variants={motionContainer} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-3 mb-6">
                    <motion.div variants={motionItem} className="h-full">
                        <KPICard
                            label="Today's Revenue"
                            value={formatCurrency(salesData.summary.total_revenue)}
                            change={null} // No comparison for realtime view
                            icon={<ShoppingBag className="h-5 w-5" />}
                        />
                    </motion.div>
                    <motion.div variants={motionItem} className="h-full">
                        <KPICard
                            label="Today's Orders"
                            value={formatNumber(salesData.summary.total_orders)}
                            change={null}
                            icon={<Package className="h-5 w-5" />}
                        />
                    </motion.div>
                    <motion.div variants={motionItem} className="h-full">
                        <KPICard
                            label="Current AOV"
                            value={formatCurrency(salesData.summary.aov)}
                            change={null}
                            icon={<TrendingUp className="h-5 w-5" />}
                        />
                    </motion.div>
                </motion.div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Hourly Chart - Takes up 2 columns */}
                <div className="lg:col-span-2">
                    {hourlyData && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900">Hourly Performance</h3>
                                    <Clock className="h-5 w-5 text-gray-400" />
                                </div>
                                <LineChart
                                    className="h-80"
                                    data={hourlyData.hourly.map(h => ({
                                        hour: `${h.hour}:00`,
                                        Revenue: h.total_revenue,
                                        Orders: h.total_orders,
                                    }))}
                                    index="hour"
                                    categories={['Revenue', 'Orders']}
                                    colors={['emerald', 'indigo']}
                                    valueFormatter={(value) => formatNumber(value)}
                                    yAxisWidth={60}
                                    showAnimation={true}
                                    customTooltip={(props) => (
                                        <ChartTooltip
                                            {...props}
                                            valueFormatter={(value) => formatNumber(value)}
                                        />
                                    )}
                                />
                            </Card>
                        </motion.div>
                    )}
                </div>

                {/* Top Products - Takes up 1 column */}
                <div>
                    {topProducts.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Card className="p-6 h-full">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products Today</h3>
                                <div className="space-y-4">
                                    {topProducts.map((product, index) => (
                                        <div key={index} className="flex items-start justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="text-sm font-medium text-gray-900 truncate" title={product.product_name}>
                                                    {product.product_name}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {formatNumber(product.total_qty)} sold
                                                </p>
                                            </div>
                                            <div className="text-right whitespace-nowrap">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {formatCurrency(product.total_revenue)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}

function RealtimeSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <Skeleton className="h-10 w-64" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-6">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="mt-2 h-8 w-32" />
                    </Card>
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="p-6 lg:col-span-2">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <Skeleton className="h-80 w-full" />
                </Card>
                <Card className="p-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex justify-between">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
