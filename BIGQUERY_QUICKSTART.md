# BigQuery Quick Start Guide

This guide will help you set up Google BigQuery with test data in under 10 minutes.

## 🎯 What You'll Get

After completing this setup, you'll have:
- ✅ BigQuery dataset with 4 aggregated tables
- ✅ 90 days of realistic eCommerce test data
- ✅ Data for 2 websites (Sanderson UK, Harlequin)
- ✅ Sales, product, marketing, and website behavior metrics
- ✅ Working API endpoints that return real data

---

## 📋 Prerequisites

1. **Google Cloud Account** - [Sign up here](https://cloud.google.com/free) (includes $300 free credit)
2. **gcloud CLI** - [Install guide](https://cloud.google.com/sdk/docs/install)
3. **Billing enabled** - Required for BigQuery (but you'll stay in free tier)

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Login to Google Cloud

```bash
gcloud auth login
```

This will open your browser to authenticate.

### Step 2: Create Project and Enable APIs

```bash
# Create a new project
gcloud projects create insight-dashboard-dev --name="Insight Dashboard Dev"

# Set as default project
gcloud config set project insight-dashboard-dev

# Enable BigQuery API
gcloud services enable bigquery.googleapis.com
```

**Note:** Replace `insight-dashboard-dev` with your preferred project ID (must be globally unique).

### Step 3: Create Service Account and Download Key

```bash
# Create service account
gcloud iam service-accounts create insight-bigquery \
  --display-name="Insight BigQuery Service Account"

# Grant BigQuery Admin role
gcloud projects add-iam-policy-binding insight-dashboard-dev \
  --member="serviceAccount:insight-bigquery@insight-dashboard-dev.iam.gserviceaccount.com" \
  --role="roles/bigquery.admin"

# Create and download key
gcloud iam service-accounts keys create ./bigquery-key.json \
  --iam-account=insight-bigquery@insight-dashboard-dev.iam.gserviceaccount.com
```

**Important:** The `bigquery-key.json` file is already in `.gitignore` - never commit it!

### Step 4: Update Environment Variables

Create a new `.env.local.bigquery` file (or update your existing `.env.local`):

```bash
# Copy the emulator config
cp .env.local .env.local.emulator

# Create new config for BigQuery
cat > .env.local << 'EOF'
# Firebase Client (NEXT_PUBLIC_*)
NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Use Firebase Emulators for Auth/Firestore
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true

# Firebase Admin (Server-side)
FIREBASE_PROJECT_ID=demo-project
FIREBASE_CLIENT_EMAIL=demo@demo-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W8jW6hYvPkNv\nDemo Key For Emulator Only\n-----END PRIVATE KEY-----\n"

# Google Cloud - REAL CREDENTIALS FOR BIGQUERY
GOOGLE_CLOUD_PROJECT=insight-dashboard-dev
BIGQUERY_DATASET_ID=insight_analytics
GOOGLE_APPLICATION_CREDENTIALS=./bigquery-key.json

# Genkit AI (optional)
GOOGLE_GENAI_API_KEY=demo-key
EOF
```

**Important:** Replace `insight-dashboard-dev` with your actual project ID.

### Step 5: Run Setup Script

```bash
# Run the automated setup script
npm run setup:bigquery
```

This script will:
1. ✅ Create the `insight_analytics` dataset
2. ✅ Create 4 tables with proper schemas
3. ✅ Insert test data (90 days for sales, 30 days for others)
4. ✅ Verify everything is working

**Expected output:**
```
🚀 Starting BigQuery Setup...

✅ Project ID: insight-dashboard-dev
✅ Dataset ID: insight_analytics
✅ Key File: ./bigquery-key.json

📁 Creating dataset...
   ✅ Created dataset: insight_analytics

📋 Creating tables...
   ✅ Created table: agg_sales_overview_daily
   ✅ Created table: agg_product_performance_daily
   ✅ Created table: agg_marketing_channel_daily
   ✅ Created table: agg_website_behavior_daily
   ✅ All tables created

📊 Inserting test data...
   This may take a minute...

   ✅ Inserted data into: agg_sales_overview_daily
   ✅ Inserted data into: agg_product_performance_daily
   ✅ Inserted data into: agg_marketing_channel_daily
   ✅ Inserted data into: agg_website_behavior_daily

   ✅ Test data inserted

✅ BigQuery setup complete!
```

---

## ✅ Verify Setup

### Option 1: Using BigQuery Console

1. Go to [BigQuery Console](https://console.cloud.google.com/bigquery)
2. Select your project
3. Expand `insight_analytics` dataset
4. You should see 4 tables
5. Click on `agg_sales_overview_daily` and click "Preview"
6. You should see 180 rows of data

### Option 2: Using gcloud CLI

```bash
# List tables
bq ls insight-dashboard-dev:insight_analytics

# Count rows in sales table
bq query --use_legacy_sql=false \
  'SELECT COUNT(*) as row_count FROM `insight-dashboard-dev.insight_analytics.agg_sales_overview_daily`'

# View sample data
bq query --use_legacy_sql=false \
  'SELECT * FROM `insight-dashboard-dev.insight_analytics.agg_sales_overview_daily` LIMIT 5'
```

### Option 3: Test the API

```bash
# Restart your dev server
npm run dev

# In another terminal, test the API
curl http://localhost:3000/api/sales/overview
```

You should see JSON data with sales metrics!

---

## 🎉 You're Done!

Your BigQuery setup is complete! Now you can:

1. **Test the Sales Overview page** - Visit http://localhost:3000
2. **View real data** - All KPIs and charts will show actual data
3. **Build more features** - Product, Marketing, and Website pages

---

## 📊 What Data Was Created?

### Sales Overview Data
- **180 rows** (90 days × 2 websites)
- **Websites:** sanderson_uk, harlequin
- **Metrics:** Sales, orders, sessions, media spend, revenue, returns
- **Pattern:** Weekly seasonality + growth trend

### Product Performance Data
- **150 rows** (30 days × 5 products)
- **Products:** Wallpaper, Fabric, Paint
- **Metrics:** Quantity sold, revenue, stock levels, returns

### Marketing Channel Data
- **180 rows** (30 days × 6 channels)
- **Channels:** Google Ads, Facebook Ads, Pinterest Ads, Organic
- **Metrics:** Spend, sessions, revenue, conversions, impressions, clicks

### Website Behavior Data
- **180 rows** (30 days × 6 pages)
- **Pages:** Home, Collections, Product pages
- **Metrics:** Sessions, pageviews, bounce rate, time on page

---

## 🔄 Switching Between Emulator and BigQuery

### Use Emulators Only (No BigQuery)
```bash
cp .env.local.emulator .env.local
npm run dev
```

### Use Emulators + BigQuery
```bash
# Your current .env.local should have both
npm run dev
```

### Use Production Firebase + BigQuery
Update `.env.local` with real Firebase credentials (not covered here).

---

## 💰 Cost Estimate

With this test data setup:
- **Storage:** ~1 MB = $0.00002/month (FREE - under 10 GB free tier)
- **Queries:** ~10 MB processed/day = FREE (under 1 TB/month free tier)

**You'll stay completely within the free tier during development!**

---

## 🐛 Troubleshooting

### Error: "Project not found"
```bash
# Verify project exists
gcloud projects list

# Set correct project
gcloud config set project YOUR_PROJECT_ID
```

### Error: "Permission denied"
```bash
# Verify service account has correct role
gcloud projects get-iam-policy insight-dashboard-dev \
  --flatten="bindings[].members" \
  --filter="bindings.members:insight-bigquery@*"
```

### Error: "Key file not found"
```bash
# Verify key file exists
ls -la bigquery-key.json

# If missing, recreate it
gcloud iam service-accounts keys create ./bigquery-key.json \
  --iam-account=insight-bigquery@insight-dashboard-dev.iam.gserviceaccount.com
```

### Error: "Dataset not found"
```bash
# Manually create dataset
bq mk --location=US --dataset insight-dashboard-dev:insight_analytics
```

### No data in tables
```bash
# Re-run the setup script
npm run setup:bigquery
```

---

## 📚 Next Steps

1. ✅ **Test Sales Overview** - Visit http://localhost:3000
2. ✅ **Implement Product Page** - Connect to BigQuery data
3. ✅ **Implement Marketing Page** - Show channel performance
4. ✅ **Implement Website Page** - Display behavior metrics
5. ✅ **Add more test data** - Customize for your needs

---

## 📖 Additional Resources

- [BigQuery Documentation](https://cloud.google.com/bigquery/docs)
- [BigQuery Pricing](https://cloud.google.com/bigquery/pricing)
- [Full Setup Guide](./docs/BIGQUERY_SETUP.md)
- [Database Schema](./docs/database-schema.md)

---

**Need help?** Check the [full setup guide](./docs/BIGQUERY_SETUP.md) for more details.

