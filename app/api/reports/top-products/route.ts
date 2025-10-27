import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { bigquery } from '@/lib/bigquery/client';
import { ProductPerformanceRow } from '@/types/bigquery';
import { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const datasetId = searchParams.get('dataset_id');
      const websiteId = searchParams.get('website_id'); // store_id or 'all_combined'
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const sortBy = searchParams.get('sort_by') || 'revenue'; // 'revenue' or 'quantity'

      if (!datasetId || !startDate || !endDate) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required parameters: dataset_id, start_date, end_date',
          },
          { status: 400 }
        );
      }

      // Build the query
      const websiteFilter =
        websiteId && websiteId !== 'all_combined'
          ? `AND website_id = @website_id`
          : '';

      const orderByClause =
        sortBy === 'quantity'
          ? 'ORDER BY total_qty_ordered DESC'
          : 'ORDER BY total_revenue DESC';

      const query = `
        SELECT 
          sku,
          product_name,
          product_id,
          SUM(total_qty_ordered) as total_qty_ordered,
          SUM(total_qty_invoiced) as total_qty_invoiced,
          SUM(total_qty_shipped) as total_qty_shipped,
          SUM(total_revenue) as total_revenue,
          SUM(total_discount) as total_discount,
          AVG(avg_price) as avg_price,
          SUM(order_count) as order_count
        FROM \`${datasetId}.agg_product_performance_daily\`
        WHERE date BETWEEN @start_date AND @end_date
          ${websiteFilter}
        GROUP BY sku, product_name, product_id
        ${orderByClause}
        LIMIT @limit
      `;

      const options = {
        query,
        params: {
          start_date: startDate,
          end_date: endDate,
          limit: limit,
          ...(websiteId && websiteId !== 'all_combined' && { website_id: websiteId }),
        },
      };

      const [rows] = await bigquery.query(options);

      return NextResponse.json<ApiResponse<typeof rows>>({
        success: true,
        data: rows,
      });
    } catch (error: unknown) {
      console.error('Error fetching top products:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        },
        { status: 500 }
      );
    }
  });
}

