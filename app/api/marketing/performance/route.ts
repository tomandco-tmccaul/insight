import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { queryBigQuery } from '@/lib/bigquery/client';
import { MarketingChannelRow, SEOPerformanceRow } from '@/types/bigquery';

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

      // Fetch marketing channel data
      const channelQuery = `
        SELECT
          channel,
          SUM(total_spend) as total_spend,
          SUM(total_revenue) as total_revenue,
          SUM(total_clicks) as total_clicks,
          SUM(total_impressions) as total_impressions,
          SUM(total_conversions) as total_conversions
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET_ID}.agg_marketing_channel_daily\`
        WHERE date BETWEEN @startDate AND @endDate
          AND website_id = @websiteId
        GROUP BY channel
        ORDER BY total_spend DESC
      `;

      // Fetch SEO data
      const seoQuery = `
        SELECT
          query_text,
          SUM(total_clicks) as total_clicks,
          SUM(total_impressions) as total_impressions,
          AVG(avg_position) as avg_position,
          AVG(avg_ctr) as avg_ctr
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET_ID}.agg_seo_performance_daily\`
        WHERE date BETWEEN @startDate AND @endDate
          AND website_id = @websiteId
        GROUP BY query_text
        ORDER BY total_clicks DESC
        LIMIT 20
      `;

      const params = {
        startDate,
        endDate,
        websiteId,
      };

      // Execute queries
      const [channelRows, seoRows] = await Promise.all([
        queryBigQuery<MarketingChannelRow>(channelQuery, params),
        queryBigQuery<SEOPerformanceRow>(seoQuery, params),
      ]);

      // Calculate metrics for each channel
      const channelsWithMetrics = channelRows.map((row) => ({
        ...row,
        roas: row.spend > 0 ? row.revenue / row.spend : 0,
        cpc: (row.clicks || 0) > 0 ? row.spend / (row.clicks || 1) : 0,
        ctr: (row.impressions || 0) > 0 ? ((row.clicks || 0) / (row.impressions || 1)) * 100 : 0,
        cpa: row.conversions > 0 ? row.spend / row.conversions : 0,
      }));

      return NextResponse.json({
        success: true,
        data: {
          channels: channelsWithMetrics,
          seo: seoRows,
        },
      });
    } catch (error: any) {
      console.error('Error fetching marketing performance:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

