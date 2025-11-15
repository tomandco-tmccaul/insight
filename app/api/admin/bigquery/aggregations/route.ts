import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { bigquery } from '@/lib/bigquery/client';
import { ApiResponse } from '@/types';

export interface CreateAggregationRequest {
  datasetId: string;
  aggregationType: 'sales_overview' | 'sales_overview_hourly' | 'sales_overview_monthly' | 'product_performance' | 'seo_performance' | 'sales_items_materialized_view' | 'products_flattened_materialized_view' | 'orders_flattened_materialized_view' | 'all';
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

      // Handle 'all' aggregation type
      if (aggregationType === 'all') {
        const allTypes: Array<'sales_overview' | 'sales_overview_hourly' | 'sales_overview_monthly' | 'product_performance' | 'seo_performance' | 'sales_items_materialized_view' | 'products_flattened_materialized_view' | 'orders_flattened_materialized_view'> = [
          'sales_overview',
          'sales_overview_hourly',
          'sales_overview_monthly',
          'product_performance',
          'seo_performance',
          'sales_items_materialized_view',
          'products_flattened_materialized_view',
          'orders_flattened_materialized_view'
        ];

        const results: Array<{type: string, success: boolean, error?: string}> = [];

        for (const type of allTypes) {
          try {
            const query = await getQueryForType(type, datasetId);
            const [job] = await bigquery.createQueryJob({
              query,
              location: 'europe-west2',
            });
            
            // Wait for job and check for errors
            await job.getQueryResults();
            const [jobMetadata] = await job.getMetadata();
            
            if (jobMetadata.status?.errorResult) {
              const errorMessage = jobMetadata.status.errorResult.message || 'Unknown error';
              console.error(`BigQuery job failed for ${type}:`, jobMetadata.status.errorResult);
              results.push({
                type,
                success: false,
                error: errorMessage
              });
              continue;
            }

            // Refresh Materialized Views
            if (type.includes('materialized_view') || 
                type === 'sales_overview' || 
                type === 'sales_overview_hourly' ||
                type === 'sales_overview_monthly' ||
                type === 'product_performance' || 
                type === 'seo_performance') {
              await refreshMaterializedView(type, datasetId);
            }

            results.push({ type, success: true });
          } catch (error) {
            console.error(`Error creating ${type}:`, error);
            results.push({
              type,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        const allSuccessful = results.every(r => r.success);
        return NextResponse.json({
          success: allSuccessful,
          data: { results },
          error: allSuccessful ? undefined : 'Some aggregations failed'
        });
      }

      let query = await getQueryForType(aggregationType, datasetId);

      if (!query) {
        return NextResponse.json(
          {
            success: false,
            error: `Unknown aggregation type: ${aggregationType}`,
          },
          { status: 400 }
        );
      }

      // Log the query for debugging (first 500 chars)
      console.log('Executing BigQuery query:', {
        aggregationType,
        datasetId,
        queryPreview: query.substring(0, 500) + '...',
      });

      // Execute the query
      const [job] = await bigquery.createQueryJob({
        query,
        location: 'europe-west2',
      });

      // Wait for the job to complete and check for errors
      const [jobResult] = await job.getQueryResults();
      
      // Check if the job had any errors
      const [jobMetadata] = await job.getMetadata();
      if (jobMetadata.status?.errorResult) {
        const errorMessage = jobMetadata.status.errorResult.message || 'Unknown error';
        console.error('BigQuery job failed:', {
          error: jobMetadata.status.errorResult,
          query: query.substring(0, 500) + '...',
        });
        return NextResponse.json(
          {
            success: false,
            error: `BigQuery job failed: ${errorMessage}`,
          },
          { status: 500 }
        );
      }

      // Log success for debugging
      console.log('BigQuery job completed successfully:', {
        aggregationType,
        datasetId,
        jobId: job.id,
      });

      // If it's a Materialized View, verify it was created and refresh it
      if (aggregationType.includes('materialized_view') || 
          aggregationType === 'sales_overview' || 
          aggregationType === 'product_performance' || 
          aggregationType === 'seo_performance') {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'insight-dashboard-1761555293';
        let viewName = '';
        
        switch (aggregationType) {
          case 'sales_items_materialized_view':
            viewName = `mv_adobe_commerce_sales_items`;
            break;
          case 'products_flattened_materialized_view':
            viewName = `mv_adobe_commerce_products_flattened`;
            break;
          case 'orders_flattened_materialized_view':
            viewName = `mv_adobe_commerce_orders_flattened`;
            break;
          case 'sales_overview':
            viewName = `mv_agg_sales_overview_daily`;
            break;
          case 'product_performance':
            viewName = `mv_agg_product_performance_daily`;
            break;
          case 'seo_performance':
            viewName = `mv_agg_seo_performance_daily`;
            break;
        }

        if (viewName) {
          // Verify the view exists
          try {
            const [dataset] = await bigquery.dataset(datasetId).get({ autoCreate: false });
            const [view] = await dataset.table(viewName).get({ autoCreate: false });
            console.log('Materialized view verified:', {
              viewName,
              datasetId,
              exists: !!view,
            });
          } catch (verifyError) {
            console.error('Failed to verify materialized view:', {
              viewName,
              datasetId,
              error: verifyError instanceof Error ? verifyError.message : 'Unknown error',
            });
            // Don't fail the request, but log the issue
          }

          // Refresh the materialized view
          await refreshMaterializedView(aggregationType, datasetId);
        }
      }

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

// Helper function to get query based on type
async function getQueryForType(
  aggregationType: 'sales_overview' | 'sales_overview_hourly' | 'sales_overview_monthly' | 'product_performance' | 'seo_performance' | 'sales_items_materialized_view' | 'products_flattened_materialized_view' | 'orders_flattened_materialized_view',
  datasetId: string
): Promise<string> {
  switch (aggregationType) {
    case 'sales_overview':
      return getSalesOverviewAggregationQuery(datasetId);
    case 'sales_overview_hourly':
      return getSalesOverviewHourlyAggregationQuery(datasetId);
    case 'sales_overview_monthly':
      return getSalesOverviewMonthlyAggregationQuery(datasetId);
    case 'product_performance':
      return getProductPerformanceAggregationQuery(datasetId);
    case 'seo_performance':
      return getSEOPerformanceAggregationQuery(datasetId);
    case 'sales_items_materialized_view':
      return getSalesItemsMaterializedViewQuery(datasetId);
    case 'products_flattened_materialized_view':
      return getProductsFlattenedMaterializedViewQuery(datasetId);
    case 'orders_flattened_materialized_view':
      return getOrdersFlattenedMaterializedViewQuery(datasetId);
    default:
      return '';
  }
}

// Helper function to refresh materialized views
async function refreshMaterializedView(
  aggregationType: string,
  datasetId: string
): Promise<void> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'insight-dashboard-1761555293';
  
  let viewId = '';
  switch (aggregationType) {
    case 'sales_items_materialized_view':
      viewId = `${projectId}.${datasetId}.mv_adobe_commerce_sales_items`;
      break;
    case 'products_flattened_materialized_view':
      viewId = `${projectId}.${datasetId}.mv_adobe_commerce_products_flattened`;
      break;
    case 'orders_flattened_materialized_view':
      viewId = `${projectId}.${datasetId}.mv_adobe_commerce_orders_flattened`;
      break;
    case 'sales_overview':
      viewId = `${projectId}.${datasetId}.mv_agg_sales_overview_daily`;
      break;
    case 'sales_overview_hourly':
      viewId = `${projectId}.${datasetId}.mv_agg_sales_overview_hourly`;
      break;
    case 'sales_overview_monthly':
      viewId = `${projectId}.${datasetId}.mv_agg_sales_overview_monthly`;
      break;
    case 'product_performance':
      viewId = `${projectId}.${datasetId}.mv_agg_product_performance_daily`;
      break;
    case 'seo_performance':
      viewId = `${projectId}.${datasetId}.mv_agg_seo_performance_daily`;
      break;
    default:
      return;
  }

  try {
    const [refreshJob] = await bigquery.createQueryJob({
      query: `CALL BQ.REFRESH_MATERIALIZED_VIEW('${viewId}')`,
      location: 'europe-west2',
    });
    await refreshJob.getQueryResults();
  } catch (refreshError) {
    console.warn('Failed to refresh Materialized View immediately:', refreshError);
  }
}

function getSalesOverviewAggregationQuery(datasetId: string): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'insight-dashboard-1761555293';

  return `
    CREATE OR REPLACE MATERIALIZED VIEW \`${projectId}.${datasetId}.mv_agg_sales_overview_daily\`
    CLUSTER BY website_id, date
    OPTIONS(
      enable_refresh=true,
      refresh_interval_minutes=60
    )
    AS
    SELECT 
      DATE(SAFE_CAST(o.created_at AS TIMESTAMP)) as date,
      CAST(o.store_id AS STRING) as website_id,
      
      -- Order Metrics
      -- Using APPROX_COUNT_DISTINCT for incremental materialized view compatibility
      APPROX_COUNT_DISTINCT(CAST(o.entity_id AS STRING)) as total_orders,
      APPROX_COUNT_DISTINCT(CAST(o.customer_id AS STRING)) as unique_customers,
      
      -- Revenue Metrics
      SUM(CAST(o.grand_total AS FLOAT64)) as total_revenue,
      SUM(CAST(o.subtotal AS FLOAT64)) as subtotal,
      SUM(CAST(o.tax_amount AS FLOAT64)) as total_tax,
      SUM(CAST(o.shipping_amount AS FLOAT64)) as total_shipping,
      SUM(CAST(o.discount_amount AS FLOAT64)) as total_discounts,
      
      -- Item Metrics
      SUM(CAST(o.total_qty_ordered AS FLOAT64)) as total_items,
      
      -- Order Status Breakdown
      COUNTIF(o.status = 'complete') as orders_complete,
      COUNTIF(o.status = 'pending') as orders_pending,
      COUNTIF(o.status = 'processing') as orders_processing,
      COUNTIF(o.status = 'canceled') as orders_canceled,
      
      -- Revenue by Status
      SUM(IF(o.status = 'complete', CAST(o.grand_total AS FLOAT64), 0)) as revenue_complete,
      SUM(IF(o.status = 'pending', CAST(o.grand_total AS FLOAT64), 0)) as revenue_pending,
      
      -- Sample Order Breakdown (from extension_attributes)
      -- is_samples is typically 1 for sample orders, 0 or NULL for regular orders
      COUNTIF(COALESCE(CAST(JSON_VALUE(o.extension_attributes, '$.is_samples') AS INT64), 0) = 1) as orders_sample,
      COUNTIF(COALESCE(CAST(JSON_VALUE(o.extension_attributes, '$.is_samples') AS INT64), 0) = 0) as orders_not_sample
    FROM 
      \`${projectId}.${datasetId}.adobe_commerce_orders\` o
    WHERE 
      o.created_at IS NOT NULL
    GROUP BY 
      date, website_id
  `;
}

function getSalesOverviewHourlyAggregationQuery(datasetId: string): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'insight-dashboard-1761555293';

  return `
    CREATE OR REPLACE MATERIALIZED VIEW \`${projectId}.${datasetId}.mv_agg_sales_overview_hourly\`
    CLUSTER BY website_id, date, hour
    OPTIONS(
      enable_refresh=true,
      refresh_interval_minutes=60
    )
    AS
    SELECT 
      DATE(SAFE_CAST(o.created_at AS TIMESTAMP)) as date,
      EXTRACT(HOUR FROM SAFE_CAST(o.created_at AS TIMESTAMP)) as hour,
      CAST(o.store_id AS STRING) as website_id,
      
      -- Order Metrics
      APPROX_COUNT_DISTINCT(CAST(o.entity_id AS STRING)) as total_orders,
      
      -- Revenue Metrics
      SUM(CAST(o.grand_total AS FLOAT64)) as total_revenue
    FROM 
      \`${projectId}.${datasetId}.adobe_commerce_orders\` o
    WHERE 
      o.created_at IS NOT NULL
    GROUP BY 
      date, hour, website_id
  `;
}

function getSalesOverviewMonthlyAggregationQuery(datasetId: string): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'insight-dashboard-1761555293';

  return `
    CREATE OR REPLACE MATERIALIZED VIEW \`${projectId}.${datasetId}.mv_agg_sales_overview_monthly\`
    CLUSTER BY website_id, year, month
    OPTIONS(
      enable_refresh=true,
      refresh_interval_minutes=60
    )
    AS
    SELECT 
      EXTRACT(YEAR FROM SAFE_CAST(o.created_at AS TIMESTAMP)) as year,
      EXTRACT(MONTH FROM SAFE_CAST(o.created_at AS TIMESTAMP)) as month,
      CAST(o.store_id AS STRING) as website_id,
      
      -- Order Metrics
      APPROX_COUNT_DISTINCT(CAST(o.entity_id AS STRING)) as total_orders,
      APPROX_COUNT_DISTINCT(CAST(o.customer_id AS STRING)) as unique_customers,
      
      -- Revenue Metrics
      SUM(CAST(o.grand_total AS FLOAT64)) as total_revenue,
      SUM(CAST(o.subtotal AS FLOAT64)) as subtotal,
      SUM(CAST(o.tax_amount AS FLOAT64)) as total_tax,
      SUM(CAST(o.shipping_amount AS FLOAT64)) as total_shipping,
      SUM(CAST(o.discount_amount AS FLOAT64)) as total_discounts,
      
      -- Item Metrics
      SUM(CAST(o.total_qty_ordered AS FLOAT64)) as total_items
    FROM 
      \`${projectId}.${datasetId}.adobe_commerce_orders\` o
    WHERE 
      o.created_at IS NOT NULL
    GROUP BY 
      year, month, website_id
  `;
}

function getProductPerformanceAggregationQuery(datasetId: string): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'insight-dashboard-1761555293';

