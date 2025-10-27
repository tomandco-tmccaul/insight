'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, BarChart } from '@tremor/react';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useIdToken } from '@/lib/auth/hooks';
import { apiRequest, buildQueryString } from '@/lib/utils/api';
import { formatCurrency, formatNumber, formatPercentage, calculatePercentageChange } from '@/lib/utils/date';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SalesData {
  rows: Array<{
    date: string;
    total_sales: number;
    total_orders: number;
    total_sessions: number;
  }>;
  totals: {
    total_sales: number;
    total_orders: number;
    total_sessions: number;
    total_media_spend: number;
    total_revenue: number;
  };
  metrics: {
    aov: number;
    cvr: number;
    blendedROAS: number;
    cpa: number;
  };
}

export default function OverviewPage() {
  const { selectedWebsiteId, dateRange, comparisonPeriod } = useDashboard();
  const getIdToken = useIdToken();
  const [data, setData] = useState<SalesData | null>(null);
  const [comparisonData, setComparisonData] = useState<SalesData | null>(null);
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
        // Fetch current period data
        const queryString = buildQueryString({
          websiteId: selectedWebsiteId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        });

        const response = await apiRequest<SalesData>(
          `/api/sales/overview${queryString}`,
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
          <h3 className="text-lg font-semibold text-gray-900">No Website Selected</h3>
          <p className="mt-2 text-gray-600">Please select a website from the header to view data</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <OverviewSkeleton />;
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
          <p className="mt-2 text-gray-600">No data found for the selected date range</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = data.rows.map((row) => ({
    date: row.date,
    Sales: row.total_sales,
    Orders: row.total_orders,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sales Overview</h1>
        <p className="mt-2 text-gray-600">
          Track your key performance metrics and sales data
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Total Sales"
          value={formatCurrency(data.totals.total_sales)}
          change={null}
        />
        <KPICard
          label="Orders"
          value={formatNumber(data.totals.total_orders)}
          change={null}
        />
        <KPICard
          label="AOV"
          value={formatCurrency(data.metrics.aov)}
          change={null}
        />
        <KPICard
          label="Conversion Rate"
          value={`${data.metrics.cvr.toFixed(2)}%`}
          change={null}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
          <div className="mt-4">
            <AreaChart
              className="h-64"
              data={chartData}
              index="date"
              categories={['Sales']}
              colors={['blue']}
              valueFormatter={(value) => formatCurrency(value)}
              showLegend={false}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Orders Trend</h3>
          <div className="mt-4">
            <BarChart
              className="h-64"
              data={chartData}
              index="date"
              categories={['Orders']}
              colors={['emerald']}
              valueFormatter={(value) => formatNumber(value)}
              showLegend={false}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: number | null;
}) {
  return (
    <Card className="p-6">
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {change !== null && (
          <div
            className={`flex items-center text-sm font-medium ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change >= 0 ? (
              <TrendingUp className="mr-1 h-4 w-4" />
            ) : (
              <TrendingDown className="mr-1 h-4 w-4" />
            )}
            {formatPercentage(Math.abs(change))}
          </div>
        )}
      </div>
    </Card>
  );
}

function OverviewSkeleton() {
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
    </div>
  );
}

