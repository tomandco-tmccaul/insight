# Insight Setup Guide

This guide will walk you through setting up the Insight eCommerce reporting dashboard from scratch.

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- npm or yarn package manager
- A Google Cloud account
- A Firebase account
- Access to client eCommerce data sources (Magento, GA4, etc.)

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `insight-dashboard` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

### 1.2 Enable Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Enable "Email/Password" provider
4. Enable "Google" provider
5. Add authorized domains if deploying to custom domain

### 1.3 Create Firestore Database

1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode"
4. Select a location (choose closest to your users)
5. Click "Enable"

### 1.4 Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click "Web" icon to add a web app
4. Register app with nickname "Insight Dashboard"
5. Copy the Firebase configuration object
6. Save these values for `.env.local`

### 1.5 Generate Service Account Key

1. Go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file securely
4. Extract the values for `.env.local`:
   - `project_id`
   - `client_email`
   - `private_key`

## Step 2: Google Cloud Setup

### 2.1 Enable BigQuery API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to "APIs & Services" > "Library"
4. Search for "BigQuery API"
5. Click "Enable"

### 2.2 Create BigQuery Dataset

1. Go to BigQuery in Cloud Console
2. Click your project name
3. Click "Create Dataset"
4. Dataset ID: `analytics` (or your preferred name)
5. Location: Choose same as Firestore
6. Click "Create dataset"

### 2.3 Enable Cloud Tasks API

1. Go to "APIs & Services" > "Library"
2. Search for "Cloud Tasks API"
3. Click "Enable"

### 2.4 Enable Cloud Run API

1. Search for "Cloud Run API"
2. Click "Enable"

## Step 3: Data Pipeline Setup

### 3.1 Install Airbyte

Follow [Airbyte installation guide](https://docs.airbyte.com/deploying-airbyte/local-deployment)

### 3.2 Configure Data Sources

For each client, set up Airbyte connections:

1. **Magento 2** (eCommerce platform)
   - Orders
   - Products
   - Customers

2. **Google Analytics 4**
   - Sessions
   - Events
   - Conversions

3. **Google Ads**
   - Campaigns
   - Ad Groups
   - Performance metrics

4. **Facebook Ads**
   - Campaigns
   - Ad Sets
   - Performance metrics

5. **Pinterest Ads**
   - Campaigns
   - Performance metrics

6. **Google Search Console**
   - Search queries
   - Page performance

### 3.3 Create BigQuery Scheduled Queries

Create scheduled queries to transform raw data into aggregated tables:

```sql
-- Example: agg_sales_overview_daily
CREATE OR REPLACE TABLE `project.analytics.agg_sales_overview_daily` AS
SELECT
  DATE(order_date) as date,
  website_id,
  SUM(grand_total) as total_sales,
  COUNT(DISTINCT order_id) as total_orders,
  -- Add more aggregations
FROM `project.analytics.raw_magento_orders`
GROUP BY date, website_id;
```

Schedule these queries to run hourly.

## Step 4: Application Setup

### 4.1 Clone Repository

```bash
git clone <repository-url>
cd tco-client-reports-augment
```

### 4.2 Install Dependencies

```bash
npm install
```

### 4.3 Configure Environment Variables

Create `.env.local` file:

```bash
cp .env.local.example .env.local
```

Fill in all required values from Steps 1 and 2.

### 4.4 Initialize Firestore Data

Create initial admin user in Firestore:

```javascript
// Run this in Firebase Console > Firestore > Add document
Collection: users
Document ID: <your-firebase-auth-uid>
Fields:
  uid: <your-firebase-auth-uid>
  email: "admin@tomandco.co.uk"
  role: "admin"
  clientId: null
```

Create a test client:

```javascript
Collection: clients
Document ID: "test_client"
Fields:
  id: "test_client"
  clientName: "Test Client"
```

### 4.5 Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

### 4.6 Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000 and log in with your admin account.

## Step 5: Production Deployment

### 5.1 Build Application

```bash
npm run build
```

### 5.2 Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

### 5.3 Set Up Cloud Run for Exports

1. Create a Cloud Run service for PDF/XLS generation
2. Configure Cloud Tasks queue
3. Update environment variables with service URLs

## Step 6: Client Onboarding

For each new client:

1. **Create Client in Firestore**
   - Add document to `/clients/{client_id}`

2. **Add Websites**
   - Add documents to `/clients/{client_id}/websites/{website_id}`

3. **Set Up Data Pipeline**
   - Configure Airbyte connections for client's data sources
   - Create BigQuery scheduled queries

4. **Create Client Users**
   - Add users to `/users/{user_id}` with `clientId` set

5. **Configure Targets** (optional)
   - Add performance targets to `/clients/{client_id}/targets/{target_id}`

6. **Add Custom Links** (optional)
   - Add resource links to `/clients/{client_id}/customLinks/{link_id}`

## Troubleshooting

### Authentication Issues

- Verify Firebase configuration in `.env.local`
- Check that authentication providers are enabled
- Ensure authorized domains are configured

### BigQuery Connection Issues

- Verify service account has BigQuery permissions
- Check that dataset ID matches `.env.local`
- Ensure BigQuery API is enabled

### Data Not Showing

- Verify Airbyte connections are running
- Check BigQuery scheduled queries are executing
- Confirm data exists in BigQuery tables

## Support

For issues or questions, contact the Tom&Co development team.

