import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { queryBigQuery } from '@/lib/bigquery/client';
import { ProductPerformanceDailyRow } from '@/types/bigquery';

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
          sku,
          SUM(total_qty_ordered) as total_qty_ordered,
          SUM(total_revenue) as total_revenue,
          AVG(avg_price) as avg_price,
          SUM(total_qty_refunded) as total_qty_refunded
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET_ID}.mv_agg_product_performance_daily\`
        WHERE date BETWEEN @startDate AND @endDate
          AND website_id = @websiteId
        GROUP BY product_id, product_name, sku
        ORDER BY total_revenue DESC
        LIMIT ${parseInt(limit)}
      `;

      const params = {
        startDate,
        endDate,
        websiteId,
      };

      // Execute query
      const rows = await queryBigQuery<ProductPerformanceDailyRow>(query, params);

      // Calculate return rates
      const productsWithMetrics = rows.map((row) => {
        const totalOrdered = row.total_qty_ordered ?? 0;
        const totalRefunded = row.total_qty_refunded ?? 0;

        return {
          ...row,
          return_rate: totalOrdered > 0 ? (totalRefunded / totalOrdered) * 100 : 0,
        };
      });

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

