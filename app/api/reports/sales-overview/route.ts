import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { bigquery } from '@/lib/bigquery/client';
import { SalesOverviewRow } from '@/types/bigquery';
import { resolveWebsiteToBigQueryIds } from '@/lib/utils/website-resolver';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      
      // Get query parameters
      const datasetId = searchParams.get('dataset_id');
      const websiteId = searchParams.get('website_id');
      const clientId = searchParams.get('client_id') || user.clientId;
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      
      // Debug logging
      console.log('[Sales Overview API] Query params:', {
        datasetId,
        websiteId,
        startDate,
        endDate,
      });
      
      // Validation
      if (!datasetId) {
        return NextResponse.json(
          { success: false, error: 'dataset_id is required' },
          { status: 400 }
        );
      }
      
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'start_date and end_date are required' },
          { status: 400 }
        );
      }
      
      // Resolve website ID to BigQuery website IDs (handles grouped websites)
      let bigQueryWebsiteIds: string[] | null = null;
      if (websiteId && websiteId !== 'all_combined' && clientId) {
        console.log('[Sales Overview API] Resolving website:', { clientId, websiteId });
        bigQueryWebsiteIds = await resolveWebsiteToBigQueryIds(clientId, websiteId);
        console.log('[Sales Overview API] Resolved BigQuery IDs:', bigQueryWebsiteIds);
        
        // If resolution fails and we have a clientId, this is an error (website not found)
        // Don't fall back to using websiteId as-is because it's likely a Firestore ID, not a BigQuery ID
        if (!bigQueryWebsiteIds) {
          console.error('[Sales Overview API] Failed to resolve website to BigQuery IDs:', { clientId, websiteId });
          return NextResponse.json(
            { success: false, error: `Website "${websiteId}" not found or missing BigQuery configuration` },
            { status: 404 }
          );
        }
      } else if (websiteId && websiteId !== 'all_combined') {
        // No clientId provided, assume websiteId is already a BigQuery website ID
        console.log('[Sales Overview API] No clientId, using websiteId as BigQuery ID:', websiteId);
        bigQueryWebsiteIds = [websiteId];
      }

      // Build query
      let query = `
        SELECT 
          date,
          website_id,
          total_orders,
          unique_customers,
          total_revenue,
          subtotal,
          total_tax,
          total_shipping,
          total_discounts,
          total_items,
          orders_complete,
          orders_pending,
          orders_processing,
          orders_canceled,
          revenue_complete,
          revenue_pending
        FROM \`${bigquery.projectId}.${datasetId}.agg_sales_overview_daily\`
        WHERE date BETWEEN @start_date AND @end_date
      `;
      
      // Add website filter - use IN clause for grouped websites, = for single websites
      // IMPORTANT: If a specific website is selected (not 'all_combined'), we MUST have a filter
      if (websiteId && websiteId !== 'all_combined') {
        if (!bigQueryWebsiteIds || bigQueryWebsiteIds.length === 0) {
          console.error('[Sales Overview API] No BigQuery IDs resolved for website:', websiteId);
          return NextResponse.json(
            { success: false, error: `Failed to resolve website "${websiteId}" to BigQuery IDs` },
            { status: 400 }
          );
        }
        
        if (bigQueryWebsiteIds.length === 1) {
          query += ` AND website_id = @website_id`;
          console.log('[Sales Overview API] Using single website filter:', bigQueryWebsiteIds[0]);
        } else {
          // For grouped websites, use IN clause
          const placeholders = bigQueryWebsiteIds.map((_, i) => `@website_id${i}`).join(', ');
          query += ` AND website_id IN (${placeholders})`;
          console.log('[Sales Overview API] Using grouped website filter with', bigQueryWebsiteIds.length, 'IDs:', bigQueryWebsiteIds);
        }
      } else {
        console.log('[Sales Overview API] No website filter (all_combined or no website selected)');
      }
      
      query += ` ORDER BY date DESC`;
      
      // Query parameters
      const queryOptions: any = {
        query,
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      };
      
      // Add website ID(s) to params
      if (bigQueryWebsiteIds && bigQueryWebsiteIds.length > 0) {
        if (bigQueryWebsiteIds.length === 1) {
          queryOptions.params.website_id = bigQueryWebsiteIds[0];
        } else {
          // For grouped websites, add each ID with its placeholder
          bigQueryWebsiteIds.forEach((id, i) => {
            queryOptions.params[`website_id${i}`] = id;
          });
        }
      }
      
      // Debug logging
      console.log('[Sales Overview API] Query:', query);
      console.log('[Sales Overview API] Query options:', JSON.stringify(queryOptions, null, 2));
      
      // Execute query
      const [rows] = await bigquery.query(queryOptions);
      
      // Debug logging
      console.log('[Sales Overview API] Rows returned:', rows.length);
      if (rows.length > 0 && websiteId && websiteId !== 'all_combined') {
        const uniqueWebsiteIds = [...new Set(rows.map((r: any) => r.website_id))];
        console.log('[Sales Overview API] Unique website_ids in results:', uniqueWebsiteIds);
      }

      // Transform rows to convert BigQuery DATE objects to strings
      const transformedRows = rows.map((row: any) => ({
        ...row,
        date: row.date?.value || row.date, // Convert {value: "2025-10-20"} to "2025-10-20"
      }));

      // Calculate summary metrics
      const summary = transformedRows.reduce(
        (acc: any, row: SalesOverviewRow) => {
          acc.total_orders += row.total_orders || 0;
          acc.total_revenue += row.total_revenue || 0;
          acc.total_items += row.total_items || 0;
          acc.unique_customers = Math.max(acc.unique_customers, row.unique_customers || 0);
          acc.subtotal += row.subtotal || 0;
          acc.total_tax += row.total_tax || 0;
          acc.total_shipping += row.total_shipping || 0;
          acc.total_discounts += row.total_discounts || 0;
          acc.orders_complete += row.orders_complete || 0;
          acc.orders_pending += row.orders_pending || 0;
          acc.orders_processing += row.orders_processing || 0;
          acc.orders_canceled += row.orders_canceled || 0;
          return acc;
        },
        {
          total_orders: 0,
          total_revenue: 0,
          total_items: 0,
          unique_customers: 0,
          subtotal: 0,
          total_tax: 0,
          total_shipping: 0,
          total_discounts: 0,
          orders_complete: 0,
          orders_pending: 0,
          orders_processing: 0,
          orders_canceled: 0,
        }
      );

      // Calculate AOV
      summary.aov = summary.total_orders > 0
        ? summary.total_revenue / summary.total_orders
        : 0;

      // Calculate items per order
      summary.items_per_order = summary.total_orders > 0
        ? summary.total_items / summary.total_orders
        : 0;
      
      return NextResponse.json({
        success: true,
        data: {
          daily: transformedRows,
          summary,
        },
      });
    } catch (error: any) {
      console.error('Error fetching sales overview:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

