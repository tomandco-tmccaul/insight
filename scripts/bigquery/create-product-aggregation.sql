-- Create product performance aggregation table
-- This table aggregates product sales data from the items JSON field in orders

CREATE OR REPLACE TABLE `insight-dashboard-1761555293.sanderson_design_group.agg_product_performance_daily`
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
  `insight-dashboard-1761555293.sanderson_design_group.adobe_commerce_orders` o,
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
  date, website_id, sku, product_name, product_id;