  return `
    CREATE OR REPLACE MATERIALIZED VIEW \`${projectId}.${datasetId}.mv_agg_product_performance_daily\`
    CLUSTER BY website_id, sku, date
    OPTIONS(
      enable_refresh=true,
      refresh_interval_minutes=60
    )
    AS
    SELECT 
      DATE(SAFE_CAST(o.created_at AS TIMESTAMP)) as date,
      CAST(o.store_id AS STRING) as website_id,
      JSON_EXTRACT_SCALAR(item_json, '$.sku') as sku,
      JSON_EXTRACT_SCALAR(item_json, '$.name') as product_name,
      JSON_EXTRACT_SCALAR(item_json, '$.product_id') as product_id,
      
      -- Quantity metrics
      SUM(SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.qty_ordered') AS FLOAT64)) as total_qty_ordered,
      SUM(SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.qty_invoiced') AS FLOAT64)) as total_qty_invoiced,
      SUM(SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.qty_shipped') AS FLOAT64)) as total_qty_shipped,
      SUM(SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.qty_canceled') AS FLOAT64)) as total_qty_canceled,
      SUM(SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.qty_refunded') AS FLOAT64)) as total_qty_refunded,
      
      -- Revenue metrics
      SUM(SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.row_total') AS FLOAT64)) as total_revenue,
      SUM(SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.base_row_total') AS FLOAT64)) as total_base_revenue,
      SUM(SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.discount_amount') AS FLOAT64)) as total_discount,
      SUM(SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.tax_amount') AS FLOAT64)) as total_tax,
      
      -- Price metrics
      AVG(SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.price') AS FLOAT64)) as avg_price,
      MIN(SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.price') AS FLOAT64)) as min_price,
      MAX(SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.price') AS FLOAT64)) as max_price,
      
      -- Order count
      -- Using APPROX_COUNT_DISTINCT for incremental materialized view compatibility
      APPROX_COUNT_DISTINCT(CAST(o.entity_id AS STRING)) as order_count
    FROM 
      \`${projectId}.${datasetId}.adobe_commerce_orders\` o
    CROSS JOIN UNNEST(JSON_EXTRACT_ARRAY(o.items)) as item_json
    WHERE 
      o.created_at IS NOT NULL
      AND o.items IS NOT NULL
      AND item_json IS NOT NULL
    GROUP BY 
      date, website_id, sku, product_name, product_id
  `;
}

