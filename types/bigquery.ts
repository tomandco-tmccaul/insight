// BigQuery Data Models
// These interfaces represent the schema of tables in BigQuery
// Auto-generated from BigQuery schemas

// ============================================================================
// Aggregated Reporting Materialized Views
// ============================================================================

// mv_agg_customer_metrics_daily
export interface CustomerMetricsDailyRow {
  date?: string | null;
  website_id?: string | null;
  unique_customers?: number | null;
  registered_customers?: number | null;
  guest_customers?: number | null;
  revenue_per_customer?: number | null;
  _aggregated_at?: string | null;
}

// mv_agg_product_performance_daily
export interface ProductPerformanceDailyRow {
  date?: string | null;
  website_id?: string | null;
  sku?: string | null;
  product_name?: string | null;
  product_id?: string | null;
  total_qty_ordered?: number | null;
  total_qty_invoiced?: number | null;
  total_qty_shipped?: number | null;
  total_qty_canceled?: number | null;
  total_qty_refunded?: number | null;
  total_revenue?: number | null;
  total_base_revenue?: number | null;
  total_discount?: number | null;
  total_tax?: number | null;
  avg_price?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  order_count?: number | null;
  _aggregated_at?: string | null;
}

// mv_agg_sales_overview_daily
export interface SalesOverviewDailyRow {
  date?: string | null;
  website_id?: string | null;
  total_orders?: number | null;
  unique_customers?: number | null;
  total_revenue?: number | null;
  subtotal?: number | null;
  total_tax?: number | null;
  total_shipping?: number | null;
  total_discounts?: number | null;
  total_items?: number | null;
  orders_complete?: number | null;
  orders_pending?: number | null;
  orders_processing?: number | null;
  orders_canceled?: number | null;
  revenue_complete?: number | null;
  revenue_pending?: number | null;
  orders_sample?: number | null;
  orders_not_sample?: number | null;
  _aggregated_at?: string | null;
}

// mv_agg_sales_overview_hourly
export interface SalesOverviewHourlyRow {
  date?: string | null;
  hour?: number | null;
  website_id?: string | null;
  total_orders?: number | null;
  total_revenue?: number | null;
  _aggregated_at?: string | null;
}

// mv_agg_sales_overview_monthly
export interface SalesOverviewMonthlyRow {
  year?: number | null;
  month?: number | null;
  website_id?: string | null;
  total_orders?: number | null;
  unique_customers?: number | null;
  total_revenue?: number | null;
  subtotal?: number | null;
  total_tax?: number | null;
  total_shipping?: number | null;
  total_discounts?: number | null;
  total_items?: number | null;
  _aggregated_at?: string | null;
}

// mv_agg_seo_performance_daily
export interface SeoPerformanceDailyRow {
  date?: string | null;
  website_id?: string | null;
  query_text?: string | null;
  page_url?: string | null;
  total_clicks?: number | null;
  total_impressions?: number | null;
  avg_ctr?: number | null;
  avg_position?: number | null;
  attributed_revenue?: number | null;
}

// ============================================================================
// Materialized Views
// ============================================================================

