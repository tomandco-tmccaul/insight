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

// ============================================================================
// GA4 Data Models (from Airbyte GA4 connector)
// ============================================================================

// GA4 Website Overview - Overall site metrics
export interface GA4WebsiteOverviewRow {
  property_id: string; // GA4 property ID
  date: string; // YYYY-MM-DD format
  activeUsers: number;
  newUsers: number;
  totalUsers: number;
  sessions: number;
  engagedSessions: number;
  averageSessionDuration: number; // in seconds
  screenPageViews: number;
  screenPageViewsPerSession: number;
  eventCount: number;
  conversions: number;
  totalRevenue: number;
  engagementRate: number; // percentage
  bounceRate: number; // percentage
  _airbyte_extracted_at: string;
  _airbyte_ab_id?: string;
  _airbyte_emitted_at?: string;
  _airbyte_normalized_at?: string;
}

// GA4 Daily Active Users
export interface GA4DailyActiveUsersRow {
  property_id: string;
  date: string; // YYYY-MM-DD format
  activeUsers: number;
  _airbyte_extracted_at: string;
  _airbyte_ab_id?: string;
  _airbyte_emitted_at?: string;
  _airbyte_normalized_at?: string;
}

// GA4 Weekly Active Users
export interface GA4WeeklyActiveUsersRow {
  property_id: string;
  date: string; // YYYY-MM-DD format
  activeUsers: number;
  _airbyte_extracted_at: string;
  _airbyte_ab_id?: string;
  _airbyte_emitted_at?: string;
  _airbyte_normalized_at?: string;
}

// GA4 Four Weekly Active Users (Monthly)
export interface GA4FourWeeklyActiveUsersRow {
  property_id: string;
  date: string; // YYYY-MM-DD format
  activeUsers: number;
  _airbyte_extracted_at: string;
  _airbyte_ab_id?: string;
  _airbyte_emitted_at?: string;
  _airbyte_normalized_at?: string;
}

// GA4 Pages - Page-level metrics
export interface GA4PagesRow {
  property_id: string;
  date: string;
  hostName: string;
  pagePath: string;
  pageTitle?: string;
  screenPageViews: number;
  sessions: number;
  engagedSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  _airbyte_extracted_at: string;
  _airbyte_ab_id?: string;
  _airbyte_emitted_at?: string;
  _airbyte_normalized_at?: string;
}

// GA4 Traffic Sources - Session source/medium breakdown
export interface GA4TrafficSourcesRow {
  property_id: string;
  date: string;
  sessionSource: string;
  sessionMedium: string;
  sessionCampaignName?: string;
  sessions: number;
  activeUsers: number;
  newUsers: number;
  engagedSessions: number;
  averageSessionDuration: number;
  screenPageViews: number;
  conversions: number;
  totalRevenue: number;
  bounceRate: number;
  _airbyte_extracted_at: string;
  _airbyte_ab_id?: string;
  _airbyte_emitted_at?: string;
  _airbyte_normalized_at?: string;
}

// GA4 Devices - Device category breakdown
export interface GA4DevicesRow {
  property_id: string;
  date: string;
  deviceCategory: string; // 'desktop', 'mobile', 'tablet'
  sessions: number;
  activeUsers: number;
  newUsers: number;
  engagedSessions: number;
  averageSessionDuration: number;
  screenPageViews: number;
  conversions: number;
  totalRevenue: number;
  bounceRate: number;
  _airbyte_extracted_at: string;
  _airbyte_ab_id?: string;
  _airbyte_emitted_at?: string;
  _airbyte_normalized_at?: string;
}

// GA4 Locations - Geographic breakdown
export interface GA4LocationsRow {
  property_id: string;
  country: string;
  region?: string;
  city?: string;
  sessions: number;
  activeUsers: number;
  newUsers: number;
  engagedSessions: number;
  averageSessionDuration: number;
  screenPageViews: number;
  conversions: number;
  totalRevenue: number;
  bounceRate: number;
  _airbyte_extracted_at: string;
  _airbyte_ab_id?: string;
  _airbyte_emitted_at?: string;
  _airbyte_normalized_at?: string;
}

