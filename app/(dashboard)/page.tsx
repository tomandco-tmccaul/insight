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
import { Target, Website } from '@/types/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Helper function to calculate comparison date range
function calculateComparisonDates(
  startDate: string,
  endDate: string,
  comparisonPeriod: 'previous_period' | 'previous_year'
): { startDate: string; endDate: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (comparisonPeriod === 'previous_period') {
    // Go back by the same number of days
    const comparisonEnd = new Date(start);
    comparisonEnd.setDate(comparisonEnd.getDate() - 1);
    const comparisonStart = new Date(comparisonEnd);
    comparisonStart.setDate(comparisonStart.getDate() - daysDiff);

    return {
      startDate: comparisonStart.toISOString().split('T')[0],
      endDate: comparisonEnd.toISOString().split('T')[0],
    };
  } else {
    // Previous year - same dates, one year back
    const comparisonStart = new Date(start);
    comparisonStart.setFullYear(comparisonStart.getFullYear() - 1);
    const comparisonEnd = new Date(end);
    comparisonEnd.setFullYear(comparisonEnd.getFullYear() - 1);

    return {
      startDate: comparisonStart.toISOString().split('T')[0],
      endDate: comparisonEnd.toISOString().split('T')[0],
    };
  }
}

interface SalesData {
  daily: Array<{
    date: string;
    website_id: string;
    total_orders: number;
    total_revenue: number;
    unique_customers: number;
    total_items: number;
    subtotal: number;
    total_tax: number;
    total_shipping: number;
    total_discounts: number;
  }>;
  summary: {
    total_orders: number;
    total_revenue: number;
    total_items: number;
    unique_customers: number;
    aov: number;
    items_per_order: number;
  };
}

