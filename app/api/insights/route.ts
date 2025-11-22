import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { adminDb } from '@/lib/firebase/admin';
import { getSalesOverview } from '@/lib/data-layer/sales-overview';
import { getHourlySales } from '@/lib/data-layer/hourly-sales';
import { getCustomerMetrics } from '@/lib/data-layer/customer-metrics';
import { getTopProducts } from '@/lib/data-layer/top-products';
import { getCategoryBreakdown } from '@/lib/data-layer/category-breakdown';
import { getCollectionsPerformance } from '@/lib/data-layer/collections-performance';
import { getSampleOrdersSummary } from '@/lib/data-layer/sample-orders-summary';
import { getSampleOrdersDaily } from '@/lib/data-layer/sample-orders-daily';
import { getSampleOrdersHourly } from '@/lib/data-layer/sample-orders-hourly';
import { getTopSampleProducts } from '@/lib/data-layer/top-sample-products';
import { getSampleOrdersByCollection } from '@/lib/data-layer/sample-orders-by-collection';

// Enhanced insights API with comprehensive data passing

// Initialize Genkit with explicit API key
const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
});


export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const clientId = searchParams.get('clientId');
      const websiteId = searchParams.get('websiteId') || 'all_combined';
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      if (!clientId || !startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameters: clientId, startDate, endDate' },
          { status: 400 }
        );
      }

      // Check authorization
      if (user.role === 'client' && user.clientId !== clientId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }

      if (!adminDb) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      // Fetch client data to get BigQuery dataset ID
      const clientDoc = await adminDb
        .collection('clients')
        .doc(clientId)
        .get();

      if (!clientDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Client not found' },
          { status: 404 }
        );
      }

      const clientData = clientDoc.data();
      const datasetId = clientData?.bigQueryDatasetId;

      if (!datasetId) {
        return NextResponse.json(
          { success: false, error: 'Client dataset not configured' },
          { status: 400 }
        );
      }

      // Get the authorization header from the original request for marketing/website APIs
      const authHeader = req.headers.get('authorization');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      // Use data layer functions for BigQuery data
      const queryOptions = {
        datasetId,
        clientId,
        websiteId: websiteId || 'all_combined',
        startDate,
        endDate,
      };

      // Fetch data from all sources in parallel - comprehensive data collection
      const [
        salesData,
        hourlySalesData,
        customerMetricsData,
        productsData,
        categoryBreakdownData,
        collectionsPerformanceData,
        sampleOrdersSummaryData,
        sampleOrdersDailyData,
        sampleOrdersHourlyData,
        topSampleProductsData,
        sampleOrdersByCollectionData,
        marketingResponse,
        seoInsightsResponse,
        websiteResponse,
        annotationsResponse,
        targetsResponse,
      ] = await Promise.all([
        // Core sales data
        getSalesOverview(queryOptions).catch((err) => {
          console.error('Error fetching sales overview:', err);
          return null;
        }),
        getHourlySales(queryOptions).catch((err) => {
          console.error('Error fetching hourly sales:', err);
          return null;
        }),
        getCustomerMetrics(queryOptions).catch((err) => {
          console.error('Error fetching customer metrics:', err);
          return null;
        }),
        getTopProducts({ ...queryOptions, limit: 200, sortBy: 'revenue' }).catch((err) => {
          console.error('Error fetching top products:', err);
          return null;
        }),
        // Category and collection breakdowns
        getCategoryBreakdown({ ...queryOptions, orderType: 'main' }).catch((err) => {
          console.error('Error fetching category breakdown:', err);
          return null;
        }),
        getCollectionsPerformance({ ...queryOptions, orderType: 'main', limit: 50, sortBy: 'revenue' }).catch((err) => {
          console.error('Error fetching collections performance:', err);
          return null;
        }),
        // Sample orders data
        getSampleOrdersSummary(queryOptions).catch((err) => {
          console.error('Error fetching sample orders summary:', err);
          return null;
        }),
        getSampleOrdersDaily(queryOptions).catch((err) => {
          console.error('Error fetching sample orders daily:', err);
          return null;
        }),
        getSampleOrdersHourly(queryOptions).catch((err) => {
          console.error('Error fetching sample orders hourly:', err);
          return null;
        }),
        getTopSampleProducts({ ...queryOptions, limit: 50 }).catch((err) => {
          console.error('Error fetching top sample products:', err);
          return null;
        }),
        getSampleOrdersByCollection(queryOptions).catch((err) => {
          console.error('Error fetching sample orders by collection:', err);
          return null;
        }),
        // Marketing and website data still use API endpoints (no data layer functions yet)
        fetch(`${req.nextUrl.origin}/api/marketing/performance?websiteId=${websiteId}&startDate=${startDate}&endDate=${endDate}`, { headers }).catch(() => null),
        fetch(`${req.nextUrl.origin}/api/seo-insights?websiteId=${websiteId}&startDate=${startDate}&endDate=${endDate}&clientId=${clientId}`, { headers }).catch(() => null),
        fetch(`${req.nextUrl.origin}/api/website/behavior?websiteId=${websiteId}&startDate=${startDate}&endDate=${endDate}`, { headers }).catch(() => null),
        adminDb
          .collection('clients')
          .doc(clientId)
          .collection('annotations')
          .where('startDate', '<=', endDate)
          .where('endDate', '>=', startDate)
          .orderBy('startDate', 'desc')
          .get()
          .then((snapshot) => {
            const annotations: any[] = [];
            snapshot.forEach((doc) => {
              annotations.push(doc.data());
            });
            return { success: true, data: annotations };
          }),
        adminDb
          .collection('clients')
          .doc(clientId)
          .collection('targets')
          .get()
          .then((snapshot) => {
            const targets: any[] = [];
            snapshot.forEach((doc) => {
              targets.push(doc.data());
            });
            return { success: true, data: targets };
          }),
      ]);

      // Parse API responses (marketing, SEO, and website)
      const marketingData = marketingResponse?.ok ? await marketingResponse.json() : null;
      const seoInsightsData = seoInsightsResponse?.ok ? await seoInsightsResponse.json() : null;
      const websiteData = websiteResponse?.ok ? await websiteResponse.json() : null;
      const annotationsData = (annotationsResponse as any)?.success ? (annotationsResponse as any).data : [];
      const targetsData = (targetsResponse as any)?.success ? (targetsResponse as any).data : [];

      // Get currency from client data or default to GBP
      const currency = (clientData?.currency as string) || 'GBP';
      const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency;

      // Helper function to format currency values
      const formatCurrency = (value: number): string => {
        return `${currencySymbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      // Build context for AI
      const contextParts: string[] = [];

      contextParts.push(`## Period Analysis: ${startDate} to ${endDate}`);
      contextParts.push(`Client: ${clientData?.clientName || clientId}`);
      contextParts.push(`Website: ${websiteId === 'all_combined' ? 'All Websites Combined' : websiteId}`);
      contextParts.push(`Currency: ${currency} (${currencySymbol})\n`);

      if (salesData) {
        contextParts.push('## Sales Performance Overview');
        const summary = salesData.summary;
        contextParts.push(`### Summary Metrics:`);
        contextParts.push(`- Total Revenue: ${formatCurrency(summary.total_revenue || 0)}`);
        contextParts.push(`- Total Orders: ${summary.total_orders?.toLocaleString() || 0}`);
        contextParts.push(`- Average Order Value: ${formatCurrency(summary.aov || 0)}`);
        contextParts.push(`- Unique Customers: ${summary.unique_customers?.toLocaleString() || 0}`);
        contextParts.push(`- Items per Order: ${summary.items_per_order?.toFixed(2) || 0}`);
        if (summary.total_discounts) {
          contextParts.push(`- Total Discounts: ${formatCurrency(summary.total_discounts)}`);
        }
        contextParts.push(`- Subtotal: ${formatCurrency(summary.subtotal || 0)}`);
        contextParts.push(`- Total Tax: ${formatCurrency(summary.total_tax || 0)}`);
        contextParts.push(`- Total Shipping: ${formatCurrency(summary.total_shipping || 0)}`);

        // Include daily breakdown
        const daily = salesData.daily || [];
        if (daily && daily.length > 0) {
          contextParts.push(`\n### Daily Breakdown (${daily.length} days):`);
          contextParts.push('Date | Orders | Revenue | Customers | AOV | Items | Discounts');
          contextParts.push('--- | --- | --- | --- | --- | --- | ---');
          daily.forEach((day: any) => {
            const dayAov = day.total_orders > 0 ? (day.total_revenue / day.total_orders) : 0;
            contextParts.push(`${day.date} | ${day.total_orders || 0} | ${formatCurrency(day.total_revenue || 0)} | ${day.unique_customers || 0} | ${formatCurrency(dayAov)} | ${day.total_items || 0} | ${formatCurrency(day.total_discounts || 0)}`);
          });
        }
        contextParts.push('');
      }

      // Add hourly sales data
      if (hourlySalesData) {
        contextParts.push('## Hourly Sales Patterns');
        if (hourlySalesData.hourly && Array.isArray(hourlySalesData.hourly)) {
          contextParts.push('### Sales by Hour of Day:');
          contextParts.push('Hour | Total Orders | Total Revenue | Avg Orders/Day | Avg Revenue/Day');
          contextParts.push('--- | --- | --- | --- | ---');
          hourlySalesData.hourly.forEach((hour: any) => {
            contextParts.push(`${hour.hour}:00 | ${hour.total_orders || 0} | ${formatCurrency(hour.total_revenue || 0)} | ${hour.avg_orders_per_day?.toFixed(2) || 0} | ${formatCurrency(hour.avg_revenue_per_day || 0)}`);
          });
          if (hourlySalesData.peaks) {
            contextParts.push(`\n### Peak Hours:`);
            contextParts.push(`- Peak Orders Hour: ${hourlySalesData.peaks.orders?.hour || 0}:00 (${hourlySalesData.peaks.orders?.total_orders || 0} orders)`);
            contextParts.push(`- Peak Revenue Hour: ${hourlySalesData.peaks.revenue?.hour || 0}:00 (${formatCurrency(hourlySalesData.peaks.revenue?.total_revenue || 0)})`);
          }
        }
        contextParts.push('');
      }

      // Add customer metrics
      if (customerMetricsData) {
        contextParts.push('## Customer Metrics');
        const customerSummary = customerMetricsData.summary;
        if (customerSummary) {
          contextParts.push(`### Summary:`);
          contextParts.push(`- Total Unique Customers: ${(customerSummary.total_unique_customers || 0).toLocaleString()}`);
          contextParts.push(`- Total Registered Customers: ${(customerSummary.total_registered_customers || 0).toLocaleString()}`);
          contextParts.push(`- Total Guest Customers: ${(customerSummary.total_guest_customers || 0).toLocaleString()}`);
          contextParts.push(`- Average Revenue per Customer: ${formatCurrency(customerSummary.avg_revenue_per_customer || 0)}`);
        }

        const customerDaily = customerMetricsData.daily || [];
        if (customerDaily && customerDaily.length > 0) {
          contextParts.push(`\n### Daily Customer Breakdown (${customerDaily.length} days):`);
          contextParts.push('Date | Unique Customers | Registered | Guest | Revenue/Customer');
          contextParts.push('--- | --- | --- | --- | ---');
          customerDaily.forEach((day: any) => {
            contextParts.push(`${day.date} | ${day.unique_customers || 0} | ${day.registered_customers || 0} | ${day.guest_customers || 0} | ${formatCurrency(day.revenue_per_customer || 0)}`);
          });
        }
        contextParts.push('');
      }

      // Handle products data - data layer returns array directly
      let products: any[] = [];
      if (Array.isArray(productsData)) {
        products = productsData;
      }

      if (products && products.length > 0) {
        contextParts.push('## Product Performance Analysis');
        contextParts.push(`### Product Overview (${products.length} products):`);

        // Top products by revenue
        contextParts.push(`\n#### Top 20 Products by Revenue:`);
        products.slice(0, 20).forEach((product: any, index: number) => {
          const productName = product.product_name || product.title || 'Unknown';
          const revenue = product.total_revenue || product.revenue || 0;
          const quantity = product.total_qty_ordered || product.quantity_sold || 0;
          const avgPrice = product.avg_price || (revenue > 0 && quantity > 0 ? revenue / quantity : 0);
          const orderCount = product.order_count || 0;
          contextParts.push(`${index + 1}. ${productName} (SKU: ${product.sku || 'N/A'})`);
          contextParts.push(`   - Revenue: ${formatCurrency(revenue)}`);
          contextParts.push(`   - Quantity Sold: ${quantity.toLocaleString()}`);
          contextParts.push(`   - Average Price: ${formatCurrency(avgPrice)}`);
          contextParts.push(`   - Orders: ${orderCount.toLocaleString()}`);
          if (product.total_discount) {
            contextParts.push(`   - Discounts: ${formatCurrency(product.total_discount)}`);
          }
        });

        // Summary statistics
        const totalRevenue = products.reduce((sum: number, p: any) => sum + (p.total_revenue || p.revenue || 0), 0);
        const totalQuantity = products.reduce((sum: number, p: any) => sum + (p.total_qty_ordered || p.quantity_sold || 0), 0);
        const totalOrders = products.reduce((sum: number, p: any) => sum + (p.order_count || 0), 0);
        const avgPrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

        contextParts.push(`\n### Product Summary:`);
        contextParts.push(`- Total Products Analyzed: ${products.length}`);
        contextParts.push(`- Combined Revenue: ${formatCurrency(totalRevenue)}`);
        contextParts.push(`- Combined Quantity Sold: ${totalQuantity.toLocaleString()}`);
        contextParts.push(`- Combined Orders: ${totalOrders.toLocaleString()}`);
        contextParts.push(`- Average Product Price: ${formatCurrency(avgPrice)}`);

        // Product performance distribution
        const top10Revenue = products.slice(0, 10).reduce((sum: number, p: any) => sum + (p.total_revenue || p.revenue || 0), 0);
        const top10Percentage = totalRevenue > 0 ? (top10Revenue / totalRevenue * 100).toFixed(1) : 0;
        contextParts.push(`- Top 10 Products Revenue: ${formatCurrency(top10Revenue)} (${top10Percentage}% of total)`);

        // Enhanced product details (invoiced, shipped, canceled, refunded)
        if (products.some((p: any) => p.total_qty_invoiced || p.total_qty_shipped || p.total_qty_canceled || p.total_qty_refunded)) {
          contextParts.push(`\n### Product Fulfillment Details (Top 20):`);
          products.slice(0, 20).forEach((product: any, index: number) => {
            if (product.total_qty_invoiced || product.total_qty_shipped || product.total_qty_canceled || product.total_qty_refunded) {
              const productName = product.product_name || product.title || 'Unknown';
              contextParts.push(`${index + 1}. ${productName} (SKU: ${product.sku || 'N/A'})`);
              if (product.total_qty_invoiced) contextParts.push(`   - Invoiced: ${product.total_qty_invoiced.toLocaleString()}`);
              if (product.total_qty_shipped) contextParts.push(`   - Shipped: ${product.total_qty_shipped.toLocaleString()}`);
              if (product.total_qty_canceled) contextParts.push(`   - Canceled: ${product.total_qty_canceled.toLocaleString()}`);
              if (product.total_qty_refunded) contextParts.push(`   - Refunded: ${product.total_qty_refunded.toLocaleString()}`);
            }
          });
        }

        // Price analysis
        const pricesWithMinMax = products.filter((p: any) => p.min_price || p.max_price);
        if (pricesWithMinMax.length > 0) {
          contextParts.push(`\n### Price Range Analysis (Products with price variations):`);
          pricesWithMinMax.slice(0, 10).forEach((product: any) => {
            const productName = product.product_name || product.title || 'Unknown';
            contextParts.push(`- ${productName}: Min ${formatCurrency(product.min_price || 0)}, Max ${formatCurrency(product.max_price || 0)}, Avg ${formatCurrency(product.avg_price || 0)}`);
          });
        }
        contextParts.push('');
      }

      // Category Breakdown
      if (categoryBreakdownData && categoryBreakdownData.length > 0) {
        contextParts.push('## Category Breakdown (Main Orders)');
        contextParts.push('Category | Revenue | Quantity | Orders | % of Revenue');
        contextParts.push('--- | --- | --- | --- | ---');
        categoryBreakdownData.forEach((category: any) => {
          contextParts.push(`${category.category_group} | ${formatCurrency(category.total_revenue || 0)} | ${category.total_qty?.toLocaleString() || 0} | ${category.order_count?.toLocaleString() || 0} | ${category.percentage?.toFixed(1) || 0}%`);
        });
        contextParts.push('');
      }

      // Collections Performance
      if (collectionsPerformanceData && collectionsPerformanceData.length > 0) {
        contextParts.push('## Collections Performance (Main Orders)');
        contextParts.push('Collection | Revenue | Quantity | Orders');
        contextParts.push('--- | --- | --- | ---');
        collectionsPerformanceData.forEach((collection: any) => {
          contextParts.push(`${collection.collection} | ${formatCurrency(collection.total_revenue || 0)} | ${collection.total_qty?.toLocaleString() || 0} | ${collection.order_count?.toLocaleString() || 0}`);
        });
        contextParts.push('');
      }

      // Order Status Breakdowns (from sales overview)
      if (salesData && salesData.summary) {
        const summary = salesData.summary;
        contextParts.push('## Order Status Breakdown');
        contextParts.push(`- Complete Orders: ${(summary.orders_complete || 0).toLocaleString()} (${summary.total_orders > 0 ? ((summary.orders_complete / summary.total_orders) * 100).toFixed(1) : 0}%) - Revenue: ${formatCurrency((summary as any).revenue_complete || 0)}`);
        contextParts.push(`- Pending Orders: ${(summary.orders_pending || 0).toLocaleString()} (${summary.total_orders > 0 ? ((summary.orders_pending / summary.total_orders) * 100).toFixed(1) : 0}%) - Revenue: ${formatCurrency((summary as any).revenue_pending || 0)}`);
        contextParts.push(`- Processing Orders: ${(summary.orders_processing || 0).toLocaleString()} (${summary.total_orders > 0 ? ((summary.orders_processing / summary.total_orders) * 100).toFixed(1) : 0}%)`);
        contextParts.push(`- Canceled Orders: ${(summary.orders_canceled || 0).toLocaleString()} (${summary.total_orders > 0 ? ((summary.orders_canceled / summary.total_orders) * 100).toFixed(1) : 0}%)`);
        if (summary.orders_sample !== undefined) {
          contextParts.push(`- Sample Orders: ${(summary.orders_sample || 0).toLocaleString()} (${summary.total_orders > 0 ? ((summary.orders_sample / summary.total_orders) * 100).toFixed(1) : 0}%)`);
          contextParts.push(`- Non-Sample Orders: ${((summary.orders_not_sample ?? summary.total_orders) || 0).toLocaleString()} (${summary.total_orders > 0 ? (((summary.orders_not_sample ?? summary.total_orders) / summary.total_orders) * 100).toFixed(1) : 0}%)`);
        }
        contextParts.push('');
      }

      // Sample Orders Summary
      if (sampleOrdersSummaryData) {
        contextParts.push('## Sample Orders Summary');
        contextParts.push(`- Total Sample Orders: ${(sampleOrdersSummaryData.total_sample_orders || 0).toLocaleString()}`);
        contextParts.push(`- Total Sample Quantity: ${(sampleOrdersSummaryData.total_sample_qty || 0).toLocaleString()}`);
        contextParts.push(`- Total Sample Revenue: ${formatCurrency(sampleOrdersSummaryData.total_sample_revenue || 0)}`);
        contextParts.push('');
      }

      // Sample Orders Daily
      if (sampleOrdersDailyData && sampleOrdersDailyData.daily && sampleOrdersDailyData.daily.length > 0) {
        contextParts.push('## Sample Orders Daily Breakdown');
        contextParts.push('Date | Orders | Revenue | Items | Items/Order');
        contextParts.push('--- | --- | --- | --- | ---');
        sampleOrdersDailyData.daily.forEach((day: any) => {
          const itemsPerOrder = day.total_orders > 0 ? (day.total_items / day.total_orders).toFixed(2) : '0';
          contextParts.push(`${day.date} | ${day.total_orders || 0} | ${formatCurrency(day.total_revenue || 0)} | ${day.total_items || 0} | ${itemsPerOrder}`);
        });
        if (sampleOrdersDailyData.summary) {
          contextParts.push(`\n### Summary:`);
          contextParts.push(`- Total Orders: ${(sampleOrdersDailyData.summary.total_orders || 0).toLocaleString()}`);
          contextParts.push(`- Total Revenue: ${formatCurrency(sampleOrdersDailyData.summary.total_revenue || 0)}`);
          contextParts.push(`- Total Items: ${(sampleOrdersDailyData.summary.total_items || 0).toLocaleString()}`);
          contextParts.push(`- Items per Order: ${(sampleOrdersDailyData.summary.items_per_order || 0).toFixed(2)}`);
        }
        contextParts.push('');
      }

      // Sample Orders Hourly
      if (sampleOrdersHourlyData && sampleOrdersHourlyData.hourly) {
        contextParts.push('## Sample Orders Hourly Patterns');
        contextParts.push('Hour | Total Orders | Total Revenue | Avg Orders/Day | Avg Revenue/Day');
        contextParts.push('--- | --- | --- | --- | ---');
        sampleOrdersHourlyData.hourly.forEach((hour: any) => {
          contextParts.push(`${hour.hour}:00 | ${hour.total_orders || 0} | ${formatCurrency(hour.total_revenue || 0)} | ${hour.avg_orders_per_day?.toFixed(2) || 0} | ${formatCurrency(hour.avg_revenue_per_day || 0)}`);
        });
        if (sampleOrdersHourlyData.peaks) {
          contextParts.push(`\n### Peak Hours for Sample Orders:`);
          contextParts.push(`- Peak Orders Hour: ${sampleOrdersHourlyData.peaks.orders?.hour || 0}:00 (${sampleOrdersHourlyData.peaks.orders?.total_orders || 0} orders)`);
          contextParts.push(`- Peak Revenue Hour: ${sampleOrdersHourlyData.peaks.revenue?.hour || 0}:00 (${formatCurrency(sampleOrdersHourlyData.peaks.revenue?.total_revenue || 0)})`);
        }
        contextParts.push('');
      }

      // Top Sample Products
      if (topSampleProductsData && topSampleProductsData.length > 0) {
        contextParts.push('## Top Sample Products');
        contextParts.push('Product | SKU | Quantity | Revenue | Avg Price | Orders');
        contextParts.push('--- | --- | --- | --- | --- | ---');
        topSampleProductsData.slice(0, 20).forEach((product: any) => {
          const productName = product.product_name || 'Unknown';
          contextParts.push(`${productName} | ${product.sku || 'N/A'} | ${product.total_qty_ordered?.toLocaleString() || 0} | ${formatCurrency(product.total_revenue || 0)} | ${formatCurrency(product.avg_price || 0)} | ${product.order_count?.toLocaleString() || 0}`);
        });
        contextParts.push('');
      }

      // Sample Orders by Collection
      if (sampleOrdersByCollectionData && sampleOrdersByCollectionData.length > 0) {
        contextParts.push('## Sample Orders by Collection');
        contextParts.push('Collection | Total Items | Total Orders');
        contextParts.push('--- | --- | ---');
        sampleOrdersByCollectionData.forEach((collection: any) => {
          contextParts.push(`${collection.collection} | ${collection.total_items?.toLocaleString() || 0} | ${collection.total_orders?.toLocaleString() || 0}`);
        });
        contextParts.push('');
      }

      // SEO Insights
      if (seoInsightsData?.data) {
        contextParts.push('## SEO Performance');
        const seoData = seoInsightsData.data;
        if (seoData.overview) {
          contextParts.push('### Overview:');
          contextParts.push(`- Total Clicks: ${(seoData.overview.total_clicks || 0).toLocaleString()}`);
          contextParts.push(`- Total Impressions: ${(seoData.overview.total_impressions || 0).toLocaleString()}`);
          contextParts.push(`- Average Position: ${(seoData.overview.avg_position || 0).toFixed(1)}`);
          contextParts.push(`- Average CTR: ${((seoData.overview.avg_ctr || 0) * 100).toFixed(2)}%`);
          contextParts.push(`- Attributed Revenue: ${formatCurrency(seoData.overview.total_attributed_revenue || 0)}`);
        }
        if (seoData.topQueries && seoData.topQueries.length > 0) {
          contextParts.push(`\n### Top Queries by Clicks (${seoData.topQueries.length} queries):`);
          seoData.topQueries.slice(0, 20).forEach((query: any) => {
            contextParts.push(`- "${query.query}": ${query.total_clicks || 0} clicks, ${query.total_impressions || 0} impressions, Position ${query.avg_position?.toFixed(1) || 0}, CTR ${((query.avg_ctr || 0) * 100).toFixed(2)}%, Revenue ${formatCurrency(query.attributed_revenue || 0)}`);
          });
        }
        if (seoData.topImpressions && seoData.topImpressions.length > 0) {
          contextParts.push(`\n### Top Queries by Impressions (${seoData.topImpressions.length} queries):`);
          seoData.topImpressions.slice(0, 10).forEach((query: any) => {
            contextParts.push(`- "${query.query}": ${query.total_impressions || 0} impressions, ${query.total_clicks || 0} clicks, Position ${query.avg_position?.toFixed(1) || 0}`);
          });
        }
        if (seoData.topPages && seoData.topPages.length > 0) {
          contextParts.push(`\n### Top Pages by Clicks (${seoData.topPages.length} pages):`);
          seoData.topPages.slice(0, 10).forEach((page: any) => {
            contextParts.push(`- ${page.page}: ${page.total_clicks || 0} clicks, ${page.total_impressions || 0} impressions, Position ${page.avg_position?.toFixed(1) || 0}`);
          });
        }
        if (seoData.positionDistribution && seoData.positionDistribution.length > 0) {
          contextParts.push(`\n### Position Distribution:`);
          seoData.positionDistribution.forEach((dist: any) => {
            contextParts.push(`- Position ${dist.position}: ${dist.count || 0} queries`);
          });
        }
        contextParts.push('');
      }

      if (marketingData?.data) {
        contextParts.push('## Marketing Performance');
        if (marketingData.data.channels) {
          contextParts.push('### Marketing Channels:');
          marketingData.data.channels.forEach((channel: any) => {
            contextParts.push(`- ${channel.channel}: Spend $${channel.total_spend?.toLocaleString() || 0}, Revenue $${channel.total_revenue?.toLocaleString() || 0}, ROAS ${channel.roas?.toFixed(2) || 0}x`);
          });
        }
        if (marketingData.data.seo && marketingData.data.seo.length > 0) {
          contextParts.push('### Top SEO Keywords:');
          marketingData.data.seo.slice(0, 5).forEach((seo: any) => {
            contextParts.push(`- "${seo.query_text}": ${seo.total_clicks || 0} clicks, Position ${seo.avg_position?.toFixed(1) || 0}`);
          });
        }
        contextParts.push('');
      }

      if (websiteData?.data) {
        contextParts.push('## Website Behavior');
        const metrics = websiteData.data.metrics;
        contextParts.push(`- Total Sessions: ${metrics.total_sessions?.toLocaleString() || 0}`);
        contextParts.push(`- Total Pageviews: ${metrics.total_pageviews?.toLocaleString() || 0}`);
        contextParts.push(`- Total Users: ${metrics.total_users?.toLocaleString() || 0}`);
        contextParts.push(`- Average Session Duration: ${Math.round(metrics.avg_session_duration || 0)} seconds`);
        contextParts.push(`- Bounce Rate: ${((metrics.bounce_rate || 0) * 100).toFixed(1)}%`);
        if (websiteData.data.trafficSources && websiteData.data.trafficSources.length > 0) {
          contextParts.push('### Top Traffic Sources:');
          websiteData.data.trafficSources.slice(0, 5).forEach((source: any) => {
            contextParts.push(`- ${source.traffic_source}: ${source.total_sessions || 0} sessions`);
          });
        }
        contextParts.push('');
      }

      if (annotationsData.length > 0) {
        contextParts.push('## Annotations (Important Events)');
        annotationsData.forEach((annotation: any) => {
          const startDate = new Date(annotation.startDate).toISOString().split('T')[0];
          const endDate = new Date(annotation.endDate || annotation.startDate).toISOString().split('T')[0];
          const isSingleDay = startDate === endDate;

          if (isSingleDay) {
            contextParts.push(`- [${annotation.type.toUpperCase()}] Date: ${startDate} - ${annotation.title}`);
          } else {
            contextParts.push(`- [${annotation.type.toUpperCase()}] Start Date: ${startDate}, End Date: ${endDate} - ${annotation.title}`);
          }
          if (annotation.description) {
            contextParts.push(`  Description: ${annotation.description}`);
          }
        });
        contextParts.push('');
      }

      if (targetsData.length > 0) {
        contextParts.push('## Targets & Goals');
        targetsData.forEach((target: any) => {
          contextParts.push(`- ${target.metric}: Target ${target.value}${target.unit || ''} (${target.granularity || 'monthly'})`);
        });
        contextParts.push('');
      }

      const contextSummary = contextParts.join('\n');

      // System prompt for generating comprehensive insights
      const SYSTEM_PROMPT = `You are an AI analytics assistant for an eCommerce dashboard called "Insight" built by Tom&Co.

Your task is to analyze all available data and provide comprehensive insights about what happened during the selected period.

You have access to EXTENSIVE, comprehensive, detailed data:

**CORE SALES DATA:**
- **Sales Performance Data**: Complete overview metrics (revenue, orders, AOV, customers, taxes, shipping, discounts) PLUS full daily breakdown showing day-by-day trends
- **Order Status Breakdowns**: Complete vs pending vs processing vs canceled orders with revenue breakdowns, plus sample vs non-sample order breakdowns
- **Hourly Sales Patterns**: Sales broken down by hour of day (0-23), showing peak shopping times, average orders/revenue per day by hour, and peak hours analysis

**CUSTOMER DATA:**
- **Customer Metrics**: Customer segmentation (registered vs guest), daily customer trends, and revenue per customer analysis with full daily breakdowns

**PRODUCT DATA:**
- **Product Performance**: Rich product data including top 200+ products with detailed metrics:
  - Revenue, quantity sold, average price, discounts, order counts
  - Fulfillment details: invoiced, shipped, canceled, refunded quantities
  - Price analysis: min/max/average prices for products with price variations
  - Product performance distribution (top 10 products revenue percentage)
- **Category Breakdown**: Revenue and quantity breakdown by category/collection group for main orders with percentages
- **Collections Performance**: Top collections by revenue and quantity with order counts

**SAMPLE ORDERS DATA:**
- **Sample Orders Summary**: Total sample orders, quantity, and revenue metrics
- **Sample Orders Daily**: Daily breakdown of sample orders with trends and items per order
- **Sample Orders Hourly**: Hourly patterns for sample orders with peak hours analysis
- **Top Sample Products**: Top performing sample products with metrics (quantity, revenue, price, orders)
- **Sample Orders by Collection**: Sample order breakdown by collection/category

**MARKETING & SEO DATA:**
- **Marketing Performance**: Channel-level performance (Google Ads, Facebook, Pinterest, SEO), spend, ROAS, and keyword analysis
- **SEO Performance**: Comprehensive SEO data including:
  - Overview metrics (clicks, impressions, average position, CTR, attributed revenue)
  - Top queries by clicks and impressions (with position, CTR, revenue)
  - Top pages by clicks
  - Position distribution analysis

**WEBSITE DATA:**
- **Website Behavior**: Sessions, pageviews, bounce rate, traffic sources, user engagement metrics

**CONTEXTUAL DATA:**
- **Annotations**: User-created notes about important events during this period with dates, types, titles, and descriptions
- **Targets**: Revenue and performance goals to compare against with granularity

Your analysis should:
1. **Identify key trends and patterns** across all data sources - use the daily breakdowns to spot day-to-day trends, use hourly data to identify shopping patterns
2. **Highlight significant changes or anomalies** - look for spikes or drops in daily metrics, unusual hourly patterns
3. **Connect annotations to changes in metrics** when relevant - correlate events with data changes
4. **Compare performance against targets** when available
5. **Explain correlations between different metrics** - connect marketing spend to revenue, traffic sources to conversions, hourly patterns to customer behavior
6. **Provide actionable insights and recommendations** based on the comprehensive data
7. **Be specific and reference actual numbers** from the detailed data - use daily breakdowns, hourly patterns, product-level insights
8. **Analyze temporal patterns** - use the daily and hourly breakdowns to identify when customers shop and how sales patterns vary over time
9. **Provide product-level insights** - analyze the rich product data to identify opportunities, top performers, and product mix insights
10. **Customer segmentation insights** - analyze registered vs guest customers and their behavior patterns

Format your response using markdown:
- Use **bold** for emphasis and key metrics
- Use ## for main sections
- Use ### for subsections
- Use bullet points for lists
- Use tables when comparing metrics

Structure your insights as:
## Executive Summary
(Brief overview of the period)

## Sales Performance Analysis
(Detailed analysis of revenue, orders, AOV, etc.)

## Marketing Performance Analysis
(Analysis of marketing channels, spend efficiency, SEO performance)

## Website Performance Analysis
(Analysis of traffic, engagement, user behavior)

## Key Events & Correlations
(How annotations relate to changes in metrics)

## Recommendations
(Actionable next steps based on the analysis)`;

      // Prepare metadata for the frontend
      const metadata = {
        period: { startDate, endDate },
        dataSources: {
          sales: !!salesData,
          hourlySales: !!hourlySalesData,
          customerMetrics: !!customerMetricsData,
          products: products && products.length > 0,
          categoryBreakdown: !!categoryBreakdownData,
          collectionsPerformance: !!collectionsPerformanceData,
          sampleOrdersSummary: !!sampleOrdersSummaryData,
          sampleOrdersDaily: !!sampleOrdersDailyData,
          sampleOrdersHourly: !!sampleOrdersHourlyData,
          topSampleProducts: !!topSampleProductsData,
          sampleOrdersByCollection: !!sampleOrdersByCollectionData,
          marketing: !!marketingData,
          seoInsights: !!seoInsightsData,
          website: !!websiteData,
          annotations: annotationsData.length,
          targets: targetsData.length,
        },
        contextSummary,
        systemPrompt: SYSTEM_PROMPT,
      };

      // Start streaming response
      const { stream } = await ai.generateStream({
        model: googleAI.model('gemini-2.5-flash'),
        system: SYSTEM_PROMPT,
        prompt: `Analyze the following data and provide comprehensive insights for the period ${startDate} to ${endDate}:\n\n${contextSummary}`,
        config: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      });

      // Create a ReadableStream to stream metadata + content
      const responseStream = new ReadableStream({
        async start(controller) {
          // 1. Send metadata as a JSON line
          controller.enqueue(new TextEncoder().encode(JSON.stringify(metadata) + '\n'));

          // 2. Stream the AI response chunks
          try {
            for await (const chunk of stream) {
              const text = chunk.text;
              if (text) {
                controller.enqueue(new TextEncoder().encode(text));
              }
            }
          } catch (error) {
            console.error('Error streaming from AI:', error);
            controller.enqueue(new TextEncoder().encode('\n\n**Error generating insights.**'));
          } finally {
            controller.close();
          }
        },
      });

      return new NextResponse(responseStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });

    } catch (error: any) {
      console.error('[Insights GET] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: `Internal server error: ${error.message || 'Unknown error'}`,
        },
        { status: 500 }
      );
    }
  });
}
// POST - Generate insights from pre-fetched data
export async function POST(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      const {
        clientId,
        websiteId,
        startDate,
        endDate,
        salesData,
        hourlySalesData,
        customerMetricsData,
        productsData,
        marketingData,
        websiteData,
        annotationsData,
        targetsData,
      } = body;

      if (!clientId || !startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameters: clientId, startDate, endDate' },
          { status: 400 }
        );
      }

      // Check authorization
      if (user.role === 'client' && user.clientId !== clientId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }

      if (!adminDb) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      // Fetch client data to get client name
      const clientDoc = await adminDb
        .collection('clients')
        .doc(clientId)
        .get();

      if (!clientDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Client not found' },
          { status: 404 }
        );
      }

      const clientData = clientDoc.data();
      const datasetId = clientData?.bigQueryDatasetId;

      // Fetch data using data layer if not provided
      let salesDataActual = salesData?.data || salesData;
      let hourlySalesDataActual = hourlySalesData?.data || hourlySalesData;
      let customerMetricsDataActual = customerMetricsData?.data || customerMetricsData;
      let productsDataActual = productsData?.data || productsData;
      const marketingDataActual = marketingData?.data || marketingData;
      const websiteDataActual = websiteData?.data || websiteData;

      // Initialize breakdown data variables
      let categoryBreakdownDataActual: any = null;
      let collectionsPerformanceDataActual: any = null;
      let sampleOrdersSummaryDataActual: any = null;
      let sampleOrdersDailyDataActual: any = null;
      let sampleOrdersHourlyDataActual: any = null;
      let topSampleProductsDataActual: any = null;
      let sampleOrdersByCollectionDataActual: any = null;

      // If data not provided, fetch using data layer
      if (datasetId) {
        const queryOptions = {
          datasetId,
          clientId,
          websiteId: websiteId || 'all_combined',
          startDate,
          endDate,
        };

        const [
          fetchedSalesData,
          fetchedHourlySalesData,
          fetchedCustomerMetricsData,
          fetchedProductsData,
          fetchedCategoryBreakdownData,
          fetchedCollectionsPerformanceData,
          fetchedSampleOrdersSummaryData,
          fetchedSampleOrdersDailyData,
          fetchedSampleOrdersHourlyData,
          fetchedTopSampleProductsData,
          fetchedSampleOrdersByCollectionData,
        ] = await Promise.all([
          !salesDataActual
            ? getSalesOverview(queryOptions).catch((err) => {
              console.error('Error fetching sales overview:', err);
              return null;
            })
            : Promise.resolve(null),
          !hourlySalesDataActual
            ? getHourlySales(queryOptions).catch((err) => {
              console.error('Error fetching hourly sales:', err);
              return null;
            })
            : Promise.resolve(null),
          !customerMetricsDataActual
            ? getCustomerMetrics(queryOptions).catch((err) => {
              console.error('Error fetching customer metrics:', err);
              return null;
            })
            : Promise.resolve(null),
          !productsDataActual
            ? getTopProducts({ ...queryOptions, limit: 200, sortBy: 'revenue' }).catch((err) => {
              console.error('Error fetching top products:', err);
              return null;
            })
            : Promise.resolve(null),
          getCategoryBreakdown({ ...queryOptions, orderType: 'main' }).catch((err) => {
            console.error('Error fetching category breakdown:', err);
            return null;
          }),
          getCollectionsPerformance({ ...queryOptions, orderType: 'main', limit: 50, sortBy: 'revenue' }).catch((err) => {
            console.error('Error fetching collections performance:', err);
            return null;
          }),
          getSampleOrdersSummary(queryOptions).catch((err) => {
            console.error('Error fetching sample orders summary:', err);
            return null;
          }),
          getSampleOrdersDaily(queryOptions).catch((err) => {
            console.error('Error fetching sample orders daily:', err);
            return null;
          }),
          getSampleOrdersHourly(queryOptions).catch((err) => {
            console.error('Error fetching sample orders hourly:', err);
            return null;
          }),
          getTopSampleProducts({ ...queryOptions, limit: 50 }).catch((err) => {
            console.error('Error fetching top sample products:', err);
            return null;
          }),
          getSampleOrdersByCollection(queryOptions).catch((err) => {
            console.error('Error fetching sample orders by collection:', err);
            return null;
          }),
        ]);

        if (fetchedSalesData) salesDataActual = fetchedSalesData;
        if (fetchedHourlySalesData) hourlySalesDataActual = fetchedHourlySalesData;
        if (fetchedCustomerMetricsData) customerMetricsDataActual = fetchedCustomerMetricsData;
        if (fetchedProductsData) productsDataActual = fetchedProductsData;

        // Always use fetched breakdown data
        categoryBreakdownDataActual = fetchedCategoryBreakdownData;
        collectionsPerformanceDataActual = fetchedCollectionsPerformanceData;
        sampleOrdersSummaryDataActual = fetchedSampleOrdersSummaryData;
        sampleOrdersDailyDataActual = fetchedSampleOrdersDailyData;
        sampleOrdersHourlyDataActual = fetchedSampleOrdersHourlyData;
        topSampleProductsDataActual = fetchedTopSampleProductsData;
        sampleOrdersByCollectionDataActual = fetchedSampleOrdersByCollectionData;
      }

      // Get currency from client data or default to GBP
      const currency = (clientData?.currency as string) || 'GBP';
      const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency;

      // Helper function to format currency values
      const formatCurrency = (value: number): string => {
        return `${currencySymbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      // Build context for AI (same logic as GET endpoint)
      const contextParts: string[] = [];

      contextParts.push(`## Period Analysis: ${startDate} to ${endDate}`);
      contextParts.push(`Client: ${clientData?.clientName || clientId}`);
      contextParts.push(`Website: ${websiteId === 'all_combined' ? 'All Websites Combined' : websiteId}`);
      contextParts.push(`Currency: ${currency} (${currencySymbol})\n`);

      if (salesDataActual) {
        contextParts.push('## Sales Performance Overview');
        const summary = salesDataActual.summary || salesDataActual.data?.summary;
        if (summary) {
          contextParts.push(`### Summary Metrics:`);
          contextParts.push(`- Total Revenue: ${formatCurrency(summary.total_revenue || 0)}`);
          contextParts.push(`- Total Orders: ${(summary.total_orders || 0).toLocaleString()}`);
          contextParts.push(`- Average Order Value: ${formatCurrency(summary.aov || 0)}`);
          contextParts.push(`- Unique Customers: ${(summary.unique_customers || 0).toLocaleString()}`);
          contextParts.push(`- Items per Order: ${(summary.items_per_order || 0).toFixed(2)}`);
          if (summary.total_discounts) {
            contextParts.push(`- Total Discounts: ${formatCurrency(summary.total_discounts)}`);
          }
          contextParts.push(`- Subtotal: ${formatCurrency(summary.subtotal || 0)}`);
          contextParts.push(`- Total Tax: ${formatCurrency(summary.total_tax || 0)}`);
          contextParts.push(`- Total Shipping: ${formatCurrency(summary.total_shipping || 0)}`);
          contextParts.push(`- Orders Complete: ${(summary.orders_complete || 0).toLocaleString()}`);
          contextParts.push(`- Orders Pending: ${(summary.orders_pending || 0).toLocaleString()}`);
          contextParts.push(`- Orders Processing: ${(summary.orders_processing || 0).toLocaleString()}`);
          contextParts.push(`- Orders Canceled: ${(summary.orders_canceled || 0).toLocaleString()}`);
        }

        // Include daily breakdown for temporal analysis
        const daily = salesDataActual.daily || salesDataActual.data?.daily || [];
        if (daily && daily.length > 0) {
          contextParts.push(`\n### Daily Breakdown (${daily.length} days):`);
          contextParts.push('Date | Orders | Revenue | Customers | AOV | Items | Discounts');
          contextParts.push('--- | --- | --- | --- | --- | --- | ---');
          daily.forEach((day: any) => {
            const dayAov = day.total_orders > 0 ? (day.total_revenue / day.total_orders) : 0;
            contextParts.push(`${day.date} | ${day.total_orders || 0} | ${formatCurrency(day.total_revenue || 0)} | ${day.unique_customers || 0} | ${formatCurrency(dayAov)} | ${day.total_items || 0} | ${formatCurrency(day.total_discounts || 0)}`);
          });
        }
        contextParts.push('');
      } else {
        contextParts.push('## Sales Performance');
        contextParts.push('- No sales data available for this period');
        contextParts.push('');
      }

      // Add hourly sales data for temporal patterns
      if (hourlySalesDataActual) {
        contextParts.push('## Hourly Sales Patterns');
        if (hourlySalesDataActual.hourly && Array.isArray(hourlySalesDataActual.hourly)) {
          contextParts.push('### Sales by Hour of Day:');
          contextParts.push('Hour | Total Orders | Total Revenue | Avg Orders/Day | Avg Revenue/Day');
          contextParts.push('--- | --- | --- | --- | ---');
          hourlySalesDataActual.hourly.forEach((hour: any) => {
            contextParts.push(`${hour.hour}:00 | ${hour.total_orders || 0} | ${formatCurrency(hour.total_revenue || 0)} | ${hour.avg_orders_per_day?.toFixed(2) || 0} | ${formatCurrency(hour.avg_revenue_per_day || 0)}`);
          });
          if (hourlySalesDataActual.peaks) {
            contextParts.push(`\n### Peak Hours:`);
            contextParts.push(`- Peak Orders Hour: ${hourlySalesDataActual.peaks.orders?.hour || 0}:00 (${hourlySalesDataActual.peaks.orders?.total_orders || 0} orders)`);
            contextParts.push(`- Peak Revenue Hour: ${hourlySalesDataActual.peaks.revenue?.hour || 0}:00 (${formatCurrency(hourlySalesDataActual.peaks.revenue?.total_revenue || 0)})`);
          }
        }
        contextParts.push('');
      }

      // Add customer metrics
      if (customerMetricsDataActual) {
        contextParts.push('## Customer Metrics');
        const customerSummary = customerMetricsDataActual.summary || customerMetricsDataActual.data?.summary;
        if (customerSummary) {
          contextParts.push(`### Summary:`);
          contextParts.push(`- Total Unique Customers: ${(customerSummary.total_unique_customers || 0).toLocaleString()}`);
          contextParts.push(`- Total Registered Customers: ${(customerSummary.total_registered_customers || 0).toLocaleString()}`);
          contextParts.push(`- Total Guest Customers: ${(customerSummary.total_guest_customers || 0).toLocaleString()}`);
          contextParts.push(`- Average Revenue per Customer: ${formatCurrency(customerSummary.avg_revenue_per_customer || 0)}`);
        }

        const customerDaily = customerMetricsDataActual.daily || customerMetricsDataActual.data?.daily || [];
        if (customerDaily && customerDaily.length > 0) {
          contextParts.push(`\n### Daily Customer Breakdown (${customerDaily.length} days):`);
          contextParts.push('Date | Unique Customers | Registered | Guest | Revenue/Customer');
          contextParts.push('--- | --- | --- | --- | ---');
          customerDaily.forEach((day: any) => {
            contextParts.push(`${day.date} | ${day.unique_customers || 0} | ${day.registered_customers || 0} | ${day.guest_customers || 0} | ${formatCurrency(day.revenue_per_customer || 0)}`);
          });
        }
        contextParts.push('');
      }

      // Handle products data - API returns { success: true, data: array } or could be direct array
      let products: any[] = [];
      if (Array.isArray(productsDataActual)) {
        products = productsDataActual;
      } else if (productsDataActual?.products) {
        products = productsDataActual.products;
      } else if (productsDataActual?.data?.products) {
        products = productsDataActual.data.products;
      }

      if (products && products.length > 0) {
        contextParts.push('## Product Performance Analysis');
        contextParts.push(`### Product Overview (${products.length} products):`);

        // Top products by revenue
        contextParts.push(`\n#### Top 20 Products by Revenue:`);
        products.slice(0, 20).forEach((product: any, index: number) => {
          const productName = product.product_name || product.title || 'Unknown';
          const revenue = product.total_revenue || product.revenue || 0;
          const quantity = product.total_qty_ordered || product.quantity_sold || 0;
          const avgPrice = product.avg_price || (revenue > 0 && quantity > 0 ? revenue / quantity : 0);
          const orderCount = product.order_count || 0;
          contextParts.push(`${index + 1}. ${productName} (SKU: ${product.sku || 'N/A'})`);
          contextParts.push(`   - Revenue: ${formatCurrency(revenue)}`);
          contextParts.push(`   - Quantity Sold: ${quantity.toLocaleString()}`);
          contextParts.push(`   - Average Price: ${formatCurrency(avgPrice)}`);
          contextParts.push(`   - Orders: ${orderCount.toLocaleString()}`);
          if (product.total_discount) {
            contextParts.push(`   - Discounts: ${formatCurrency(product.total_discount)}`);
          }
        });

        // Summary statistics
        const totalRevenue = products.reduce((sum: number, p: any) => sum + (p.total_revenue || p.revenue || 0), 0);
        const totalQuantity = products.reduce((sum: number, p: any) => sum + (p.total_qty_ordered || p.quantity_sold || 0), 0);
        const totalOrders = products.reduce((sum: number, p: any) => sum + (p.order_count || 0), 0);
        const avgPrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

        contextParts.push(`\n### Product Summary:`);
        contextParts.push(`- Total Products Analyzed: ${products.length}`);
        contextParts.push(`- Combined Revenue: ${formatCurrency(totalRevenue)}`);
        contextParts.push(`- Combined Quantity Sold: ${totalQuantity.toLocaleString()}`);
        contextParts.push(`- Combined Orders: ${totalOrders.toLocaleString()}`);
        contextParts.push(`- Average Product Price: ${formatCurrency(avgPrice)}`);

        // Product performance distribution
        const top10Revenue = products.slice(0, 10).reduce((sum: number, p: any) => sum + (p.total_revenue || p.revenue || 0), 0);
        const top10Percentage = totalRevenue > 0 ? (top10Revenue / totalRevenue * 100).toFixed(1) : 0;
        contextParts.push(`- Top 10 Products Revenue: ${formatCurrency(top10Revenue)} (${top10Percentage}% of total)`);
        contextParts.push('');
      }

      if (marketingDataActual) {
        contextParts.push('## Marketing Performance');
        const channels = marketingDataActual.channels || marketingDataActual.data?.channels;
        if (channels && Array.isArray(channels)) {
          contextParts.push('### Marketing Channels:');
          channels.forEach((channel: any) => {
            contextParts.push(`- ${channel.channel}: Spend ${formatCurrency(channel.total_spend || 0)}, Revenue ${formatCurrency(channel.total_revenue || 0)}, ROAS ${channel.roas?.toFixed(2) || 0}x`);
          });
        }
        const seo = marketingDataActual.seo || marketingDataActual.data?.seo;
        if (seo && Array.isArray(seo) && seo.length > 0) {
          contextParts.push('### Top SEO Keywords:');
          seo.slice(0, 5).forEach((seoItem: any) => {
            contextParts.push(`- "${seoItem.query_text}": ${seoItem.total_clicks || 0} clicks, Position ${seoItem.avg_position?.toFixed(1) || 0}`);
          });
        }
        contextParts.push('');
      }

      if (websiteDataActual) {
        contextParts.push('## Website Behavior');
        const metrics = websiteDataActual.metrics || websiteDataActual.data?.metrics;
        if (metrics) {
          contextParts.push(`- Total Sessions: ${metrics.total_sessions?.toLocaleString() || 0}`);
          contextParts.push(`- Total Pageviews: ${metrics.total_pageviews?.toLocaleString() || 0}`);
          contextParts.push(`- Total Users: ${metrics.total_users?.toLocaleString() || 0}`);
          contextParts.push(`- Average Session Duration: ${Math.round(metrics.avg_session_duration || 0)} seconds`);
          contextParts.push(`- Bounce Rate: ${((metrics.bounce_rate || 0) * 100).toFixed(1)}%`);
        }
        const trafficSources = websiteDataActual.trafficSources || websiteDataActual.data?.trafficSources;
        if (trafficSources && Array.isArray(trafficSources) && trafficSources.length > 0) {
          contextParts.push('### Top Traffic Sources:');
          trafficSources.slice(0, 5).forEach((source: any) => {
            contextParts.push(`- ${source.traffic_source}: ${source.total_sessions || 0} sessions`);
          });
        }
        contextParts.push('');
      }

      if (annotationsData && annotationsData.length > 0) {
        contextParts.push('## Annotations (Important Events)');
        annotationsData.forEach((annotation: any) => {
          const startDate = new Date(annotation.startDate).toISOString().split('T')[0];
          const endDate = new Date(annotation.endDate || annotation.startDate).toISOString().split('T')[0];
          const isSingleDay = startDate === endDate;

          if (isSingleDay) {
            contextParts.push(`- [${annotation.type.toUpperCase()}] Date: ${startDate} - ${annotation.title}`);
          } else {
            contextParts.push(`- [${annotation.type.toUpperCase()}] Start Date: ${startDate}, End Date: ${endDate} - ${annotation.title}`);
          }
          if (annotation.description) {
            contextParts.push(`  Description: ${annotation.description}`);
          }
        });
        contextParts.push('');
      }

      if (targetsData && targetsData.length > 0) {
        contextParts.push('## Targets & Goals');
        targetsData.forEach((target: any) => {
          contextParts.push(`- ${target.metric}: Target ${target.value}${target.unit || ''} (${target.granularity || 'monthly'})`);
        });
        contextParts.push('');
      }

      const contextSummary = contextParts.join('\n');

      // Log context summary for debugging (remove in production)
      console.log('Context summary length:', contextSummary.length);
      console.log('Data sources available:', {
        sales: !!salesDataActual,
        products: !!productsDataActual,
        marketing: !!marketingDataActual,
        website: !!websiteDataActual,
        annotations: annotationsData?.length || 0,
        targets: targetsData?.length || 0,
      });

      // System prompt (same as GET endpoint)
      const SYSTEM_PROMPT = `You are an AI analytics assistant for an eCommerce dashboard called "Insight" built by Tom&Co.

Your task is to analyze all available data and provide comprehensive insights about what happened during the selected period.

You have access to comprehensive, detailed data:
- **Sales Performance Data**: Complete overview metrics (revenue, orders, AOV, customers, taxes, shipping, discounts) PLUS full daily breakdown showing day-by-day trends
- **Hourly Sales Patterns**: Sales broken down by hour of day, showing peak shopping times and temporal patterns
- **Customer Metrics**: Customer segmentation (registered vs guest), daily customer trends, and revenue per customer analysis
- **Product Performance**: Rich product data including top 100 products with detailed metrics (revenue, quantity, average price, discounts, order counts) and product performance distribution
- **Marketing Performance**: Channel-level performance (Google Ads, Facebook, Pinterest, SEO), spend, ROAS, and keyword analysis
- **Website Behavior**: Sessions, pageviews, bounce rate, traffic sources, user engagement metrics
- **Annotations**: User-created notes about important events during this period
- **Targets**: Revenue and performance goals to compare against

Your analysis should:
1. **Identify key trends and patterns** across all data sources - use the daily breakdowns to spot day-to-day trends, use hourly data to identify shopping patterns
2. **Highlight significant changes or anomalies** - look for spikes or drops in daily metrics, unusual hourly patterns
3. **Connect annotations to changes in metrics** when relevant - correlate events with data changes
4. **Compare performance against targets** when available
5. **Explain correlations between different metrics** - connect marketing spend to revenue, traffic sources to conversions, hourly patterns to customer behavior
6. **Provide actionable insights and recommendations** based on the comprehensive data
7. **Be specific and reference actual numbers** from the detailed data - use daily breakdowns, hourly patterns, product-level insights
8. **Analyze temporal patterns** - use the daily and hourly breakdowns to identify when customers shop and how sales patterns vary over time
9. **Provide product-level insights** - analyze the rich product data to identify opportunities, top performers, and product mix insights
10. **Customer segmentation insights** - analyze registered vs guest customers and their behavior patterns

Format your response using markdown:
- Use **bold** for emphasis and key metrics
- Use ## for main sections
- Use ### for subsections
- Use bullet points for lists
- Use tables when comparing metrics

Structure your insights as:
## Executive Summary
(Brief overview of the period)

## Sales Performance Analysis
(Detailed analysis of revenue, orders, AOV, etc.)

## Marketing Performance Analysis
(Analysis of marketing channels, spend efficiency, SEO performance)

## Website Performance Analysis
(Analysis of traffic, engagement, user behavior)

## Key Events & Correlations
(How annotations relate to changes in metrics)

## Recommendations
(Actionable next steps based on the analysis)`;

      // Define the output schema - Use a single required field to ensure consistent response
      const outputSchema = z.object({
        insights: z.string().describe('Comprehensive AI-generated insights in markdown format. Must include Executive Summary, Sales Performance Analysis, Marketing Performance Analysis, Website Performance Analysis, Key Events & Correlations, and Recommendations sections.'),
      });

      // Generate insights
      let output;
      try {
        console.log('Calling Gemini API with context length:', contextSummary.length);
        const result = await ai.generate({
          model: googleAI.model('gemini-2.5-flash'),
          system: SYSTEM_PROMPT,
          prompt: `Analyze the following data and provide comprehensive insights for the period ${startDate} to ${endDate}:\n\n${contextSummary}`,
          output: {
            schema: outputSchema,
          },
          config: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        });
        output = result.output;
        console.log('Gemini API raw result:', JSON.stringify(result, null, 2).substring(0, 1000));
        console.log('Gemini API output:', output ? JSON.stringify(output, null, 2).substring(0, 1000) : 'No output');
        console.log('Output keys:', output ? Object.keys(output) : 'N/A');
        console.log('Has insights?', !!output?.insights);
        if (output?.insights) {
          console.log('Insights type:', Array.isArray(output.insights) ? 'array' : typeof output.insights, 'length:', Array.isArray(output.insights) ? output.insights.length : (typeof output.insights === 'string' ? output.insights.length : 'N/A'));
          if (typeof output.insights === 'string') {
            console.log('Insights preview (first 300 chars):', output.insights.substring(0, 300));
          }
        }
      } catch (error: any) {
        console.error('Gemini API error:', error);
        console.error('Error stack:', error.stack);
        return NextResponse.json(
          {
            success: false,
            error: `AI generation failed: ${error.message || 'Unknown error'}`
          },
          { status: 500 }
        );
      }

      // Handle response - Gemini may return "analysis" instead of "insights" despite schema
      // Check both fields since Gemini doesn't always follow the schema strictly
      // Also check for nested structures or text fields
      let insightsText: any = null;

      // Cast output to any to access runtime properties that may not be in schema
      const outputAny = output as any;

      // Try multiple possible field names and structures
      if (output?.insights) {
        insightsText = output.insights;
        console.log('Found insights in output.insights');
      } else if (outputAny?.analysis) {
        insightsText = outputAny.analysis;
        console.warn('Found insights in output.analysis instead of output.insights');
      } else if (outputAny?.text) {
        insightsText = outputAny.text;
        console.warn('Found insights in output.text');
      } else if (typeof outputAny === 'string') {
        insightsText = outputAny;
        console.warn('Output is a direct string');
      } else if (outputAny && typeof outputAny === 'object') {
        // Check if output is an object with multiple string fields (like section headers)
        // This happens when Gemini returns { "Executive Summary": "...", "Sales Performance": "...", etc. }
        const stringFields = Object.entries(outputAny).filter(([_, value]) => typeof value === 'string' && value.length > 50);

        if (stringFields.length > 1) {
          // Multiple string fields - likely section headers, join them all
          console.warn(`Found ${stringFields.length} string fields (likely sections). Joining all fields.`);
          const sections = stringFields.map(([key, value]) => {
            // Add the key as a header if it looks like a section name
            if (key.match(/^[A-Z][a-zA-Z\s&]+$/)) {
              return `## ${key}\n\n${value}`;
            }
            return value;
          });
          insightsText = sections.join('\n\n');
        } else if (stringFields.length === 1) {
          // Single string field - use it
          insightsText = stringFields[0][1];
          console.warn(`Found insights in single field: ${stringFields[0][0]}`);
        } else {
          // Check for array fields
          const arrayFields = Object.entries(outputAny).filter(([_, value]) => Array.isArray(value));
          if (arrayFields.length > 0) {
            // Use the first array field
            insightsText = arrayFields[0][1];
            console.warn(`Found insights in array field: ${arrayFields[0][0]}`);
          } else {
            console.error('Could not find insights in output. Available fields:', Object.keys(outputAny));
            console.error('Output structure:', JSON.stringify(outputAny, null, 2).substring(0, 2000));
          }
        }
      }

      // Handle array format (some Gemini responses return arrays)
      let finalInsights = '';
      if (insightsText) {
        if (Array.isArray(insightsText)) {
          console.log('Joining array of', insightsText.length, 'items');
          finalInsights = insightsText.join('\n\n');
        } else if (typeof insightsText === 'string') {
          finalInsights = insightsText.trim();
        } else {
          console.error('Insights text is not a string or array. Type:', typeof insightsText, 'Value:', insightsText);
        }
      } else {
        console.error('No insightsText found. Output:', JSON.stringify(output, null, 2).substring(0, 2000));
      }

      console.log('Final insights length:', finalInsights.length);
      if (finalInsights.length > 0) {
        console.log('Final insights preview (first 300 chars):', finalInsights.substring(0, 300));
      } else {
        console.error('No insights extracted. Output structure:', JSON.stringify(output, null, 2).substring(0, 2000));
      }

      if (!output || !finalInsights || finalInsights.trim() === '') {
        console.error('Empty finalInsights detected. Raw output:', JSON.stringify(output).substring(0, 500));
        // Generate a fallback message with available data info
        const fallbackInsights = `## Executive Summary

Based on the available data for ${startDate} to ${endDate}:

${websiteDataActual ? '✓ Website behavior data is available\n' : '✗ Website behavior data not available\n'}
${salesDataActual ? '✓ Sales data is available\n' : '✗ Sales data not available\n'}
${productsDataActual ? '✓ Product performance data is available\n' : '✗ Product data not available\n'}
${marketingDataActual ? '✓ Marketing data is available\n' : '✗ Marketing data not available\n'}
${annotationsData && annotationsData.length > 0 ? `✓ ${annotationsData.length} annotation(s) found\n` : '✗ No annotations found\n'}
${targetsData && targetsData.length > 0 ? `✓ ${targetsData.length} target(s) configured\n` : '✗ No targets configured\n'}

## Analysis

${websiteDataActual ? 'Website performance data is available for analysis. ' : ''}
${salesDataActual ? 'Sales performance data is available for analysis. ' : 'Sales data was not available for this period. '}
${productsDataActual ? 'Product performance data is available for analysis. ' : 'Product data was not available for this period. '}
${marketingDataActual ? 'Marketing performance data is available for analysis. ' : 'Marketing data was not available for this period. '}

## Recommendations

To generate more comprehensive insights, please ensure:
1. All data sources are properly configured and accessible
2. The selected date range contains data from configured sources
3. API endpoints are responding correctly

For best results, ensure sales, product, and marketing data sources are available.`;

        return NextResponse.json({
          success: true,
          data: {
            insights: fallbackInsights,
            period: {
              startDate,
              endDate,
            },
            dataSources: {
              sales: !!salesDataActual,
              products: !!productsDataActual,
              marketing: !!marketingDataActual,
              website: !!websiteDataActual,
              annotations: annotationsData?.length || 0,
              targets: targetsData?.length || 0,
            },
          },
        });
      }

      // Ensure finalInsights is a non-empty string
      if (!finalInsights || finalInsights.trim() === '') {
        console.error('CRITICAL: finalInsights is empty before sending response. Output was:', JSON.stringify(output, null, 2).substring(0, 1000));
        // Don't return empty insights - return error instead
        return NextResponse.json({
          success: false,
          error: 'Failed to extract insights from AI response. Please check server logs for details.',
        }, { status: 500 });
      }

      const responseData: any = {
        success: true,
        data: {
          insights: finalInsights,
          period: {
            startDate,
            endDate,
          },
          dataSources: {
            sales: !!salesDataActual,
            products: !!productsDataActual,
            marketing: !!marketingDataActual,
            website: !!websiteDataActual,
            annotations: annotationsData?.length || 0,
            targets: targetsData?.length || 0,
          },
        },
      };

      // Include contextSummary for admins (what was passed to the AI)
      if (user.role === 'admin') {
        responseData.data.contextSummary = contextSummary;
        responseData.data.systemPrompt = SYSTEM_PROMPT;
      }

      console.log('Sending response with insights length:', finalInsights.length);
      console.log('Response data structure:', JSON.stringify({
        success: responseData.success,
        hasData: !!responseData.data,
        hasInsights: !!responseData.data.insights,
        insightsLength: responseData.data.insights.length,
      }));

      return NextResponse.json(responseData);
    } catch (error: any) {
      console.error('Insights API POST error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

