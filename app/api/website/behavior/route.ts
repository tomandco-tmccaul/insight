import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { queryBigQuery } from '@/lib/bigquery/client';
import { WebsiteBehaviorRow } from '@/types/bigquery';

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

      // Fetch session metrics
      const metricsQuery = `
        SELECT
          SUM(total_sessions) as total_sessions,
          SUM(total_pageviews) as total_pageviews,
          SUM(total_users) as total_users,
          AVG(avg_session_duration) as avg_session_duration,
          AVG(bounce_rate) as bounce_rate
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET_ID}.agg_website_behavior_daily\`
        WHERE date BETWEEN @startDate AND @endDate
          AND website_id = @websiteId
      `;

      // Fetch top pages
      const pagesQuery = `
        SELECT
          page_path,
          SUM(total_pageviews) as total_pageviews,
          SUM(total_unique_pageviews) as total_unique_pageviews,
          AVG(avg_time_on_page) as avg_time_on_page,
          AVG(bounce_rate) as bounce_rate
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET_ID}.agg_website_behavior_daily\`
        WHERE date BETWEEN @startDate AND @endDate
          AND website_id = @websiteId
        GROUP BY page_path
        ORDER BY total_pageviews DESC
        LIMIT 20
      `;

      // Fetch traffic sources
      const sourcesQuery = `
        SELECT
          traffic_source,
          SUM(total_sessions) as total_sessions,
          SUM(total_users) as total_users,
          AVG(bounce_rate) as bounce_rate
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET_ID}.agg_website_behavior_daily\`
        WHERE date BETWEEN @startDate AND @endDate
          AND website_id = @websiteId
        GROUP BY traffic_source
        ORDER BY total_sessions DESC
      `;

      const params = {
        startDate,
        endDate,
        websiteId,
      };

      // Execute queries
      const [metricsRows, pagesRows, sourcesRows] = await Promise.all([
        queryBigQuery<any>(metricsQuery, params),
        queryBigQuery<any>(pagesQuery, params),
        queryBigQuery<any>(sourcesQuery, params),
      ]);

      const metrics = metricsRows[0] || {
        total_sessions: 0,
        total_pageviews: 0,
        total_users: 0,
        avg_session_duration: 0,
        bounce_rate: 0,
      };

      return NextResponse.json({
        success: true,
        data: {
          metrics,
          topPages: pagesRows,
          trafficSources: sourcesRows,
        },
      });
    } catch (error: any) {
      console.error('Error fetching website behavior:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

