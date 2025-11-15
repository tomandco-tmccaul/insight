'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useAuth } from '@/lib/auth/context';
import { useIdToken } from '@/lib/auth/hooks';
import { apiRequest, buildQueryString } from '@/lib/utils/api';
import { Brain, RefreshCw, AlertCircle, CheckCircle2, Database, TrendingUp, Globe, ShoppingCart, Package, Megaphone, Target, MessageSquare, ChevronDown, ChevronUp, Code2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { InsightsLoading } from '@/components/insights/insights-loading';
import { ReportAnnotations } from '@/components/dashboard/report-annotations';
import { PageHeader } from '@/components/dashboard/page-header';

interface InsightsData {
  insights: string;
  period: {
    startDate: string;
    endDate: string;
  };
  dataSources: {
    sales: boolean;
    products: boolean;
    marketing: boolean;
    website: boolean;
    annotations: number;
    targets: number;
  };
  contextSummary?: string; // Admin only: what was passed to AI
  systemPrompt?: string; // Admin only: system prompt used
}

const container = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function InsightsPage() {
  const { selectedClientId, selectedWebsiteId, dateRange } = useDashboard();
  const { appUser } = useAuth();
  const getIdToken = useIdToken();
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [showAiInput, setShowAiInput] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<{
    dataSources: Array<{ id: string; name: string; icon: React.ComponentType<{ className?: string }>; status: 'pending' | 'loading' | 'complete' }>;
    currentStage: 'fetching' | 'analyzing' | 'complete';
    aiProgress: number;
  }>({
    dataSources: [
      { id: 'sales', name: 'Sales Data', icon: ShoppingCart, status: 'pending' },
      { id: 'products', name: 'Product Performance', icon: Package, status: 'pending' },
      { id: 'marketing', name: 'Marketing Metrics', icon: Megaphone, status: 'pending' },
      { id: 'website', name: 'Website Behavior', icon: Globe, status: 'pending' },
      { id: 'annotations', name: 'Annotations', icon: MessageSquare, status: 'pending' },
      { id: 'targets', name: 'Targets & Goals', icon: Target, status: 'pending' },
    ],
    currentStage: 'fetching',
    aiProgress: 0,
  });

  // Determine the client ID to use
  const clientId = appUser?.role === 'admin' ? selectedClientId : appUser?.clientId;

  const updateDataSourceStatus = (id: string, status: 'pending' | 'loading' | 'complete') => {
    setLoadingProgress((prev) => ({
      ...prev,
      dataSources: prev.dataSources.map((ds) => (ds.id === id ? { ...ds, status } : ds)),
    }));
  };

  const fetchInsights = async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    if (!dateRange || 
        !dateRange.startDate || 
        !dateRange.endDate || 
        (typeof dateRange.startDate === 'string' && dateRange.startDate.trim() === '') ||
        (typeof dateRange.endDate === 'string' && dateRange.endDate.trim() === '')) {
      setError('Please select a valid date range');
      setLoading(false);
      return;
    }

    const isRefresh = insightsData !== null;
    
    // Always show loading screen when fetching (including refresh)
    setShowLoadingScreen(true);
    setLoading(true);
    setRefreshing(isRefresh);
    setError(null);

    // Reset loading progress
    setLoadingProgress({
      dataSources: [
        { id: 'sales', name: 'Sales Data', icon: ShoppingCart, status: 'pending' },
        { id: 'products', name: 'Product Performance', icon: Package, status: 'pending' },
        { id: 'marketing', name: 'Marketing Metrics', icon: Megaphone, status: 'pending' },
        { id: 'website', name: 'Website Behavior', icon: Globe, status: 'pending' },
        { id: 'annotations', name: 'Annotations', icon: MessageSquare, status: 'pending' },
        { id: 'targets', name: 'Targets & Goals', icon: Target, status: 'pending' },
      ],
      currentStage: 'fetching',
      aiProgress: 0,
    });

    try {
      const idToken = await getIdToken();
      if (!idToken) {
        throw new Error('Authentication required');
      }

      const websiteFilter = selectedWebsiteId || 'all_combined';
      const queryParams = buildQueryString({
        dataset_id: '', // Will be fetched from client
        website_id: websiteFilter,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      });

      // Get client data to get dataset ID
      const clientResponse = await apiRequest<{ id: string; clientName: string; bigQueryDatasetId: string }>(
        `/api/admin/clients/${clientId}`,
        {},
        idToken
      );

      if (!clientResponse.success || !clientResponse.data) {
        throw new Error('Failed to fetch client data');
      }

      const datasetId = clientResponse.data.bigQueryDatasetId;
      const websiteIdForQuery = websiteFilter === 'all_combined' ? 'all_combined' : websiteFilter;

      // Get website storeId if needed
      let storeId = websiteIdForQuery;
      if (websiteFilter !== 'all_combined') {
        const websiteResponse = await apiRequest<{ id: string; websiteName: string; storeId: string }>(
          `/api/admin/clients/${clientId}/websites/${websiteFilter}`,
          {},
          idToken
        );
        if (websiteResponse.success && websiteResponse.data) {
          storeId = websiteResponse.data.storeId;
        }
      }

      const params = buildQueryString({
        dataset_id: datasetId,
        website_id: storeId,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      });
      // Remove leading ? if present since buildQueryString already adds it
      const cleanParams = params.startsWith('?') ? params.substring(1) : params;

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      };

      // Fetch data sources individually and track progress
      updateDataSourceStatus('sales', 'loading');
      const salesResponse = await fetch(`/api/reports/sales-overview?${cleanParams}`, { headers });
      const salesData = salesResponse.ok ? await salesResponse.json() : null;
      
      // Fetch hourly sales data for rich temporal analysis
      const hourlySalesResponse = await fetch(`/api/reports/hourly-sales?${cleanParams}`, { headers }).catch(() => null);
      const hourlySalesData = hourlySalesResponse?.ok ? await hourlySalesResponse.json() : null;
      
      // Fetch customer metrics for customer insights
      const customerMetricsResponse = await fetch(`/api/reports/customer-metrics?${cleanParams}`, { headers }).catch(() => null);
      const customerMetricsData = customerMetricsResponse?.ok ? await customerMetricsResponse.json() : null;
      
      updateDataSourceStatus('sales', 'complete');

      updateDataSourceStatus('products', 'loading');
      // Fetch more products (top 100) for comprehensive product analysis
      const productsResponse = await fetch(`/api/reports/top-products?${cleanParams}&limit=100&sort_by=revenue`, { headers });
      const productsData = productsResponse.ok ? await productsResponse.json() : null;
      updateDataSourceStatus('products', 'complete');

      updateDataSourceStatus('marketing', 'loading');
      const marketingResponse = await fetch(`/api/marketing/performance?websiteId=${storeId}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, { headers }).catch(() => null);
      const marketingData = marketingResponse?.ok ? await marketingResponse.json() : null;
      updateDataSourceStatus('marketing', 'complete');

      updateDataSourceStatus('website', 'loading');
      const websiteResponse = await fetch(`/api/website/behavior?websiteId=${storeId}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, { headers }).catch(() => null);
      const websiteData = websiteResponse?.ok ? await websiteResponse.json() : null;
      updateDataSourceStatus('website', 'complete');

      updateDataSourceStatus('annotations', 'loading');
      const annotationsParams = buildQueryString({ clientId });
      const cleanAnnotationsParams = annotationsParams.startsWith('?') ? annotationsParams.substring(1) : annotationsParams;
      const annotationsResponse = await apiRequest<any[]>(
        `/api/annotations?${cleanAnnotationsParams}`,
        {},
        idToken
      );
      // Filter annotations by date range
      const allAnnotations = annotationsResponse.success ? annotationsResponse.data || [] : [];
      const annotationsData = allAnnotations.filter((annotation: any) => {
        const annotationStart = new Date(annotation.startDate);
        const annotationEnd = new Date(annotation.endDate || annotation.startDate);
        const rangeStart = new Date(dateRange.startDate);
        const rangeEnd = new Date(dateRange.endDate);
        return annotationStart <= rangeEnd && annotationEnd >= rangeStart;
      });
      updateDataSourceStatus('annotations', 'complete');

      updateDataSourceStatus('targets', 'loading');
      const targetsResponse = await apiRequest<any[]>(
        `/api/admin/clients/${clientId}/targets`,
        {},
        idToken
      );
      const targetsData = targetsResponse.success ? targetsResponse.data : [];
      updateDataSourceStatus('targets', 'complete');

      // Move to analyzing stage
      setLoadingProgress((prev) => ({ ...prev, currentStage: 'analyzing' }));

      // Start AI progress animation - takes 20 seconds total (1% every 200ms)
      const aiProgressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev.aiProgress >= 100) {
            clearInterval(aiProgressInterval);
            return prev;
          }
          return { ...prev, aiProgress: Math.min(prev.aiProgress + 1, 100) };
        });
      }, 200); // 1% every 200ms = 20 seconds total

      // Call POST endpoint with all fetched data
      const insightsResponse = await fetch('/api/insights', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clientId,
          websiteId: websiteFilter,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          salesData,
          hourlySalesData,
          customerMetricsData,
          productsData,
          marketingData,
          websiteData,
          annotationsData: annotationsData || [],
          targetsData: targetsData || [],
        }),
      });

      // Wait for progress animation to complete (20 seconds) or API to finish, whichever is longer
      const apiStartTime = Date.now();
      const minAnimationTime = 20000; // 20 seconds
      
      // Check if response is OK before parsing
      if (!insightsResponse.ok) {
        clearInterval(aiProgressInterval);
        const errorData = await insightsResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${insightsResponse.status}: Failed to generate insights`);
      }
      
      const insightsResult = await insightsResponse.json();
      const apiElapsedTime = Date.now() - apiStartTime;
      const remainingTime = Math.max(0, minAnimationTime - apiElapsedTime);
      
      // If API finished before 20 seconds, wait for the rest to complete the animation
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      // Ensure progress is at 100% and clear interval
      clearInterval(aiProgressInterval);
      setLoadingProgress((prev) => ({ ...prev, aiProgress: 100, currentStage: 'complete' }));

      console.log('Insights API response:', insightsResult);
      console.log('Response success:', insightsResult.success);
      console.log('Response data:', insightsResult.data);
      console.log('Response data.insights:', insightsResult.data?.insights);
      console.log('Response data.insights type:', typeof insightsResult.data?.insights);
      console.log('Response data.insights length:', insightsResult.data?.insights?.length);

      if (insightsResult.success && insightsResult.data) {
        const insightsToSet = insightsResult.data;
        console.log('Setting insights data:', insightsToSet);
        console.log('Insights content length:', insightsToSet.insights?.length || 0);
        console.log('Insights content preview:', insightsToSet.insights?.substring(0, 200));
        
        // Verify insights field exists and is not empty
        if (!insightsToSet.insights || (typeof insightsToSet.insights === 'string' && insightsToSet.insights.trim() === '')) {
          console.error('Insights field is empty or missing:', insightsToSet);
          setError('Generated insights are empty. Please try again.');
          setShowLoadingScreen(false);
          return;
        }
        
        setInsightsData(insightsToSet);
        // Small delay to show completion state
        setTimeout(() => {
          setShowLoadingScreen(false);
        }, 800);
      } else {
        console.error('Insights API error:', insightsResult);
        setError(insightsResult.error || 'Failed to generate insights');
        setShowLoadingScreen(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setShowLoadingScreen(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setShowLoadingScreen(true);
    fetchInsights();
  }, [clientId, selectedWebsiteId, dateRange?.startDate, dateRange?.endDate]);

  if (!clientId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Brain className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Client Selected</h3>
          <p className="mt-2 text-gray-600">
            {appUser?.role === 'admin'
              ? 'Please select a client from the header to view insights'
              : 'No client assigned to your account'}
          </p>
        </div>
      </div>
    );
  }

  if (loading && showLoadingScreen) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <InsightsLoading
            dataSources={loadingProgress.dataSources}
            currentStage={loadingProgress.currentStage}
            aiProgress={loadingProgress.aiProgress}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-4 text-lg font-semibold text-red-600">Error Loading Insights</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <Button onClick={fetchInsights} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!insightsData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Brain className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Loading Insights</h3>
          <p className="mt-2 text-gray-600">Preparing your insights...</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        variants={container}
        className="space-y-6"
      >
      {/* Header */}
      <motion.div variants={item}>
        <PageHeader
          title="AI Insights"
          description={`Analysis for ${formatDate(insightsData.period.startDate)} - ${formatDate(insightsData.period.endDate)}`}
          badge={
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "easeInOut",
              }}
            >
              <Brain className="h-8 w-8 text-indigo-600" />
            </motion.div>
          }
          actions={
            <Button
              onClick={fetchInsights}
              disabled={loading || refreshing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
              Refresh Insights
            </Button>
          }
        />
      </motion.div>

      <ReportAnnotations />

      {/* Data Sources Status */}
      <motion.div variants={item}>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-5 w-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">Data Sources</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {insightsData.dataSources.sales && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <div className="flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">Sales</span>
                </div>
              </div>
            )}
            {insightsData.dataSources.products && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">Products</span>
                </div>
              </div>
            )}
            {insightsData.dataSources.marketing && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <div className="flex items-center gap-1">
                  <Megaphone className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">Marketing</span>
                </div>
              </div>
            )}
            {insightsData.dataSources.website && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">Website</span>
                </div>
              </div>
            )}
            {insightsData.dataSources.annotations > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-gray-600">
                  {insightsData.dataSources.annotations} Annotation{insightsData.dataSources.annotations !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {insightsData.dataSources.targets > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">
                    {insightsData.dataSources.targets} Target{insightsData.dataSources.targets !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Insights Content */}
      <motion.div variants={item}>
        <Card className="p-8">
          {(() => {
            const hasInsights = insightsData.insights && 
                                typeof insightsData.insights === 'string' && 
                                insightsData.insights.trim() !== '';
            
            console.log('Rendering insights:', {
              hasInsights,
              insightsType: typeof insightsData.insights,
              insightsLength: insightsData.insights?.length || 0,
              insightsPreview: insightsData.insights?.substring(0, 100),
            });
            
            if (!hasInsights) {
              return (
                <div className="text-center py-12">
                  <AlertCircle className="mx-auto h-12 w-12 text-yellow-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Insights Generated</h3>
                  <p className="text-gray-600 mb-4">
                    The AI was unable to generate insights from the available data.
                  </p>
                  <p className="text-sm text-gray-500">
                    Debug info: insights length = {insightsData.insights?.length || 0}, type = {typeof insightsData.insights}
                  </p>
                </div>
              );
            }
            
            return (
            <div className="prose prose-lg max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                // Custom styling for markdown elements
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-4 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-3 border-b border-gray-200 pb-2">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-semibold text-gray-800 mt-5 mb-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-4 text-gray-700 leading-relaxed last:mb-0">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 ml-6 list-disc space-y-2 text-gray-700">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-4 ml-6 list-decimal space-y-2 text-gray-700">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-900">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-gray-700">{children}</em>
                ),
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 rounded bg-gray-100 text-sm font-mono text-indigo-700">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="p-4 rounded-lg bg-gray-100 text-sm font-mono overflow-x-auto mb-4">
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-indigo-500 pl-4 my-4 italic text-gray-600">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-gray-50">{children}</thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-gray-50">{children}</tr>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {children}
                  </td>
                ),
                hr: () => <hr className="my-6 border-gray-200" />,
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 underline"
                  >
                    {children}
                  </a>
                ),
              }}
              >
                {insightsData.insights}
              </ReactMarkdown>
            </div>
            );
          })()}
        </Card>
      </motion.div>

      {/* Admin Only: AI Input Data */}
      {appUser?.role === 'admin' && insightsData.contextSummary && (
        <motion.div variants={item}>
          <Card className="p-6 border-amber-200 bg-amber-50/30">
            <button
              onClick={() => setShowAiInput(!showAiInput)}
              className="w-full flex items-center justify-between text-left cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-lg">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Input Data</h3>
                  <p className="text-sm text-gray-600">View what was passed to the AI (Admin Only)</p>
                </div>
              </div>
              {showAiInput ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </button>
            
            <AnimatePresence>
              {showAiInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 space-y-4"
                >
                  {/* System Prompt */}
                  {insightsData.systemPrompt && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Code2 className="h-4 w-4 text-gray-500" />
                        <h4 className="text-sm font-semibold text-gray-700">System Prompt</h4>
                      </div>
                      <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono">
                        {insightsData.systemPrompt}
                      </pre>
                    </div>
                  )}
                  
                  {/* Context Summary */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-4 w-4 text-gray-500" />
                      <h4 className="text-sm font-semibold text-gray-700">Context Summary (Data Passed to AI)</h4>
                    </div>
                    <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono whitespace-pre-wrap">
                      {insightsData.contextSummary}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      )}
    </motion.div>
    </AnimatePresence>
  );
}

