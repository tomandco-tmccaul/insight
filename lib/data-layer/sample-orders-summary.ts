import { bigquery } from '@/lib/bigquery/client';
import { buildWebsiteFilter, executeQuery } from './base';
import { QueryOptions } from './base';

export interface SampleOrdersSummaryRow {
  order_date: string;
  store_id?: string;
  total_sample_orders: number;
  total_sample_qty: number;
  total_sample_revenue: number;
}

export interface SampleOrdersSummaryData {
  total_sample_orders: number;
  total_sample_qty: number;
  total_sample_revenue: number;
}

/**
 * Fetches sample orders summary data with currency conversion and grouped website aggregation.
 */
export async function getSampleOrdersSummary(
  options: QueryOptions
): Promise<SampleOrdersSummaryData> {
  const { datasetId, clientId, websiteId, startDate, endDate } = options;

  // Build website filter
  const websiteFilter = await buildWebsiteFilter(clientId, websiteId);

  const query = `
    SELECT 
      o.order_date,
      o.website_id as store_id,
      COUNT(DISTINCT o.entity_id) as total_sample_orders,
      SUM(CAST(o.total_qty_ordered AS FLOAT64)) as total_sample_qty,
      SUM(CAST(o.grand_total AS FLOAT64)) as total_sample_revenue
    FROM \`${bigquery.projectId}.${datasetId}.mv_adobe_commerce_orders_flattened\` o
    WHERE o.order_date BETWEEN @start_date AND @end_date
      AND COALESCE(CAST(o.ext_is_samples AS INT64), 0) = 1
      ${websiteFilter.filterClause ? websiteFilter.filterClause.replace(/(?<!@)website_id/g, 'o.website_id') : ''}
    GROUP BY order_date, store_id
  `;

  const queryParams: Record<string, any> = {
    start_date: startDate,
    end_date: endDate,
    ...websiteFilter.params,
  };

  // Execute query and process results (aggregate by date+store_id first)
  const rows = await executeQuery<SampleOrdersSummaryRow>(query, queryParams, {
    clientId,
    startDate,
    monetaryFields: [
      { field: 'total_sample_revenue', websiteField: 'store_id', dateField: 'order_date' },
    ],
    groupBy: ['order_date'],
    sumFields: ['total_sample_orders', 'total_sample_qty', 'total_sample_revenue'],
    maxFields: [],
  });

  // Then aggregate everything into a single summary
  const summary = rows.reduce(
    (acc, row) => {
      acc.total_sample_orders += row.total_sample_orders || 0;
      acc.total_sample_qty += row.total_sample_qty || 0;
      acc.total_sample_revenue += row.total_sample_revenue || 0;
      return acc;
    },
    {
      total_sample_orders: 0,
      total_sample_qty: 0,
      total_sample_revenue: 0,
    }
  );

  return summary;
}

