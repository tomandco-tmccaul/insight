-- ============================================================================
-- BigQuery Aggregation Tables for Sanderson Design Group
-- ============================================================================
-- These tables pre-aggregate data for faster dashboard queries
-- Run this script to create the aggregation tables
-- ============================================================================

-- ============================================================================
-- 1. Daily Sales Overview Aggregation
-- ============================================================================
-- Aggregates order data by date and website for the Sales Overview dashboard
-- ============================================================================

CREATE OR REPLACE TABLE `insight-dashboard-1761555293.sanderson_design_group.agg_sales_overview_daily`
PARTITION BY date
CLUSTER BY website_id, date
AS
SELECT
  DATE(PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', created_at)) as date,
  CAST(store_id AS STRING) as website_id,
  
  -- Order Metrics
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_email) as unique_customers,
  
  -- Revenue Metrics
  SUM(CAST(grand_total AS FLOAT64)) as total_revenue,
  SUM(CAST(subtotal AS FLOAT64)) as subtotal,
  SUM(CAST(tax_amount AS FLOAT64)) as total_tax,
  SUM(CAST(shipping_amount AS FLOAT64)) as total_shipping,
  SUM(CAST(discount_amount AS FLOAT64)) as total_discounts,
  
  -- Calculated Metrics (will be computed in app)
  -- AOV = total_revenue / total_orders
  -- Items per order = total_items / total_orders
  
  -- Item Metrics
  SUM(CAST(total_qty_ordered AS FLOAT64)) as total_items,
  
  -- Order Status Breakdown
  COUNTIF(status = 'complete') as orders_complete,
  COUNTIF(status = 'pending') as orders_pending,
  COUNTIF(status = 'processing') as orders_processing,
  COUNTIF(status = 'canceled') as orders_canceled,
  
  -- Revenue by Status
  SUM(CASE WHEN status = 'complete' THEN CAST(grand_total AS FLOAT64) ELSE 0 END) as revenue_complete,
  SUM(CASE WHEN status = 'pending' THEN CAST(grand_total AS FLOAT64) ELSE 0 END) as revenue_pending,
  
  -- Metadata
  CURRENT_TIMESTAMP() as _aggregated_at
  
FROM `insight-dashboard-1761555293.sanderson_design_group.adobe_commerce_orders`
WHERE created_at IS NOT NULL
GROUP BY date, website_id;

-- ============================================================================
-- 2. Product Performance Aggregation (from order items)
-- ============================================================================
-- Note: This requires parsing the JSON items field from orders
-- We'll create this after exploring the items structure
-- ============================================================================

-- Placeholder for product aggregation
-- CREATE OR REPLACE TABLE `insight-dashboard-1761555293.sanderson_design_group.agg_product_performance_daily`
-- ...

-- ============================================================================
-- 3. Customer Segmentation Aggregation
-- ============================================================================

CREATE OR REPLACE TABLE `insight-dashboard-1761555293.sanderson_design_group.agg_customer_metrics_daily`
PARTITION BY date
CLUSTER BY website_id, date
AS
SELECT
  DATE(PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', created_at)) as date,
  CAST(store_id AS STRING) as website_id,
  
  -- New vs Returning Customers
  -- Note: This is a simplified version. True new/returning requires customer history analysis
  COUNT(DISTINCT customer_email) as unique_customers,
  COUNT(DISTINCT CASE WHEN customer_id IS NOT NULL THEN customer_id END) as registered_customers,
  COUNT(DISTINCT CASE WHEN customer_id IS NULL THEN customer_email END) as guest_customers,
  
  -- Customer Value
  SUM(CAST(grand_total AS FLOAT64)) / COUNT(DISTINCT customer_email) as revenue_per_customer,
  
  -- Metadata
  CURRENT_TIMESTAMP() as _aggregated_at
  
FROM `insight-dashboard-1761555293.sanderson_design_group.adobe_commerce_orders`
WHERE created_at IS NOT NULL
  AND customer_email IS NOT NULL
GROUP BY date, website_id;

-- ============================================================================
-- 4. Hourly Sales Aggregation (for intraday analysis)
-- ============================================================================

CREATE OR REPLACE TABLE `insight-dashboard-1761555293.sanderson_design_group.agg_sales_overview_hourly`
PARTITION BY date
CLUSTER BY website_id, date, hour
AS
SELECT
  DATE(PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', created_at)) as date,
  EXTRACT(HOUR FROM PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', created_at)) as hour,
  CAST(store_id AS STRING) as website_id,
  
  -- Order Metrics
  COUNT(*) as total_orders,
  
  -- Revenue Metrics
  SUM(CAST(grand_total AS FLOAT64)) as total_revenue,
  
  -- Metadata
  CURRENT_TIMESTAMP() as _aggregated_at
  
FROM `insight-dashboard-1761555293.sanderson_design_group.adobe_commerce_orders`
WHERE created_at IS NOT NULL
GROUP BY date, hour, website_id;

-- ============================================================================
-- 5. Monthly Sales Summary (for long-term trends)
-- ============================================================================

CREATE OR REPLACE TABLE `insight-dashboard-1761555293.sanderson_design_group.agg_sales_overview_monthly`
CLUSTER BY website_id, year, month
AS
SELECT
  EXTRACT(YEAR FROM PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', created_at)) as year,
  EXTRACT(MONTH FROM PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', created_at)) as month,
  CAST(store_id AS STRING) as website_id,
  
  -- Order Metrics
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_email) as unique_customers,
  
  -- Revenue Metrics
  SUM(CAST(grand_total AS FLOAT64)) as total_revenue,
  SUM(CAST(subtotal AS FLOAT64)) as subtotal,
  SUM(CAST(tax_amount AS FLOAT64)) as total_tax,
  SUM(CAST(shipping_amount AS FLOAT64)) as total_shipping,
  SUM(CAST(discount_amount AS FLOAT64)) as total_discounts,
  
  -- Item Metrics
  SUM(CAST(total_qty_ordered AS FLOAT64)) as total_items,
  
  -- Metadata
  CURRENT_TIMESTAMP() as _aggregated_at
  
FROM `insight-dashboard-1761555293.sanderson_design_group.adobe_commerce_orders`
WHERE created_at IS NOT NULL
GROUP BY year, month, website_id;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check daily aggregation
-- SELECT * FROM `insight-dashboard-1761555293.sanderson_design_group.agg_sales_overview_daily`
-- ORDER BY date DESC LIMIT 10;

-- Check hourly aggregation
-- SELECT * FROM `insight-dashboard-1761555293.sanderson_design_group.agg_sales_overview_hourly`
-- WHERE date = CURRENT_DATE()
-- ORDER BY hour DESC;

-- Check monthly aggregation
-- SELECT * FROM `insight-dashboard-1761555293.sanderson_design_group.agg_sales_overview_monthly`
-- ORDER BY year DESC, month DESC LIMIT 12;