// mv_adobe_commerce_orders_flattened
export interface AdobeCommerceOrdersflattenedRow {
  entity_id?: number | null;
  increment_id?: string | null;
  order_date?: string | null;
  order_created_at?: string | null;
  website_id?: string | null;
  customer_id?: number | null;
  customer_email?: string | null;
  customer_firstname?: string | null;
  customer_lastname?: string | null;
  customer_is_guest?: number | null;
  status?: string | null;
  state?: string | null;
  grand_total?: number | null;
  subtotal?: number | null;
  base_grand_total?: number | null;
  base_subtotal?: number | null;
  tax_amount?: number | null;
  base_tax_amount?: number | null;
  shipping_amount?: number | null;
  base_shipping_amount?: number | null;
  discount_amount?: number | null;
  base_discount_amount?: number | null;
  total_qty_ordered?: number | null;
  total_item_count?: number | null;
  shipping_description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  extension_attributes_raw?: string | null;
  extension_attributes_json?: any | null;
  ext_additional_itemized_taxes?: string | null;
  ext_applied_taxes?: string | null;
  ext_base_gift_cards_amount?: string | null;
  ext_converting_from_quote?: string | null;
  ext_gift_cards?: string | null;
  ext_gift_cards_amount?: string | null;
  ext_gw_base_price?: string | null;
  ext_gw_card_base_price?: string | null;
  ext_gw_card_price?: string | null;
  ext_gw_items_base_price?: string | null;
  ext_gw_items_price?: string | null;
  ext_gw_price?: string | null;
  ext_is_samples?: string | null;
  ext_item_applied_taxes?: string | null;
  ext_payment_additional_info?: string | null;
  ext_shipping_assignments?: string | null;
  ext_sources?: string | null;
  ext_taxes?: string | null;
}

// mv_adobe_commerce_products_flattened
export interface AdobeCommerceProductsflattenedRow {
  sku?: string | null;
  product_name?: string | null;
  attr_sdb_collection_name?: string | null;
  attr_sdb_design_name?: string | null;
  attr_sdb_parent_title?: string | null;
  attr_sdb_product_collection_data?: any | null;
  attr_brand?: string | null;
  attr_color?: string | null;
  attr_size?: string | null;
  attr_material?: string | null;
  attr_pattern?: string | null;
  attr_width?: string | null;
  attr_length?: string | null;
  attr_height?: string | null;
  attr_weight?: string | null;
  attr_price?: string | null;
  attr_special_price?: string | null;
  attr_cost?: string | null;
  attr_manufacturer?: string | null;
  attr_country_of_manufacture?: string | null;
  attr_description?: string | null;
  attr_short_description?: string | null;
  attr_meta_title?: string | null;
  attr_meta_description?: string | null;
  attr_meta_keyword?: string | null;
  attr_url_key?: string | null;
  attr_url_path?: string | null;
  attr_image?: string | null;
  attr_small_image?: string | null;
  attr_thumbnail?: string | null;
  attr_status?: string | null;
  attr_visibility?: string | null;
  attr_tax_class_id?: string | null;
}

// mv_adobe_commerce_sales_items
export interface AdobeCommerceSalesItemsRow {
  order_id?: number | null;
  order_entity_id?: number | null;
  order_increment_id?: string | null;
  order_date?: string | null;
  order_created_at?: string | null;
  website_id?: string | null;
  item_id?: number | null;
  sku?: string | null;
  product_name?: string | null;
  product_id?: string | null;
  product_type?: string | null;
  qty_ordered?: number | null;
  qty_invoiced?: number | null;
  qty_shipped?: number | null;
  qty_canceled?: number | null;
  qty_refunded?: number | null;
  qty_returned?: number | null;
  price?: number | null;
  base_price?: number | null;
  original_price?: number | null;
  base_original_price?: number | null;
  price_incl_tax?: number | null;
  base_price_incl_tax?: number | null;
  row_total?: number | null;
  base_row_total?: number | null;
  row_total_incl_tax?: number | null;
  base_row_total_incl_tax?: number | null;
  tax_amount?: number | null;
  base_tax_amount?: number | null;
  tax_percent?: number | null;
  discount_amount?: number | null;
  base_discount_amount?: number | null;
  discount_percent?: number | null;
  order_status?: string | null;
  order_state?: string | null;
  customer_id?: number | null;
  customer_email?: string | null;
  customer_is_guest?: number | null;
  item_created_at?: string | null;
  item_updated_at?: string | null;
  order_created_at_full?: string | null;
  order_updated_at?: string | null;
}

// ============================================================================
// Adobe Commerce Tables (from Airbyte Adobe Commerce connector)
// ============================================================================