function getSEOPerformanceAggregationQuery(datasetId: string): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'insight-dashboard-1761555293';

  return `
    CREATE OR REPLACE MATERIALIZED VIEW \`${projectId}.${datasetId}.mv_agg_seo_performance_daily\`
    CLUSTER BY website_id, query_text
    OPTIONS(
      enable_refresh=true,
      refresh_interval_minutes=60
    )
    AS
    SELECT 
      date,
      site_url as website_id,
      query as query_text,
      SUM(CAST(clicks AS INT64)) as total_clicks,
      SUM(CAST(impressions AS INT64)) as total_impressions,
      AVG(CAST(ctr AS FLOAT64)) as avg_ctr,
      AVG(CAST(position AS FLOAT64)) as avg_position
    FROM 
      \`${projectId}.${datasetId}.gsc_search_analytics_by_query\`
    WHERE 
      date IS NOT NULL
      AND query IS NOT NULL
    GROUP BY 
      date, site_url, query
  `;
}

function getSalesItemsMaterializedViewQuery(datasetId: string): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'insight-dashboard-1761555293';

  return `
    CREATE OR REPLACE MATERIALIZED VIEW \`${projectId}.${datasetId}.mv_adobe_commerce_sales_items\`
    CLUSTER BY website_id, sku, order_id, order_date
    OPTIONS(
      enable_refresh=true,
      refresh_interval_minutes=60
    )
    AS
    WITH order_items AS (
      SELECT
        CAST(o.entity_id AS INT64) as order_entity_id,
        o.increment_id as order_increment_id,
        DATE(SAFE_CAST(o.created_at AS TIMESTAMP)) as order_date,
        SAFE_CAST(o.created_at AS TIMESTAMP) as order_created_at,
        CAST(o.store_id AS STRING) as website_id,
        o.status as order_status,
        o.state as order_state,
        SAFE_CAST(o.customer_id AS INT64) as customer_id,
        o.customer_email,
        SAFE_CAST(o.customer_is_guest AS INT64) as customer_is_guest,
        o.created_at as order_created_at_full,
        o.updated_at as order_updated_at,
        item_json
      FROM 
        \`${projectId}.${datasetId}.adobe_commerce_orders\` o
      CROSS JOIN UNNEST(JSON_EXTRACT_ARRAY(o.items)) as item_json
      WHERE 
        o.created_at IS NOT NULL
        AND o.items IS NOT NULL
        AND item_json IS NOT NULL
    )
    SELECT 
      COALESCE(SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.order_id') AS INT64), order_entity_id) as order_id,
      order_entity_id,
      order_increment_id,
      order_date,
      order_created_at,
      website_id,
      
      -- Item identification
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.item_id') AS INT64) as item_id,
      JSON_EXTRACT_SCALAR(item_json, '$.sku') as sku,
      JSON_EXTRACT_SCALAR(item_json, '$.name') as product_name,
      JSON_EXTRACT_SCALAR(item_json, '$.product_id') as product_id,
      JSON_EXTRACT_SCALAR(item_json, '$.product_type') as product_type,
      
      -- Quantity metrics
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.qty_ordered') AS FLOAT64) as qty_ordered,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.qty_invoiced') AS FLOAT64) as qty_invoiced,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.qty_shipped') AS FLOAT64) as qty_shipped,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.qty_canceled') AS FLOAT64) as qty_canceled,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.qty_refunded') AS FLOAT64) as qty_refunded,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.qty_returned') AS FLOAT64) as qty_returned,
      
      -- Pricing
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.price') AS FLOAT64) as price,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.base_price') AS FLOAT64) as base_price,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.original_price') AS FLOAT64) as original_price,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.base_original_price') AS FLOAT64) as base_original_price,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.price_incl_tax') AS FLOAT64) as price_incl_tax,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.base_price_incl_tax') AS FLOAT64) as base_price_incl_tax,
      
      -- Row totals
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.row_total') AS FLOAT64) as row_total,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.base_row_total') AS FLOAT64) as base_row_total,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.row_total_incl_tax') AS FLOAT64) as row_total_incl_tax,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.base_row_total_incl_tax') AS FLOAT64) as base_row_total_incl_tax,
      
      -- Tax information
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.tax_amount') AS FLOAT64) as tax_amount,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.base_tax_amount') AS FLOAT64) as base_tax_amount,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.tax_percent') AS FLOAT64) as tax_percent,
      
      -- Discount information
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.discount_amount') AS FLOAT64) as discount_amount,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.base_discount_amount') AS FLOAT64) as base_discount_amount,
      SAFE_CAST(JSON_EXTRACT_SCALAR(item_json, '$.discount_percent') AS FLOAT64) as discount_percent,
      
      -- Order status (from order table)
      order_status,
      order_state,
      
      -- Customer information (from order table)
      customer_id,
      customer_email,
      customer_is_guest,
      
      -- Metadata
      JSON_EXTRACT_SCALAR(item_json, '$.created_at') as item_created_at,
      JSON_EXTRACT_SCALAR(item_json, '$.updated_at') as item_updated_at,
      order_created_at_full,
      order_updated_at
    FROM 
      order_items
  `;
}

