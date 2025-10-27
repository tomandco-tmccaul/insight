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
import { DonutChart } from '@tremor/react';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useIdToken } from '@/lib/auth/hooks';
import { apiRequest, buildQueryString } from '@/lib/utils/api';
import { formatNumber } from '@/lib/utils/date';
import { Globe, Users, Eye, Clock } from 'lucide-react';

interface WebsiteData {
  metrics: {
    total_sessions: number;
    total_pageviews: number;
    total_users: number;
    avg_session_duration: number;
    bounce_rate: number;
  };
  topPages: Array<{
    page_path: string;
    total_pageviews: number;
    total_unique_pageviews: number;
    avg_time_on_page: number;
    bounce_rate: number;
  }>;
  trafficSources: Array<{
    traffic_source: string;
    total_sessions: number;
    total_users: number;
    bounce_rate: number;
  }>;
}

export default function WebsitePage() {
  const { selectedWebsiteId, dateRange } = useDashboard();
  const getIdToken = useIdToken();
  const [data, setData] = useState<WebsiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const queryString = buildQueryString({
          websiteId: selectedWebsiteId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        });

        const response = await apiRequest<WebsiteData>(
          `/api/website/behavior${queryString}`,
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
          <Globe className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Website Selected</h3>
          <p className="mt-2 text-gray-600">Please select a website from the header to view data</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <WebsiteSkeleton />;
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
          <p className="mt-2 text-gray-600">No website data found for the selected date range</p>
        </div>
      </div>
    );
  }

  // Format session duration (seconds to minutes)
  const avgDurationMinutes = Math.floor(data.metrics.avg_session_duration / 60);
  const avgDurationSeconds = Math.floor(data.metrics.avg_session_duration % 60);

  // Prepare traffic sources chart
  const trafficSourcesChart = data.trafficSources.map((source) => ({
    name: source.traffic_source,
    value: source.total_sessions,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Website Behaviour</h1>
        <p className="mt-2 text-gray-600">
          Understand how visitors interact with your website
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Total Users</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(data.metrics.total_users)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-3">
              <Globe className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Sessions</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(data.metrics.total_sessions)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-3">
              <Eye className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Pageviews</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(data.metrics.total_pageviews)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-3">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Avg Duration</div>
              <div className="text-2xl font-bold text-gray-900">
                {avgDurationMinutes}m {avgDurationSeconds}s
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Traffic Sources</h3>
          <div className="mt-4">
            <DonutChart
              className="h-64"
              data={trafficSourcesChart}
              category="value"
              index="name"
              valueFormatter={(value) => formatNumber(value)}
              colors={['blue', 'cyan', 'indigo', 'violet', 'purple']}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Key Metrics</h3>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm font-medium text-gray-600">Bounce Rate</span>
              <span className="text-lg font-bold text-gray-900">
                {data.metrics.bounce_rate.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm font-medium text-gray-600">Pages per Session</span>
              <span className="text-lg font-bold text-gray-900">
                {(data.metrics.total_pageviews / data.metrics.total_sessions).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">New vs Returning</span>
              <span className="text-lg font-bold text-gray-900">
                {((data.metrics.total_users / data.metrics.total_sessions) * 100).toFixed(0)}% New
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Pages Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Top Pages</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page Path</TableHead>
              <TableHead className="text-right">Pageviews</TableHead>
              <TableHead className="text-right">Unique Pageviews</TableHead>
              <TableHead className="text-right">Avg Time on Page</TableHead>
              <TableHead className="text-right">Bounce Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.topPages.map((page, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium max-w-md truncate">{page.page_path}</TableCell>
                <TableCell className="text-right">{formatNumber(page.total_pageviews)}</TableCell>
                <TableCell className="text-right">{formatNumber(page.total_unique_pageviews)}</TableCell>
                <TableCell className="text-right">
                  {Math.floor(page.avg_time_on_page / 60)}m {Math.floor(page.avg_time_on_page % 60)}s
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      page.bounce_rate > 70
                        ? 'text-red-600'
                        : page.bounce_rate > 50
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }
                  >
                    {page.bounce_rate.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Traffic Sources Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Traffic Sources</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">Bounce Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.trafficSources.map((source, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{source.traffic_source}</TableCell>
                <TableCell className="text-right">{formatNumber(source.total_sessions)}</TableCell>
                <TableCell className="text-right">{formatNumber(source.total_users)}</TableCell>
                <TableCell className="text-right">{source.bounce_rate.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function WebsiteSkeleton() {
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

