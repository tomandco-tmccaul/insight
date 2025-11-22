'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useUrlSync } from '@/lib/hooks/use-url-sync';
import { useIdToken } from '@/lib/auth/hooks';
import { apiRequest, buildQueryString } from '@/lib/utils/api';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/date';
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Target,
  Package,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/dashboard/page-header';
import { WebsiteSwimlane } from '@/components/dashboard/website-swimlane';
import { Website } from '@/types/firestore';

const container = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
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

interface WebsiteData {
  website: Website;
  salesData: SalesData | null;
  loading: boolean;
  error: string | null;
}

export default function OverviewPage() {
  const { selectedClientId, dateRange } = useDashboard();
  const getIdToken = useIdToken();

  // Sync URL parameters with dashboard context
  useUrlSync();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [websitesData, setWebsitesData] = useState<WebsiteData[]>([]);
  const [aggregatedData, setAggregatedData] = useState<SalesData | null>(null);

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
          console.log('Client data fetched:', clientResponse.data);
          if (clientResponse.data.bigQueryDatasetId) {
            setDatasetId(clientResponse.data.bigQueryDatasetId);
          } else {
            console.error('Client missing bigQueryDatasetId');
            setError('Client configuration error: Missing BigQuery Dataset ID');
            setLoading(false);
          }
        } else {
          console.error('Failed to fetch client data:', clientResponse);
          setError('Failed to fetch client data');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error in fetchClientData:', err);
        setError(err.message || 'An error occurred');
        setLoading(false);
      }
    }

    fetchClientData();
  }, [selectedClientId, getIdToken]);

  // Fetch websites and their data
  useEffect(() => {
    async function fetchWebsitesAndData() {
      if (!selectedClientId || !datasetId) return;

      setLoading(true);
      setError(null);

      try {
        const idToken = await getIdToken();

        // 1. Fetch all websites for the client
        console.log('Fetching websites for client:', selectedClientId);
        const websitesResponse = await apiRequest<Website[]>(
          `/api/admin/clients/${selectedClientId}/websites`,
          {},
          idToken || undefined
        );

        console.log('Websites response:', websitesResponse);

        if (!websitesResponse.success || !websitesResponse.data) {
          throw new Error('Failed to fetch websites');
        }

        const websites = websitesResponse.data;
        console.log('Websites found:', websites.length);

        // Initialize websites data state
        setWebsitesData(websites.map(website => ({
          website,
          salesData: null,
          loading: true,
          error: null
        })));

        // 2. Fetch aggregated data (all_combined)
        const aggregatedQueryParams = buildQueryString({
          dataset_id: datasetId,
          client_id: selectedClientId,
          website_id: 'all_combined',
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
          exclude_sample_orders: 'true',
        });

        console.log('Fetching aggregated data with params:', aggregatedQueryParams);

        const aggregatedResponse = await apiRequest<{ daily: any[]; summary: any }>(
          `/api/reports/sales-overview${aggregatedQueryParams}`,
          {},
          idToken || undefined
        );

        console.log('Aggregated response:', aggregatedResponse);

        if (aggregatedResponse.success && aggregatedResponse.data) {
          setAggregatedData({
            summary: aggregatedResponse.data.summary,
            daily: aggregatedResponse.data.daily.map((d: any) => ({
              date: d.date,
              total_revenue: d.total_revenue || 0,
              total_orders: d.total_orders || 0,
            })),
          });
        }

        // 3. Fetch data for each website in parallel
        const websiteDataPromises = websites.map(async (website) => {
          try {
            const queryParams = buildQueryString({
              dataset_id: datasetId,
              client_id: selectedClientId,
              website_id: website.id,
              start_date: dateRange.startDate,
              end_date: dateRange.endDate,
              exclude_sample_orders: 'true',
            });

            console.log(`Fetching data for website ${website.id} with params:`, queryParams);

            const response = await apiRequest<{ daily: any[]; summary: any }>(
              `/api/reports/sales-overview${queryParams}`,
              {},
              idToken || undefined
            );

            console.log(`Response for website ${website.id}:`, response);

            if (response.success && response.data) {
              return {
                website,
                salesData: {
                  summary: response.data.summary,
                  daily: response.data.daily.map((d: any) => ({
                    date: d.date,
                    total_revenue: d.total_revenue || 0,
                    total_orders: d.total_orders || 0,
                  })),
                },
                loading: false,
                error: null
              };
            } else {
              return {
                website,
                salesData: null,
                loading: false,
                error: 'Failed to fetch data'
              };
            }
          } catch (err: any) {
            return {
              website,
              salesData: null,
              loading: false,
              error: err.message
            };
          }
        });

        const results = await Promise.all(websiteDataPromises);
        setWebsitesData(results);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchWebsitesAndData();
  }, [selectedClientId, datasetId, dateRange, getIdToken]);

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

  return (
    <ProtectedRoute>
      <div className="space-y-8 pb-12">
        {/* Page Header */}
        <PageHeader
          title="Overview"
          description="Performance by website"
        />

        {/* Error Message */}
        {error && (
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </Card>
        )}

        {/* Website Swimlanes */}
        <motion.div variants={container} initial="hidden" animate="show">
          {loading && websitesData.length === 0 ? (
            // Initial loading skeleton
            [...Array(2)].map((_, i) => (
              <WebsiteSwimlane
                key={i}
                websiteName="Loading..."
                salesData={null}
                loading={true}
              />
            ))
          ) : websitesData.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <p>No websites found for this client.</p>
            </Card>
          ) : (
            websitesData.map((data) => (
              <WebsiteSwimlane
                key={data.website.id}
                websiteName={data.website.websiteName}
                salesData={data.salesData}
                loading={data.loading}
                error={data.error}
              />
            ))
          )}
        </motion.div>

        {/* Aggregated Totals */}
        {!loading && aggregatedData && (
          <div className="mt-12 pt-8 border-t border-border">
            <h2 className="text-2xl font-bold mb-6">All Websites Combined</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Revenue */}
              <Card className="p-6 group relative overflow-hidden glass-card">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 p-2.5 shadow-md">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Total Revenue</h3>
                      <p className="text-xs text-muted-foreground">All Stores</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    {formatCurrency(aggregatedData.summary.total_revenue)}
                  </div>
                </div>
              </Card>

              {/* Total Orders */}
              <Card className="p-6 group relative overflow-hidden glass-card">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 p-2.5 shadow-md">
                      <ShoppingCart className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Total Orders</h3>
                      <p className="text-xs text-muted-foreground">All Stores</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    {formatNumber(aggregatedData.summary.total_orders)}
                  </div>
                </div>
              </Card>

              {/* AOV */}
              <Card className="p-6 group relative overflow-hidden glass-card">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 p-2.5 shadow-md">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Average Order Value</h3>
                      <p className="text-xs text-muted-foreground">All Stores</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    {formatCurrency(aggregatedData.summary.aov)}
                  </div>
                </div>
              </Card>

              {/* Items per Order */}
              <Card className="p-6 group relative overflow-hidden glass-card">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 p-2.5 shadow-md">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Items per Order</h3>
                      <p className="text-xs text-muted-foreground">All Stores</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    {formatNumber(aggregatedData.summary.items_per_order, 1)}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

