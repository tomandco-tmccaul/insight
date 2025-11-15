import { bigquery } from '@/lib/bigquery/client';
import { buildWebsiteFilter, executeQuery } from './base';
import { QueryOptions } from './base';

export interface HourlySalesRow {
  date: string;
  hour: number;
  website_id?: string;
  total_orders: number;
  total_revenue: number;
}

export interface HourlySalesData {
  hourly: Array<{
    hour: number;
    total_orders: number;
    total_revenue: number;
    avg_orders_per_day: number;
    avg_revenue_per_day: number;
  }>;
  peaks: {
    orders: {
      hour: number;
      total_orders: number;
      total_revenue: number;
      avg_orders_per_day: number;
      avg_revenue_per_day: number;
    };
    revenue: {
      hour: number;
      total_orders: number;
      total_revenue: number;
      avg_orders_per_day: number;
      avg_revenue_per_day: number;
    };
  };
}

/**
 * Fetches hourly sales data with currency conversion and grouped website aggregation.
 */
export async function getHourlySales(
  options: QueryOptions
): Promise<HourlySalesData> {
  const { datasetId, clientId, websiteId, startDate, endDate } = options;

  // Build website filter
  const websiteFilter = await buildWebsiteFilter(clientId, websiteId);

  const query = `
    SELECT 
      date,
      hour,
      website_id,
      total_orders,
      total_revenue
    FROM \`${bigquery.projectId}.${datasetId}.mv_agg_sales_overview_hourly\`
    WHERE date BETWEEN @start_date AND @end_date
      ${websiteFilter.filterClause}
    ORDER BY date DESC, hour DESC
  `;

  const queryParams: Record<string, any> = {
    start_date: startDate,
    end_date: endDate,
    ...websiteFilter.params,
  };

  // Execute query and process results (aggregate by date+hour first)
  const rows = await executeQuery<HourlySalesRow>(query, queryParams, {
    clientId,
    startDate,
    monetaryFields: [
      { field: 'total_revenue', websiteField: 'website_id', dateField: 'date' },
    ],
    groupBy: ['date', 'hour'],
    sumFields: ['total_orders', 'total_revenue'],
    maxFields: [],
  });

  // Then aggregate by hour across all days
  const hourlyAggregates = Array.from({ length: 24 }, (_, hour) => {
    const hourData = rows.filter((row) => row.hour === hour);
    const totalOrders = hourData.reduce((sum, row) => sum + (row.total_orders || 0), 0);
    const totalRevenue = hourData.reduce((sum, row) => sum + (row.total_revenue || 0), 0);

    // Count unique dates for this hour to calculate averages correctly
    const uniqueDates = new Set(hourData.map((row) => row.date));
    const dayCount = uniqueDates.size;

    return {
      hour,
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      avg_orders_per_day: dayCount > 0 ? totalOrders / dayCount : 0,
      avg_revenue_per_day: dayCount > 0 ? totalRevenue / dayCount : 0,
    };
  });

  // Find peak hours
  const peakOrdersHour = hourlyAggregates.reduce((max, curr) =>
    curr.total_orders > max.total_orders ? curr : max
  );

  const peakRevenueHour = hourlyAggregates.reduce((max, curr) =>
    curr.total_revenue > max.total_revenue ? curr : max
  );

  return {
    hourly: hourlyAggregates,
    peaks: {
      orders: peakOrdersHour,
      revenue: peakRevenueHour,
    },
  };
}

