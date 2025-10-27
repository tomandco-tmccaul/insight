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
import { TrendingUp, Search } from 'lucide-react';

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
  const { selectedWebsiteId, dateRange } = useDashboard();
  const getIdToken = useIdToken();
  const [data, setData] = useState<MarketingData | null>(null);
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
  }, [selectedWebsiteId, dateRange, getIdToken]);

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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Total Spend</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(totals.spend)}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Total Revenue</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(totals.revenue)}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Blended ROAS</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {blendedROAS.toFixed(2)}x
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Blended CPA</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(blendedCPA)}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Spend by Channel</h3>
          <div className="mt-4">
            <DonutChart
              className="h-64"
              data={spendByChannel}
              category="value"
              index="name"
              valueFormatter={(value) => formatCurrency(value)}
              colors={['blue', 'cyan', 'indigo', 'violet', 'purple']}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">ROAS by Channel</h3>
          <div className="mt-4">
            <BarChart
              className="h-64"
              data={roasChart}
              index="channel"
              categories={['ROAS']}
              colors={['emerald']}
              valueFormatter={(value) => `${value.toFixed(2)}x`}
              showLegend={false}
            />
          </div>
        </Card>
      </div>

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

