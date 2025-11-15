import { bigquery } from '@/lib/bigquery/client';
import { buildWebsiteFilter, executeQuery } from './base';
import { QueryOptions } from './base';

export interface CategoryBreakdownRow {
  category_group: string;
  total_revenue: number;
  total_qty: number;
  order_count: number;
  percentage: number;
}

/**
 * Fetches category breakdown data with currency conversion and grouped website aggregation.
 */
export async function getCategoryBreakdown(
  options: QueryOptions & { orderType?: 'main' | 'sample' }
): Promise<CategoryBreakdownRow[]> {
  const { datasetId, clientId, websiteId, startDate, endDate, orderType = 'main' } = options;

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
      COALESCE(p.attr_sdb_collection_name, 'Unknown') as category_group,
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
    GROUP BY order_date, store_id, category_group
  `;

  const queryParams: Record<string, any> = {
    start_date: startDate,
    end_date: endDate,
    ...websiteFilter.params,
  };

  // Execute query and process results (aggregate by date+store_id+category_group first)
  const rows = await executeQuery<{
    order_date: string;
    store_id?: string;
    category_group: string;
    total_revenue: number;
    total_qty: number;
    order_count: number;
  }>(query, queryParams, {
    clientId,
    startDate,
    monetaryFields: [{ field: 'total_revenue', websiteField: 'store_id', dateField: 'order_date' }],
    groupBy: ['order_date', 'category_group'],
    sumFields: ['total_revenue', 'total_qty', 'order_count'],
    maxFields: [],
  });

  // Then aggregate by category across all dates
  const aggregatedByCategory = rows.reduce<Record<string, CategoryBreakdownRow>>((acc, row) => {
    const key = row.category_group || 'Unknown';
    if (!acc[key]) {
      acc[key] = {
        category_group: key,
        total_revenue: 0,
        total_qty: 0,
        order_count: 0,
        percentage: 0,
      };
    }

    acc[key].total_revenue += row.total_revenue || 0;
    acc[key].total_qty += row.total_qty || 0;
    acc[key].order_count += row.order_count || 0;

    return acc;
  }, {});

  const totalRevenue = Object.values(aggregatedByCategory).reduce(
    (sum, row) => sum + (row.total_revenue || 0),
    0
  );

  // Calculate percentages and sort
  const result = Object.values(aggregatedByCategory)
    .map((row) => ({
      ...row,
      percentage: totalRevenue > 0 ? (row.total_revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue);

  return result;
}

