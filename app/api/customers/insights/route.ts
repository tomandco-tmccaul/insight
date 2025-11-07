import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { bigquery } from '@/lib/bigquery/client';
import { ApiResponse } from '@/types';
import {
  GA4WebsiteOverviewRow,
  GA4DailyActiveUsersRow,
  GA4WeeklyActiveUsersRow,
  GA4FourWeeklyActiveUsersRow,
  GA4LocationsRow,
  GA4DevicesRow,
} from '@/types/bigquery';

interface CustomerInsightsData {
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  userMetrics: {
    totalUsers: number;
    newUsers: number;
    returningUsers: number;
    newUserPercentage: number;
    returningUserPercentage: number;
  };
  demographics: {
    byLocation: Array<{
      country: string;
      users: number;
      sessions: number;
      revenue: number;
      percentage: number;
    }>;
    byDevice: Array<{
      deviceCategory: string;
      users: number;
      sessions: number;
      revenue: number;
      percentage: number;
    }>;
  };
  engagement: {
    averageSessionDuration: number;
    screenPageViewsPerSession: number;
    engagementRate: number;
    bounceRate: number;
  };
}

/**
 * GET /api/customers/insights
 * Get customer insights data from GA4 tables
 */
export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const websiteId = searchParams.get('websiteId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      if (!websiteId || !startDate || !endDate) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required parameters: websiteId, startDate, endDate',
          },
          { status: 400 }
        );
      }

      // Get the client's dataset ID from Firestore
      // For now, we'll use a hardcoded dataset - this should be fetched from user's client
      const datasetId = 'sanderson_design_group'; // TODO: Get from user's clientId

      // Query 1: Get latest daily active users
      const dauQuery = `
        SELECT active1DayUsers as activeUsers
        FROM \`${datasetId}.ga4_daily_active_users\`
        WHERE date BETWEEN REPLACE(@startDate, '-', '') AND REPLACE(@endDate, '-', '')
        ORDER BY date DESC
        LIMIT 1
      `;

      // Query 2: Get latest weekly active users
      const wauQuery = `
        SELECT active7DayUsers as activeUsers
        FROM \`${datasetId}.ga4_weekly_active_users\`
        WHERE date BETWEEN REPLACE(@startDate, '-', '') AND REPLACE(@endDate, '-', '')
        ORDER BY date DESC
        LIMIT 1
      `;

      // Query 3: Get latest monthly active users
      const mauQuery = `
        SELECT active28DayUsers as activeUsers
        FROM \`${datasetId}.ga4_four_weekly_active_users\`
        WHERE date BETWEEN REPLACE(@startDate, '-', '') AND REPLACE(@endDate, '-', '')
        ORDER BY date DESC
        LIMIT 1
      `;

      // Query 4: Get overall user metrics
      const overviewQuery = `
        SELECT
          SUM(CAST(totalUsers AS INT64)) as totalUsers,
          SUM(CAST(newUsers AS INT64)) as newUsers,
          AVG(CAST(averageSessionDuration AS FLOAT64)) as averageSessionDuration,
          AVG(CAST(screenPageViewsPerSession AS FLOAT64)) as screenPageViewsPerSession,
          AVG(CAST(bounceRate AS FLOAT64)) as bounceRate
        FROM \`${datasetId}.ga4_website_overview\`
        WHERE date BETWEEN REPLACE(@startDate, '-', '') AND REPLACE(@endDate, '-', '')
      `;

      // Query 5: Get location breakdown (using ga4_website_overview since ga4_locations may not have all fields)
      const locationsQuery = `
        SELECT
          'Global' as country,
          SUM(CAST(totalUsers AS INT64)) as users,
          SUM(CAST(sessions AS INT64)) as sessions,
          0 as revenue
        FROM \`${datasetId}.ga4_website_overview\`
        WHERE date BETWEEN REPLACE(@startDate, '-', '') AND REPLACE(@endDate, '-', '')
        GROUP BY country
        LIMIT 10
      `;

      // Query 6: Get device breakdown
      const devicesQuery = `
        SELECT
          deviceCategory,
          SUM(CAST(totalUsers AS INT64)) as users,
          SUM(CAST(sessions AS INT64)) as sessions,
          0 as revenue,
          AVG(CAST(bounceRate AS FLOAT64)) as bounce_rate
        FROM \`${datasetId}.ga4_devices\`
        WHERE date BETWEEN REPLACE(@startDate, '-', '') AND REPLACE(@endDate, '-', '')
        GROUP BY deviceCategory
        ORDER BY users DESC
      `;

      // Execute all queries in parallel
      const [dauResults, wauResults, mauResults, overviewResults, locationsResults, devicesResults] =
        await Promise.all([
          bigquery.query({
            query: dauQuery,
            params: { startDate, endDate },
            location: 'europe-west2',
          }),
          bigquery.query({
            query: wauQuery,
            params: { startDate, endDate },
            location: 'europe-west2',
          }),
          bigquery.query({
            query: mauQuery,
            params: { startDate, endDate },
            location: 'europe-west2',
          }),
          bigquery.query({
            query: overviewQuery,
            params: { startDate, endDate },
            location: 'europe-west2',
          }),
          bigquery.query({
            query: locationsQuery,
            params: { startDate, endDate },
            location: 'europe-west2',
          }),
          bigquery.query({
            query: devicesQuery,
            params: { startDate, endDate },
            location: 'europe-west2',
          }),
        ]);

      // Extract results
      const dau = (dauResults[0][0] as GA4DailyActiveUsersRow)?.activeUsers || 0;
      const wau = (wauResults[0][0] as GA4WeeklyActiveUsersRow)?.activeUsers || 0;
      const mau = (mauResults[0][0] as GA4FourWeeklyActiveUsersRow)?.activeUsers || 0;

      const overview = overviewResults[0][0] as any;
      const totalUsers = overview?.totalUsers || 0;
      const newUsers = overview?.newUsers || 0;
      const returningUsers = totalUsers - newUsers;

      const locations = locationsResults[0] as any[];
      const devices = devicesResults[0] as any[];

      // Calculate percentages for locations
      const totalLocationUsers = locations.reduce((sum, loc) => sum + (loc.users || 0), 0);
      const locationData = locations.map((loc) => ({
        country: loc.country,
        users: loc.users || 0,
        sessions: loc.sessions || 0,
        revenue: loc.revenue || 0,
        percentage: totalLocationUsers > 0 ? (loc.users / totalLocationUsers) * 100 : 0,
      }));

      // Calculate percentages for devices
      const totalDeviceUsers = devices.reduce((sum, dev) => sum + (dev.users || 0), 0);
      const deviceData = devices.map((dev) => ({
        deviceCategory: dev.deviceCategory,
        users: dev.users || 0,
        sessions: dev.sessions || 0,
        revenue: dev.revenue || 0,
        percentage: totalDeviceUsers > 0 ? (dev.users / totalDeviceUsers) * 100 : 0,
      }));

      const data: CustomerInsightsData = {
        activeUsers: {
          daily: dau,
          weekly: wau,
          monthly: mau,
        },
        userMetrics: {
          totalUsers,
          newUsers,
          returningUsers,
          newUserPercentage: totalUsers > 0 ? (newUsers / totalUsers) * 100 : 0,
          returningUserPercentage: totalUsers > 0 ? (returningUsers / totalUsers) * 100 : 0,
        },
        demographics: {
          byLocation: locationData,
          byDevice: deviceData,
        },
        engagement: {
          averageSessionDuration: overview?.averageSessionDuration || 0,
          screenPageViewsPerSession: overview?.screenPageViewsPerSession || 0,
          engagementRate: overview?.engagementRate || 0,
          bounceRate: overview?.bounceRate || 0,
        },
      };

      return NextResponse.json<ApiResponse<CustomerInsightsData>>({
        success: true,
        data,
      });
    } catch (error: unknown) {
      console.error('Error fetching customer insights:', error);
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

