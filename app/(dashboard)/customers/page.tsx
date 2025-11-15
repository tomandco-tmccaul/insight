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
import { DonutChart, BarChart } from '@tremor/react';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useIdToken } from '@/lib/auth/hooks';
import { apiRequest, buildQueryString } from '@/lib/utils/api';
import { formatNumber, formatCurrency } from '@/lib/utils/date';
import { ChartTooltip } from '@/components/ui/chart-tooltip';
import { Users, UserPlus, UserCheck, Activity, PieChart, BarChart3, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { ReportAnnotations } from '@/components/dashboard/report-annotations';
import { PageHeader } from '@/components/dashboard/page-header';

interface CustomerInsightsData {
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  userMetrics: {
    totalUsers: number;
    newUsers: number;
    returningUsers: number;
    newUserPercentage: number;
    returningUserPercentage: number;
  };
  demographics: {
    byLocation: Array<{
      country: string;
      users: number;
      sessions: number;
      revenue: number;
      percentage: number;
    }>;
    byDevice: Array<{
      deviceCategory: string;
      users: number;
      sessions: number;
      revenue: number;
      percentage: number;
    }>;
  };
  engagement: {
    averageSessionDuration: number;
    screenPageViewsPerSession: number;
    engagementRate: number;
    bounceRate: number;
  };
}

export default function CustomersPage() {
  const { selectedClientId, selectedWebsiteId, dateRange } = useDashboard();
  const getIdToken = useIdToken();
  const [data, setData] = useState<CustomerInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Note: The Customers API currently doesn't filter by website as it uses GA4 data
  // which may not have website-level filtering. The API will need to be updated separately
  // to filter by GA4 property_id if the tables support it.
  useEffect(() => {
    async function fetchData() {
      if (!selectedWebsiteId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const idToken = await getIdToken();
        // Pass selectedWebsiteId - the API should eventually filter by GA4 property_id
        const queryString = buildQueryString({
          websiteId: selectedWebsiteId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        });

        const response = await apiRequest<CustomerInsightsData>(
          `/api/customers/insights${queryString}`,
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
  }, [selectedWebsiteId, dateRange, getIdToken]);

  if (!selectedWebsiteId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Website Selected</h3>
          <p className="mt-2 text-gray-600">Please select a website from the header to view data</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <CustomerInsightsSkeleton />;
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
          <p className="mt-2 text-gray-600">No customer data found for the selected date range</p>
        </div>
      </div>
    );
  }

  // Format session duration
  const avgDurationMinutes = Math.floor(data.engagement.averageSessionDuration / 60);
  const avgDurationSeconds = Math.floor(data.engagement.averageSessionDuration % 60);

  // Prepare charts data
  const newVsReturningChart = [
    { name: 'New Users', value: data.userMetrics.newUsers },
    { name: 'Returning Users', value: data.userMetrics.returningUsers },
  ];

  const deviceChart = data.demographics.byDevice.map((device) => ({
    name: device.deviceCategory.charAt(0).toUpperCase() + device.deviceCategory.slice(1),
    Users: device.users,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Insights"
        description="Analyze customer behavior, demographics, and engagement"
      />

      <ReportAnnotations />

      {/* Active Users Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 flex-1">
            <div className="rounded-lg bg-blue-100 p-3">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Daily Active Users</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(data.activeUsers.daily)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 flex-1">
            <div className="rounded-lg bg-emerald-100 p-3">
              <Activity className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Weekly Active Users</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(data.activeUsers.weekly)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 flex-1">
            <div className="rounded-lg bg-purple-100 p-3">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Monthly Active Users</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(data.activeUsers.monthly)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 flex-1">
            <div className="rounded-lg bg-orange-100 p-3">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Total Users</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(data.userMetrics.totalUsers)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* New vs Returning Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid gap-6 lg:grid-cols-2"
      >
        <motion.div whileHover={{ scale: 1.01 }} className="group">
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-emerald-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                  className="rounded-lg bg-gradient-to-br from-blue-400 to-emerald-500 p-2 shadow-md"
                >
                  <PieChart className="h-5 w-5 text-white" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900">New vs Returning Users</h3>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mt-4"
              >
                <DonutChart
                  className="h-64"
                  data={newVsReturningChart}
                  category="value"
                  index="name"
                  valueFormatter={(value) => formatNumber(value)}
                  colors={['#6366f1', '#8b5cf6', '#d946ef', '#10b981', '#f59e0b', '#06b6d4']}
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
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600">New Users</div>
                  <div className="text-xl font-bold text-blue-600">
                    {data.userMetrics.newUserPercentage.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600">Returning Users</div>
                  <div className="text-xl font-bold text-emerald-600">
                    {data.userMetrics.returningUserPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Engagement Metrics</h3>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm font-medium text-gray-600">Avg Session Duration</span>
              <span className="text-lg font-bold text-gray-900">
                {avgDurationMinutes}m {avgDurationSeconds}s
              </span>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm font-medium text-gray-600">Pages per Session</span>
              <span className="text-lg font-bold text-gray-900">
                {data.engagement.screenPageViewsPerSession.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm font-medium text-gray-600">Engagement Rate</span>
              <span className="text-lg font-bold text-gray-900">
                {data.engagement.engagementRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Bounce Rate</span>
              <span className="text-lg font-bold text-gray-900">
                {data.engagement.bounceRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Device Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <motion.div whileHover={{ scale: 1.01 }} className="group">
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                  className="rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 p-2 shadow-md"
                >
                  <Smartphone className="h-5 w-5 text-white" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900">Users by Device</h3>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="mt-4"
              >
                <BarChart
                  className="h-64"
                  data={deviceChart}
                  index="name"
                  categories={['Users']}
                  colors={['#06b6d4']}
                  valueFormatter={(value) => formatNumber(value)}
                  showAnimation={false}
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

      {/* Location Breakdown Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Top Locations</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.demographics.byLocation.map((location, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{location.country}</TableCell>
                <TableCell className="text-right">{formatNumber(location.users)}</TableCell>
                <TableCell className="text-right">{formatNumber(location.sessions)}</TableCell>
                <TableCell className="text-right">{formatCurrency(location.revenue)}</TableCell>
                <TableCell className="text-right">{location.percentage.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Device Breakdown Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Device Performance</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.demographics.byDevice.map((device, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium capitalize">{device.deviceCategory}</TableCell>
                <TableCell className="text-right">{formatNumber(device.users)}</TableCell>
                <TableCell className="text-right">{formatNumber(device.sessions)}</TableCell>
                <TableCell className="text-right">{formatCurrency(device.revenue)}</TableCell>
                <TableCell className="text-right">{device.percentage.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function CustomerInsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-16 w-full" />
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
