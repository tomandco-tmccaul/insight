import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { queryBigQuery } from '@/lib/bigquery/client';
import { ProductPerformanceRow } from '@/types/bigquery';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      // Get query parameters
      const { searchParams } = new URL(req.url);
      const websiteId = searchParams.get('websiteId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const limit = searchParams.get('limit') || '50';

      // Validate required parameters
      if (!websiteId || !startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameters' },
          { status: 400 }
        );
      }

      // Build BigQuery query
      const query = `
        SELECT
          product_id,
          product_name,
          product_sku,
          SUM(quantity_sold) as quantity_sold,
          SUM(total_revenue) as total_revenue,
          SUM(total_orders) as total_orders,
          AVG(avg_price) as avg_price,
          SUM(quantity_returned) as quantity_returned,
          SUM(stock_level) as stock_level
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET_ID}.agg_product_performance_daily\`
        WHERE date BETWEEN @startDate AND @endDate
          AND website_id = @websiteId
        GROUP BY product_id, product_name, product_sku
        ORDER BY total_revenue DESC
        LIMIT ${parseInt(limit)}
      `;

      const params = {
        startDate,
        endDate,
        websiteId,
      };

      // Execute query
      const rows = await queryBigQuery<ProductPerformanceRow>(query, params);

      // Calculate return rates
      const productsWithMetrics = rows.map((row) => ({
        ...row,
        return_rate: row.return_rate !== undefined
          ? row.return_rate
          : row.quantity_sold > 0 ? ((row.return_count || 0) / row.quantity_sold) * 100 : 0,
      }));

      return NextResponse.json({
        success: true,
        data: productsWithMetrics,
      });
    } catch (error: any) {
      console.error('Error fetching product performance:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

