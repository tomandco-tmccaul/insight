import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { queryBigQuery } from '@/lib/bigquery/client';
import { SEOPerformanceRow } from '@/types/bigquery';
import { adminDb } from '@/lib/firebase/admin';
import { resolveWebsiteToBigQueryIds } from '@/lib/utils/website-resolver';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      // Get query parameters
      const { searchParams } = new URL(req.url);
      const websiteId = searchParams.get('websiteId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const clientId = searchParams.get('clientId') || user.clientId;
      const datasetIdParam = searchParams.get('dataset_id');

      // Validate required parameters
      if (!websiteId || !startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameters: websiteId, startDate, endDate' },
          { status: 400 }
        );
      }

      // Get the client's dataset ID (same approach as sales API)
      let datasetId = datasetIdParam;
      
      if (!datasetId && clientId) {
        if (!adminDb) {
          return NextResponse.json(
            { success: false, error: 'Database not initialized' },
            { status: 500 }
          );
        }

        const clientDoc = await adminDb.collection('clients').doc(clientId).get();
        if (clientDoc.exists) {
          const clientData = clientDoc.data();
          datasetId = clientData?.bigQueryDatasetId;
        }
      }

      if (!datasetId) {
        return NextResponse.json(
          { success: false, error: 'Dataset ID is required. Please provide dataset_id parameter or ensure client has bigQueryDatasetId configured.' },
          { status: 400 }
        );
      }

      const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'insight-dashboard-1761555293';
      
      // Use aggregated SEO performance table for better performance
      const aggregatedTable = `${projectId}.${datasetId}.agg_seo_performance_daily`;
      const pageTable = `${projectId}.${datasetId}.gsc_search_analytics_by_page`; // Still use raw table for page-level data

      // Handle websiteId filter
      // If 'all_combined', don't filter by website_id
      // Otherwise, resolve the website (including grouped websites) to BigQuery website IDs
      let bigQueryWebsiteIds: string[] | null = null;
      if (websiteId && websiteId !== 'all_combined' && clientId) {
        bigQueryWebsiteIds = await resolveWebsiteToBigQueryIds(clientId, websiteId);
        // Fall back to using websiteId as-is if resolution fails
        if (!bigQueryWebsiteIds) {
          console.warn(`Failed to resolve website ${websiteId}, falling back to websiteId`);
          bigQueryWebsiteIds = [websiteId];
        }
      }

      // Build website filter - use IN clause for grouped websites, = for single websites
      let websiteFilter = '';
      if (bigQueryWebsiteIds && bigQueryWebsiteIds.length > 0) {
        if (bigQueryWebsiteIds.length === 1) {
          websiteFilter = `AND website_id = @websiteId`;
        } else {
          // For grouped websites, use IN clause
          const placeholders = bigQueryWebsiteIds.map((_, i) => `@websiteId${i}`).join(', ');
          websiteFilter = `AND website_id IN (${placeholders})`;
        }
      }

      // Query 1: Overall SEO metrics (from aggregated table)
      const overviewQuery = `
        SELECT
          SUM(total_clicks) as total_clicks,
          SUM(total_impressions) as total_impressions,
          AVG(avg_position) as avg_position,
          AVG(avg_ctr) as avg_ctr,
          SUM(attributed_revenue) as total_attributed_revenue
        FROM \`${aggregatedTable}\`
        WHERE date BETWEEN @startDate AND @endDate
          ${websiteFilter}
      `;

      // Query 2: Top queries by clicks (from aggregated table)
      const topQueriesQuery = `
        SELECT
          query_text,
          SUM(total_clicks) as total_clicks,
          SUM(total_impressions) as total_impressions,
          AVG(avg_position) as avg_position,
          AVG(avg_ctr) as avg_ctr,
          SUM(attributed_revenue) as attributed_revenue
        FROM \`${aggregatedTable}\`
        WHERE date BETWEEN @startDate AND @endDate
          ${websiteFilter}
        GROUP BY query_text
        ORDER BY total_clicks DESC
        LIMIT 50
      `;

      // Query 3: Top queries by impressions (from aggregated table)
      const topImpressionsQuery = `
        SELECT
          query_text,
          SUM(total_clicks) as total_clicks,
          SUM(total_impressions) as total_impressions,
          AVG(avg_position) as avg_position,
          AVG(avg_ctr) as avg_ctr,
          SUM(attributed_revenue) as attributed_revenue
        FROM \`${aggregatedTable}\`
        WHERE date BETWEEN @startDate AND @endDate
          ${websiteFilter}
        GROUP BY query_text
        ORDER BY total_impressions DESC
        LIMIT 50
      `;

      // Query 4: Top pages by clicks (from raw page table since aggregated table doesn't have page_url)
      const topPagesQuery = `
        SELECT
          page as page_url,
          SUM(CAST(clicks AS INT64)) as total_clicks,
          SUM(CAST(impressions AS INT64)) as total_impressions,
          AVG(CAST(position AS FLOAT64)) as avg_position,
          AVG(CAST(ctr AS FLOAT64)) as avg_ctr,
          0 as attributed_revenue
        FROM \`${pageTable}\`
        WHERE date BETWEEN @startDate AND @endDate
        GROUP BY page
        ORDER BY total_clicks DESC
        LIMIT 50
      `;

      // Query 5: Position distribution (buckets) - from aggregated table
      const positionDistributionQuery = `
        SELECT
          CASE
            WHEN avg_position <= 3 THEN '1-3'
            WHEN avg_position <= 10 THEN '4-10'
            WHEN avg_position <= 20 THEN '11-20'
            WHEN avg_position <= 50 THEN '21-50'
            ELSE '51+'
          END as position_range,
          SUM(total_clicks) as total_clicks,
          SUM(total_impressions) as total_impressions
        FROM \`${aggregatedTable}\`
        WHERE date BETWEEN @startDate AND @endDate
          ${websiteFilter}
        GROUP BY position_range
        ORDER BY
          CASE position_range
            WHEN '1-3' THEN 1
            WHEN '4-10' THEN 2
            WHEN '11-20' THEN 3
            WHEN '21-50' THEN 4
            WHEN '51+' THEN 5
          END
      `;

      const params: { [key: string]: any } = {
        startDate,
        endDate,
      };

      // Add website ID(s) to params based on whether it's a single or grouped website
      if (bigQueryWebsiteIds && bigQueryWebsiteIds.length > 0) {
        if (bigQueryWebsiteIds.length === 1) {
          params.websiteId = bigQueryWebsiteIds[0];
        } else {
          // For grouped websites, add each ID with its placeholder
          bigQueryWebsiteIds.forEach((id, i) => {
            params[`websiteId${i}`] = id;
          });
        }
      }

      // Execute queries in parallel - try aggregated table first
      let [
        overviewRows,
        topQueriesRows,
        topImpressionsRows,
        topPagesRows,
        positionRows,
      ] = await Promise.all([
        queryBigQuery<any>(overviewQuery, params).catch((err) => {
          console.error('Aggregated table query error:', err);
          return [];
        }),
        queryBigQuery<any>(topQueriesQuery, params).catch(() => []),
        queryBigQuery<any>(topImpressionsQuery, params).catch(() => []),
        queryBigQuery<any>(topPagesQuery, params).catch(() => []),
        queryBigQuery<any>(positionDistributionQuery, params).catch(() => []),
      ]);

      // Fallback to raw tables if aggregated table has no data or errors
      const hasData = overviewRows && overviewRows.length > 0 && 
        (Number(overviewRows[0]?.total_clicks || 0) > 0 || Number(overviewRows[0]?.total_impressions || 0) > 0);
      
      if (!hasData) {
        console.log('Aggregated table empty, using raw tables');
        const queryTable = `${projectId}.${datasetId}.gsc_search_analytics_by_query`;
        
        const rawQueries = {
          overview: `SELECT SUM(CAST(clicks AS INT64)) as total_clicks, SUM(CAST(impressions AS INT64)) as total_impressions, AVG(CAST(position AS FLOAT64)) as avg_position, AVG(CAST(ctr AS FLOAT64)) as avg_ctr, 0 as total_attributed_revenue FROM \`${queryTable}\` WHERE date BETWEEN @startDate AND @endDate`,
          topQueries: `SELECT query as query_text, SUM(CAST(clicks AS INT64)) as total_clicks, SUM(CAST(impressions AS INT64)) as total_impressions, AVG(CAST(position AS FLOAT64)) as avg_position, AVG(CAST(ctr AS FLOAT64)) as avg_ctr, 0 as attributed_revenue FROM \`${queryTable}\` WHERE date BETWEEN @startDate AND @endDate GROUP BY query ORDER BY total_clicks DESC LIMIT 50`,
          topImpressions: `SELECT query as query_text, SUM(CAST(clicks AS INT64)) as total_clicks, SUM(CAST(impressions AS INT64)) as total_impressions, AVG(CAST(position AS FLOAT64)) as avg_position, AVG(CAST(ctr AS FLOAT64)) as avg_ctr, 0 as attributed_revenue FROM \`${queryTable}\` WHERE date BETWEEN @startDate AND @endDate GROUP BY query ORDER BY total_impressions DESC LIMIT 50`,
          positionDist: `SELECT CASE WHEN position <= 3 THEN '1-3' WHEN position <= 10 THEN '4-10' WHEN position <= 20 THEN '11-20' WHEN position <= 50 THEN '21-50' ELSE '51+' END as position_range, SUM(CAST(clicks AS INT64)) as total_clicks, SUM(CAST(impressions AS INT64)) as total_impressions FROM \`${queryTable}\` WHERE date BETWEEN @startDate AND @endDate GROUP BY position_range ORDER BY CASE position_range WHEN '1-3' THEN 1 WHEN '4-10' THEN 2 WHEN '11-20' THEN 3 WHEN '21-50' THEN 4 WHEN '51+' THEN 5 END`
        };

        [
          overviewRows,
          topQueriesRows,
          topImpressionsRows,
          positionRows,
        ] = await Promise.all([
          queryBigQuery<any>(rawQueries.overview, params).catch(() => []),
          queryBigQuery<any>(rawQueries.topQueries, params).catch(() => []),
          queryBigQuery<any>(rawQueries.topImpressions, params).catch(() => []),
          queryBigQuery<any>(rawQueries.positionDist, params).catch(() => []),
        ]);
      }

      const overview = overviewRows[0] || {
        total_clicks: 0,
        total_impressions: 0,
        avg_position: 0,
        avg_ctr: 0,
        total_attributed_revenue: 0,
      };

      return NextResponse.json({
        success: true,
        data: {
          overview: {
            total_clicks: Number(overview.total_clicks) || 0,
            total_impressions: Number(overview.total_impressions) || 0,
            avg_position: Number(overview.avg_position) || 0,
            avg_ctr: Number(overview.avg_ctr) || 0,
            total_attributed_revenue: Number(overview.total_attributed_revenue) || 0,
          },
          topQueries: topQueriesRows.map((row) => ({
            query: row.query_text || '',
            total_clicks: Number(row.total_clicks) || 0,
            total_impressions: Number(row.total_impressions) || 0,
            avg_position: Number(row.avg_position) || 0,
            avg_ctr: Number(row.avg_ctr) || 0,
            attributed_revenue: Number(row.attributed_revenue) || 0,
          })),
          topImpressions: topImpressionsRows.map((row) => ({
            query: row.query_text || '',
            total_clicks: Number(row.total_clicks) || 0,
            total_impressions: Number(row.total_impressions) || 0,
            avg_position: Number(row.avg_position) || 0,
            avg_ctr: Number(row.avg_ctr) || 0,
            attributed_revenue: Number(row.attributed_revenue) || 0,
          })),
          topPages: topPagesRows.map((row) => ({
            page: row.page_url || row.page || '',
            total_clicks: Number(row.total_clicks) || 0,
            total_impressions: Number(row.total_impressions) || 0,
            avg_position: Number(row.avg_position) || 0,
            avg_ctr: Number(row.avg_ctr) || 0,
            attributed_revenue: Number(row.attributed_revenue) || 0,
          })),
          positionDistribution: positionRows.map((row) => ({
            position_range: row.position_range || '',
            total_clicks: Number(row.total_clicks) || 0,
            total_impressions: Number(row.total_impressions) || 0,
          })),
        },
      });
    } catch (error: any) {
      console.error('Error fetching SEO insights:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

