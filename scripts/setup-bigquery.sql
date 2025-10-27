-- BigQuery Setup Script for Insight Dashboard
-- This script creates the necessary tables and populates them with test data

-- ============================================================================
-- STEP 1: Create Dataset (run this first in BigQuery Console)
-- ============================================================================
-- CREATE SCHEMA `insight_analytics` OPTIONS(location='US');

-- ============================================================================
-- STEP 2: Create Aggregated Tables
-- ============================================================================

-- Sales Overview Daily Aggregation
CREATE TABLE IF NOT EXISTS `insight_analytics.agg_sales_overview_daily` (
  date DATE NOT NULL,
  website_id STRING NOT NULL,
  total_sales FLOAT64 NOT NULL,
  total_orders INT64 NOT NULL,
  total_sessions INT64 NOT NULL,
  total_media_spend FLOAT64 NOT NULL,
  total_revenue FLOAT64 NOT NULL,
  total_returns INT64,
  total_return_value FLOAT64
)
PARTITION BY date
CLUSTER BY website_id;

-- Product Performance Daily Aggregation
CREATE TABLE IF NOT EXISTS `insight_analytics.agg_product_performance_daily` (
  date DATE NOT NULL,
  website_id STRING NOT NULL,
  product_id STRING NOT NULL,
  product_name STRING NOT NULL,
  product_sku STRING NOT NULL,
  category STRING,
  quantity_sold INT64 NOT NULL,
  revenue FLOAT64 NOT NULL,
  stock_level INT64,
  return_count INT64,
  return_rate FLOAT64
)
PARTITION BY date
CLUSTER BY website_id, product_id;

-- Marketing Channel Daily Aggregation
CREATE TABLE IF NOT EXISTS `insight_analytics.agg_marketing_channel_daily` (
  date DATE NOT NULL,
  website_id STRING NOT NULL,
  channel STRING NOT NULL,
  campaign_name STRING,
  spend FLOAT64 NOT NULL,
  sessions INT64 NOT NULL,
  revenue FLOAT64 NOT NULL,
  conversions INT64 NOT NULL,
  impressions INT64,
  clicks INT64
)
PARTITION BY date
CLUSTER BY website_id, channel;

-- SEO Performance Daily Aggregation
CREATE TABLE IF NOT EXISTS `insight_analytics.agg_seo_performance_daily` (
  date DATE NOT NULL,
  website_id STRING NOT NULL,
  query STRING NOT NULL,
  page_url STRING,
  impressions INT64 NOT NULL,
  clicks INT64 NOT NULL,
  ctr FLOAT64 NOT NULL,
  average_position FLOAT64 NOT NULL,
  attributed_revenue FLOAT64
)
PARTITION BY date
CLUSTER BY website_id;

-- Website Behavior Daily Aggregation
CREATE TABLE IF NOT EXISTS `insight_analytics.agg_website_behavior_daily` (
  date DATE NOT NULL,
  website_id STRING NOT NULL,
  page_path STRING NOT NULL,
  page_title STRING,
  sessions INT64 NOT NULL,
  pageviews INT64 NOT NULL,
  unique_pageviews INT64 NOT NULL,
  avg_time_on_page FLOAT64 NOT NULL,
  bounce_rate FLOAT64 NOT NULL,
  exit_rate FLOAT64 NOT NULL,
  entrances INT64 NOT NULL,
  exits INT64 NOT NULL
)
PARTITION BY date
CLUSTER BY website_id;

-- ============================================================================
-- STEP 3: Insert Test Data
-- ============================================================================