// ============================================================================
// Adobe Commerce SQL Tables (from Airbyte Adobe Commerce connector)
// ============================================================================

// Adobe Commerce Sales Order - Main order table
export interface AdobeCommerceSalesOrderRow {
  // Airbyte metadata fields
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any; // JSON
  _airbyte_generation_id?: number;

  // Order identification
  entity_id: number;
  increment_id: string;
  ext_order_id?: string;
  original_increment_id?: string;
  protect_code?: string;
  relation_child_id?: string;
  relation_parent_id?: string;
  relation_child_real_id?: string;
  relation_parent_real_id?: string;

  // Store information
  store_id: number;
  store_name?: string;
  store_currency_code?: string;
  store_to_base_rate?: number;
  store_to_order_rate?: number;

  // Customer information
  customer_id?: number;
  customer_is_guest?: number;
  customer_email?: string;
  customer_firstname?: string;
  customer_lastname?: string;
  customer_middlename?: string;
  customer_prefix?: string;
  customer_suffix?: string;
  customer_dob?: string; // DATETIME
  customer_gender?: number;
  customer_group_id?: number;
  customer_taxvat?: string;
  ext_customer_id?: string;

  // Order status and state
  state?: string;
  status?: string;
  hold_before_state?: string;
  hold_before_status?: string;
  dispute_status?: string;

  // Pricing and totals
  subtotal?: number;
  base_subtotal?: number;
  subtotal_incl_tax?: number;
  base_subtotal_incl_tax?: number;
  grand_total?: number;
  base_grand_total?: number;
  total_due?: number;
  base_total_due?: number;
  total_paid?: number;
  base_total_paid?: number;

  // Tax information
  tax_amount?: number;
  base_tax_amount?: number;
  tax_canceled?: number;
  base_tax_canceled?: number;
  tax_invoiced?: number;
  base_tax_invoiced?: number;
  tax_refunded?: number;
  base_tax_refunded?: number;

  // Shipping information
  shipping_amount?: number;
  base_shipping_amount?: number;
  shipping_incl_tax?: number;
  base_shipping_incl_tax?: number;
  shipping_canceled?: number;
  base_shipping_canceled?: number;
  shipping_invoiced?: number;
  base_shipping_invoiced?: number;
  shipping_refunded?: number;
  base_shipping_refunded?: number;
  shipping_tax_amount?: number;
  base_shipping_tax_amount?: number;
  shipping_tax_refunded?: number;
  base_shipping_tax_refunded?: number;
  shipping_method?: string;
  shipping_description?: string;
  shipping_discount_amount?: number;
  base_shipping_discount_amount?: number;
  shipping_discount_tax_compensation_amount?: number;
  base_shipping_discount_tax_compensation_amnt?: number;

  // Discount information
  discount_amount?: number;
  base_discount_amount?: number;
  discount_canceled?: number;
  base_discount_canceled?: number;
  discount_invoiced?: number;
  base_discount_invoiced?: number;
  discount_refunded?: number;
  base_discount_refunded?: number;
  discount_description?: string;
  discount_tax_compensation_amount?: number;
  discount_tax_compensation_invoiced?: number;
  discount_tax_compensation_refunded?: number;
  base_discount_tax_compensation_amount?: number;
  base_discount_tax_compensation_invoiced?: number;
  base_discount_tax_compensation_refunded?: number;

