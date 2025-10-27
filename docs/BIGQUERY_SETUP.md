# BigQuery Setup Guide

This guide walks you through setting up Google BigQuery for the Insight Dashboard with test data.

## Prerequisites

- Google Cloud Platform account
- `gcloud` CLI installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
- Billing enabled on your GCP project

## Option 1: Quick Setup (Recommended for Testing)

### Step 1: Set Up Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create insight-dashboard-dev --name="Insight Dashboard Dev"

# Set the project as default
gcloud config set project insight-dashboard-dev

# Enable required APIs
gcloud services enable bigquery.googleapis.com
gcloud services enable bigquerydatatransfer.googleapis.com
```

### Step 2: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create insight-bigquery \
  --display-name="Insight BigQuery Service Account"

# Grant BigQuery permissions
gcloud projects add-iam-policy-binding insight-dashboard-dev \
  --member="serviceAccount:insight-bigquery@insight-dashboard-dev.iam.gserviceaccount.com" \
  --role="roles/bigquery.admin"

# Create and download key
gcloud iam service-accounts keys create ./bigquery-key.json \
  --iam-account=insight-bigquery@insight-dashboard-dev.iam.gserviceaccount.com

# IMPORTANT: Add bigquery-key.json to .gitignore (already done)
```

### Step 3: Create BigQuery Dataset and Tables

```bash
# Create dataset
bq mk --location=US --dataset insight-dashboard-dev:insight_analytics

# Run the setup SQL script
bq query --use_legacy_sql=false < scripts/setup-bigquery.sql
```

### Step 4: Update Environment Variables

Update your `.env.local` file with real BigQuery credentials:

```bash
# Google Cloud
GOOGLE_CLOUD_PROJECT=insight-dashboard-dev
BIGQUERY_DATASET_ID=insight_analytics

# Path to service account key (for local development)
GOOGLE_APPLICATION_CREDENTIALS=./bigquery-key.json
```

For production (Firebase Hosting), you'll set these as environment variables in Firebase:

```bash
firebase functions:config:set \
  google.project_id="insight-dashboard-dev" \
  bigquery.dataset_id="insight_analytics"
```

### Step 5: Verify Setup

```bash
# List tables in dataset
bq ls insight-dashboard-dev:insight_analytics

# Query test data
bq query --use_legacy_sql=false \
  'SELECT COUNT(*) as row_count FROM `insight-dashboard-dev.insight_analytics.agg_sales_overview_daily`'
```

You should see:
- `agg_sales_overview_daily` - 180 rows (90 days × 2 websites)
- `agg_product_performance_daily` - 150 rows (30 days × 5 products)
- `agg_marketing_channel_daily` - 180 rows (30 days × 6 channels)
- `agg_website_behavior_daily` - 180 rows (30 days × 6 pages)

---

## Option 2: Manual Setup (BigQuery Console)

### Step 1: Create Dataset

