# Airbyte Setup Guide

This guide explains how to configure Airbyte to load data into the Insight Dashboard's BigQuery datasets.

## Architecture Overview

Each client has their own BigQuery dataset for data isolation:

```
insight-dashboard-1761555293 (GCP Project)
├── sanderson_design_group (Dataset for Sanderson Design Group)
│   ├── Raw tables (loaded by Airbyte)
│   │   ├── raw_google_ads_sanderson_uk
│   │   ├── raw_google_ads_harlequin
│   │   ├── raw_facebook_ads_sanderson_uk
│   │   ├── raw_facebook_ads_harlequin
│   │   └── ... (other raw tables)
│   │
│   └── Aggregated tables (created by scheduled queries)
│       ├── agg_sales_overview_daily
│       ├── agg_product_performance_daily
│       ├── agg_marketing_channel_daily
│       └── agg_website_behavior_daily
│
└── client2_dataset (Dataset for another client)
    └── ... (same structure)
```

## BigQuery Configuration

### Project Details
- **Project ID:** `insight-dashboard-1761555293`
- **Location:** `europe-west2` (London)
- **Service Account:** `insight-service-account@insight-dashboard-1761555293.iam.gserviceaccount.com`
- **Service Account Key:** Located at `service-account-key.json` in project root

### Existing Datasets
- `sanderson_design_group` - Sanderson Design Group client data
- `insight_analytics` - Legacy shared dataset (to be deprecated)

### Service Account Permissions
The service account has the following roles:
- `roles/bigquery.admin` - Full BigQuery access
- `roles/datastore.user` - Firestore access
- `roles/firebase.admin` - Firebase admin access

## Airbyte Destination Configuration

### BigQuery Destination Settings

**Connection Name:** `Insight Dashboard - BigQuery`

**Authentication:**
- **Method:** Service Account Key Authentication
- **Service Account Key JSON:** Upload the `service-account-key.json` file
  - **IMPORTANT:** Make sure you're using the correct service account key
  - **Project ID in key should be:** `insight-dashboard-1761555293`
  - **Service Account Email:** `insight-service-account@insight-dashboard-1761555293.iam.gserviceaccount.com`

**Configuration:**
- **Project ID:** `insight-dashboard-1761555293`
- **Dataset Location:** `europe-west2`
- **Default Dataset ID:** `sanderson_design_group` (or the specific client's dataset)
- **Loading Method:** Standard Inserts (or GCS Staging for large volumes)
- **Transformation Query Run Type:** Interactive
- **Google BigQuery Client Chunk Size:** 15 MiB (default)

### Per-Client Dataset Configuration

When setting up connections for different clients, you'll need to:

1. **Create a new dataset for each client** (if not exists):
   ```bash
   bq mk --dataset \
     --location=europe-west2 \
     --description="[Client Name] analytics data" \
     insight-dashboard-1761555293:[client_dataset_id]
   ```

2. **Configure Airbyte connection** to use the client-specific dataset:
   - Set **Default Dataset ID** to the client's dataset (e.g., `sanderson_design_group`)
   - All tables for that client will be loaded into their dataset

## Source Connections

For each data source, configure Airbyte to load into the appropriate client dataset:

### Google Ads
- **Destination Dataset:** `[client_dataset_id]`
- **Table Naming:** `raw_google_ads_[website_id]`
- **Example:** `raw_google_ads_sanderson_uk`, `raw_google_ads_harlequin`

### Facebook Ads
- **Destination Dataset:** `[client_dataset_id]`
- **Table Naming:** `raw_facebook_ads_[website_id]`
- **Example:** `raw_facebook_ads_sanderson_uk`, `raw_facebook_ads_harlequin`

### Pinterest Ads
- **Destination Dataset:** `[client_dataset_id]`
- **Table Naming:** `raw_pinterest_ads_[website_id]`
- **Example:** `raw_pinterest_ads_sanderson_uk`, `raw_pinterest_ads_harlequin`

### Google Search Console
- **Destination Dataset:** `[client_dataset_id]`
- **Table Naming:** `raw_gsc_[website_id]`
- **Example:** `raw_gsc_sanderson_uk`, `raw_gsc_harlequin`

### Google Analytics 4
- **Destination Dataset:** `[client_dataset_id]`
- **Table Naming:** `raw_ga4_[website_id]`
- **Example:** `raw_ga4_sanderson_uk`, `raw_ga4_harlequin`

### Adobe Commerce (Magento)
- **Destination Dataset:** `[client_dataset_id]`
- **Table Naming:** `raw_magento_[website_id]`
- **Example:** `raw_magento_sanderson_uk`, `raw_magento_harlequin`

## Firestore Website Configuration

Each website in Firestore stores the BigQuery table names for reference:

```json
{
  "id": "sanderson_uk",
  "websiteName": "Sanderson UK",
  "bigQueryWebsiteId": "sanderson_uk",
  "adobeCommerceWebsiteId": "1",
  "bigQueryTables": {
    "googleAds": "raw_google_ads_sanderson_uk",
    "facebookAds": "raw_facebook_ads_sanderson_uk",
    "pinterestAds": "raw_pinterest_ads_sanderson_uk",
    "googleSearchConsole": "raw_gsc_sanderson_uk",
    "ga4": "raw_ga4_sanderson_uk",
    "adobeCommerce": "raw_magento_sanderson_uk"
  }
}
```

These table names should match what Airbyte creates in BigQuery.

## Troubleshooting

### Error: "Permission bigquery.datasets.get denied"

**Possible Causes:**
1. **Wrong service account key** - Check that the project ID in the key matches `insight-dashboard-1761555293`
2. **Dataset doesn't exist** - Create the dataset first using `bq mk`
3. **Wrong project ID** - Ensure you're using `insight-dashboard-1761555293` not a different project

**Solution:**
```bash
# Verify service account key project ID
cat service-account-key.json | jq -r '.project_id'
# Should output: insight-dashboard-1761555293

# List existing datasets
bq ls --project_id=insight-dashboard-1761555293

# Create missing dataset
bq mk --dataset --location=europe-west2 \
  --description="[Client Name] analytics data" \
  insight-dashboard-1761555293:[client_dataset_id]
```

### Error: "Dataset may not exist"

**Solution:** Create the dataset before configuring Airbyte:
```bash
bq mk --dataset --location=europe-west2 \
  --description="Sanderson Design Group analytics data" \
  insight-dashboard-1761555293:sanderson_design_group
```

### Verify Service Account Access

```bash
# Check service account roles
gcloud projects get-iam-policy insight-dashboard-1761555293 \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:insight-service-account@insight-dashboard-1761555293.iam.gserviceaccount.com"

# Should show:
# - roles/bigquery.admin
# - roles/datastore.user
# - roles/firebase.admin
```

## Next Steps

After configuring Airbyte:

1. **Test the connection** in Airbyte to verify BigQuery access
2. **Set up source connections** for each data source (Google Ads, Facebook Ads, etc.)
3. **Configure sync schedules** for each connection
4. **Create aggregation queries** to transform raw data into reporting tables
5. **Update the application** to query from client-specific datasets

## Important Notes

- ✅ All datasets must be in `europe-west2` for GDPR compliance
- ✅ Each client has their own isolated dataset
- ✅ Raw table names include the website ID for multi-website clients
- ✅ The service account has full BigQuery admin access
- ✅ Table names in Firestore should match Airbyte table names exactly