function getProductsFlattenedMaterializedViewQuery(datasetId: string): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'insight-dashboard-1761555293';

  return `
    CREATE OR REPLACE MATERIALIZED VIEW \`${projectId}.${datasetId}.mv_adobe_commerce_products_flattened\`
    CLUSTER BY sku
    OPTIONS(
      enable_refresh=true,
      refresh_interval_minutes=60
    )
    AS
    SELECT 
      p.sku,
      p.name as product_name,
      
      -- Flatten ALL custom_attributes into individual columns
      -- Each attribute_code becomes its own column with the attribute value
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'sdb_collection_name', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_sdb_collection_name,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'sdb_design_name', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_sdb_design_name,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'sdb_parent_title', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_sdb_parent_title,
      ANY_VALUE(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'sdb_product_collection_data', 
        SAFE.PARSE_JSON(JSON_EXTRACT_SCALAR(attr, '$.value')), NULL)) as attr_sdb_product_collection_data,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'brand', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_brand,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'color', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_color,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'size', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_size,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'material', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_material,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'pattern', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_pattern,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'width', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_width,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'length', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_length,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'height', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_height,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'weight', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_weight,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'price', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_price,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'special_price', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_special_price,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'cost', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_cost,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'manufacturer', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_manufacturer,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'country_of_manufacture', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_country_of_manufacture,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'description', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_description,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'short_description', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_short_description,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'meta_title', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_meta_title,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'meta_description', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_meta_description,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'meta_keyword', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_meta_keyword,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'url_key', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_url_key,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'url_path', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_url_path,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'image', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_image,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'small_image', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_small_image,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'thumbnail', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_thumbnail,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'status', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_status,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'visibility', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_visibility,
      MAX(IF(JSON_EXTRACT_SCALAR(attr, '$.attribute_code') = 'tax_class_id', 
        JSON_EXTRACT_SCALAR(attr, '$.value'), NULL)) as attr_tax_class_id
      
    FROM 
      \`${projectId}.${datasetId}.adobe_commerce_products\` p,
      UNNEST(JSON_EXTRACT_ARRAY(p.custom_attributes)) as attr
    WHERE 
      p.sku IS NOT NULL
    GROUP BY
      p.sku, p.name
  `;
}

