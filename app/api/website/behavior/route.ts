import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { bigquery } from '@/lib/bigquery/client';
import { ApiResponse } from '@/types';

interface WebsiteBehaviorData {
  metrics: {
    total_sessions: number;
    total_pageviews: number;
    total_users: number;
    avg_session_duration: number;
    bounce_rate: number;
  };
  topPages: Array<{
    page_path: string;
    total_pageviews: number;
    total_unique_pageviews: number;
    avg_time_on_page: number;
    bounce_rate: number;
  }>;
  trafficSources: Array<{
    traffic_source: string;
    total_sessions: number;
    total_users: number;
    bounce_rate: number;
  }>;
  devices: Array<{
    device_category: string;
    sessions: number;
    users: number;
    bounce_rate: number;
  }>;
}

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

      // Get the client's dataset ID from Firestore
      // For now, we'll use a hardcoded dataset - this should be fetched from user's client
      const datasetId = 'sanderson_design_group'; // TODO: Get from user's clientId

      // Query 1: Get overall website metrics from GA4
      const metricsQuery = `
        SELECT
          SUM(CAST(sessions AS INT64)) as total_sessions,
          SUM(CAST(screenPageViews AS INT64)) as total_pageviews,
          SUM(CAST(totalUsers AS INT64)) as total_users,
          AVG(CAST(averageSessionDuration AS FLOAT64)) as avg_session_duration,
          AVG(CAST(bounceRate AS FLOAT64)) as bounce_rate
        FROM \`${datasetId}.ga4_website_overview\`
        WHERE date BETWEEN REPLACE(@startDate, '-', '') AND REPLACE(@endDate, '-', '')
      `;

      // Query 2: Get top pages from GA4
      const pagesQuery = `
        SELECT
          pagePathPlusQueryString as page_path,
          SUM(CAST(screenPageViews AS INT64)) as total_pageviews,
          COUNT(DISTINCT CONCAT(property_id, date)) as total_unique_pageviews,
          0 as avg_time_on_page,
          AVG(CAST(bounceRate AS FLOAT64)) as bounce_rate
        FROM \`${datasetId}.ga4_pages\`
        WHERE date BETWEEN REPLACE(@startDate, '-', '') AND REPLACE(@endDate, '-', '')
        GROUP BY pagePathPlusQueryString
        ORDER BY total_pageviews DESC
        LIMIT 20
      `;

      // Query 3: Get traffic sources from GA4
      const sourcesQuery = `
        SELECT
          CONCAT(sessionSource, ' / ', sessionMedium) as traffic_source,
          SUM(CAST(sessions AS INT64)) as total_sessions,
          SUM(CAST(totalUsers AS INT64)) as total_users,
          AVG(CAST(bounceRate AS FLOAT64)) as bounce_rate
        FROM \`${datasetId}.ga4_traffic_sources\`
        WHERE date BETWEEN REPLACE(@startDate, '-', '') AND REPLACE(@endDate, '-', '')
        GROUP BY sessionSource, sessionMedium
        ORDER BY total_sessions DESC
        LIMIT 10
      `;

      // Query 4: Get device breakdown from GA4
      const devicesQuery = `
        SELECT
          deviceCategory as device_category,
          SUM(CAST(sessions AS INT64)) as sessions,
          SUM(CAST(totalUsers AS INT64)) as users,
          AVG(CAST(bounceRate AS FLOAT64)) as bounce_rate
        FROM \`${datasetId}.ga4_devices\`
        WHERE date BETWEEN REPLACE(@startDate, '-', '') AND REPLACE(@endDate, '-', '')
        GROUP BY deviceCategory
        ORDER BY sessions DESC
      `;

      const params = {
        startDate,
        endDate,
      };

      // Execute queries in parallel
      const [metricsResults, pagesResults, sourcesResults, devicesResults] = await Promise.all([
        bigquery.query({
          query: metricsQuery,
          params,
          location: 'europe-west2',
        }),
        bigquery.query({
          query: pagesQuery,
          params,
          location: 'europe-west2',
        }),
        bigquery.query({
          query: sourcesQuery,
          params,
          location: 'europe-west2',
        }),
        bigquery.query({
          query: devicesQuery,
          params,
          location: 'europe-west2',
        }),
      ]);

      const metricsRow = metricsResults[0][0] as any;
      const metrics = {
        total_sessions: metricsRow?.total_sessions || 0,
        total_pageviews: metricsRow?.total_pageviews || 0,
        total_users: metricsRow?.total_users || 0,
        avg_session_duration: metricsRow?.avg_session_duration || 0,
        bounce_rate: metricsRow?.bounce_rate || 0,
      };

      const topPages = (pagesResults[0] as any[]).map((row) => ({
        page_path: row.page_path,
        total_pageviews: row.total_pageviews || 0,
        total_unique_pageviews: row.total_unique_pageviews || 0,
        avg_time_on_page: row.avg_time_on_page || 0,
        bounce_rate: row.bounce_rate || 0,
      }));

      const trafficSources = (sourcesResults[0] as any[]).map((row) => ({
        traffic_source: row.traffic_source,
        total_sessions: row.total_sessions || 0,
        total_users: row.total_users || 0,
        bounce_rate: row.bounce_rate || 0,
      }));

      const devices = (devicesResults[0] as any[]).map((row) => ({
        device_category: row.device_category,
        sessions: row.sessions || 0,
        users: row.users || 0,
        bounce_rate: row.bounce_rate || 0,
      }));

      const data: WebsiteBehaviorData = {
        metrics,
        topPages,
        trafficSources,
        devices,
      };

      return NextResponse.json<ApiResponse<WebsiteBehaviorData>>({
        success: true,
        data,
      });
    } catch (error: unknown) {
      console.error('Error fetching website behavior:', error);
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

