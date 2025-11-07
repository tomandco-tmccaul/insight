'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, BarChart, DonutChart, LineChart } from '@tremor/react';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useIdToken } from '@/lib/auth/hooks';
import { apiRequest, buildQueryString } from '@/lib/utils/api';
import { formatCurrency, formatCurrencyNoDecimals, formatNumber, formatPercentage, calculatePercentageChange, formatChartDate } from '@/lib/utils/date';
import { ChartTooltip } from '@/components/ui/chart-tooltip';
import { TrendingUp, TrendingDown, Users, ShoppingBag, Clock, Percent, Package, PieChart, BarChart3, DollarSign } from 'lucide-react';
import { Target } from '@/types/firestore';
import { ReportAnnotations } from '@/components/dashboard/report-annotations';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { motion } from 'framer-motion';

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
    orders_complete?: number;
    orders_pending?: number;
    orders_processing?: number;
    orders_canceled?: number;
    revenue_complete?: number;
    revenue_pending?: number;
  }>;
  summary: {
    total_orders: number;
    total_revenue: number;
    total_items: number;
    unique_customers: number;
    aov: number;
    items_per_order: number;
    subtotal?: number;
    total_tax?: number;
    total_shipping?: number;
    total_discounts?: number;
    orders_complete?: number;
    orders_pending?: number;
    orders_processing?: number;
    orders_canceled?: number;
  };
}

interface CustomerMetrics {
  daily: Array<{
    date: string;
    unique_customers: number;
    registered_customers: number;
    guest_customers: number;
    revenue_per_customer: number;
  }>;
  summary: {
    total_unique_customers: number;
    total_registered_customers: number;
    total_guest_customers: number;
    avg_revenue_per_customer: number;
  };
}

interface HourlySales {
  hourly: Array<{
    hour: number;
    total_orders: number;
    total_revenue: number;
    avg_orders_per_day: number;
    avg_revenue_per_day: number;
  }>;
  peaks: {
    orders: {
      hour: number;
      total_orders: number;
    };
    revenue: {
      hour: number;
      total_revenue: number;
    };
  };
}

