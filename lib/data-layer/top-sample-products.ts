import { bigquery } from '@/lib/bigquery/client';
import { buildWebsiteFilter, executeQuery } from './base';
import { QueryOptions } from './base';

export interface TopSampleProduct {
  sku: string;
  product_name: string;
  product_id: string;
  total_qty_ordered: number;
  total_revenue: number;
  avg_price: number;
  order_count: number;
}

/**
 * Fetches top sample products data with currency conversion and grouped website aggregation.
 */
export async function getTopSampleProducts(
  options: QueryOptions & { limit?: number }
): Promise<TopSampleProduct[]> {
  const { datasetId, clientId, websiteId, startDate, endDate, limit = 10 } = options;

  // Build website filter
  const websiteFilter = await buildWebsiteFilter(clientId, websiteId);

  const query = `
    SELECT 
      item.order_date,
      item.website_id as store_id,
      CAST(item.order_entity_id AS STRING) as order_id,
      item.sku,
      item.product_name,
      item.product_id,
      CAST(item.qty_ordered AS FLOAT64) as total_qty_ordered,
      CAST(item.row_total AS FLOAT64) as total_revenue,
      CAST(item.price AS FLOAT64) as avg_price
    FROM \`${bigquery.projectId}.${datasetId}.mv_adobe_commerce_sales_items\` item
    INNER JOIN \`${bigquery.projectId}.${datasetId}.mv_adobe_commerce_orders_flattened\` o
      ON item.order_entity_id = o.entity_id
    WHERE item.order_date BETWEEN @start_date AND @end_date
      AND COALESCE(CAST(o.ext_is_samples AS INT64), 0) = 1
      ${websiteFilter.filterClause ? websiteFilter.filterClause.replace(/(?<!@)website_id/g, 'item.website_id') : ''}
  `;

  const queryParams: Record<string, any> = {
    start_date: startDate,
    end_date: endDate,
    ...websiteFilter.params,
  };

  // Execute query and process results (aggregate by date+store_id+product first)
  const rows = await executeQuery<{
    order_date: string;
    store_id?: string;
    order_id: string;
    sku: string;
    product_name: string;
    product_id: string;
    total_qty_ordered: number;
    total_revenue: number;
    avg_price: number;
  }>(query, queryParams, {
    clientId,
    startDate,
    monetaryFields: [
      { field: 'total_revenue', websiteField: 'store_id', dateField: 'order_date' },
      { field: 'avg_price', websiteField: 'store_id', dateField: 'order_date' },
    ],
    groupBy: ['order_date', 'sku', 'product_id'],
    sumFields: ['total_qty_ordered', 'total_revenue'],
    maxFields: [],
  });

  // Then aggregate by product across all dates, tracking unique orders
  const aggregatedByProduct = rows.reduce<
    Record<
      string,
      {
        sku: string;
        product_name: string;
        product_id: string;
        total_qty_ordered: number;
        total_revenue: number;
        orderIds: Set<string>;
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
        total_revenue: 0,
        orderIds: new Set<string>(),
      };
    }

    acc[key].total_qty_ordered += row.total_qty_ordered || 0;
    acc[key].total_revenue += row.total_revenue || 0;
    if (row.order_id) {
      acc[key].orderIds.add(String(row.order_id));
    }

    return acc;
  }, {});

  // Transform to final format
  const result = Object.values(aggregatedByProduct)
    .map(({ orderIds, ...row }) => ({
      ...row,
      order_count: orderIds.size,
      avg_price: row.total_qty_ordered > 0 ? row.total_revenue / row.total_qty_ordered : 0,
    }))
    .sort((a, b) => (b.total_qty_ordered || 0) - (a.total_qty_ordered || 0))
    .slice(0, limit);

  return result;
}

