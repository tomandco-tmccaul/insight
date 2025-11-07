import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { adminDb } from '@/lib/firebase/admin';

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

      // Pass the website ID (Firestore ID) to sales-overview, which will resolve it to BigQuery IDs
      // This allows sales-overview to handle grouped websites properly
      const params = new URLSearchParams({
        dataset_id: datasetId,
        website_id: websiteId || 'all_combined',
        client_id: clientId,
        start_date: startDate,
        end_date: endDate,
      });

      // Get the authorization header from the original request
      const authHeader = req.headers.get('authorization');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      // Fetch data from all sources in parallel
      const [
        salesResponse,
        hourlySalesResponse,
        customerMetricsResponse,
        productsResponse,
        marketingResponse,
        websiteResponse,
        annotationsResponse,
        targetsResponse,
      ] = await Promise.all([
        fetch(`${req.nextUrl.origin}/api/reports/sales-overview?${params}`, { headers }),
        fetch(`${req.nextUrl.origin}/api/reports/hourly-sales?${params}`, { headers }).catch(() => null),
        fetch(`${req.nextUrl.origin}/api/reports/customer-metrics?${params}`, { headers }).catch(() => null),
        fetch(`${req.nextUrl.origin}/api/reports/top-products?${params}&limit=100&sort_by=revenue`, { headers }),
        fetch(`${req.nextUrl.origin}/api/reports/product-type-breakdown?${params}`, { headers }).catch(() => null),
        fetch(`${req.nextUrl.origin}/api/marketing/performance?websiteId=${websiteId}&startDate=${startDate}&endDate=${endDate}`, { headers }).catch(() => null),
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

      // Parse responses
      const salesData = salesResponse.ok ? await salesResponse.json() : null;
      const hourlySalesData = hourlySalesResponse?.ok ? await hourlySalesResponse.json() : null;
      const customerMetricsData = customerMetricsResponse?.ok ? await customerMetricsResponse.json() : null;
      const productsData = productsResponse.ok ? await productsResponse.json() : null;
      const marketingData = marketingResponse?.ok ? await marketingResponse.json() : null;
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

      if (salesData?.data) {
        contextParts.push('## Sales Performance Overview');
        const summary = salesData.data.summary;
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
        const daily = salesData.data.daily || [];
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
      if (hourlySalesData?.data) {
        contextParts.push('## Hourly Sales Patterns');
        if (hourlySalesData.data.hourly && Array.isArray(hourlySalesData.data.hourly)) {
          contextParts.push('### Sales by Hour of Day:');
          contextParts.push('Hour | Total Orders | Total Revenue | Avg Orders/Day | Avg Revenue/Day');
          contextParts.push('--- | --- | --- | --- | ---');
          hourlySalesData.data.hourly.forEach((hour: any) => {
            contextParts.push(`${hour.hour}:00 | ${hour.total_orders || 0} | ${formatCurrency(hour.total_revenue || 0)} | ${hour.avg_orders_per_day?.toFixed(2) || 0} | ${formatCurrency(hour.avg_revenue_per_day || 0)}`);
          });
          if (hourlySalesData.data.peaks) {
            contextParts.push(`\n### Peak Hours:`);
            contextParts.push(`- Peak Orders Hour: ${hourlySalesData.data.peaks.orders?.hour || 0}:00 (${hourlySalesData.data.peaks.orders?.total_orders || 0} orders)`);
            contextParts.push(`- Peak Revenue Hour: ${hourlySalesData.data.peaks.revenue?.hour || 0}:00 (${formatCurrency(hourlySalesData.data.peaks.revenue?.total_revenue || 0)})`);
          }
        }
        contextParts.push('');
      }

      // Add customer metrics
      if (customerMetricsData?.data) {
        contextParts.push('## Customer Metrics');
        const customerSummary = customerMetricsData.data.summary;
        if (customerSummary) {
          contextParts.push(`### Summary:`);
          contextParts.push(`- Total Unique Customers: ${(customerSummary.total_unique_customers || 0).toLocaleString()}`);
          contextParts.push(`- Total Registered Customers: ${(customerSummary.total_registered_customers || 0).toLocaleString()}`);
          contextParts.push(`- Total Guest Customers: ${(customerSummary.total_guest_customers || 0).toLocaleString()}`);
          contextParts.push(`- Average Revenue per Customer: ${formatCurrency(customerSummary.avg_revenue_per_customer || 0)}`);
        }
        
        const customerDaily = customerMetricsData.data.daily || [];
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

      // Handle products data - API returns { success: true, data: array }
      let products: any[] = [];
      if (Array.isArray(productsData?.data)) {
        products = productsData.data;
      } else if (productsData?.data?.products) {
        products = productsData.data.products;
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

      // Define the output schema
      const outputSchema = z.object({
        insights: z.string().describe('Comprehensive AI-generated insights in markdown format'),
      });

      // Generate insights
      const { output } = await ai.generate({
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

      if (!output) {
        return NextResponse.json(
          { success: false, error: 'Failed to generate insights' },
          { status: 500 }
        );
      }

      const responseData: any = {
        success: true,
        data: {
          insights: output.insights,
          period: {
            startDate,
            endDate,
          },
          dataSources: {
            sales: !!salesData,
            products: !!productsData,
            marketing: !!marketingData,
            website: !!websiteData,
            annotations: annotationsData.length,
            targets: targetsData.length,
          },
        },
      };

      // Include contextSummary for admins (what was passed to the AI)
      if (user.role === 'admin') {
        responseData.data.contextSummary = contextSummary;
        responseData.data.systemPrompt = SYSTEM_PROMPT;
      }

      return NextResponse.json(responseData);
    } catch (error: any) {
      console.error('Insights API error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
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

      // Handle data structure - API responses are { success: true, data: {...} }
      // But we might receive either the full response or just the data
      const salesDataActual = salesData?.data || salesData;
      const hourlySalesDataActual = hourlySalesData?.data || hourlySalesData;
      const customerMetricsDataActual = customerMetricsData?.data || customerMetricsData;
      const productsDataActual = productsData?.data || productsData;
      const marketingDataActual = marketingData?.data || marketingData;
      const websiteDataActual = websiteData?.data || websiteData;

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
        console.log('Has analysis?', !!output?.analysis);
        if (output?.insights) {
          console.log('Insights type:', Array.isArray(output.insights) ? 'array' : typeof output.insights, 'length:', Array.isArray(output.insights) ? output.insights.length : (typeof output.insights === 'string' ? output.insights.length : 'N/A'));
          if (typeof output.insights === 'string') {
            console.log('Insights preview (first 300 chars):', output.insights.substring(0, 300));
          }
        }
        if (output?.analysis) {
          console.log('Analysis type:', Array.isArray(output.analysis) ? 'array' : typeof output.analysis, 'length:', Array.isArray(output.analysis) ? output.analysis.length : (typeof output.analysis === 'string' ? output.analysis.length : 'N/A'));
          if (typeof output.analysis === 'string') {
            console.log('Analysis preview (first 300 chars):', output.analysis.substring(0, 300));
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
      
      // Try multiple possible field names and structures
      if (output?.insights) {
        insightsText = output.insights;
        console.log('Found insights in output.insights');
      } else if (output?.analysis) {
        insightsText = output.analysis;
        console.warn('Found insights in output.analysis instead of output.insights');
      } else if (output?.text) {
        insightsText = output.text;
        console.warn('Found insights in output.text');
      } else if (typeof output === 'string') {
        insightsText = output;
        console.warn('Output is a direct string');
      } else if (output && typeof output === 'object') {
        // Check if output is an object with multiple string fields (like section headers)
        // This happens when Gemini returns { "Executive Summary": "...", "Sales Performance": "...", etc. }
        const stringFields = Object.entries(output).filter(([_, value]) => typeof value === 'string' && value.length > 50);
        
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
          const arrayFields = Object.entries(output).filter(([_, value]) => Array.isArray(value));
          if (arrayFields.length > 0) {
            // Use the first array field
            insightsText = arrayFields[0][1];
            console.warn(`Found insights in array field: ${arrayFields[0][0]}`);
          } else {
            console.error('Could not find insights in output. Available fields:', Object.keys(output));
            console.error('Output structure:', JSON.stringify(output, null, 2).substring(0, 2000));
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