// adobe_commerce_creditmemos
export interface AdobeCommerceCreditmemosRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  items?: any | null;
  state?: number | null;
  comments?: any | null;
  order_id?: number | null;
  store_id?: number | null;
  subtotal?: number | null;
  entity_id?: number | null;
  adjustment?: number | null;
  created_at?: string | null;
  email_sent?: number | null;
  invoice_id?: number | null;
  tax_amount?: number | null;
  updated_at?: string | null;
  grand_total?: number | null;
  increment_id?: string | null;
  base_subtotal?: number | null;
  transaction_id?: string | null;
  base_adjustment?: number | null;
  base_tax_amount?: number | null;
  discount_amount?: number | null;
  shipping_amount?: number | null;
  base_grand_total?: number | null;
  shipping_incl_tax?: number | null;
  subtotal_incl_tax?: number | null;
  base_currency_code?: string | null;
  base_to_order_rate?: number | null;
  billing_address_id?: number | null;
  store_to_base_rate?: number | null;
  adjustment_negative?: number | null;
  adjustment_positive?: number | null;
  base_to_global_rate?: number | null;
  order_currency_code?: string | null;
  shipping_tax_amount?: number | null;
  store_currency_code?: string | null;
  store_to_order_rate?: number | null;
  base_discount_amount?: number | null;
  base_shipping_amount?: number | null;
  discount_description?: string | null;
  global_currency_code?: string | null;
  base_shipping_incl_tax?: number | null;
  base_subtotal_incl_tax?: number | null;
  base_adjustment_negative?: number | null;
  base_adjustment_positive?: number | null;
  base_shipping_tax_amount?: number | null;
  discount_tax_compensation_amount?: number | null;
  base_discount_tax_compensation_amount?: number | null;
}

// adobe_commerce_customers
export interface AdobeCommerceCustomersRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  id?: number | null;
  dob?: string | null;
  email?: string | null;
  gender?: number | null;
  group_id?: number | null;
  lastname?: string | null;
  store_id?: number | null;
  addresses?: any | null;
  firstname?: string | null;
  created_at?: string | null;
  created_in?: string | null;
  updated_at?: string | null;
  website_id?: number | null;
  confirmation?: string | null;
  default_billing?: string | null;
  default_shipping?: string | null;
  custom_attributes?: any | null;
  extension_attributes?: any | null;
  disable_auto_group_change?: number | null;
}

// adobe_commerce_invoices
export interface AdobeCommerceInvoicesRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  items?: any | null;
  state?: number | null;
  comments?: any | null;
  order_id?: number | null;
  store_id?: number | null;
  subtotal?: number | null;
  entity_id?: number | null;
  total_qty?: number | null;
  created_at?: string | null;
  email_sent?: number | null;
  tax_amount?: number | null;
  updated_at?: string | null;
  grand_total?: number | null;
  increment_id?: string | null;
  base_subtotal?: number | null;
  transaction_id?: string | null;
  base_tax_amount?: number | null;
  discount_amount?: number | null;
  shipping_amount?: number | null;
  base_grand_total?: number | null;
  shipping_incl_tax?: number | null;
  subtotal_incl_tax?: number | null;
  base_currency_code?: string | null;
  base_to_order_rate?: number | null;
  billing_address_id?: number | null;
  store_to_base_rate?: number | null;
  base_to_global_rate?: number | null;
  order_currency_code?: string | null;
  shipping_tax_amount?: number | null;
  store_currency_code?: string | null;
  store_to_order_rate?: number | null;
  base_discount_amount?: number | null;
  base_shipping_amount?: number | null;
  discount_description?: string | null;
  extension_attributes?: any | null;
  global_currency_code?: string | null;
  base_shipping_incl_tax?: number | null;
  base_subtotal_incl_tax?: number | null;
  base_shipping_tax_amount?: number | null;
  discount_tax_compensation_amount?: number | null;
  base_discount_tax_compensation_amount?: number | null;
  shipping_discount_tax_compensation_amount?: number | null;
  base_shipping_discount_tax_compensation_amnt?: number | null;
}

