import { bigquery } from '@/lib/bigquery/client';
import { buildWebsiteFilter } from './base';
import { QueryOptions } from './base';

export interface SampleOrdersByCollectionRow {
  collection: string;
  total_items: number;
  total_orders: number;
}

/**
 * Fetches sample orders by collection data.
 * Note: This doesn't need currency conversion as it only tracks quantities.
 */
export async function getSampleOrdersByCollection(
  options: QueryOptions
): Promise<SampleOrdersByCollectionRow[]> {
  const { datasetId, clientId, websiteId, startDate, endDate } = options;

  // Build website filter
  const websiteFilter = await buildWebsiteFilter(clientId, websiteId);

  const query = `
    SELECT 
      COALESCE(p.attr_sdb_collection_name, 'Unknown') as collection,
      SUM(CAST(item.qty_ordered AS FLOAT64)) as total_items,
      COUNT(DISTINCT item.order_entity_id) as total_orders
    FROM \`${bigquery.projectId}.${datasetId}.mv_adobe_commerce_sales_items\` item
    INNER JOIN \`${bigquery.projectId}.${datasetId}.mv_adobe_commerce_orders_flattened\` o
      ON item.order_entity_id = o.entity_id
    LEFT JOIN \`${bigquery.projectId}.${datasetId}.mv_adobe_commerce_products_flattened\` p
      ON item.sku = p.sku
    WHERE item.order_date BETWEEN @start_date AND @end_date
      AND COALESCE(CAST(o.ext_is_samples AS INT64), 0) = 1
      ${websiteFilter.filterClause ? websiteFilter.filterClause.replace(/(?<!@)website_id/g, 'item.website_id') : ''}
    GROUP BY collection
    ORDER BY total_items DESC
  `;

  const queryParams: Record<string, any> = {
    start_date: startDate,
    end_date: endDate,
    ...websiteFilter.params,
  };

  // Execute query (no currency conversion needed for this query)
  const [rows] = await bigquery.query({
    query,
    params: queryParams,
  });

  // Transform results
  return rows.map((row: any) => ({
    collection: row.collection || 'Unknown',
    total_items: Number(row.total_items) || 0,
    total_orders: Number(row.total_orders) || 0,
  }));
}