-- Insert Sales Overview Test Data (Last 90 days)
-- This generates realistic eCommerce data for Sanderson UK and Harlequin websites
INSERT INTO `insight_analytics.agg_sales_overview_daily` (
  date, website_id, total_sales, total_orders, total_sessions, 
  total_media_spend, total_revenue, total_returns, total_return_value
)
WITH date_range AS (
  SELECT DATE_SUB(CURRENT_DATE(), INTERVAL day DAY) as date
  FROM UNNEST(GENERATE_ARRAY(1, 90)) as day
),
websites AS (
  SELECT 'sanderson_uk' as website_id, 1.0 as multiplier
  UNION ALL
  SELECT 'harlequin', 0.8 as multiplier
)
SELECT 
  dr.date,
  w.website_id,
  -- Sales with weekly seasonality and growth trend
  ROUND(
    (15000 + RAND() * 5000) * w.multiplier * 
    (1 + 0.3 * SIN(2 * 3.14159 * EXTRACT(DAYOFWEEK FROM dr.date) / 7)) *
    (1 + 0.001 * (90 - DATE_DIFF(CURRENT_DATE(), dr.date, DAY)))
  , 2) as total_sales,
  -- Orders
  CAST(
    (80 + RAND() * 30) * w.multiplier * 
    (1 + 0.3 * SIN(2 * 3.14159 * EXTRACT(DAYOFWEEK FROM dr.date) / 7))
  AS INT64) as total_orders,
  -- Sessions
  CAST(
    (2000 + RAND() * 800) * w.multiplier * 
    (1 + 0.4 * SIN(2 * 3.14159 * EXTRACT(DAYOFWEEK FROM dr.date) / 7))
  AS INT64) as total_sessions,
  -- Media Spend
  ROUND((2000 + RAND() * 500) * w.multiplier, 2) as total_media_spend,
  -- Revenue (same as sales for simplicity)
  ROUND(
    (15000 + RAND() * 5000) * w.multiplier * 
    (1 + 0.3 * SIN(2 * 3.14159 * EXTRACT(DAYOFWEEK FROM dr.date) / 7)) *
    (1 + 0.001 * (90 - DATE_DIFF(CURRENT_DATE(), dr.date, DAY)))
  , 2) as total_revenue,
  -- Returns (5-10% of orders)
  CAST((5 + RAND() * 5) * w.multiplier AS INT64) as total_returns,
  -- Return Value
  ROUND((500 + RAND() * 300) * w.multiplier, 2) as total_return_value
FROM date_range dr
CROSS JOIN websites w;

-- Insert Product Performance Test Data
INSERT INTO `insight_analytics.agg_product_performance_daily` (
  date, website_id, product_id, product_name, product_sku, 
  category, quantity_sold, revenue, stock_level, return_count, return_rate
)
WITH date_range AS (
  SELECT DATE_SUB(CURRENT_DATE(), INTERVAL day DAY) as date
  FROM UNNEST(GENERATE_ARRAY(1, 30)) as day
),
products AS (
  SELECT 'sanderson_uk' as website_id, 'prod_001' as product_id, 'Sanderson Wallpaper - Damask Rose' as product_name, 'SKU-WP-001' as sku, 'Wallpaper' as category, 1.0 as multiplier
  UNION ALL SELECT 'sanderson_uk', 'prod_002', 'Morris & Co Fabric - Strawberry Thief', 'SKU-FB-002', 'Fabric', 1.2
  UNION ALL SELECT 'sanderson_uk', 'prod_003', 'Sanderson Paint - Pavilion Blue', 'SKU-PT-003', 'Paint', 0.8
  UNION ALL SELECT 'harlequin', 'prod_101', 'Harlequin Wallpaper - Momentum', 'SKU-WP-101', 'Wallpaper', 0.9
  UNION ALL SELECT 'harlequin', 'prod_102', 'Harlequin Fabric - Amazilia', 'SKU-FB-102', 'Fabric', 1.1
)
SELECT 
  dr.date,
  p.website_id,
  p.product_id,
  p.product_name,
  p.sku,
  p.category,
  CAST((10 + RAND() * 20) * p.multiplier AS INT64) as quantity_sold,
  ROUND((800 + RAND() * 400) * p.multiplier, 2) as revenue,
  CAST(50 + RAND() * 100 AS INT64) as stock_level,
  CAST(RAND() * 3 AS INT64) as return_count,
  ROUND(RAND() * 0.1, 3) as return_rate