// adobe_commerce_orders
export interface AdobeCommerceOrdersRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  items?: any | null;
  state?: string | null;
  status?: string | null;
  weight?: number | null;
  payment?: any | null;
  quote_id?: number | null;
  store_id?: number | null;
  subtotal?: number | null;
  entity_id?: number | null;
  remote_ip?: string | null;
  total_due?: number | null;
  created_at?: string | null;
  email_sent?: number | null;
  is_virtual?: number | null;
  store_name?: string | null;
  tax_amount?: number | null;
  total_paid?: number | null;
  updated_at?: string | null;
  coupon_code?: string | null;
  customer_id?: number | null;
  grand_total?: number | null;
  increment_id?: string | null;
  protect_code?: string | null;
  tax_canceled?: number | null;
  tax_invoiced?: number | null;
  base_subtotal?: number | null;
  base_total_due?: number | null;
  customer_email?: string | null;
  total_canceled?: number | null;
  total_invoiced?: number | null;
  base_tax_amount?: number | null;
  base_total_paid?: number | null;
  billing_address?: any | null;
  discount_amount?: number | null;
  shipping_amount?: number | null;
  applied_rule_ids?: string | null;
  base_grand_total?: number | null;
  status_histories?: any | null;
  total_item_count?: number | null;
  base_tax_canceled?: number | null;
  base_tax_invoiced?: number | null;
  customer_group_id?: number | null;
  customer_is_guest?: number | null;
  customer_lastname?: string | null;
  discount_canceled?: number | null;
  discount_invoiced?: number | null;
  shipping_canceled?: number | null;
  shipping_incl_tax?: number | null;
  shipping_invoiced?: number | null;
  subtotal_canceled?: number | null;
  subtotal_incl_tax?: number | null;
  subtotal_invoiced?: number | null;
  total_qty_ordered?: number | null;
  base_currency_code?: string | null;
  base_to_order_rate?: number | null;
  billing_address_id?: number | null;
  customer_firstname?: string | null;
  store_to_base_rate?: number | null;
  base_to_global_rate?: number | null;
  base_total_canceled?: number | null;
  base_total_invoiced?: number | null;
  order_currency_code?: string | null;
  shipping_tax_amount?: number | null;
  store_currency_code?: string | null;
  store_to_order_rate?: number | null;
  base_discount_amount?: number | null;
  base_shipping_amount?: number | null;
  customer_note_notify?: number | null;
  discount_description?: string | null;
  extension_attributes?: any | null;
  global_currency_code?: string | null;
  base_discount_canceled?: number | null;
  base_discount_invoiced?: number | null;
  base_shipping_canceled?: number | null;
  base_shipping_incl_tax?: number | null;
  base_shipping_invoiced?: number | null;
  base_subtotal_canceled?: number | null;
  base_subtotal_incl_tax?: number | null;
  base_subtotal_invoiced?: number | null;
  base_shipping_tax_amount?: number | null;
  base_total_invoiced_cost?: number | null;
  shipping_discount_amount?: number | null;
  base_shipping_discount_amount?: number | null;
  discount_tax_compensation_amount?: number | null;
  discount_tax_compensation_invoiced?: number | null;
  base_discount_tax_compensation_amount?: number | null;
  base_discount_tax_compensation_invoiced?: number | null;
  shipping_discount_tax_compensation_amount?: number | null;
  base_shipping_discount_tax_compensation_amnt?: number | null;
}

// adobe_commerce_products
export interface AdobeCommerceProductsRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  id?: number | null;
  sku?: string | null;
  name?: string | null;
  price?: number | null;
  status?: number | null;
  weight?: number | null;
  options?: any | null;
  type_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  visibility?: number | null;
  tier_prices?: any | null;
  product_links?: any | null;
  attribute_set_id?: number | null;
  custom_attributes?: any | null;
  extension_attributes?: any | null;
  media_gallery_entries?: any | null;
}