  // Gift cards and gift wrapping
  gift_cards?: string;
  gift_cards_amount?: number;
  base_gift_cards_amount?: number;
  gift_cards_invoiced?: number;
  gift_cards_refunded?: number;
  base_gift_cards_invoiced?: number;
  base_gift_cards_refunded?: number;
  gift_message_id?: number;
  gw_id?: number;
  gw_price?: number;
  gw_base_price?: number;
  gw_price_incl_tax?: number;
  gw_base_price_incl_tax?: number;
  gw_tax_amount?: number;
  gw_base_tax_amount?: number;
  gw_add_card?: number;
  gw_allow_gift_receipt?: number;
  gw_items_price?: number;
  gw_items_base_price?: number;
  gw_items_price_incl_tax?: number;
  gw_items_base_price_incl_tax?: number;
  gw_items_tax_amount?: number;
  gw_items_base_tax_amount?: number;
  gw_card_price?: number;
  gw_card_base_price?: number;
  gw_card_price_incl_tax?: number;
  gw_card_base_price_incl_tax?: number;
  gw_card_tax_amount?: number;
  gw_card_base_tax_amount?: number;
  // Gift wrapping invoiced/refunded fields
  gw_price_invoiced?: number;
  gw_price_refunded?: number;
  gw_base_price_invoiced?: number;
  gw_base_price_refunded?: number;
  gw_tax_amount_invoiced?: number;
  gw_tax_amount_refunded?: number;
  gw_base_tax_amount_invoiced?: number;
  gw_base_tax_amount_refunded?: number;
  gw_items_price_invoiced?: number;
  gw_items_price_refunded?: number;
  gw_items_base_price_invoiced?: number;
  gw_items_base_price_refunded?: number;
  gw_items_tax_invoiced?: number;
  gw_items_tax_refunded?: number;
  gw_items_base_tax_invoiced?: number;
  gw_items_base_tax_refunded?: number;
  gw_card_price_invoiced?: number;
  gw_card_price_refunded?: number;
  gw_card_base_price_invoiced?: number;
  gw_card_base_price_refunded?: number;
  gw_card_tax_invoiced?: number;
  gw_card_tax_refunded?: number;
  gw_card_base_tax_invoiced?: number;
  gw_card_base_tax_refunded?: number;

  // Currency and rates
  base_currency_code?: string;
  order_currency_code?: string;
  global_currency_code?: string;
  base_to_order_rate?: number;
  base_to_global_rate?: number;

  // Order details
  total_qty_ordered?: number;
  base_total_qty_ordered?: number;
  total_item_count?: number;
  weight?: number;
  is_virtual?: number;
  is_samples?: number;
  can_ship_partially?: number;
  can_ship_partially_item?: number;
  forced_shipment_with_invoice?: number;

  // Invoiced and refunded totals
  subtotal_invoiced?: number;
  base_subtotal_invoiced?: number;
  subtotal_canceled?: number;
  base_subtotal_canceled?: number;
  subtotal_refunded?: number;
  base_subtotal_refunded?: number;
  total_invoiced?: number;
  base_total_invoiced?: number;
  base_total_invoiced_cost?: number;
  total_canceled?: number;
  base_total_canceled?: number;
  total_refunded?: number;
  base_total_refunded?: number;
  total_online_refunded?: number;
  base_total_online_refunded?: number;
  total_offline_refunded?: number;
  base_total_offline_refunded?: number;

  // Addresses
  quote_id?: number;
  quote_address_id?: number;
  billing_address_id?: number;
  shipping_address_id?: number;

  // Payment information
  payment_auth_expiration?: number;
  payment_authorization_amount?: number;
  stripe_payment_method_type?: string;
  stripe_radar_risk_level?: string;
  stripe_radar_risk_score?: number;
  paypal_ipn_customer_notified?: number;

