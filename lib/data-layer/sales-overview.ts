import { bigquery } from '@/lib/bigquery/client';
import { buildWebsiteFilter, executeQuery } from './base';
import { QueryOptions } from './base';

export interface SalesOverviewDailyRow {
  date: string;
  website_id?: string;
  total_orders: number;
  unique_customers: number;
  total_revenue: number;
  subtotal: number;
  total_tax: number;
  total_shipping: number;
  total_discounts: number;
  total_items: number;
  orders_complete: number;
  orders_pending: number;
  orders_processing: number;
  orders_canceled: number;
  revenue_complete: number;
  revenue_pending: number;
  orders_sample?: number;
  orders_not_sample?: number;
}

export interface SalesOverviewData {
  daily: SalesOverviewDailyRow[];
  summary: {
    total_orders: number;
    total_revenue: number;
    total_items: number;
    unique_customers: number;
    aov: number;
    items_per_order: number;
    subtotal: number;
    total_tax: number;
    total_shipping: number;
    total_discounts: number;
    orders_complete: number;
    orders_pending: number;
    orders_processing: number;
    orders_canceled: number;
    orders_sample?: number;
    orders_not_sample?: number;
  };
}

/**
 * Fetches sales overview data with currency conversion and grouped website aggregation.
 */
export async function getSalesOverview(
  options: QueryOptions & { excludeSampleOrders?: boolean }
): Promise<SalesOverviewData> {
  const { datasetId, clientId, websiteId, startDate, endDate, excludeSampleOrders = false } = options;

  // Build website filter
  const websiteFilter = await buildWebsiteFilter(clientId, websiteId);

  // Check if sample order columns exist in aggregated table (only if not excluding)
  let hasSampleColumns = false;
  if (!excludeSampleOrders) {
    try {
      const schemaQuery = `
        SELECT column_name
        FROM \`${bigquery.projectId}.${datasetId}.INFORMATION_SCHEMA.COLUMNS\`
        WHERE table_name = 'mv_agg_sales_overview_daily'
          AND column_name IN ('orders_sample', 'orders_not_sample')
      `;
      const [schemaRows] = await bigquery.query(schemaQuery);
      hasSampleColumns = schemaRows.length > 0;
    } catch (schemaError) {
      console.log('[Sales Overview] Could not check schema, assuming sample columns do not exist:', schemaError);
      hasSampleColumns = false;
    }
  }

  let query: string;
  let queryParams: Record<string, any> = {
    start_date: startDate,
    end_date: endDate,
    ...websiteFilter.params,
  };

  if (excludeSampleOrders) {
    // Query directly from materialized view excluding sample orders
    query = `
      SELECT 
        o.order_date as date,
        o.website_id,
        COUNT(DISTINCT o.entity_id) as total_orders,
        COUNT(DISTINCT o.customer_id) as unique_customers,
        SUM(CAST(o.grand_total AS FLOAT64)) as total_revenue,
        SUM(CAST(o.subtotal AS FLOAT64)) as subtotal,
        SUM(CAST(o.tax_amount AS FLOAT64)) as total_tax,
        SUM(CAST(o.shipping_amount AS FLOAT64)) as total_shipping,
        SUM(CAST(o.discount_amount AS FLOAT64)) as total_discounts,
        SUM(CAST(o.total_qty_ordered AS FLOAT64)) as total_items,
        COUNTIF(o.status = 'complete') as orders_complete,
        COUNTIF(o.status = 'pending') as orders_pending,
        COUNTIF(o.status = 'processing') as orders_processing,
        COUNTIF(o.status = 'canceled') as orders_canceled,
        SUM(IF(o.status = 'complete', CAST(o.grand_total AS FLOAT64), 0)) as revenue_complete,
        SUM(IF(o.status = 'pending', CAST(o.grand_total AS FLOAT64), 0)) as revenue_pending,
        CAST(0 AS INT64) as orders_sample,
        CAST(0 AS INT64) as orders_not_sample
      FROM \`${bigquery.projectId}.${datasetId}.mv_adobe_commerce_orders_flattened\` o
      WHERE o.order_date BETWEEN @start_date AND @end_date
        AND COALESCE(CAST(o.ext_is_samples AS INT64), 0) = 0
        ${websiteFilter.filterClause ? websiteFilter.filterClause.replace(/(?<!@)website_id/g, 'o.website_id') : ''}
      GROUP BY date, o.website_id
      ORDER BY date DESC
    `;
  } else {
    // Use aggregated table
    const sampleColumns = hasSampleColumns
      ? `orders_sample,
        orders_not_sample`
      : `CAST(NULL AS INT64) as orders_sample,
        CAST(NULL AS INT64) as orders_not_sample`;

    query = `
      SELECT 
        date,
        website_id,
        total_orders,
        unique_customers,
        total_revenue,
        subtotal,
        total_tax,
        total_shipping,
        total_discounts,
        total_items,
        orders_complete,
        orders_pending,
        orders_processing,
        orders_canceled,
        revenue_complete,
        revenue_pending,
        ${sampleColumns}
      FROM \`${bigquery.projectId}.${datasetId}.mv_agg_sales_overview_daily\`
      WHERE date BETWEEN @start_date AND @end_date
        ${websiteFilter.filterClause}
      ORDER BY date DESC
    `;
  }

  // Execute query and process results
  const daily = await executeQuery<SalesOverviewDailyRow>(query, queryParams, {
    clientId,
    startDate,
    monetaryFields: [
      { field: 'total_revenue', websiteField: 'website_id', dateField: 'date' },
      { field: 'subtotal', websiteField: 'website_id', dateField: 'date' },
      { field: 'total_tax', websiteField: 'website_id', dateField: 'date' },
      { field: 'total_shipping', websiteField: 'website_id', dateField: 'date' },
      { field: 'total_discounts', websiteField: 'website_id', dateField: 'date' },
      { field: 'revenue_complete', websiteField: 'website_id', dateField: 'date' },
      { field: 'revenue_pending', websiteField: 'website_id', dateField: 'date' },
    ],
    groupBy: ['date'],
    sumFields: [
      'total_orders',
      'total_revenue',
      'subtotal',
      'total_tax',
      'total_shipping',
      'total_discounts',
      'total_items',
      'orders_complete',
      'orders_pending',
      'orders_processing',
      'orders_canceled',
      'revenue_complete',
      'revenue_pending',
      'orders_sample',
      'orders_not_sample',
      'unique_customers',
    ],
    maxFields: [],
  });

  // Calculate summary
  const summary = daily.reduce(
    (acc, row) => {
      acc.total_orders += row.total_orders || 0;
      acc.total_revenue += row.total_revenue || 0;
      acc.total_items += row.total_items || 0;
      acc.unique_customers += row.unique_customers || 0;
      acc.subtotal += row.subtotal || 0;
      acc.total_tax += row.total_tax || 0;
      acc.total_shipping += row.total_shipping || 0;
      acc.total_discounts += row.total_discounts || 0;
      acc.orders_complete += row.orders_complete || 0;
      acc.orders_pending += row.orders_pending || 0;
      acc.orders_processing += row.orders_processing || 0;
      acc.orders_canceled += row.orders_canceled || 0;
      if (row.orders_sample !== undefined) {
        acc.orders_sample = (acc.orders_sample || 0) + (row.orders_sample || 0);
      }
      if (row.orders_not_sample !== undefined) {
        acc.orders_not_sample = (acc.orders_not_sample || 0) + (row.orders_not_sample || 0);
      }
      return acc;
    },
    {
      total_orders: 0,
      total_revenue: 0,
      total_items: 0,
      unique_customers: 0,
      subtotal: 0,
      total_tax: 0,
      total_shipping: 0,
      total_discounts: 0,
      orders_complete: 0,
      orders_pending: 0,
      orders_processing: 0,
      orders_canceled: 0,
      orders_sample: 0,
      orders_not_sample: 0,
    }
  );

  const finalSummary = {
    ...summary,
    aov: summary.total_orders > 0 ? summary.total_revenue / summary.total_orders : 0,
    items_per_order: summary.total_orders > 0 ? summary.total_items / summary.total_orders : 0,
    orders_sample: summary.orders_sample ?? 0,
    orders_not_sample: summary.orders_not_sample ?? summary.total_orders,
  };

  return {
    daily,
    summary: finalSummary,
  };
}