// adobe_commerce_shipments
export interface AdobeCommerceShipmentsRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  items?: any | null;
  tracks?: any | null;
  comments?: any | null;
  order_id?: number | null;
  packages?: any | null;
  entity_id?: number | null;
  total_qty?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  increment_id?: string | null;
  billing_address_id?: number | null;
  extension_attributes?: any | null;
}

// adobe_commerce_transactions
export interface AdobeCommerceTransactionsRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  txn_id?: string | null;
  order_id?: number | null;
  txn_type?: string | null;
  is_closed?: number | null;
  parent_id?: number | null;
  created_at?: string | null;
  payment_id?: number | null;
  parent_txn_id?: string | null;
  transaction_id?: number | null;
  child_transactions?: any | null;
  additional_information?: any | null;
}

// ============================================================================
// GA4 Data Models (from Airbyte GA4 connector)
// ============================================================================

// ga4_daily_active_users
export interface Ga4DailyActiveUsersRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  date?: string | null;
  endDate?: string | null;
  startDate?: string | null;
  property_id?: string | null;
  active1DayUsers?: number | null;
}

// ga4_devices
export interface Ga4DevicesRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  date?: string | null;
  browser?: string | null;
  endDate?: string | null;
  newUsers?: number | null;
  sessions?: number | null;
  startDate?: string | null;
  bounceRate?: number | null;
  totalUsers?: number | null;
  property_id?: string | null;
  deviceCategory?: string | null;
  operatingSystem?: string | null;
  screenPageViews?: number | null;
  sessionsPerUser?: number | null;
  averageSessionDuration?: number | null;
  screenPageViewsPerSession?: number | null;
}

// ga4_four_weekly_active_users
export interface Ga4FourWeeklyActiveUsersRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  date?: string | null;
  endDate?: string | null;
  startDate?: string | null;
  property_id?: string | null;
  active28DayUsers?: number | null;
}

// ga4_locations
export interface Ga4LocationsRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  city?: string | null;
  date?: string | null;
  region?: string | null;
  country?: string | null;
  endDate?: string | null;
  newUsers?: number | null;
  sessions?: number | null;
  startDate?: string | null;
  bounceRate?: number | null;
  totalUsers?: number | null;
  property_id?: string | null;
  screenPageViews?: number | null;
  sessionsPerUser?: number | null;
  averageSessionDuration?: number | null;
  screenPageViewsPerSession?: number | null;
}

// ga4_pages
export interface Ga4PagesRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  date?: string | null;
  endDate?: string | null;
  hostName?: string | null;
  startDate?: string | null;
  bounceRate?: number | null;
  property_id?: string | null;
  screenPageViews?: number | null;
  pagePathPlusQueryString?: string | null;
}

// ga4_traffic_sources
export interface Ga4TrafficSourcesRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  date?: string | null;
  endDate?: string | null;
  newUsers?: number | null;
  sessions?: number | null;
  startDate?: string | null;
  bounceRate?: number | null;
  totalUsers?: number | null;
  property_id?: string | null;
  sessionMedium?: string | null;
  sessionSource?: string | null;
  screenPageViews?: number | null;
  sessionsPerUser?: number | null;
  averageSessionDuration?: number | null;
  screenPageViewsPerSession?: number | null;
}

// ga4_website_overview
export interface Ga4WebsiteOverviewRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  date?: string | null;
  endDate?: string | null;
  newUsers?: number | null;
  sessions?: number | null;
  startDate?: string | null;
  bounceRate?: number | null;
  totalUsers?: number | null;
  property_id?: string | null;
  screenPageViews?: number | null;
  sessionsPerUser?: number | null;
  averageSessionDuration?: number | null;
  screenPageViewsPerSession?: number | null;
}

// ga4_weekly_active_users
export interface Ga4WeeklyActiveUsersRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  date?: string | null;
  endDate?: string | null;
  startDate?: string | null;
  property_id?: string | null;
  active7DayUsers?: number | null;
}

