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
import { Search, TrendingUp, Globe, BarChart3, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { ReportAnnotations } from '@/components/dashboard/report-annotations';

interface SEOOverview {
  total_clicks: number;
  total_impressions: number;
  avg_position: number;
  avg_ctr: number;
  total_attributed_revenue: number;
}

interface SEOQuery {
  query: string;
  total_clicks: number;
  total_impressions: number;
  avg_position: number;
  avg_ctr: number;
  attributed_revenue: number;
}

interface SEOPage {
  page: string;
  total_clicks: number;
  total_impressions: number;
  avg_position: number;
  avg_ctr: number;
  attributed_revenue: number;
}

interface PositionDistribution {
  position_range: string;
  total_clicks: number;
  total_impressions: number;
}

interface SEOData {
  overview: SEOOverview;
  topQueries: SEOQuery[];
  topImpressions: SEOQuery[];
  topPages: SEOPage[];
  positionDistribution: PositionDistribution[];
}

export default function SEOInsightsPage() {
  const { selectedWebsiteId, selectedClientId, dateRange } = useDashboard();
  const getIdToken = useIdToken();
  const [data, setData] = useState<SEOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);

  // Fetch client's dataset ID
  useEffect(() => {
    async function fetchClientData() {
      if (!selectedClientId) {
        setDatasetId(null);
        return;
      }

      try {
        const idToken = await getIdToken();

        // Fetch client data
        const clientResponse = await apiRequest<{ id: string; clientName: string; bigQueryDatasetId: string }>(
          `/api/admin/clients/${selectedClientId}`,
          {},
          idToken || undefined
        );

        if (clientResponse.success && clientResponse.data) {
          setDatasetId(clientResponse.data.bigQueryDatasetId);
        } else {
          setError('Failed to fetch client data');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      }
    }

    fetchClientData();
  }, [selectedClientId, getIdToken]);

  useEffect(() => {
    async function fetchData() {
      if (!selectedWebsiteId || !selectedClientId || !datasetId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const idToken = await getIdToken();
        const queryString = buildQueryString({
          websiteId: selectedWebsiteId,
          clientId: selectedClientId,
          dataset_id: datasetId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        });

        const response = await apiRequest<SEOData>(
          `/api/seo-insights${queryString}`,
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
  }, [selectedWebsiteId, selectedClientId, datasetId, dateRange, getIdToken]);

  if (!selectedWebsiteId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Website Selected</h3>
          <p className="mt-2 text-gray-600">Please select a website from the header to view SEO data</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <SEOInsightsSkeleton />;
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

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">No Data Available</h3>
          <p className="mt-2 text-gray-600">No SEO data found for the selected date range</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const positionChartData = data.positionDistribution.map((item) => ({
    position: item.position_range,
    clicks: item.total_clicks,
    impressions: item.total_impressions,
  }));

  const topQueriesChart = data.topQueries.slice(0, 10).map((query) => ({
    query: query.query.length > 30 ? query.query.substring(0, 30) + '...' : query.query,
    clicks: query.total_clicks,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">SEO Insights</h1>
        <p className="mt-2 text-gray-600">
          Google Search Console performance metrics and search query analytics
        </p>
      </div>

      <ReportAnnotations />

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="p-6 h-full flex flex-col">
          <div className="text-sm font-medium text-gray-600">Total Clicks</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 flex-1">
            {formatNumber(data.overview.total_clicks)}
          </div>
        </Card>
        <Card className="p-6 h-full flex flex-col">
          <div className="text-sm font-medium text-gray-600">Total Impressions</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 flex-1">
            {formatNumber(data.overview.total_impressions)}
          </div>
        </Card>
        <Card className="p-6 h-full flex flex-col">
          <div className="text-sm font-medium text-gray-600">Avg Position</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 flex-1">
            {data.overview.avg_position > 0 ? data.overview.avg_position.toFixed(1) : 'N/A'}
          </div>
        </Card>
        <Card className="p-6 h-full flex flex-col">
          <div className="text-sm font-medium text-gray-600">Avg CTR</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 flex-1">
            {(data.overview.avg_ctr * 100).toFixed(2)}%
          </div>
        </Card>
        <Card className="p-6 h-full flex flex-col">
          <div className="text-sm font-medium text-gray-600">Attributed Revenue</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 flex-1">
            {formatCurrency(data.overview.total_attributed_revenue)}
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
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                  className="rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 p-2 shadow-md"
                >
                  <Target className="h-5 w-5 text-white" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900">Position Distribution</h3>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mt-4"
              >
                <BarChart
                  className="h-64"
                  data={positionChartData}
                  index="position"
                  categories={['clicks', 'impressions']}
                  colors={['#3b82f6', '#6366f1']}
                  valueFormatter={(value) => formatNumber(value)}
                  showLegend={true}
                  showAnimation={true}
                  animationDuration={1000}
                  customTooltip={(props) => (
                    <ChartTooltip
                      {...props}
                      valueFormatter={(value) => formatNumber(value)}
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
                <h3 className="text-lg font-semibold text-gray-900">Top Queries by Clicks</h3>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="mt-4"
              >
                <BarChart
                  className="h-64"
                  data={topQueriesChart}
                  index="query"
                  categories={['clicks']}
                  colors={['#10b981']}
                  valueFormatter={(value) => formatNumber(value)}
                  showLegend={false}
                  showAnimation={true}
                  animationDuration={1000}
                  customTooltip={(props) => (
                    <ChartTooltip
                      {...props}
                      valueFormatter={(value) => formatNumber(value)}
                    />
                  )}
                />
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Top Queries Table */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Top Search Queries by Clicks</h3>
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
              <TableHead className="text-right">Attributed Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.topQueries.length > 0 ? (
              data.topQueries.map((query, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{query.query}</TableCell>
                  <TableCell className="text-right">{formatNumber(query.total_clicks)}</TableCell>
                  <TableCell className="text-right">{formatNumber(query.total_impressions)}</TableCell>
                  <TableCell className="text-right">{(query.avg_ctr * 100).toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{query.avg_position.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(query.attributed_revenue)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  No query data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Top Pages Table */}
      {data.topPages.length > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Top Pages by Clicks</h3>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page URL</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Avg Position</TableHead>
                <TableHead className="text-right">Attributed Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topPages.map((page, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium max-w-xs truncate" title={page.page}>
                    {page.page}
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(page.total_clicks)}</TableCell>
                  <TableCell className="text-right">{formatNumber(page.total_impressions)}</TableCell>
                  <TableCell className="text-right">{(page.avg_ctr * 100).toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{page.avg_position.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(page.attributed_revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function SEOInsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
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

