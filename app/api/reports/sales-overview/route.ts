import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { bigquery } from '@/lib/bigquery/client';
import { SalesOverviewRow } from '@/types/bigquery';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      
      // Get query parameters
      const datasetId = searchParams.get('dataset_id');
      const websiteId = searchParams.get('website_id');
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      
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
      
      // Add website filter if provided
      if (websiteId && websiteId !== 'all_combined') {
        query += ` AND website_id = @website_id`;
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
      
      if (websiteId && websiteId !== 'all_combined') {
        queryOptions.params.website_id = websiteId;
      }
      
      // Execute query
      const [rows] = await bigquery.query(queryOptions);
      
      // Calculate summary metrics
      const summary = rows.reduce(
        (acc: any, row: SalesOverviewRow) => {
          acc.total_orders += row.total_orders || 0;
          acc.total_revenue += row.total_revenue || 0;
          acc.total_items += row.total_items || 0;
          acc.unique_customers = Math.max(acc.unique_customers, row.unique_customers || 0);
          return acc;
        },
        { total_orders: 0, total_revenue: 0, total_items: 0, unique_customers: 0 }
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
          daily: rows,
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