async function getOrdersFlattenedMaterializedViewQuery(datasetId: string): Promise<string> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'insight-dashboard-1761555293';

  const extensionAttributeColumns = await buildOrderExtensionAttributeColumns(projectId, datasetId);

  const baseSelectColumns = `
      -- Order identification
      CAST(o.entity_id AS INT64) as entity_id,
      o.increment_id,
      DATE(SAFE_CAST(o.created_at AS TIMESTAMP)) as order_date,
      SAFE_CAST(o.created_at AS TIMESTAMP) as order_created_at,
      CAST(o.store_id AS STRING) as website_id,
      
      -- Customer information
      SAFE_CAST(o.customer_id AS INT64) as customer_id,
      o.customer_email,
      o.customer_firstname,
      o.customer_lastname,
      SAFE_CAST(o.customer_is_guest AS INT64) as customer_is_guest,
      
      -- Order status
      o.status,
      o.state,
      
      -- Financial totals
      CAST(o.grand_total AS FLOAT64) as grand_total,
      CAST(o.subtotal AS FLOAT64) as subtotal,
      CAST(o.base_grand_total AS FLOAT64) as base_grand_total,
      CAST(o.base_subtotal AS FLOAT64) as base_subtotal,
      CAST(o.tax_amount AS FLOAT64) as tax_amount,
      CAST(o.base_tax_amount AS FLOAT64) as base_tax_amount,
      CAST(o.shipping_amount AS FLOAT64) as shipping_amount,
      CAST(o.base_shipping_amount AS FLOAT64) as base_shipping_amount,
      CAST(o.discount_amount AS FLOAT64) as discount_amount,
      CAST(o.base_discount_amount AS FLOAT64) as base_discount_amount,
      
      -- Quantities
      CAST(o.total_qty_ordered AS FLOAT64) as total_qty_ordered,
      CAST(o.total_item_count AS INT64) as total_item_count,
      
      -- Shipping information
      CAST(NULL AS STRING) as shipping_description,
      
      -- Timestamps
      o.created_at,
      o.updated_at,
      
      -- Extension attributes (raw + parsed JSON)
      TO_JSON_STRING(o.extension_attributes) as extension_attributes_raw,
      o.extension_attributes as extension_attributes_json`;

  const extensionColumnsSql = extensionAttributeColumns.length
    ? ',\n' + extensionAttributeColumns.join(',\n')
    : '';

  return `
    CREATE OR REPLACE MATERIALIZED VIEW \`${projectId}.${datasetId}.mv_adobe_commerce_orders_flattened\`
    CLUSTER BY order_date, website_id, entity_id
    OPTIONS(
      enable_refresh=true,
      refresh_interval_minutes=60
    )
    AS
    SELECT
${baseSelectColumns}${extensionColumnsSql}
    FROM 
      \`${projectId}.${datasetId}.adobe_commerce_orders\` o
    WHERE 
      o.created_at IS NOT NULL
  `;
}

