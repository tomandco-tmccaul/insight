import { bigquery } from '@/lib/bigquery/client';
import { buildWebsiteFilter, executeQuery } from './base';
import { QueryOptions } from './base';

export interface CollectionPerformanceRow {
  collection: string;
  total_revenue: number;
  total_qty: number;
  order_count: number;
}

/**
 * Fetches collections performance data with currency conversion and grouped website aggregation.
 */
export async function getCollectionsPerformance(
  options: QueryOptions & { orderType?: 'main' | 'sample'; sortBy?: 'revenue' | 'qty'; limit?: number }
): Promise<CollectionPerformanceRow[]> {
  const {
    datasetId,
    clientId,
    websiteId,
    startDate,
    endDate,
    orderType = 'main',
    sortBy = 'revenue',
    limit = 20,
  } = options;

  // Build website filter
  const websiteFilter = await buildWebsiteFilter(clientId, websiteId);

  // Build sample order filter
  const sampleFilter =
    orderType === 'sample'
      ? 'AND COALESCE(CAST(o.ext_is_samples AS INT64), 0) = 1'
      : 'AND COALESCE(CAST(o.ext_is_samples AS INT64), 0) = 0';

  const query = `
    SELECT 
      item.order_date,
      item.website_id as store_id,
      COALESCE(JSON_VALUE(p.attributes, '$.sdb_collection_name'), 'Unknown') as collection,
      SUM(CAST(item.row_total AS FLOAT64)) as total_revenue,
      SUM(CAST(item.qty_ordered AS FLOAT64)) as total_qty,
      COUNT(DISTINCT item.order_entity_id) as order_count
    FROM \`${bigquery.projectId}.${datasetId}.mv_adobe_commerce_sales_items\` item
    INNER JOIN \`${bigquery.projectId}.${datasetId}.mv_adobe_commerce_orders_flattened\` o
      ON item.order_entity_id = o.entity_id
    LEFT JOIN \`${bigquery.projectId}.${datasetId}.mv_adobe_commerce_products_flattened\` p
      ON item.sku = p.sku
    WHERE item.order_date BETWEEN @start_date AND @end_date
      ${sampleFilter}
      ${websiteFilter.filterClause ? websiteFilter.filterClause.replace(/(?<!@)website_id/g, 'item.website_id') : ''}
    GROUP BY order_date, store_id, collection
  `;

  const queryParams: Record<string, any> = {
    start_date: startDate,
    end_date: endDate,
    ...websiteFilter.params,
  };

  // Execute query and process results (aggregate by date+store_id+collection first)
  const rows = await executeQuery<{
    order_date: string;
    store_id?: string;
    collection: string;
    total_revenue: number;
    total_qty: number;
    order_count: number;
  }>(query, queryParams, {
    clientId,
    startDate,
    monetaryFields: [{ field: 'total_revenue', websiteField: 'store_id', dateField: 'order_date' }],
    groupBy: ['order_date', 'collection'],
    sumFields: ['total_revenue', 'total_qty', 'order_count'],
    maxFields: [],
  });

  // Then aggregate by collection across all dates
  const aggregatedByCollection = rows.reduce<Record<string, CollectionPerformanceRow>>(
    (acc, row) => {
      const key = row.collection || 'Unknown';
      if (!acc[key]) {
        acc[key] = {
          collection: key,
          total_revenue: 0,
          total_qty: 0,
          order_count: 0,
        };
      }

      acc[key].total_revenue += row.total_revenue || 0;
      acc[key].total_qty += row.total_qty || 0;
      acc[key].order_count += row.order_count || 0;

      return acc;
    },
    {}
  );

  // Sort and limit
  const result = Object.values(aggregatedByCollection).sort((a, b) => {
    if (sortBy === 'qty') {
      return (b.total_qty || 0) - (a.total_qty || 0);
    }
    return (b.total_revenue || 0) - (a.total_revenue || 0);
  });

  return result.slice(0, limit);
}

