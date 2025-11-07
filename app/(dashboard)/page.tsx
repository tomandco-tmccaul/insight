'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useIdToken } from '@/lib/auth/hooks';
import { apiRequest, buildQueryString } from '@/lib/utils/api';
import { formatCurrency, formatNumber, formatPercentage, calculatePercentageChange, formatChartDate } from '@/lib/utils/date';
import { ChartTooltip } from '@/components/ui/chart-tooltip';
import {
  ShoppingCart,
  TrendingUp,
  Users,
  MousePointerClick,
  DollarSign,
  Target,
  Package,
  Eye,
  Clock,
  Percent,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, DonutChart } from '@tremor/react';

const container = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

interface SalesData {
  summary: {
    total_orders: number;
    total_revenue: number;
    total_items: number;
    unique_customers: number;
    aov: number;
    items_per_order: number;
  };
  daily: Array<{
    date: string;
    total_revenue: number;
    total_orders: number;
  }>;
}

interface TopProducts {
  sku: string;
  product_name: string;
  total_revenue: number;
  total_qty_ordered: number;
}

interface CustomerMetrics {
  summary: {
    total_unique_customers: number;
    total_registered_customers: number;
    total_guest_customers: number;
    avg_revenue_per_customer: number;
  };
}

interface WebsiteBehavior {
  metrics: {
    total_sessions: number;
    total_pageviews: number;
    total_users: number;
    avg_session_duration: number;
    bounce_rate: number;
  };
}

