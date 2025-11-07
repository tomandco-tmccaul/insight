'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart, DonutChart } from '@tremor/react';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useIdToken } from '@/lib/auth/hooks';
import { apiRequest, buildQueryString } from '@/lib/utils/api';
import { formatCurrency, formatNumber } from '@/lib/utils/date';
import { ChartTooltip } from '@/components/ui/chart-tooltip';
import { TrendingUp, Search, PieChart, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ReportAnnotations } from '@/components/dashboard/report-annotations';

interface ChannelData {
  channel: string;
  total_spend: number;
  total_revenue: number;
  total_clicks: number;
  total_impressions: number;
  total_conversions: number;
  roas: number;
  cpc: number;
  ctr: number;
  cpa: number;
}

interface SEOData {
  query_text: string;
  total_clicks: number;
  total_impressions: number;
  avg_position: number;
  avg_ctr: number;
}

interface MarketingData {
  channels: ChannelData[];
  seo: SEOData[];
}

export default function MarketingPage() {
  const { selectedClientId, selectedWebsiteId, dateRange } = useDashboard();
  const getIdToken = useIdToken();
  const [data, setData] = useState<MarketingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Fetch website's store ID when selection changes
  useEffect(() => {
    async function fetchWebsiteData() {
      if (!selectedClientId || !selectedWebsiteId || selectedWebsiteId === 'all_combined') {
        setStoreId(null);
        return;
      }

      try {
        const idToken = await getIdToken();
        const response = await apiRequest<{ id: string; websiteName: string; storeId: string }>(
          `/api/admin/clients/${selectedClientId}/websites/${selectedWebsiteId}`,
          {},
          idToken || undefined
        );

        if (response.success && response.data) {
          setStoreId(response.data.storeId);
        } else {
          setError('Failed to fetch website data');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      }
    }

    fetchWebsiteData();
  }, [selectedClientId, selectedWebsiteId, getIdToken]);

  useEffect(() => {
    async function fetchData() {
      if (!selectedWebsiteId) {
        setLoading(false);
        return;
      }

      // Wait for storeId if we have a specific website selected
      if (selectedWebsiteId !== 'all_combined' && !storeId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const idToken = await getIdToken();
        
        // Use storeId if a specific website is selected, otherwise pass 'all_combined'
        const websiteFilter = selectedWebsiteId === 'all_combined' || !storeId
          ? 'all_combined'
          : storeId;

        const queryString = buildQueryString({
          websiteId: websiteFilter,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        });

        const response = await apiRequest<MarketingData>(
          `/api/marketing/performance${queryString}`,
          {},
          idToken || undefined
        );

        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || 'Failed to fetch data');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedWebsiteId, storeId, dateRange, getIdToken]);

  if (!selectedWebsiteId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Website Selected</h3>
          <p className="mt-2 text-gray-600">Please select a website from the header to view data</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <MarketingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600">Error Loading Data</h3>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.channels.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">No Data Available</h3>
          <p className="mt-2 text-gray-600">No marketing data found for the selected date range</p>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totals = data.channels.reduce(
    (acc, channel) => ({
      spend: acc.spend + channel.total_spend,
      revenue: acc.revenue + channel.total_revenue,
      conversions: acc.conversions + channel.total_conversions,
    }),
    { spend: 0, revenue: 0, conversions: 0 }
  );

  const blendedROAS = totals.spend > 0 ? totals.revenue / totals.spend : 0;
  const blendedCPA = totals.conversions > 0 ? totals.spend / totals.conversions : 0;

  // Prepare chart data
  const spendByChannel = data.channels.map((ch) => ({
    name: ch.channel,
    value: ch.total_spend,
  }));

  const roasChart = data.channels.map((ch) => ({
    channel: ch.channel,
    ROAS: ch.roas,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Digital Marketing Breakdown</h1>
        <p className="mt-2 text-gray-600">
          Compare all channels and analyze performance by platform
        </p>
      </div>

      <ReportAnnotations />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6 h-full flex flex-col">
          <div className="text-sm font-medium text-gray-600">Total Spend</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 flex-1">
            {formatCurrency(totals.spend)}
          </div>
        </Card>
        <Card className="p-6 h-full flex flex-col">
          <div className="text-sm font-medium text-gray-600">Total Revenue</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 flex-1">
            {formatCurrency(totals.revenue)}
          </div>
        </Card>
        <Card className="p-6 h-full flex flex-col">
          <div className="text-sm font-medium text-gray-600">Blended ROAS</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 flex-1">
            {blendedROAS.toFixed(2)}x
          </div>
        </Card>
        <Card className="p-6 h-full flex flex-col">
          <div className="text-sm font-medium text-gray-600">Blended CPA</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 flex-1">
            {formatCurrency(blendedCPA)}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid gap-6 lg:grid-cols-2"
      >
        <motion.div whileHover={{ scale: 1.01 }} className="group">
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="rounded-lg bg-gradient-to-br from-purple-400 to-indigo-500 p-2 shadow-md"
                >
                  <PieChart className="h-5 w-5 text-white" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900">Spend by Channel</h3>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mt-4"
              >
                <DonutChart
                  className="h-64"
                  data={spendByChannel}
                  category="value"
                  index="name"
                  valueFormatter={(value) => formatCurrency(value)}
                  colors={['#6366f1', '#8b5cf6', '#d946ef', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#14b8a6']}
                  showAnimation={true}
                  animationDuration={1000}
                  customTooltip={(props) => (
                    <ChartTooltip
                      {...props}
                      valueFormatter={(value) => formatCurrency(value)}
                    />
                  )}
                />
              </motion.div>
            </div>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.01 }} className="group">
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-green-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  animate={{
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                  className="rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 p-2 shadow-md"
                >
                  <BarChart3 className="h-5 w-5 text-white" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900">ROAS by Channel</h3>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="mt-4"
              >
                <BarChart
                  className="h-64"
                  data={roasChart}
                  index="channel"
                  categories={['ROAS']}
                  colors={['#8b5cf6']}
                  valueFormatter={(value) => `${value.toFixed(2)}x`}
                  showLegend={false}
                  showAnimation={false}
                  customTooltip={(props) => (
                    <ChartTooltip
                      {...props}
                      valueFormatter={(value) => `${value.toFixed(2)}x`}
                    />
                  )}
                />
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Channel Performance Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Channel Performance</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead className="text-right">Conversions</TableHead>
              <TableHead className="text-right">CPA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.channels.map((channel) => (
              <TableRow key={channel.channel}>
                <TableCell className="font-medium">{channel.channel}</TableCell>
                <TableCell className="text-right">{formatCurrency(channel.total_spend)}</TableCell>
                <TableCell className="text-right">{formatCurrency(channel.total_revenue)}</TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      channel.roas >= 3
                        ? 'text-green-600 font-semibold'
                        : channel.roas >= 2
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }
                  >
                    {channel.roas.toFixed(2)}x
                  </span>
                </TableCell>
                <TableCell className="text-right">{formatNumber(channel.total_conversions)}</TableCell>
                <TableCell className="text-right">{formatCurrency(channel.cpa)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* SEO Performance */}
      {data.seo.length > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Top Search Queries</h3>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Query</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Avg Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.seo.map((query, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{query.query_text}</TableCell>
                  <TableCell className="text-right">{formatNumber(query.total_clicks)}</TableCell>
                  <TableCell className="text-right">{formatNumber(query.total_impressions)}</TableCell>
                  <TableCell className="text-right">{(query.avg_ctr * 100).toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{query.avg_position.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function MarketingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-8 w-32" />
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-4 h-64 w-full" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-4 h-64 w-full" />
        </Card>
      </div>

      <Card className="p-6">
        <Skeleton className="h-96 w-full" />
      </Card>
    </div>
  );
}

