import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { bigquery } from '@/lib/bigquery/client';
import { ApiResponse } from '@/types';

interface HourlySalesRow {
  date: string;
  hour: number;
  website_id: string;
  total_orders: number;
  total_revenue: number;
}

export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      
      const datasetId = searchParams.get('dataset_id');
      const websiteId = searchParams.get('website_id');
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      
      if (!datasetId || !startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameters' },
          { status: 400 }
        );
      }
      
      let query = `
        SELECT 
          date,
          hour,
          website_id,
          total_orders,
          total_revenue
        FROM \`${bigquery.projectId}.${datasetId}.agg_sales_overview_hourly\`
        WHERE date BETWEEN @start_date AND @end_date
      `;
      
      if (websiteId && websiteId !== 'all_combined') {
        query += ` AND website_id = @website_id`;
      }
      
      query += ` ORDER BY date DESC, hour DESC`;
      
      const queryOptions: any = {
        query,
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      };
      
      if (websiteId && websiteId !== 'all_combined') {
        queryOptions.params.website_id = websiteId;
      }
      
      const [rows] = await bigquery.query(queryOptions);
      
      // Aggregate by hour across all days
      const hourlyAggregates = Array.from({ length: 24 }, (_, hour) => {
        const hourData = rows.filter((row: HourlySalesRow) => row.hour === hour);
        const totalOrders = hourData.reduce((sum: number, row: HourlySalesRow) => sum + (row.total_orders || 0), 0);
        const totalRevenue = hourData.reduce((sum: number, row: HourlySalesRow) => sum + (row.total_revenue || 0), 0);
        
        return {
          hour,
          total_orders: totalOrders,
          total_revenue: totalRevenue,
          avg_orders_per_day: hourData.length > 0 ? totalOrders / hourData.length : 0,
          avg_revenue_per_day: hourData.length > 0 ? totalRevenue / hourData.length : 0,
        };
      });
      
      // Find peak hours
      const peakOrdersHour = hourlyAggregates.reduce((max, curr) => 
        curr.total_orders > max.total_orders ? curr : max
      );
      
      const peakRevenueHour = hourlyAggregates.reduce((max, curr) => 
        curr.total_revenue > max.total_revenue ? curr : max
      );
      
      return NextResponse.json<ApiResponse<{ 
        hourly: typeof hourlyAggregates; 
        peaks: { orders: typeof peakOrdersHour; revenue: typeof peakRevenueHour }
      }>>({
        success: true,
        data: {
          hourly: hourlyAggregates,
          peaks: {
            orders: peakOrdersHour,
            revenue: peakRevenueHour,
          },
        },
      });
    } catch (error: any) {
      console.error('Error fetching hourly sales:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