export default function OverviewPage() {
  const { selectedClientId, selectedWebsiteId, dateRange } = useDashboard();
  const getIdToken = useIdToken();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProducts[]>([]);
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null);
  const [websiteBehavior, setWebsiteBehavior] = useState<WebsiteBehavior | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Fetch client data to get dataset ID
  useEffect(() => {
    async function fetchClientData() {
      if (!selectedClientId) {
        setLoading(false);
        return;
      }

      try {
        const idToken = await getIdToken();
        const clientResponse = await apiRequest<{ id: string; clientName: string; bigQueryDatasetId: string }>(
          `/api/admin/clients/${selectedClientId}`,
          {},
          idToken || undefined
        );

        if (clientResponse.success && clientResponse.data) {
          setDatasetId(clientResponse.data.bigQueryDatasetId);
        } else {
          setError('Failed to fetch client data');
          setLoading(false);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
        setLoading(false);
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
          setStoreId(response.data.storeId);
        }
      } catch (err: any) {
        console.error('Error fetching website data:', err);
      }
    }

    fetchWebsiteData();
  }, [selectedClientId, selectedWebsiteId, getIdToken]);

  // Fetch all overview data
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
        const websiteFilter = selectedWebsiteId === 'all_combined' || !storeId
          ? 'all_combined'
          : storeId;

        const queryParams = buildQueryString({
          dataset_id: datasetId,
          website_id: websiteFilter,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
        });

        // Fetch all data in parallel
        const [salesResponse, productsResponse, customerResponse, websiteResponse] = await Promise.all([
          apiRequest<{ daily: any[]; summary: any }>(
            `/api/reports/sales-overview${queryParams}`,
            {},
            idToken || undefined
          ),
          apiRequest<TopProducts[]>(
            `/api/reports/top-products${queryParams}&limit=5&sort_by=revenue`,
            {},
            idToken || undefined
          ),
          apiRequest<{ daily: any[]; summary: any }>(
            `/api/reports/customer-metrics${queryParams}`,
            {},
            idToken || undefined
          ),
          // Website behavior - may fail if GA4 data not available
          apiRequest<WebsiteBehavior>(
            `/api/website/behavior?websiteId=${websiteFilter}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
            {},
            idToken || undefined
          ).catch(() => ({ success: false, data: null })),
        ]);

        if (salesResponse.success && salesResponse.data) {
          setSalesData({
            summary: salesResponse.data.summary,
            daily: salesResponse.data.daily.map((d: any) => ({
              date: d.date,
              total_revenue: d.total_revenue || 0,
              total_orders: d.total_orders || 0,
            })),
          });
        }

        if (productsResponse.success && productsResponse.data) {
          setTopProducts(productsResponse.data);
        }

        if (customerResponse.success && customerResponse.data) {
          setCustomerMetrics({
            summary: customerResponse.data.summary,
          });
        }

        if (websiteResponse.success && websiteResponse.data) {
          setWebsiteBehavior(websiteResponse.data);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedClientId, selectedWebsiteId, dateRange, datasetId, storeId, getIdToken]);

  if (!selectedClientId) {
    return (
      <ProtectedRoute>
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">No Client Selected</h3>
            <p className="mt-2 text-gray-600">Please select a client to view the overview</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Calculate conversion rate if we have both sales and website data
  const conversionRate = websiteBehavior && salesData && websiteBehavior.metrics.total_sessions > 0
    ? (salesData.summary.total_orders / websiteBehavior.metrics.total_sessions) * 100
    : null;

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
            Overview
          </h1>
          <p className="mt-2 text-gray-600 text-lg">
            High-level performance across all stores and data sources
          </p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </Card>
        )}

        {/* Key Metrics Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-20" />
              </Card>
            ))}
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Revenue */}
            <motion.div variants={item} whileHover={{ scale: 1.02 }}>
              <Card className="p-6 group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-emerald-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 p-2.5 shadow-md"
                    >
                      <DollarSign className="h-5 w-5 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Total Revenue</h3>
                      <p className="text-xs text-gray-500">Adobe Commerce</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {salesData ? formatCurrency(salesData.summary.total_revenue) : '—'}
                  </div>
                  {salesData && salesData.summary.total_orders > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      {formatNumber(salesData.summary.total_orders)} orders
                    </p>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Average Order Value */}
            <motion.div variants={item} whileHover={{ scale: 1.02 }}>
              <Card className="p-6 group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-cyan-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 p-2.5 shadow-md"
                    >
                      <ShoppingCart className="h-5 w-5 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Average Order Value</h3>
                      <p className="text-xs text-gray-500">AOV</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {salesData ? formatCurrency(salesData.summary.aov) : '—'}
                  </div>
                  {salesData && (
                    <p className="text-sm text-gray-600 mt-2">
                      {formatNumber(salesData.summary.items_per_order, 1)} items per order
                    </p>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Total Sessions / Users */}
            <motion.div variants={item} whileHover={{ scale: 1.02 }}>
              <Card className="p-6 group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 p-2.5 shadow-md"
                    >
                      <Eye className="h-5 w-5 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Total Sessions</h3>
                      <p className="text-xs text-gray-500">GA4</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {websiteBehavior ? formatNumber(websiteBehavior.metrics.total_sessions) : '—'}
                  </div>
                  {websiteBehavior && (
                    <p className="text-sm text-gray-600 mt-2">
                      {formatNumber(websiteBehavior.metrics.total_users)} users
                    </p>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Conversion Rate */}
            <motion.div variants={item} whileHover={{ scale: 1.02 }}>
              <Card className="p-6 group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-amber-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 p-2.5 shadow-md"
                    >
                      <Target className="h-5 w-5 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Conversion Rate</h3>
                      <p className="text-xs text-gray-500">Orders / Sessions</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {conversionRate !== null ? formatPercentage(conversionRate, 2) : '—'}
                  </div>
                  {websiteBehavior && (
                    <p className="text-sm text-gray-600 mt-2">
                      Bounce rate: {formatPercentage(websiteBehavior.metrics.bounce_rate, 1)}
                    </p>
                  )}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Charts and Detailed Metrics */}
        {!loading && (
          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2">
            {/* Sales Trends Chart */}
            <motion.div variants={item}>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trends</h3>
                {salesData && salesData.daily.length > 0 ? (
                  <LineChart
                    className="h-80"
                    data={salesData.daily.map(d => ({
                      date: formatChartDate(d.date),
                      Revenue: d.total_revenue,
                      Orders: d.total_orders,
                    }))}
                    index="date"
                    categories={['Revenue', 'Orders']}
                    colors={['emerald', 'blue']}
                    yAxisWidth={60}
                    valueFormatter={(value) => formatCurrency(value)}
                    customTooltip={(props) => (
                      <ChartTooltip
                        {...props}
                        valueFormatter={(value) => formatCurrency(value)}
                      />
                    )}
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <p className="text-gray-500">No sales data available for this period</p>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Top Products */}
            <motion.div variants={item}>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
                {topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {topProducts.slice(0, 5).map((product, idx) => (
                      <div key={product.sku || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 truncate">{product.product_name || product.sku}</p>
                          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold text-gray-900">{formatCurrency(product.total_revenue)}</p>
                          <p className="text-xs text-gray-500">{formatNumber(product.total_qty_ordered)} sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <p className="text-gray-500">No product data available</p>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Customer Metrics */}
            {customerMetrics && (
              <motion.div variants={item}>
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Unique Customers</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatNumber(customerMetrics.summary.total_unique_customers)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Registered</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatNumber(customerMetrics.summary.total_registered_customers)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Guest</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatNumber(customerMetrics.summary.total_guest_customers)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Avg Revenue/Customer</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(customerMetrics.summary.avg_revenue_per_customer)}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Website Behavior */}
            {websiteBehavior && (
              <motion.div variants={item}>
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Website Behavior</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Pageviews</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatNumber(websiteBehavior.metrics.total_pageviews)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Avg Session Duration</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatNumber(websiteBehavior.metrics.avg_session_duration, 1)}s
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                      <p className="text-sm text-gray-600 mb-1">Bounce Rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPercentage(websiteBehavior.metrics.bounce_rate, 1)}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Data Sources & Status */}
        <Card className="p-6 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Sources</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Package className="h-4 w-4 text-green-600" />
                E-Commerce
              </h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Adobe Commerce (Magento)</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                Analytics
              </h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  {websiteBehavior ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-400">○</span>
                  )}
                  <span>Google Analytics 4</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-400">○</span>
                  <span>Google Search Console</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-purple-600" />
                Advertising
              </h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-gray-400">○</span>
                  <span>Google Ads (Not Available)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-400">○</span>
                  <span>Facebook/META Ads</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-400">○</span>
                  <span>Pinterest Ads</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