  // Customer balance and rewards
  customer_balance_amount?: number;
  base_customer_balance_amount?: number;
  customer_balance_invoiced?: number;
  base_customer_balance_invoiced?: number;
  customer_balance_refunded?: number;
  base_customer_balance_refunded?: number;
  customer_bal_total_refunded?: number;
  bs_customer_bal_total_refunded?: number;
  reward_points_balance?: number;
  reward_points_balance_refund?: number;
  reward_currency_amount?: number;
  base_reward_currency_amount?: number;
  rwrd_currency_amount_invoiced?: number;
  base_rwrd_crrncy_amt_invoiced?: number;
  rwrd_crrncy_amnt_refunded?: number;
  base_rwrd_crrncy_amnt_refnded?: number;

  // Adjustments
  adjustment_negative?: number;
  adjustment_positive?: number;
  base_adjustment_negative?: number;
  base_adjustment_positive?: number;

  // Other fields
  edit_increment?: number;
  email_sent?: number;
  send_email?: number;
  customer_note?: string;
  customer_note_notify?: number;
  applied_rule_ids?: string;
  coupon_code?: string;
  coupon_rule_name?: string;
  remote_ip?: string;
  x_forwarded_for?: string;
  additional_emails?: string;
  hubspot_user_token?: string;
  mertex_order_reference?: string;
  mertex_tariff_amount?: number;

  // Timestamps
  created_at?: string; // TIMESTAMP
  updated_at?: string; // TIMESTAMP
}

// Adobe Commerce Sales Order Grid - Optimized order table for reporting
export interface AdobeCommerceSalesOrderGridRow {
  // Airbyte metadata fields
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any; // JSON
  _airbyte_generation_id?: number;

  // Order identification
  entity_id: number;
  increment_id: string;
  status?: string;

  // Store information
  store_id: number;
  store_name?: string;

  // Customer information
  customer_id?: number;
  customer_name?: string;
  customer_email?: string;
  customer_group?: string;

  // Billing and shipping addresses (formatted strings)
  billing_name?: string;
  billing_address?: string;
  shipping_name?: string;
  shipping_address?: string;
  shipping_information?: string;

  // Pricing and totals
  subtotal?: number;
  grand_total?: number;
  base_grand_total?: number;
  total_paid?: number;
  base_total_paid?: number;
  total_refunded?: number;
  refunded_to_store_credit?: number;

  // Currency
  base_currency_code?: string;
  order_currency_code?: string;

  // Payment and transaction
  payment_method?: string;
  transaction_source?: string;

  // Shipping
  shipping_and_handling?: number;
  initial_fee_tax?: number;
  base_initial_fee_tax?: number;
  pickup_location_code?: string;
  collection_store_name?: string;

  // Risk and fraud detection
  stripe_radar_risk_level?: string;
  stripe_radar_risk_score?: number;
  stripe_payment_method_type?: string;

  // Order flags
  is_samples?: number;

  // Dispute status
  dispute_status?: string;

  // Timestamps
  created_at?: string; // TIMESTAMP
  updated_at?: string; // TIMESTAMP
}

// Adobe Commerce Sales Order Item - Order line items
export interface AdobeCommerceSalesOrderItemRow {
  // Airbyte metadata fields
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any; // JSON
  _airbyte_generation_id?: number;

  // Item identification
  item_id: number;
  order_id: number;
  parent_item_id?: number;
  quote_item_id?: number;
  ext_order_item_id?: string;

  // Product information
  product_id?: number;
  product_type?: string;
  sku?: string;
  name?: string;
  description?: string;

  // Store information
  store_id: number;

  // Pricing
  price?: number;
  base_price?: number;
  original_price?: number;
  base_original_price?: number;
  price_incl_tax?: number;
  base_price_incl_tax?: number;

  // Row totals
  row_total?: number;
  base_row_total?: number;
  row_total_incl_tax?: number;
  base_row_total_incl_tax?: number;
  row_invoiced?: number;
  base_row_invoiced?: number;

  // Quantity
  qty_ordered?: number;
  qty_invoiced?: number;
  qty_shipped?: number;
  qty_canceled?: number;
  qty_refunded?: number;
  qty_returned?: number;
  qty_backordered?: number;
  is_qty_decimal?: number;