export default function OverviewPage() {
  const { selectedClientId, dateRange, comparisonPeriod } = useDashboard();
  const getIdToken = useIdToken();
  const [data, setData] = useState<SalesData | null>(null);
  const [comparisonData, setComparisonData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  // Local state for this page only - independent of global context
  const [websites, setWebsites] = useState<Website[]>([]);
  const [localSelectedWebsiteId, setLocalSelectedWebsiteId] = useState<string>('all_combined');
  const [storeId, setStoreId] = useState<string | null>(null);

  // Fetch client's BigQuery dataset ID and websites
  useEffect(() => {
    async function fetchClientData() {
      if (!selectedClientId) {
        setLoading(false);
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

        // Fetch websites for this client
        const websitesResponse = await apiRequest<Website[]>(
          `/api/admin/clients/${selectedClientId}/websites`,
          {},
          idToken || undefined
        );

        if (websitesResponse.success && websitesResponse.data) {
          setWebsites(websitesResponse.data);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      }
    }

    fetchClientData();
  }, [selectedClientId, getIdToken]);

  // Fetch website's store ID when local selection changes
  useEffect(() => {
    async function fetchWebsiteData() {
      if (!selectedClientId || !localSelectedWebsiteId || localSelectedWebsiteId === 'all_combined') {
        setStoreId(null);
        return;
      }

      try {
        const idToken = await getIdToken();
        const response = await apiRequest<{ id: string; websiteName: string; storeId: string }>(
          `/api/admin/clients/${selectedClientId}/websites/${localSelectedWebsiteId}`,
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
  }, [selectedClientId, localSelectedWebsiteId, getIdToken]);

  // Fetch targets
  useEffect(() => {
    async function fetchTargets() {
      if (!selectedClientId) {
        setTargets([]);
        return;
      }

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
      } catch (err: any) {
        console.error('Error fetching targets:', err);
      }
    }

    fetchTargets();
  }, [selectedClientId, getIdToken]);

  // Fetch top products
  useEffect(() => {
    async function fetchTopProducts() {
      if (!selectedClientId || !datasetId) return;

      try {
        const idToken = await getIdToken();

        // Use storeId if a specific website is selected, otherwise 'all_combined'
        const websiteFilter = localSelectedWebsiteId === 'all_combined' || !storeId
          ? 'all_combined'
          : storeId;

        const params = new URLSearchParams({
          dataset_id: datasetId,
          website_id: websiteFilter,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
          limit: '10',
          sort_by: 'revenue',
        });

        const response = await fetch(`/api/reports/top-products?${params}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const result = await response.json();
        if (result.success && result.data) {
          setTopProducts(result.data);
        }
      } catch (err: unknown) {
        console.error('Error fetching top products:', err);
      }
    }

    fetchTopProducts();
  }, [selectedClientId, datasetId, localSelectedWebsiteId, storeId, dateRange, getIdToken]);

  // Fetch sales data
  useEffect(() => {
    async function fetchData() {
      if (!selectedClientId || !datasetId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const idToken = await getIdToken();

        // Use storeId if a specific website is selected, otherwise 'all_combined'
        const websiteFilter = localSelectedWebsiteId === 'all_combined' || !storeId
          ? 'all_combined'
          : storeId;

        // Build query parameters for current period
        const queryString = buildQueryString({
          dataset_id: datasetId,
          website_id: websiteFilter,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
        });

        const response = await apiRequest<SalesData>(
          `/api/reports/sales-overview${queryString}`,
          {},
          idToken || undefined
        );

        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || 'Failed to fetch data');
        }

        // Fetch comparison data if comparison period is selected
        if (comparisonPeriod !== 'none') {
          const comparisonDates = calculateComparisonDates(
            dateRange.startDate,
            dateRange.endDate,
            comparisonPeriod
          );

          const comparisonQueryString = buildQueryString({
            dataset_id: datasetId,
            website_id: websiteFilter,
            start_date: comparisonDates.startDate,
            end_date: comparisonDates.endDate,
          });

          const comparisonResponse = await apiRequest<SalesData>(
            `/api/reports/sales-overview${comparisonQueryString}`,
            {},
            idToken || undefined
          );

          if (comparisonResponse.success && comparisonResponse.data) {
            setComparisonData(comparisonResponse.data);
          }
        } else {
          setComparisonData(null);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedClientId, localSelectedWebsiteId, dateRange, comparisonPeriod, datasetId, storeId, getIdToken]);

  if (!selectedClientId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">No Client Selected</h3>
          <p className="mt-2 text-gray-600">Please select a client from the header to view data</p>
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

  // Calculate percentage changes
  const revenueChange = comparisonData
    ? calculatePercentageChange(comparisonData.summary.total_revenue, data.summary.total_revenue)
    : null;
  const ordersChange = comparisonData
    ? calculatePercentageChange(comparisonData.summary.total_orders, data.summary.total_orders)
    : null;
  const aovChange = comparisonData
    ? calculatePercentageChange(comparisonData.summary.aov, data.summary.aov)
    : null;
  const customersChange = comparisonData
    ? calculatePercentageChange(comparisonData.summary.unique_customers, data.summary.unique_customers)
    : null;

  // Prepare chart data
  const chartData = data.daily.map((row) => ({
    date: row.date,
    Revenue: row.total_revenue,
    Orders: row.total_orders,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales / Performance Overview</h1>
          <p className="mt-2 text-gray-600">
            Your one-stop-shop for a quick overview of performance
          </p>
        </div>

        {/* Website Filter - Local to this page */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter by Store:</label>
          <Select value={localSelectedWebsiteId} onValueChange={setLocalSelectedWebsiteId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_combined">All Stores Combined</SelectItem>
              {websites.map((website) => (
                <SelectItem key={website.id} value={website.id}>
                  {website.websiteName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Total Revenue"
          value={formatCurrency(data.summary.total_revenue)}
          change={revenueChange}
        />
        <KPICard
          label="Orders"
          value={formatNumber(data.summary.total_orders)}
          change={ordersChange}
        />
        <KPICard
          label="AOV"
          value={formatCurrency(data.summary.aov)}
          change={aovChange}
        />
        <KPICard
          label="Customers"
          value={formatNumber(data.summary.unique_customers)}
          change={customersChange}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
          <div className="mt-4">
            <AreaChart
              className="h-64"
              data={chartData}
              index="date"
              categories={['Revenue']}
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

      {/* Revenue vs. Target Chart */}
      {targets.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Revenue vs. Target</h3>
          <div className="mt-4">
            <RevenueVsTargetChart
              data={data}
              targets={targets}
              selectedWebsiteId={localSelectedWebsiteId}
              dateRange={dateRange}
            />
          </div>
        </Card>
      )}

      {/* Top Products Table */}
      {topProducts.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Top Products by Revenue</h3>
          <div className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-left font-medium text-gray-600">Product</th>
                    <th className="pb-3 text-left font-medium text-gray-600">SKU</th>
                    <th className="pb-3 text-right font-medium text-gray-600">Units Sold</th>
                    <th className="pb-3 text-right font-medium text-gray-600">Revenue</th>
                    <th className="pb-3 text-right font-medium text-gray-600">Avg Price</th>
                    <th className="pb-3 text-right font-medium text-gray-600">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, index) => (
                    <tr key={product.sku} className="border-b border-gray-100">
                      <td className="py-3 text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">#{index + 1}</span>
                          <span className="font-medium">{product.product_name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-600">{product.sku}</td>
                      <td className="py-3 text-right text-gray-900">
                        {formatNumber(product.total_qty_ordered)}
                      </td>
                      <td className="py-3 text-right font-medium text-gray-900">
                        {formatCurrency(product.total_revenue)}
                      </td>
                      <td className="py-3 text-right text-gray-600">
                        {formatCurrency(product.avg_price)}
                      </td>
                      <td className="py-3 text-right text-gray-600">
                        {formatNumber(product.order_count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
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

function RevenueVsTargetChart({
  data,
  targets,
  selectedWebsiteId,
  dateRange,
}: {
  data: SalesData;
  targets: Target[];
  selectedWebsiteId: string | null;
  dateRange: { startDate: string; endDate: string };
}) {
  // Find relevant revenue target
  const revenueTarget = targets.find(
    (t) =>
      t.metric === 'revenue' &&
      (t.websiteId === selectedWebsiteId || t.websiteId === 'all_combined') &&
      new Date(t.startDate) <= new Date(dateRange.endDate)
  );

  if (!revenueTarget) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        No revenue target set for this period
      </div>
    );
  }

  // Calculate actual vs target
  const actualRevenue = data.summary.total_revenue;
  const targetRevenue = revenueTarget.value;
  const percentageOfTarget = (actualRevenue / targetRevenue) * 100;

  const chartData = [
    {
      name: 'Target',
      value: targetRevenue,
    },
    {
      name: 'Actual',
      value: actualRevenue,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Target Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(targetRevenue)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Actual Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(actualRevenue)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Achievement</p>
          <p
            className={`text-2xl font-bold ${
              percentageOfTarget >= 100 ? 'text-green-600' : 'text-orange-600'
            }`}
          >
            {formatPercentage(percentageOfTarget)}
          </p>
        </div>
      </div>
      <BarChart
        className="h-64"
        data={chartData}
        index="name"
        categories={['value']}
        colors={['blue']}
        valueFormatter={(value) => formatCurrency(value)}
        showLegend={false}
      />
    </div>
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

