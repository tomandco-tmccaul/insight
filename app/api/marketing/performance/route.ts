import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { queryBigQuery } from '@/lib/bigquery/client';
import { SeoPerformanceDailyRow } from '@/types/bigquery';
import { getCurrencyConversionContext, convertMonetaryFields } from '@/lib/utils/currency';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      // Get query parameters
      const { searchParams } = new URL(req.url);
      const websiteId = searchParams.get('websiteId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const clientIdParam = searchParams.get('clientId') || user.clientId;

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
          date,
          website_id,
          channel,
          total_spend,
          total_revenue,
          total_clicks,
          total_impressions,
          total_conversions
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET_ID}.agg_marketing_channel_daily\`
        WHERE date BETWEEN @startDate AND @endDate
          AND website_id = @websiteId
      `;

      // Fetch SEO data
      const seoQuery = `
        SELECT
          query_text,
          SUM(total_clicks) as total_clicks,
          SUM(total_impressions) as total_impressions,
          AVG(avg_position) as avg_position,
          AVG(avg_ctr) as avg_ctr
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET_ID}.mv_agg_seo_performance_daily\`
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

      const currencyContext = clientIdParam
        ? await getCurrencyConversionContext(clientIdParam)
        : null;
      const fallbackMonth =
        startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)
          ? startDate.slice(0, 7)
          : null;

      // Execute queries
      // Note: MarketingChannelRow type doesn't exist yet - using any for now
      const [channelRows, seoRows] = await Promise.all([
        queryBigQuery<any>(channelQuery, params),
        queryBigQuery<SeoPerformanceDailyRow>(seoQuery, params),
      ]);

      const convertedChannelRows = channelRows.map((row) =>
        convertMonetaryFields(
          {
            ...row,
            spend: row.spend ?? row.total_spend ?? 0,
            revenue: row.revenue ?? row.total_revenue ?? 0,
          },
          currencyContext,
          [
            { field: 'spend', websiteField: 'website_id', dateField: 'date', fallbackMonth },
            { field: 'revenue', websiteField: 'website_id', dateField: 'date', fallbackMonth },
          ]
        )
      );

      const aggregatedChannels = convertedChannelRows.reduce<
        Record<
          string,
          {
            channel: string;
            spend: number;
            revenue: number;
            clicks: number;
            impressions: number;
            conversions: number;
          }
        >
      >((acc, row) => {
        const key = row.channel || 'unknown';
        if (!acc[key]) {
          acc[key] = {
            channel: row.channel,
            spend: 0,
            revenue: 0,
            clicks: 0,
            impressions: 0,
            conversions: 0,
          };
        }

        acc[key].spend += row.spend || 0;
        acc[key].revenue += row.revenue || 0;
        acc[key].clicks += row.clicks || row.total_clicks || 0;
        acc[key].impressions += row.impressions || row.total_impressions || 0;
        acc[key].conversions += row.conversions || row.total_conversions || 0;

        return acc;
      }, {});

      const channelsWithMetrics = Object.values(aggregatedChannels).map((row) => ({
        ...row,
        roas: row.spend > 0 ? row.revenue / row.spend : 0,
        cpc: row.clicks > 0 ? row.spend / row.clicks : 0,
        ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0,
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