  // Weight
  weight?: number;
  row_weight?: number;

  // Tax information
  tax_amount?: number;
  base_tax_amount?: number;
  tax_percent?: number;
  tax_canceled?: number;
  tax_invoiced?: number;
  tax_refunded?: number;
  tax_before_discount?: number;
  base_tax_before_discount?: number;
  ava_vatcode?: string;

  // Discount information
  discount_amount?: number;
  base_discount_amount?: number;
  discount_percent?: number;
  discount_invoiced?: number;
  base_discount_invoiced?: number;
  discount_refunded?: number;
  base_discount_refunded?: number;
  no_discount?: number;
  discount_tax_compensation_amount?: number;
  discount_tax_compensation_canceled?: number;
  discount_tax_compensation_invoiced?: number;
  discount_tax_compensation_refunded?: number;
  base_discount_tax_compensation_amount?: number;
  base_discount_tax_compensation_invoiced?: number;
  base_discount_tax_compensation_refunded?: number;

  // Refund information
  amount_refunded?: number;
  base_amount_refunded?: number;

  // Gift wrapping
  gw_id?: number;
  gw_price?: number;
  gw_base_price?: number;
  gw_tax_amount?: number;
  gw_base_tax_amount?: number;
  gw_price_invoiced?: number;
  gw_price_refunded?: number;
  gw_base_price_invoiced?: number;
  gw_base_price_refunded?: number;
  gw_tax_amount_invoiced?: number;
  gw_tax_amount_refunded?: number;
  gw_base_tax_amount_invoiced?: number;
  gw_base_tax_amount_refunded?: number;

  // Gift wrapping items
  gw_items_price?: number;
  gw_items_base_price?: number;
  gw_items_tax_amount?: number;
  gw_items_base_tax_amount?: number;
  gw_items_price_invoiced?: number;
  gw_items_price_refunded?: number;
  gw_items_base_price_invoiced?: number;
  gw_items_base_price_refunded?: number;
  gw_items_tax_invoiced?: number;
  gw_items_tax_refunded?: number;
  gw_items_base_tax_invoiced?: number;
  gw_items_base_tax_refunded?: number;

  // Initial fee
  initial_fee?: number;
  base_initial_fee?: number;
  initial_fee_tax?: number;
  base_initial_fee_tax?: number;

  // Product options and additional data
  product_options?: string;
  additional_data?: string;

  // WEEE (Waste Electrical and Electronic Equipment) tax
  weee_tax_applied?: string;
  weee_tax_applied_amount?: number;
  base_weee_tax_applied_amount?: number;
  weee_tax_applied_row_amount?: number;
  base_weee_tax_applied_row_amnt?: number;
  weee_tax_disposition?: number;
  weee_tax_row_disposition?: number;
  base_weee_tax_disposition?: number;
  base_weee_tax_row_disposition?: number;

  // Applied rules
  applied_rule_ids?: string;

  // Flags
  is_virtual?: number;
  free_shipping?: number;
  locked_do_ship?: number;
  locked_do_invoice?: number;
  gift_message_id?: number;
  gift_message_available?: number;
  giftregistry_item_id?: number;
  event_id?: number;

  // Cost
  base_cost?: number;

  // Mertex integration
  mertex_order_id?: string;
  mertex_basket_id?: string;

  // Stripe subscription
  stripe_original_subscription_price?: number;
  stripe_base_original_subscription_price?: number;

  // Timestamps
  created_at?: string; // TIMESTAMP
  updated_at?: string; // TIMESTAMP
}

// Adobe Commerce Store Website - Website/store configuration
export interface AdobeCommerceStoreWebsiteRow {
  // Airbyte metadata fields
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any; // JSON
  _airbyte_generation_id?: number;

  // Website identification
  website_id: number;
  code?: string;
  name?: string;
  default_group_id?: number;
  is_default?: number;
  sort_order?: number;
}