FROM date_range dr
CROSS JOIN products p;

-- Insert Marketing Channel Test Data
INSERT INTO `insight_analytics.agg_marketing_channel_daily` (
  date, website_id, channel, campaign_name, spend, sessions, 
  revenue, conversions, impressions, clicks
)
WITH date_range AS (
  SELECT DATE_SUB(CURRENT_DATE(), INTERVAL day DAY) as date
  FROM UNNEST(GENERATE_ARRAY(1, 30)) as day
),
channels AS (
  SELECT 'sanderson_uk' as website_id, 'google_ads' as channel, 'Brand Campaign' as campaign, 1.0 as multiplier
  UNION ALL SELECT 'sanderson_uk', 'facebook_ads', 'Retargeting', 0.8
  UNION ALL SELECT 'sanderson_uk', 'pinterest_ads', 'Product Pins', 0.6
  UNION ALL SELECT 'sanderson_uk', 'organic', NULL, 0.0
  UNION ALL SELECT 'harlequin', 'google_ads', 'Shopping Campaign', 0.9
  UNION ALL SELECT 'harlequin', 'facebook_ads', 'Awareness', 0.7
)
SELECT 
  dr.date,
  c.website_id,
  c.channel,
  c.campaign,
  ROUND((500 + RAND() * 300) * c.multiplier, 2) as spend,
  CAST((400 + RAND() * 200) * (1 + c.multiplier) AS INT64) as sessions,
  ROUND((3000 + RAND() * 2000) * (1 + c.multiplier), 2) as revenue,
  CAST((15 + RAND() * 10) * (1 + c.multiplier) AS INT64) as conversions,
  CAST((50000 + RAND() * 30000) * (1 + c.multiplier) AS INT64) as impressions,
  CAST((2000 + RAND() * 1000) * (1 + c.multiplier) AS INT64) as clicks
FROM date_range dr
CROSS JOIN channels c;

-- Insert Website Behavior Test Data
INSERT INTO `insight_analytics.agg_website_behavior_daily` (
  date, website_id, page_path, page_title, sessions, pageviews, 
  unique_pageviews, avg_time_on_page, bounce_rate, exit_rate, entrances, exits
)
WITH date_range AS (
  SELECT DATE_SUB(CURRENT_DATE(), INTERVAL day DAY) as date
  FROM UNNEST(GENERATE_ARRAY(1, 30)) as day
),
pages AS (
  SELECT 'sanderson_uk' as website_id, '/' as page_path, 'Home' as page_title, 1.0 as multiplier
  UNION ALL SELECT 'sanderson_uk', '/wallpaper', 'Wallpaper Collection', 0.8
  UNION ALL SELECT 'sanderson_uk', '/fabric', 'Fabric Collection', 0.7
  UNION ALL SELECT 'sanderson_uk', '/paint', 'Paint Collection', 0.6
  UNION ALL SELECT 'harlequin', '/', 'Home', 0.9
  UNION ALL SELECT 'harlequin', '/collections', 'Collections', 0.7
)
SELECT 
  dr.date,
  p.website_id,
  p.page_path,
  p.page_title,
  CAST((500 + RAND() * 300) * p.multiplier AS INT64) as sessions,
  CAST((800 + RAND() * 400) * p.multiplier AS INT64) as pageviews,
  CAST((600 + RAND() * 300) * p.multiplier AS INT64) as unique_pageviews,
  ROUND(120 + RAND() * 180, 2) as avg_time_on_page,
  ROUND(0.3 + RAND() * 0.3, 3) as bounce_rate,
  ROUND(0.2 + RAND() * 0.3, 3) as exit_rate,
  CAST((300 + RAND() * 200) * p.multiplier AS INT64) as entrances,
  CAST((200 + RAND() * 150) * p.multiplier AS INT64) as exits
FROM date_range dr
CROSS JOIN pages p;