1. Go to [BigQuery Console](https://console.cloud.google.com/bigquery)
2. Click your project name
3. Click "CREATE DATASET"
4. Dataset ID: `insight_analytics`
5. Location: `US (multiple regions in United States)`
6. Click "CREATE DATASET"

### Step 2: Create Tables

1. Click on the `insight_analytics` dataset
2. Click "CREATE TABLE"
3. For each table, use "Empty table" as source
4. Copy the schema from `scripts/setup-bigquery.sql`
5. Enable partitioning by `date` field
6. Enable clustering by `website_id` (and other fields as specified)

### Step 3: Insert Test Data

1. Click "COMPOSE NEW QUERY"
2. Copy the INSERT statements from `scripts/setup-bigquery.sql`
3. Run each INSERT statement separately
4. Verify data was inserted

---

## Table Schemas

### 1. `agg_sales_overview_daily`

Daily aggregated sales metrics per website.

| Field | Type | Description |
|-------|------|-------------|
| date | DATE | Date of the data |
| website_id | STRING | Website identifier (e.g., "sanderson_uk") |
| total_sales | FLOAT64 | Total sales revenue |
| total_orders | INT64 | Number of orders |
| total_sessions | INT64 | Website sessions |
| total_media_spend | FLOAT64 | Marketing spend |
| total_revenue | FLOAT64 | Total revenue |
| total_returns | INT64 | Number of returns |
| total_return_value | FLOAT64 | Value of returns |

**Partitioning**: By `date`  
**Clustering**: By `website_id`

### 2. `agg_product_performance_daily`

Daily product performance metrics.

| Field | Type | Description |
|-------|------|-------------|
| date | DATE | Date of the data |
| website_id | STRING | Website identifier |
| product_id | STRING | Product identifier |
| product_name | STRING | Product name |
| product_sku | STRING | Product SKU |
| category | STRING | Product category |
| quantity_sold | INT64 | Units sold |
| revenue | FLOAT64 | Revenue from product |
| stock_level | INT64 | Current stock level |
| return_count | INT64 | Number of returns |
| return_rate | FLOAT64 | Return rate (0-1) |

**Partitioning**: By `date`  
**Clustering**: By `website_id`, `product_id`

### 3. `agg_marketing_channel_daily`

Daily marketing channel performance.

| Field | Type | Description |
|-------|------|-------------|
| date | DATE | Date of the data |
| website_id | STRING | Website identifier |
| channel | STRING | Marketing channel (e.g., "google_ads") |
| campaign_name | STRING | Campaign name |
| spend | FLOAT64 | Marketing spend |
| sessions | INT64 | Sessions from channel |
| revenue | FLOAT64 | Revenue attributed |
| conversions | INT64 | Number of conversions |
| impressions | INT64 | Ad impressions |
| clicks | INT64 | Ad clicks |

**Partitioning**: By `date`  
**Clustering**: By `website_id`, `channel`

### 4. `agg_website_behavior_daily`

Daily website behavior metrics.

| Field | Type | Description |
|-------|------|-------------|
| date | DATE | Date of the data |
| website_id | STRING | Website identifier |
| page_path | STRING | Page URL path |
| page_title | STRING | Page title |
| sessions | INT64 | Sessions on page |
| pageviews | INT64 | Total pageviews |
| unique_pageviews | INT64 | Unique pageviews |
| avg_time_on_page | FLOAT64 | Average time (seconds) |
| bounce_rate | FLOAT64 | Bounce rate (0-1) |
| exit_rate | FLOAT64 | Exit rate (0-1) |
| entrances | INT64 | Number of entrances |
| exits | INT64 | Number of exits |

**Partitioning**: By `date`  
**Clustering**: By `website_id`

---

## Test Data Overview

The setup script generates realistic test data:

### Sales Data
- **Period**: Last 90 days
- **Websites**: sanderson_uk, harlequin
- **Pattern**: Weekly seasonality + growth trend
- **Metrics**: 
  - Sales: £15,000-£20,000/day
  - Orders: 80-110/day
  - Sessions: 2,000-2,800/day
  - Media Spend: £2,000-£2,500/day

### Product Data
- **Period**: Last 30 days
- **Products**: 5 products across both websites
- **Categories**: Wallpaper, Fabric, Paint
- **Metrics**: 10-30 units/day per product

### Marketing Data
- **Period**: Last 30 days
- **Channels**: Google Ads, Facebook Ads, Pinterest Ads, Organic
- **Campaigns**: Brand, Retargeting, Shopping, Awareness
- **Metrics**: Realistic ROAS and conversion rates

### Website Behavior
- **Period**: Last 30 days
- **Pages**: Home, Collections, Product pages
- **Metrics**: Sessions, pageviews, bounce rates

---

## Troubleshooting

### Error: "Permission denied"
- Ensure your service account has `roles/bigquery.admin` role
- Check that `GOOGLE_APPLICATION_CREDENTIALS` points to the correct key file

### Error: "Dataset not found"
- Verify dataset name matches `BIGQUERY_DATASET_ID` in `.env.local`
- Check that dataset exists in the correct project

### Error: "Table not found"
- Run the CREATE TABLE statements from `scripts/setup-bigquery.sql`
- Verify table names match the TypeScript interfaces

### No data returned
- Run the INSERT statements from `scripts/setup-bigquery.sql`
- Check date ranges in queries match the test data period

---

## Next Steps

After BigQuery is set up:

1. ✅ Test API routes with real data
2. ✅ Implement Sales Overview page
3. ✅ Implement Product Performance page
4. ✅ Implement Marketing Breakdown page
5. ✅ Implement Website Behaviour page

---

## Cost Considerations

BigQuery pricing:
- **Storage**: $0.02 per GB/month (first 10 GB free)
- **Queries**: $5 per TB processed (first 1 TB/month free)

With test data (~1 MB) and typical development queries, you'll stay well within the free tier.

For production:
- Use partitioning and clustering (already configured)
- Set up query result caching
- Monitor query costs in GCP Console

