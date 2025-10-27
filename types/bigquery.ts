// BigQuery Data Models
// These interfaces represent the schema of aggregated reporting tables

// Represents the schema of the `agg_sales_overview_daily` table
export interface SalesOverviewRow {
  date: string; // YYYY-MM-DD format
  website_id: string;

  // Order Metrics
  total_orders: number;
  unique_customers: number;

  // Revenue Metrics
  total_revenue: number;
  subtotal: number;
  total_tax: number;
  total_shipping: number;
  total_discounts: number;

  // Item Metrics
  total_items: number;

  // Order Status Breakdown
  orders_complete: number;
  orders_pending: number;
  orders_processing: number;
  orders_canceled: number;

  // Revenue by Status
  revenue_complete: number;
  revenue_pending: number;

  // Metadata
  _aggregated_at: string;
}

// Product performance data (from agg_product_performance_daily)
export interface ProductPerformanceRow {
  date: string; // YYYY-MM-DD format
  website_id: string; // store_id from Adobe Commerce
  sku: string;
  product_name: string;
  product_id: string;

  // Quantity metrics
  total_qty_ordered: number;
  total_qty_invoiced: number;
  total_qty_shipped: number;
  total_qty_canceled: number;
  total_qty_refunded: number;

  // Revenue metrics
  total_revenue: number;
  total_base_revenue: number;
  total_discount: number;
  total_tax: number;

  // Price metrics
  avg_price: number;
  min_price: number;
  max_price: number;

  // Order count
  order_count: number;

  // Metadata
  _aggregated_at: string;
}

// Marketing channel data
export interface MarketingChannelRow {
  date: string;
  website_id: string;
  channel: string; // 'google_ads', 'facebook_ads', 'pinterest_ads', 'organic', 'direct', etc.
  campaign_name?: string;
  spend: number;
  sessions: number;
  revenue: number;
  conversions: number;
  impressions?: number;
  clicks?: number;
}

// SEO / Search Console data
export interface SEOPerformanceRow {
  date: string;
  website_id: string;
  query: string;
  page_url?: string;
  impressions: number;
  clicks: number;
  ctr: number;
  average_position: number;
  attributed_revenue?: number;
}

// Website behavior data
export interface WebsiteBehaviorRow {
  date: string;
  website_id: string;
  page_path: string;
  page_title?: string;
  sessions: number;
  pageviews: number;
  unique_pageviews: number;
  avg_time_on_page: number;
  bounce_rate: number;
  exit_rate: number;
  entrances: number;
  exits: number;
}

// Search insights (internal site search)
export interface SearchInsightRow {
  date: string;
  website_id: string;
  search_term: string;
  search_count: number;
  results_count?: number;
  conversion_rate?: number;
}

// Cart and checkout behavior
export interface CartBehaviorRow {
  date: string;
  website_id: string;
  add_to_cart_events: number;
  cart_abandonment_count: number;
  cart_abandonment_rate: number;
  checkout_started: number;
  checkout_completed: number;
}

// Aggregated metrics (calculated in-app)
export interface CalculatedMetrics {
  aov: number; // Average Order Value = total_revenue / total_orders
  items_per_order: number; // total_items / total_orders
  cvr?: number; // Conversion Rate = (total_orders / total_sessions) * 100 (requires session data)
  returnRate?: number; // Return Rate = (total_returns / total_orders) * 100 (requires return data)
  blendedROAS?: number; // Return on Ad Spend = total_revenue / total_media_spend (requires ad spend data)
  cpa?: number; // Cost Per Acquisition = total_media_spend / total_orders (requires ad spend data)
}

// Date range filter
export interface DateRange {
  startDate: string; // ISO 8601 or YYYY-MM-DD
  endDate: string;
}

// Comparison period
export type ComparisonPeriod = 'previous_period' | 'previous_year' | 'none';

// Report context (used for filtering)
export interface ReportContext {
  clientId: string;
  websiteId: string | 'all_combined'; // 'all_combined' for combined totals
  dateRange: DateRange;
  comparisonPeriod: ComparisonPeriod;
}