// ============================================================================
// Google Search Console Tables (from Airbyte GSC connector)
// ============================================================================

// gsc_search_analytics_all_fields
export interface GscSearchAnalyticsAllFieldsRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  ctr?: number | null;
  date?: string | null;
  page?: string | null;
  query?: string | null;
  clicks?: number | null;
  device?: string | null;
  country?: string | null;
  position?: number | null;
  site_url?: string | null;
  impressions?: number | null;
  search_type?: string | null;
}

// gsc_search_analytics_by_country
export interface GscSearchAnalyticsByCountryRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  ctr?: number | null;
  date?: string | null;
  clicks?: number | null;
  country?: string | null;
  position?: number | null;
  site_url?: string | null;
  impressions?: number | null;
  search_type?: string | null;
}

// gsc_search_analytics_by_date
export interface GscSearchAnalyticsByDateRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  ctr?: number | null;
  date?: string | null;
  clicks?: number | null;
  position?: number | null;
  site_url?: string | null;
  impressions?: number | null;
  search_type?: string | null;
}

// gsc_search_analytics_by_device
export interface GscSearchAnalyticsByDeviceRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  ctr?: number | null;
  date?: string | null;
  clicks?: number | null;
  device?: string | null;
  position?: number | null;
  site_url?: string | null;
  impressions?: number | null;
  search_type?: string | null;
}

// gsc_search_analytics_by_page
export interface GscSearchAnalyticsByPageRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  ctr?: number | null;
  date?: string | null;
  page?: string | null;
  clicks?: number | null;
  position?: number | null;
  site_url?: string | null;
  impressions?: number | null;
  search_type?: string | null;
}

// gsc_search_analytics_by_query
export interface GscSearchAnalyticsByQueryRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  ctr?: number | null;
  date?: string | null;
  query?: string | null;
  clicks?: number | null;
  position?: number | null;
  site_url?: string | null;
  impressions?: number | null;
  search_type?: string | null;
}

// gsc_search_analytics_page_report
export interface GscSearchAnalyticsPageReportRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  ctr?: number | null;
  date?: string | null;
  page?: string | null;
  clicks?: number | null;
  device?: string | null;
  country?: string | null;
  position?: number | null;
  site_url?: string | null;
  impressions?: number | null;
  search_type?: string | null;
}

// gsc_search_analytics_site_report_by_page
export interface GscSearchAnalyticsSiteReportByPageRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  ctr?: number | null;
  date?: string | null;
  clicks?: number | null;
  device?: string | null;
  country?: string | null;
  position?: number | null;
  site_url?: string | null;
  impressions?: number | null;
  search_type?: string | null;
}

// gsc_search_analytics_site_report_by_site
export interface GscSearchAnalyticsSiteReportBySiteRow {
  _airbyte_raw_id: string;
  _airbyte_extracted_at: string;
  _airbyte_meta: any;
  _airbyte_generation_id?: number | null;
  ctr?: number | null;
  date?: string | null;
  clicks?: number | null;
  device?: string | null;
  country?: string | null;
  position?: number | null;
  site_url?: string | null;
  impressions?: number | null;
  search_type?: string | null;
}

// ============================================================================
// Utility Types
// ============================================================================

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

// Aggregated metrics (calculated in-app)
export interface CalculatedMetrics {
  aov: number; // Average Order Value = total_revenue / total_orders
  items_per_order: number; // total_items / total_orders
  cvr?: number; // Conversion Rate = (total_orders / total_sessions) * 100 (requires session data)
  returnRate?: number; // Return Rate = (total_returns / total_orders) * 100 (requires return data)
  blendedROAS?: number; // Return on Ad Spend = total_revenue / total_media_spend (requires ad spend data)
  cpa?: number; // Cost Per Acquisition = total_media_spend / total_orders (requires ad spend data)
}
