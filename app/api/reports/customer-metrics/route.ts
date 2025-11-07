import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { bigquery } from '@/lib/bigquery/client';
import { ApiResponse } from '@/types';
import { resolveWebsiteToBigQueryIds } from '@/lib/utils/website-resolver';

interface CustomerMetricsRow {
  date: string;
  website_id: string;
  unique_customers: number;
  registered_customers: number;
  guest_customers: number;
  revenue_per_customer: number;
}

export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      
      const datasetId = searchParams.get('dataset_id');
      const websiteId = searchParams.get('website_id');
      const clientId = searchParams.get('client_id') || user.clientId;
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      
      if (!datasetId || !startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameters' },
          { status: 400 }
        );
      }
      
      // Resolve website ID to BigQuery website IDs (handles grouped websites)
      let bigQueryWebsiteIds: string[] | null = null;
      if (websiteId && websiteId !== 'all_combined' && clientId) {
        bigQueryWebsiteIds = await resolveWebsiteToBigQueryIds(clientId, websiteId);
        if (!bigQueryWebsiteIds) {
          bigQueryWebsiteIds = [websiteId];
        }
      } else if (websiteId && websiteId !== 'all_combined') {
        bigQueryWebsiteIds = [websiteId];
      }
      
      let query = `
        SELECT 
          date,
          website_id,
          unique_customers,
          registered_customers,
          guest_customers,
          revenue_per_customer
        FROM \`${bigquery.projectId}.${datasetId}.agg_customer_metrics_daily\`
        WHERE date BETWEEN @start_date AND @end_date
      `;
      
      // Add website filter - use IN clause for grouped websites, = for single websites
      if (bigQueryWebsiteIds && bigQueryWebsiteIds.length > 0) {
        if (bigQueryWebsiteIds.length === 1) {
          query += ` AND website_id = @website_id`;
        } else {
          const placeholders = bigQueryWebsiteIds.map((_, i) => `@website_id${i}`).join(', ');
          query += ` AND website_id IN (${placeholders})`;
        }
      }
      
      query += ` ORDER BY date DESC`;
      
      const queryOptions: any = {
        query,
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      };
      
      // Add website ID(s) to params
      if (bigQueryWebsiteIds && bigQueryWebsiteIds.length > 0) {
        if (bigQueryWebsiteIds.length === 1) {
          queryOptions.params.website_id = bigQueryWebsiteIds[0];
        } else {
          bigQueryWebsiteIds.forEach((id, i) => {
            queryOptions.params[`website_id${i}`] = id;
          });
        }
      }
      
      const [rows] = await bigquery.query(queryOptions);

      // Transform rows to convert BigQuery DATE objects to strings
      const transformedRows = rows.map((row: any) => ({
        ...row,
        date: row.date?.value || row.date,
      }));

      // Calculate summary
      const summary = transformedRows.reduce(
        (acc: any, row: CustomerMetricsRow) => {
          acc.total_unique_customers += row.unique_customers || 0;
          acc.total_registered_customers += row.registered_customers || 0;
          acc.total_guest_customers += row.guest_customers || 0;
          acc.total_revenue_per_customer += row.revenue_per_customer || 0;
          acc.count += 1;
          return acc;
        },
        { 
          total_unique_customers: 0, 
          total_registered_customers: 0, 
          total_guest_customers: 0,
          total_revenue_per_customer: 0,
          count: 0
        }
      );
      
      // Calculate averages
      summary.avg_revenue_per_customer = summary.count > 0
        ? summary.total_revenue_per_customer / summary.count
        : 0;
      
      return NextResponse.json<ApiResponse<{ daily: typeof transformedRows; summary: typeof summary }>>({
        success: true,
        data: {
          daily: transformedRows,
          summary,
        },
      });
    } catch (error: any) {
      console.error('Error fetching customer metrics:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

