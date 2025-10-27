import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { bigquery } from '@/lib/bigquery/client';
import { ApiResponse } from '@/types';

export interface CreateAggregationRequest {
  datasetId: string;
  aggregationType: 'sales_overview' | 'product_performance';
}

/**
 * POST /api/admin/bigquery/aggregations
 * Create aggregation tables in BigQuery
 */
export async function POST(request: NextRequest) {
  return requireAdmin(request, async (req) => {
    try {
      const body: CreateAggregationRequest = await req.json();
      const { datasetId, aggregationType } = body;

      if (!datasetId || !aggregationType) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required fields: datasetId, aggregationType',
          },
          { status: 400 }
        );
      }

      let query = '';

      if (aggregationType === 'sales_overview') {
        query = getSalesOverviewAggregationQuery(datasetId);
      } else if (aggregationType === 'product_performance') {
        query = getProductPerformanceAggregationQuery(datasetId);
      } else {
        return NextResponse.json(
          {
            success: false,
            error: `Unknown aggregation type: ${aggregationType}`,
          },
          { status: 400 }
        );
      }

      // Execute the query
      const [job] = await bigquery.createQueryJob({
        query,
        location: 'europe-west2',
      });

      // Wait for the job to complete
      await job.getQueryResults();

      return NextResponse.json<ApiResponse<{ success: boolean }>>({
        success: true,
        data: { success: true },
      });
    } catch (error: unknown) {
      console.error('Error creating aggregation table:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        },
        { status: 500 }
      );
    }
  });
}

function getSalesOverviewAggregationQuery(datasetId: string): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'insight-dashboard-1761555293';

  return `
    CREATE OR REPLACE TABLE \`${projectId}.${datasetId}.agg_sales_overview_daily\`
    PARTITION BY date
    CLUSTER BY website_id, date
    AS
    SELECT 
      DATE(PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', created_at)) as date,
      CAST(store_id AS STRING) as website_id,
      
      -- Order Metrics
      COUNT(DISTINCT entity_id) as total_orders,
      COUNT(DISTINCT customer_id) as unique_customers,
      
      -- Revenue Metrics
      SUM(CAST(grand_total AS FLOAT64)) as total_revenue,
      SUM(CAST(subtotal AS FLOAT64)) as subtotal,
      SUM(CAST(tax_amount AS FLOAT64)) as total_tax,
      SUM(CAST(shipping_amount AS FLOAT64)) as total_shipping,
      SUM(CAST(discount_amount AS FLOAT64)) as total_discounts,
      
      -- Item Metrics
      SUM(CAST(total_qty_ordered AS FLOAT64)) as total_items,
      
      -- Order Status Breakdown
      COUNTIF(status = 'complete') as orders_complete,
      COUNTIF(status = 'pending') as orders_pending,
      COUNTIF(status = 'processing') as orders_processing,
      COUNTIF(status = 'canceled') as orders_canceled,
      
      -- Revenue by Status
      SUM(IF(status = 'complete', CAST(grand_total AS FLOAT64), 0)) as revenue_complete,
      SUM(IF(status = 'pending', CAST(grand_total AS FLOAT64), 0)) as revenue_pending,
      
      CURRENT_TIMESTAMP() as _aggregated_at
    FROM 
      \`${projectId}.${datasetId}.adobe_commerce_orders\`
    WHERE 
      created_at IS NOT NULL
    GROUP BY 
      date, website_id
  `;
}

function getProductPerformanceAggregationQuery(datasetId: string): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'insight-dashboard-1761555293';

  return `
    CREATE OR REPLACE TABLE \`${projectId}.${datasetId}.agg_product_performance_daily\`
    PARTITION BY date
    CLUSTER BY website_id, sku, date
    AS
    SELECT 
      DATE(PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', o.created_at)) as date,
      CAST(o.store_id AS STRING) as website_id,
      item.sku,
      item.name as product_name,
      item.product_id,
      
      -- Quantity metrics
      SUM(CAST(item.qty_ordered AS FLOAT64)) as total_qty_ordered,
      SUM(CAST(item.qty_invoiced AS FLOAT64)) as total_qty_invoiced,
      SUM(CAST(item.qty_shipped AS FLOAT64)) as total_qty_shipped,
      SUM(CAST(item.qty_canceled AS FLOAT64)) as total_qty_canceled,
      SUM(CAST(item.qty_refunded AS FLOAT64)) as total_qty_refunded,
      
      -- Revenue metrics
      SUM(CAST(item.row_total AS FLOAT64)) as total_revenue,
      SUM(CAST(item.base_row_total AS FLOAT64)) as total_base_revenue,
      SUM(CAST(item.discount_amount AS FLOAT64)) as total_discount,
      SUM(CAST(item.tax_amount AS FLOAT64)) as total_tax,
      
      -- Price metrics
      AVG(CAST(item.price AS FLOAT64)) as avg_price,
      MIN(CAST(item.price AS FLOAT64)) as min_price,
      MAX(CAST(item.price AS FLOAT64)) as max_price,
      
      -- Order count
      COUNT(DISTINCT o.entity_id) as order_count,
      
      CURRENT_TIMESTAMP() as _aggregated_at
    FROM 
      \`${projectId}.${datasetId}.adobe_commerce_orders\` o,
      UNNEST(JSON_EXTRACT_ARRAY(o.items)) as item_json,
      UNNEST([STRUCT(
        JSON_EXTRACT_SCALAR(item_json, '$.sku') as sku,
        JSON_EXTRACT_SCALAR(item_json, '$.name') as name,
        JSON_EXTRACT_SCALAR(item_json, '$.product_id') as product_id,
        JSON_EXTRACT_SCALAR(item_json, '$.qty_ordered') as qty_ordered,
        JSON_EXTRACT_SCALAR(item_json, '$.qty_invoiced') as qty_invoiced,
        JSON_EXTRACT_SCALAR(item_json, '$.qty_shipped') as qty_shipped,
        JSON_EXTRACT_SCALAR(item_json, '$.qty_canceled') as qty_canceled,
        JSON_EXTRACT_SCALAR(item_json, '$.qty_refunded') as qty_refunded,
        JSON_EXTRACT_SCALAR(item_json, '$.row_total') as row_total,
        JSON_EXTRACT_SCALAR(item_json, '$.base_row_total') as base_row_total,
        JSON_EXTRACT_SCALAR(item_json, '$.discount_amount') as discount_amount,
        JSON_EXTRACT_SCALAR(item_json, '$.tax_amount') as tax_amount,
        JSON_EXTRACT_SCALAR(item_json, '$.price') as price
      )]) as item
    WHERE 
      o.created_at IS NOT NULL
      AND o.items IS NOT NULL
    GROUP BY 
      date, website_id, sku, product_name, product_id
  `;
}

