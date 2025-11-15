import { bigquery } from '@/lib/bigquery/client';
import { buildWebsiteFilter, executeQuery } from './base';
import { QueryOptions } from './base';

export interface SampleOrdersDailyRow {
  date: string;
  website_id?: string;
  total_orders: number;
  total_revenue: number;
  total_items: number;
}

export interface SampleOrdersDailyData {
  daily: SampleOrdersDailyRow[];
  summary: {
    total_orders: number;
    total_revenue: number;
    total_items: number;
    items_per_order: number;
  };
}

/**
 * Fetches sample orders daily data with currency conversion and grouped website aggregation.
 */
export async function getSampleOrdersDaily(
  options: QueryOptions
): Promise<SampleOrdersDailyData> {
  const { datasetId, clientId, websiteId, startDate, endDate } = options;

  // Build website filter
  const websiteFilter = await buildWebsiteFilter(clientId, websiteId);
  
  const filterClause = websiteFilter.filterClause 
    ? websiteFilter.filterClause.replace(/(?<!@)website_id/g, 'o.website_id')
    : '';

  console.log('[Sample Orders Daily] Query filter:', {
    websiteId,
    filterClause,
    params: websiteFilter.params,
  });

  const query = `
    SELECT 
      o.order_date as date,
      o.website_id,
      COUNT(DISTINCT o.entity_id) as total_orders,
      SUM(CAST(o.grand_total AS FLOAT64)) as total_revenue,
      SUM(CAST(o.total_qty_ordered AS FLOAT64)) as total_items
    FROM \`${bigquery.projectId}.${datasetId}.mv_adobe_commerce_orders_flattened\` o
    WHERE o.order_date BETWEEN @start_date AND @end_date
      AND COALESCE(CAST(o.ext_is_samples AS INT64), 0) = 1
      ${filterClause}
    GROUP BY date, o.website_id
    ORDER BY date DESC
  `;

  const queryParams: Record<string, any> = {
    start_date: startDate,
    end_date: endDate,
    ...websiteFilter.params,
  };

  // Execute query and process results
  const daily = await executeQuery<SampleOrdersDailyRow>(query, queryParams, {
    clientId,
    startDate,
    monetaryFields: [
      { field: 'total_revenue', websiteField: 'website_id', dateField: 'date' },
    ],
    groupBy: ['date'],
    sumFields: ['total_orders', 'total_revenue', 'total_items'],
    maxFields: [],
  });

  // Calculate summary
  const summary = daily.reduce(
    (acc, row) => {
      acc.total_orders += row.total_orders || 0;
      acc.total_revenue += row.total_revenue || 0;
      acc.total_items += row.total_items || 0;
      return acc;
    },
    {
      total_orders: 0,
      total_revenue: 0,
      total_items: 0,
    }
  );

  const finalSummary = {
    ...summary,
    items_per_order: summary.total_orders > 0 ? summary.total_items / summary.total_orders : 0,
  };

  return {
    daily,
    summary: finalSummary,
  };
}

