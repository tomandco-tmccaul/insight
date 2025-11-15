import { bigquery } from '@/lib/bigquery/client';
import { buildWebsiteFilter, executeQuery } from './base';
import { QueryOptions } from './base';

export interface ProductPerformanceRow {
  date: string;
  website_id?: string;
  sku: string;
  product_name: string;
  product_id: string;
  total_qty_ordered: number;
  total_qty_invoiced: number;
  total_qty_shipped: number;
  total_revenue: number;
  total_discount: number;
  avg_price: number;
  order_count: number;
}

export interface TopProduct {
  sku: string;
  product_name: string;
  product_id: string;
  total_qty_ordered: number;
  total_qty_invoiced: number;
  total_qty_shipped: number;
  total_revenue: number;
  total_discount: number;
  avg_price: number;
  order_count: number;
}

/**
 * Fetches top products data with currency conversion and grouped website aggregation.
 */
export async function getTopProducts(
  options: QueryOptions & { limit?: number; sortBy?: 'revenue' | 'quantity' }
): Promise<TopProduct[]> {
  const { datasetId, clientId, websiteId, startDate, endDate, limit = 10, sortBy = 'revenue' } = options;

  // Build website filter
  const websiteFilter = await buildWebsiteFilter(clientId, websiteId);

  const query = `
    SELECT 
      date,
      website_id,
      sku,
      product_name,
      product_id,
      total_qty_ordered,
      total_qty_invoiced,
      total_qty_shipped,
      total_revenue,
      total_discount,
      avg_price,
      order_count
    FROM \`${bigquery.projectId}.${datasetId}.mv_agg_product_performance_daily\`
    WHERE date BETWEEN @start_date AND @end_date
      ${websiteFilter.filterClause}
  `;

  const queryParams: Record<string, any> = {
    start_date: startDate,
    end_date: endDate,
    ...websiteFilter.params,
  };

  // Execute query and process results (aggregate by date+product first)
  const rows = await executeQuery<ProductPerformanceRow>(query, queryParams, {
    clientId,
    startDate,
    monetaryFields: [
      { field: 'total_revenue', websiteField: 'website_id', dateField: 'date' },
      { field: 'total_discount', websiteField: 'website_id', dateField: 'date' },
      { field: 'avg_price', websiteField: 'website_id', dateField: 'date' },
    ],
    groupBy: ['date', 'sku', 'product_id'],
    sumFields: [
      'total_qty_ordered',
      'total_qty_invoiced',
      'total_qty_shipped',
      'total_revenue',
      'total_discount',
      'order_count',
    ],
    maxFields: [],
  });

  // Then aggregate by product across all dates
  const aggregatedByProduct = rows.reduce<
    Record<
      string,
      {
        sku: string;
        product_name: string;
        product_id: string;
        total_qty_ordered: number;
        total_qty_invoiced: number;
        total_qty_shipped: number;
        total_revenue: number;
        total_discount: number;
        order_count: number;
      }
    >
  >((acc, row) => {
    const key = `${row.sku || 'unknown'}__${row.product_id || 'unknown'}`;
    if (!acc[key]) {
      acc[key] = {
        sku: row.sku,
        product_name: row.product_name,
        product_id: row.product_id,
        total_qty_ordered: 0,
        total_qty_invoiced: 0,
        total_qty_shipped: 0,
        total_revenue: 0,
        total_discount: 0,
        order_count: 0,
      };
    }

    acc[key].total_qty_ordered += row.total_qty_ordered || 0;
    acc[key].total_qty_invoiced += row.total_qty_invoiced || 0;
    acc[key].total_qty_shipped += row.total_qty_shipped || 0;
    acc[key].total_revenue += row.total_revenue || 0;
    acc[key].total_discount += row.total_discount || 0;
    acc[key].order_count += row.order_count || 0;

    return acc;
  }, {});

  const aggregatedRows = Object.values(aggregatedByProduct).map((row) => ({
    ...row,
    avg_price: row.total_qty_ordered > 0 ? row.total_revenue / row.total_qty_ordered : 0,
  }));

  // Sort and limit
  aggregatedRows.sort((a, b) => {
    if (sortBy === 'quantity') {
      return (b.total_qty_ordered || 0) - (a.total_qty_ordered || 0);
    }
    return (b.total_revenue || 0) - (a.total_revenue || 0);
  });

  return aggregatedRows.slice(0, limit);
}