export default function SalesPerformancePage() {
  const { selectedClientId, selectedWebsiteId, dateRange, comparisonPeriod } = useDashboard();
  const getIdToken = useIdToken();
  const [data, setData] = useState<SalesData | null>(null);
  const [comparisonData, setComparisonData] = useState<SalesData | null>(null);
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null);
  const [hourlySales, setHourlySales] = useState<HourlySales | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Fetch client's BigQuery dataset ID
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
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      }
    }

    fetchClientData();
  }, [selectedClientId, getIdToken]);

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
          const fetchedStoreId = response.data.storeId;
          console.log('[Sales] Fetched website data:', {
            websiteId: selectedWebsiteId,
            storeId: fetchedStoreId,
            websiteData: response.data,
            allFields: Object.keys(response.data),
          });
          
          if (!fetchedStoreId) {
            console.error('[Sales] Missing storeId for website:', {
              websiteId: selectedWebsiteId,
              websiteName: response.data.websiteName,
              availableFields: Object.keys(response.data),
            });
            setError(`Website "${response.data.websiteName || selectedWebsiteId}" is missing a storeId. Please update it in Admin → Websites.`);
            setStoreId(null);
          } else {
            setStoreId(fetchedStoreId);
          }
        } else {
          setError('Failed to fetch website data');
          setStoreId(null);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      }
    }

    fetchWebsiteData();
  }, [selectedClientId, selectedWebsiteId, getIdToken]);

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
        const websiteFilter = selectedWebsiteId === 'all_combined' || !storeId
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
  }, [selectedClientId, datasetId, selectedWebsiteId, storeId, dateRange, getIdToken]);

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
        const websiteFilter = selectedWebsiteId === 'all_combined' || !storeId
          ? 'all_combined'
          : storeId;

        // Debug logging
        console.log('[Sales] Website filter:', {
          selectedWebsiteId,
          storeId,
          websiteFilter,
        });

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
  }, [selectedClientId, selectedWebsiteId, dateRange, comparisonPeriod, datasetId, storeId, getIdToken]);

  // Fetch customer metrics
  useEffect(() => {
    async function fetchCustomerMetrics() {
      if (!selectedClientId || !datasetId) return;

      try {
        const idToken = await getIdToken();
        const websiteFilter = selectedWebsiteId === 'all_combined' || !storeId
          ? 'all_combined'
          : storeId;

        const queryString = buildQueryString({
          dataset_id: datasetId,
          website_id: websiteFilter,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
        });

        const response = await apiRequest<CustomerMetrics>(
          `/api/reports/customer-metrics${queryString}`,
          {},
          idToken || undefined
        );

        if (response.success && response.data) {
          setCustomerMetrics(response.data);
        }
      } catch (err: any) {
        console.error('Error fetching customer metrics:', err);
      }
    }

    fetchCustomerMetrics();
  }, [selectedClientId, datasetId, selectedWebsiteId, storeId, dateRange, getIdToken]);

  // Fetch hourly sales
  useEffect(() => {
    async function fetchHourlySales() {
      if (!selectedClientId || !datasetId) return;

      try {
        const idToken = await getIdToken();
        const websiteFilter = selectedWebsiteId === 'all_combined' || !storeId
          ? 'all_combined'
          : storeId;

        const queryString = buildQueryString({
          dataset_id: datasetId,
          website_id: websiteFilter,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
        });

        const response = await apiRequest<HourlySales>(
          `/api/reports/hourly-sales${queryString}`,
          {},
          idToken || undefined
        );

        if (response.success && response.data) {
          setHourlySales(response.data);
        }
      } catch (err: any) {
        console.error('Error fetching hourly sales:', err);
      }
    }

    fetchHourlySales();
  }, [selectedClientId, datasetId, selectedWebsiteId, storeId, dateRange, getIdToken]);

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

  // Show error if storeId is missing for a specific website
  if (error && selectedWebsiteId && selectedWebsiteId !== 'all_combined' && !storeId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold text-red-600">Configuration Error</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <p className="mt-4 text-sm text-gray-500">
            The selected website is missing required configuration. Please go to <strong>Admin → Websites</strong> and ensure the <strong>storeId</strong> field is set.
          </p>
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

  // Prepare chart data with comparison values
  // Sort daily data by date ascending (oldest to newest) for proper graph display
  const sortedDaily = [...data.daily].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const chartData = sortedDaily.map((row) => {
    const comparisonRow = comparisonData?.daily.find((d) => d.date === row.date);
    return {
      date: formatChartDate(row.date),
      Revenue: row.total_revenue,
      Orders: row.total_orders,
      // Include comparison data for tooltip
      _comparisonRevenue: comparisonRow?.total_revenue ?? null,
      _comparisonOrders: comparisonRow?.total_orders ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sales Performance</h1>
        <p className="mt-2 text-gray-600">
          Detailed sales analysis from Adobe Commerce
        </p>
      </div>

      <ReportAnnotations />


      {/* Primary KPI Cards */}
      <motion.div variants={motionContainer} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={motionItem} className="h-full">
          <KPICard
            label="Total Revenue"
            value={formatCurrency(data.summary.total_revenue)}
            change={revenueChange}
            icon={<ShoppingBag className="h-5 w-5" />}
          />
        </motion.div>
        <motion.div variants={motionItem} className="h-full">
          <KPICard
            label="Orders"
            value={formatNumber(data.summary.total_orders)}
            change={ordersChange}
            icon={<Package className="h-5 w-5" />}
          />
        </motion.div>
        <motion.div variants={motionItem} className="h-full">
          <KPICard
            label="AOV"
            value={formatCurrency(data.summary.aov)}
            change={aovChange}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </motion.div>
        <motion.div variants={motionItem} className="h-full">
          <KPICard
            label="Customers"
            value={formatNumber(data.summary.unique_customers)}
            change={customersChange}
            icon={<Users className="h-5 w-5" />}
          />
        </motion.div>
      </motion.div>

      {/* Secondary Metrics */}
      <motion.div variants={motionContainer} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={motionItem} className="h-full">
          <Card className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between flex-1">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Items per Order</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.summary.items_per_order.toFixed(2)}
              </p>
              {/* Spacer to maintain consistent height */}
              <p className="text-xs text-transparent mt-1">placeholder</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-2">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>
        </motion.div>

        {data.summary.total_discounts !== undefined && (
          <motion.div variants={motionItem} className="h-full">
          <Card className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between flex-1">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Total Discounts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.summary.total_discounts)}
                </p>
                {data.summary.total_revenue > 0 ? (
                  <p className="text-xs text-gray-500 mt-1">
                    {formatPercentage((data.summary.total_discounts / data.summary.total_revenue) * 100)} of revenue
                  </p>
                ) : (
                  <p className="text-xs text-transparent mt-1">placeholder</p>
                )}
              </div>
              <div className="rounded-lg bg-orange-100 p-2">
                <Percent className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </Card>
          </motion.div>
        )}

        {data.summary.total_shipping !== undefined && (
          <motion.div variants={motionItem} className="h-full">
          <Card className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between flex-1">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Shipping Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.summary.total_shipping)}
                </p>
                {/* Spacer to maintain consistent height */}
                <p className="text-xs text-transparent mt-1">placeholder</p>
              </div>
              <div className="rounded-lg bg-purple-100 p-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </Card>
          </motion.div>
        )}

        {data.summary.total_tax !== undefined && (
          <motion.div variants={motionItem} className="h-full">
          <Card className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between flex-1">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Tax Collected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.summary.total_tax)}
                </p>
                {/* Spacer to maintain consistent height */}
                <p className="text-xs text-transparent mt-1">placeholder</p>
              </div>
              <div className="rounded-lg bg-green-100 p-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </Card>
          </motion.div>
        )}
      </motion.div>

      {/* Charts */}
      <motion.div
        variants={motionContainer}
        initial="hidden"
        animate="show"
        className="grid gap-6 lg:grid-cols-2"
      >
        <motion.div variants={motionItem} whileHover={{ scale: 1.01 }} className="group">
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
                  <TrendingUp className="h-5 w-5 text-white" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mt-4"
              >
                <AreaChart
                  className="h-64"
                  data={chartData}
                  index="date"
                  categories={['Revenue']}
                  colors={['#10b981']}
                  valueFormatter={(value) => formatCurrencyNoDecimals(value)}
                  allowDecimals={false}
                  yAxisWidth={80}
                  rotateLabelX={{ angle: 0 }}
                  showLegend={false}
                  showAnimation={true}
                  animationDuration={1000}
                  customTooltip={(props) => (
                    <ChartTooltip
                      {...props}
                      valueFormatter={(value) => formatCurrencyNoDecimals(value)}
                      comparisonKey="_comparisonRevenue"
                      comparisonLabel={comparisonPeriod === 'previous_year' ? 'Same period last year' : 'Previous period'}
                    />
                  )}
                />
              </motion.div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={motionItem} whileHover={{ scale: 1.01 }} className="group">
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
                  <ShoppingBag className="h-5 w-5 text-white" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900">Orders Trend</h3>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="mt-4"
              >
                <BarChart
                  className="h-64"
                  data={chartData}
                  index="date"
                  categories={['Orders']}
                  colors={['#8b5cf6']}
                  valueFormatter={(value) => formatNumber(value)}
                  showLegend={false}
                  showAnimation={false}
                  customTooltip={(props) => (
                    <ChartTooltip
                      {...props}
                      valueFormatter={(value) => formatNumber(value)}
                      comparisonKey="_comparisonOrders"
                      comparisonLabel={comparisonPeriod === 'previous_year' ? 'Same period last year' : 'Previous period'}
                    />
                  )}
                />
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Order Status & Revenue Breakdown */}
      <motion.div
        variants={motionContainer}
        initial="hidden"
        animate="show"
        className="grid gap-6 lg:grid-cols-2"
      >
        {/* Order Status Breakdown */}
        {data.summary.orders_complete !== undefined && (
          <motion.div variants={motionItem} whileHover={{ scale: 1.01 }} className="group">
            <Card className="p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                    className="rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 p-2 shadow-md"
                  >
                    <PieChart className="h-5 w-5 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-gray-900">Order Status Breakdown</h3>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <DonutChart
                    className="h-64"
                    data={[
                      { name: 'Complete', value: data.summary.orders_complete || 0 },
                      { name: 'Processing', value: data.summary.orders_processing || 0 },
                      { name: 'Pending', value: data.summary.orders_pending || 0 },
                      { name: 'Canceled', value: data.summary.orders_canceled || 0 },
                    ].filter(item => item.value > 0)}
                    category="value"
                    index="name"
                    colors={['#10b981', '#06b6d4', '#f59e0b', '#f43f5e', '#6366f1', '#8b5cf6', '#d946ef', '#a855f7']}
                    valueFormatter={(value) => formatNumber(value)}
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
              <div>
                <p className="text-sm text-gray-600">Complete</p>
                <p className="text-lg font-semibold text-emerald-600">
                  {formatNumber(data.summary.orders_complete || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatNumber(data.summary.orders_processing || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-lg font-semibold text-amber-600">
                  {formatNumber(data.summary.orders_pending || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Canceled</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatNumber(data.summary.orders_canceled || 0)}
                </p>
              </div>
            </div>
            </div>
          </Card>
          </motion.div>
        )}

        {/* Revenue Breakdown */}
        {data.summary.subtotal !== undefined && (
          <motion.div variants={motionItem} whileHover={{ scale: 1.01 }} className="group">
            <Card className="p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                    className="rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 p-2 shadow-md"
                  >
                    <DollarSign className="h-5 w-5 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-gray-900">Revenue Breakdown</h3>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                >
                  <DonutChart
                    className="h-64"
                    data={[
                      { name: 'Subtotal', value: data.summary.subtotal || 0 },
                      { name: 'Shipping', value: data.summary.total_shipping || 0 },
                      { name: 'Tax', value: data.summary.total_tax || 0 },
                      { name: 'Discounts', value: -(data.summary.total_discounts || 0) },
                    ].filter(item => Math.abs(item.value) > 0)}
                    category="value"
                    index="name"
                    colors={['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#d946ef', '#a855f7', '#ec4899']}
                    valueFormatter={(value) => formatCurrency(Math.abs(value))}
                    showAnimation={true}
                    animationDuration={1000}
                    customTooltip={(props) => (
                      <ChartTooltip
                        {...props}
                        valueFormatter={(value) => formatCurrency(Math.abs(value))}
                      />
                    )}
                  />
                </motion.div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(data.summary.subtotal || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">+ Shipping</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(data.summary.total_shipping || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">+ Tax</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(data.summary.total_tax || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">- Discounts</span>
                <span className="text-sm font-semibold text-orange-600">
                  {formatCurrency(data.summary.total_discounts || 0)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-900">Total Revenue</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(data.summary.total_revenue)}
                </span>
              </div>
            </div>
            </div>
          </Card>
          </motion.div>
        )}
      </motion.div>

      {/* Customer Metrics */}
      {customerMetrics && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Customer Types</h3>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Registered</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatNumber(customerMetrics.summary.total_registered_customers)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${(customerMetrics.summary.total_registered_customers / customerMetrics.summary.total_unique_customers) * 100}%`
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Guest</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatNumber(customerMetrics.summary.total_guest_customers)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{
                      width: `${(customerMetrics.summary.total_guest_customers / customerMetrics.summary.total_unique_customers) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Revenue per Customer</h3>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(customerMetrics.summary.avg_revenue_per_customer)}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Average across {formatNumber(customerMetrics.summary.total_unique_customers)} customers
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Customer Ratio</h3>
              <Percent className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Registered</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatPercentage((customerMetrics.summary.total_registered_customers / customerMetrics.summary.total_unique_customers) * 100)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Guest</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPercentage((customerMetrics.summary.total_guest_customers / customerMetrics.summary.total_unique_customers) * 100)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Hourly Performance */}
      {hourlySales && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Hourly Performance</h3>
              <p className="text-sm text-gray-600 mt-1">
                Peak orders: {hourlySales.peaks.orders.hour}:00 ({formatNumber(hourlySales.peaks.orders.total_orders)} orders) •
                Peak revenue: {hourlySales.peaks.revenue.hour}:00 ({formatCurrency(hourlySales.peaks.revenue.total_revenue)})
              </p>
            </div>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <LineChart
            className="h-64"
            data={hourlySales.hourly.map(h => ({
              hour: `${h.hour}:00`,
              Orders: h.total_orders,
              Revenue: h.total_revenue,
            }))}
            index="hour"
            categories={['Orders', 'Revenue']}
            colors={['#6366f1', '#8b5cf6']}
            valueFormatter={(value) => formatNumber(value)}
            yAxisWidth={60}
            customTooltip={(props) => (
              <ChartTooltip
                {...props}
                valueFormatter={(value) => formatNumber(value)}
              />
            )}
          />
        </Card>
      )}

      {/* Revenue vs. Target Chart */}
      {targets.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Revenue vs. Target</h3>
          <div className="mt-4">
            <RevenueVsTargetChart
              data={data}
              targets={targets}
              selectedWebsiteId={selectedWebsiteId}
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
                    <tr key={product.sku} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
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
  icon,
}: {
  label: string;
  value: string;
  change: number | null;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-600">{label}</div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2 flex-1">
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
        colors={['#06b6d4']}
        valueFormatter={(value) => formatCurrency(value)}
        showLegend={false}
        showAnimation={false}
        customTooltip={(props) => (
          <ChartTooltip
            {...props}
            valueFormatter={(value) => formatCurrency(value)}
          />
        )}
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

