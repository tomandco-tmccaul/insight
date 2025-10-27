import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { queryBigQuery } from '@/lib/bigquery/client';
import { SalesOverviewRow } from '@/types/bigquery';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      // Get query parameters
      const { searchParams } = new URL(req.url);
      const websiteId = searchParams.get('websiteId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      // Validate required parameters
      if (!websiteId || !startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameters' },
          { status: 400 }
        );
      }

      // Check authorization
      // Admins can access all data
      // Clients can only access their own client's data
      if (user.role === 'client' && user.clientId) {
        // TODO: Verify that websiteId belongs to user.clientId
        // This would require a Firestore query to check website ownership
      }

      // Build BigQuery query
      const query = `
        SELECT
          date,
          website_id,
          SUM(total_sales) as total_sales,
          SUM(total_orders) as total_orders,
          SUM(total_sessions) as total_sessions,
          SUM(total_media_spend) as total_media_spend,
          SUM(total_revenue) as total_revenue
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET_ID}.agg_sales_overview_daily\`
        WHERE date BETWEEN @startDate AND @endDate
          AND website_id = @websiteId
        GROUP BY date, website_id
        ORDER BY date ASC
      `;

      const params = {
        startDate,
        endDate,
        websiteId,
      };

      // Execute query
      const rows = await queryBigQuery<SalesOverviewRow>(query, params);

      // Calculate metrics
      const totals = rows.reduce(
        (acc, row) => ({
          total_sales: acc.total_sales + row.total_sales,
          total_orders: acc.total_orders + row.total_orders,
          total_sessions: acc.total_sessions + row.total_sessions,
          total_media_spend: acc.total_media_spend + row.total_media_spend,
          total_revenue: acc.total_revenue + row.total_revenue,
        }),
        {
          total_sales: 0,
          total_orders: 0,
          total_sessions: 0,
          total_media_spend: 0,
          total_revenue: 0,
        }
      );

      // Calculate derived metrics
      const aov = totals.total_orders > 0 ? totals.total_sales / totals.total_orders : 0;
      const cvr = totals.total_sessions > 0 ? (totals.total_orders / totals.total_sessions) * 100 : 0;
      const blendedROAS = totals.total_media_spend > 0 ? totals.total_revenue / totals.total_media_spend : 0;
      const cpa = totals.total_orders > 0 ? totals.total_media_spend / totals.total_orders : 0;

      return NextResponse.json({
        success: true,
        data: {
          rows,
          totals,
          metrics: {
            aov,
            cvr,
            blendedROAS,
            cpa,
          },
        },
      });
    } catch (error: any) {
      console.error('Error fetching sales overview:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