async function buildOrderExtensionAttributeColumns(projectId: string, datasetId: string): Promise<string[]> {
  const collectedKeys = new Set<string>();

  try {
    const [rows] = await bigquery.query({
      query: `
        SELECT extension_attributes
        FROM \`${projectId}.${datasetId}.adobe_commerce_orders\`
        WHERE extension_attributes IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 200
      `,
      location: 'europe-west2',
    });

    for (const row of rows as Array<{ extension_attributes?: unknown }>) {
      const raw = row.extension_attributes;
      if (!raw) continue;

      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          extractKeysFromObject(parsed, collectedKeys);
        } catch (parseError) {
          console.warn('Failed to parse extension_attributes JSON string', parseError);
        }
        continue;
      }

      if (typeof raw === 'object') {
        extractKeysFromObject(raw as Record<string, unknown>, collectedKeys);
      }
    }
  } catch (error) {
    console.warn('Failed to introspect extension attributes for orders', error);
  }

  if (collectedKeys.size === 0) {
    return [];
  }

  const maxColumns = 100;
  const sortedKeys = Array.from(collectedKeys).sort().slice(0, maxColumns);

  const usedAliases = new Set<string>();

  return sortedKeys.map((key) => {
    const aliasBase = sanitizeExtensionAttributeAlias(key);
    let alias = aliasBase;
    let counter = 2;
    while (usedAliases.has(alias)) {
      alias = `${aliasBase}_${counter}`;
      counter += 1;
    }
    usedAliases.add(alias);

    const jsonPath = buildJsonPathForKey(key);
    const escapedJsonPathForSql = jsonPath.replace(/'/g, "''");

    return `      COALESCE(
        JSON_VALUE(o.extension_attributes, '${escapedJsonPathForSql}'),
        TO_JSON_STRING(JSON_QUERY(o.extension_attributes, '${escapedJsonPathForSql}'))
      ) as ${alias}`;
  });
}

function extractKeysFromObject(source: Record<string, unknown>, target: Set<string>) {
  Object.keys(source || {}).forEach((key) => {
    if (!key) return;
    target.add(key);
  });
}

function sanitizeExtensionAttributeAlias(key: string): string {
  const normalized = key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+/, '');

  const prefixed = normalized ? `ext_${normalized}` : 'ext_unknown';
  return prefixed;
}

function buildJsonPathForKey(key: string): string {
  const simpleKeyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
  if (simpleKeyPattern.test(key)) {
    return `$.${key}`;
  }

  const escapedKey = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `$["${escapedKey}"]`;
}

