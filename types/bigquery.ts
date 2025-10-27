// BigQuery Data Models
// These interfaces represent the schema of aggregated reporting tables

// Represents the schema of the `agg_sales_overview_daily` table
export interface SalesOverviewRow {
  date: string; // YYYY-MM-DD format
  website_id: string;
  total_sales: number;
  total_orders: number;
  total_sessions: number;
  total_media_spend: number;
  total_revenue: number;
  total_returns?: number;
  total_return_value?: number;
}

// Product performance data
export interface ProductPerformanceRow {
  date: string;
  website_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  category?: string;
  quantity_sold: number;
  revenue: number;
  stock_level?: number;
  return_count?: number;
  return_rate?: number;
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
  aov: number; // Average Order Value = total_sales / total_orders
  cvr: number; // Conversion Rate = (total_orders / total_sessions) * 100
  returnRate: number; // Return Rate = (total_returns / total_orders) * 100
  blendedROAS: number; // Return on Ad Spend = total_revenue / total_media_spend
  cpa: number; // Cost Per Acquisition = total_media_spend / total_orders
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

