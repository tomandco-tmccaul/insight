'use client';

import { Card } from '@/components/ui/card';
import { formatCurrency, formatNumber, formatChartDate, formatCurrencyNoDecimals } from '@/lib/utils/date';
import { ChartTooltip } from '@/components/ui/chart-tooltip';
import { CustomChartLegend } from '@/components/ui/custom-chart-legend';
import { LineChart } from '@tremor/react';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingCart, TrendingUp, Package } from 'lucide-react';

interface WebsiteSwimlaneProps {
    websiteName: string;
    salesData: {
        summary: {
            total_orders: number;
            total_revenue: number;
            aov: number;
            items_per_order: number;
        };
        daily: Array<{
            date: string;
            total_revenue: number;
            total_orders: number;
        }>;
    } | null;
    loading?: boolean;
    error?: string | null;
}

const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export function WebsiteSwimlane({ websiteName, salesData, loading = false, error }: WebsiteSwimlaneProps) {

    if (loading) {
        return (
            <Card className="p-6 mb-6">
                <div className="h-8 w-48 bg-muted/50 rounded mb-6 animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-40 bg-muted/50 rounded animate-pulse" />
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 bg-muted/50 rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }} className="mb-8">
                <h2 className="text-xl font-semibold mb-4 px-1">{websiteName}</h2>
                <Card className="p-6 glass-card border-destructive/50 bg-destructive/5">
                    <div className="flex h-40 items-center justify-center text-destructive">
                        Error loading data: {error}
                    </div>
                </Card>
            </motion.div>
        );
    }

    if (!salesData) {
        return (
            <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }} className="mb-8">
                <h2 className="text-xl font-semibold mb-4 px-1">{websiteName}</h2>
                <Card className="p-6 glass-card">
                    <div className="flex h-40 items-center justify-center text-muted-foreground">
                        No sales data available for this period
                    </div>
                </Card>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }} className="mb-8">
            <h2 className="text-xl font-semibold mb-4 px-1">{websiteName}</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart Section - 50% */}
                <Card className="p-4 glass-card relative">
                    <div className="absolute top-4 right-4 z-10">
                        <CustomChartLegend
                            categories={['Revenue', 'Orders']}
                            colors={['emerald', 'blue']}
                        />
                    </div>
                    <LineChart
                        className="h-48 text-xs"
                        data={[...salesData.daily].reverse().map(d => ({
                            date: formatChartDate(d.date),
                            Revenue: d.total_revenue,
                            Orders: d.total_orders,
                        }))}
                        index="date"
                        categories={['Revenue', 'Orders']}
                        colors={['emerald', 'blue']}
                        yAxisWidth={84}
                        valueFormatter={(value) => formatCurrencyNoDecimals(value)}
                        showLegend={false}
                        customTooltip={(props) => (
                            <ChartTooltip
                                {...props}
                                valueFormatter={(value) => formatCurrency(value)}
                            />
                        )}
                    />
                </Card>

                {/* Metrics Grid - 50% */}
                <div className="grid grid-cols-4 gap-4">
                    {/* Total Revenue */}
                    <Card className="p-6 group relative overflow-hidden glass-card flex flex-col justify-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 p-2 shadow-md">
                                    <DollarSign className="h-4 w-4 text-white" />
                                </div>
                                <h3 className="font-semibold text-foreground text-sm truncate">Total Revenue</h3>
                            </div>
                            <div className="text-2xl font-bold text-foreground truncate">
                                {formatCurrency(salesData.summary.total_revenue)}
                            </div>
                        </div>
                    </Card>

                    {/* Total Orders */}
                    <Card className="p-6 group relative overflow-hidden glass-card flex flex-col justify-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 p-2 shadow-md">
                                    <ShoppingCart className="h-4 w-4 text-white" />
                                </div>
                                <h3 className="font-semibold text-foreground text-sm truncate">Total Orders</h3>
                            </div>
                            <div className="text-2xl font-bold text-foreground truncate">
                                {formatNumber(salesData.summary.total_orders)}
                            </div>
                        </div>
                    </Card>

                    {/* AOV */}
                    <Card className="p-6 group relative overflow-hidden glass-card flex flex-col justify-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 p-2 shadow-md">
                                    <TrendingUp className="h-4 w-4 text-white" />
                                </div>
                                <h3 className="font-semibold text-foreground text-sm truncate">AOV</h3>
                            </div>
                            <div className="text-2xl font-bold text-foreground truncate">
                                {formatCurrency(salesData.summary.aov)}
                            </div>
                        </div>
                    </Card>

                    {/* Items per Order */}
                    <Card className="p-6 group relative overflow-hidden glass-card flex flex-col justify-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 p-2 shadow-md">
                                    <Package className="h-4 w-4 text-white" />
                                </div>
                                <h3 className="font-semibold text-foreground text-sm truncate">Items/Order</h3>
                            </div>
                            <div className="text-2xl font-bold text-foreground truncate">
                                {formatNumber(salesData.summary.items_per_order, 1)}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </motion.div>
    );
}
