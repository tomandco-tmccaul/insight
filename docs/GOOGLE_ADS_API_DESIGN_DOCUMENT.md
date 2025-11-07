# Insight - eCommerce Analytics Dashboard
## Design Documentation for Google Ads API Integration

**Application Name:** Insight - Multi-Tenant eCommerce Reporting Dashboard  
**Developer:** Tom&Co  
**Website:** https://tomandco.co.uk  
**Document Version:** 1.0  
**Date:** October 29, 2025

---

## 1. Executive Summary

Insight is a comprehensive SaaS analytics platform designed to provide eCommerce businesses with unified reporting across multiple data sources. The platform aggregates data from Adobe Commerce (Magento), Google Analytics 4, Google Ads, and other marketing channels to deliver actionable insights through an intuitive dashboard interface.

**Purpose of Google Ads API Integration:**  
To retrieve advertising performance data (campaigns, ad groups, keywords, conversions, costs) for our clients' Google Ads accounts and display this data alongside their eCommerce sales data, enabling comprehensive ROI analysis and marketing attribution.

---

## 2. Application Overview

### 2.1 What is Insight?

Insight is a multi-tenant web application that serves as a centralized analytics hub for eCommerce businesses. It provides:

- **Real-time Performance Dashboards** - Sales, revenue, orders, and customer metrics
- **Product Analytics** - Top-performing products, inventory insights, pricing analysis
- **Marketing Attribution** - Channel performance, ROAS, CPA, conversion tracking
- **Website Behavior Analysis** - Traffic sources, user journeys, conversion funnels
- **AI-Powered Insights** - Natural language queries and automated recommendations
- **Custom Annotations** - Event tracking and performance context
- **Multi-Store Support** - Consolidated reporting across multiple websites/brands

### 2.2 Target Users

- **Primary Users:** eCommerce business owners and marketing managers
- **Secondary Users:** Digital marketing agencies managing multiple client accounts
- **Admin Users:** Tom&Co team members providing analytics services

### 2.3 Technology Stack

- **Frontend:** Next.js 14+ (React), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Firebase Cloud Functions
- **Authentication:** Firebase Authentication (Email/Password, Google OAuth)
- **Database:** Firebase Firestore (application data), Google BigQuery (analytics data)
- **AI/ML:** Google Gemini 2.5 Flash via Genkit
- **Hosting:** Firebase App Hosting
- **Data Pipeline:** Airbyte → BigQuery → Application

---

## 3. Google Ads API Integration Design

### 3.1 Why We Need Google Ads API Access

Our clients invest significant budgets in Google Ads advertising. To provide comprehensive marketing analytics, we need to:

1. **Retrieve Campaign Performance Data**
   - Campaign names, IDs, status, budget
   - Impressions, clicks, CTR, average CPC
   - Conversions, conversion value, cost per conversion
   - Quality scores, ad positions

2. **Analyze Ad Group & Keyword Performance**
   - Ad group metrics and performance
   - Keyword-level data (search terms, match types, bids)
   - Negative keyword recommendations

3. **Calculate Marketing ROI**
   - Blend Google Ads spend with eCommerce revenue
   - Calculate ROAS (Return on Ad Spend)
   - Attribute conversions to specific campaigns
   - Compare channel performance (Google Ads vs. Facebook Ads vs. Organic)

4. **Provide Actionable Insights**
   - Identify underperforming campaigns
   - Recommend budget reallocation
   - Highlight high-performing keywords
   - AI-powered optimization suggestions

### 3.2 Data Flow Architecture

```
┌─────────────────────┐
│  Client's Google    │
│   Ads Account       │
└──────────┬──────────┘
           │
           │ OAuth 2.0 Authorization
           │ (User grants access)
           ▼
┌─────────────────────┐
│  Insight Platform   │
│  (Our Application)  │
└──────────┬──────────┘
           │
           │ Google Ads API Requests
           │ (Read-only access)
           ▼
┌─────────────────────┐
│   Google Ads API    │
│   (Google Service)  │
└──────────┬──────────┘
           │
           │ Campaign, Ad Group, Keyword Data
           │ Performance Metrics, Conversion Data
           ▼
┌─────────────────────┐
│   Google BigQuery   │
│  (Data Warehouse)   │
└──────────┬──────────┘
           │
           │ Aggregated Daily/Hourly Data
           │
           ▼
┌─────────────────────┐
│  Insight Dashboard  │
│   (User Interface)  │
└─────────────────────┘
```

### 3.3 OAuth 2.0 Authorization Flow

We implement the standard OAuth 2.0 flow to ensure secure, user-authorized access:

1. **User Initiates Connection**
   - Client logs into Insight dashboard
   - Navigates to "Integrations" or "Marketing Channels" settings
   - Clicks "Connect Google Ads Account"

2. **Authorization Request**
   - Application redirects user to Google OAuth consent screen
   - User sees requested permissions (read-only access to Google Ads data)
   - User grants permission

3. **Token Exchange**
   - Google redirects back to our application with authorization code
   - Application exchanges code for access token and refresh token
   - Tokens are securely stored in Firebase Firestore (encrypted)

4. **Data Retrieval**
   - Application uses access token to make Google Ads API requests
   - Refresh token is used to obtain new access tokens when expired
   - All API calls are logged for audit purposes

### 3.4 Data Storage and Security

**Storage Location:**
- **Access Tokens:** Encrypted in Firebase Firestore under `/clients/{clientId}/integrations/google_ads`
- **Raw API Responses:** Temporarily cached in memory during processing
- **Aggregated Data:** Stored in BigQuery tables with client-scoped access control

**Security Measures:**
- All tokens encrypted at rest using Firebase's built-in encryption
- Access tokens never exposed to client-side JavaScript
- API calls made exclusively from server-side Next.js API routes
- Rate limiting implemented to prevent abuse
- Audit logs maintained for all API requests
- Multi-factor authentication required for admin users

**Data Retention:**
- Access tokens: Retained until user disconnects integration
- Historical performance data: Retained for 24 months
- Aggregated metrics: Retained indefinitely for trend analysis

---

## 4. User Interface Design

### 4.1 Marketing Dashboard Page

The "Digital Marketing Breakdown" page displays Google Ads data alongside other marketing channels:

**Key Sections:**

1. **Channel Overview Cards**
   - Total Spend (all channels)
   - Total Revenue (attributed)
   - Blended ROAS
   - Total Conversions

2. **Google Ads Performance Summary**
   - Campaign count (active/paused)
   - Total impressions
   - Total clicks
   - Average CPC
   - Conversion rate
   - Cost per acquisition (CPA)

3. **Campaign Performance Table**
   - Campaign name
   - Status (Active/Paused/Ended)
   - Budget
   - Spend
   - Impressions
   - Clicks
   - CTR
   - Conversions
   - ROAS
   - Actions (View details, Edit in Google Ads)

4. **Trend Charts**
   - Daily spend vs. revenue
   - Click-through rate over time
   - Conversion rate trends
   - ROAS by campaign

5. **AI Insights Panel**
   - Automated recommendations (e.g., "Campaign X has 3x higher ROAS - consider increasing budget")
   - Anomaly detection (e.g., "Unusual spike in CPC detected on Oct 15")
   - Optimization suggestions

### 4.2 Integration Settings Page

Located in Admin → Integrations:

**Features:**
- List of connected Google Ads accounts
- Connection status (Active/Disconnected/Error)
- Last sync timestamp
- "Connect New Account" button
- "Disconnect" button with confirmation
- Sync frequency settings (Hourly/Daily)
- Data range selector (Last 30/60/90 days)

### 4.3 User Workflow Example

**Scenario:** Marketing manager wants to analyze Google Ads performance

1. User logs into Insight dashboard
2. Selects client from dropdown (if admin) or sees their own data (if client user)
3. Navigates to "Digital Marketing Breakdown" page
4. Views Google Ads summary cards showing key metrics
5. Scrolls to campaign performance table
6. Clicks on a specific campaign to see ad group breakdown
7. Uses AI chat to ask: "Which campaigns have the best ROAS?"
8. AI responds with ranked list and recommendations
9. User exports report as PDF for stakeholder presentation

---

## 5. API Usage Specifications

### 5.1 Google Ads API Endpoints Used

We will primarily use the following Google Ads API services:

1. **GoogleAdsService.SearchStream**
   - Retrieve campaign, ad group, and keyword data
   - Query performance metrics
   - Filter by date ranges

2. **CustomerService.ListAccessibleCustomers**
   - List all Google Ads accounts the user has access to
   - Allow multi-account selection

3. **CampaignService.GetCampaign**
   - Fetch detailed campaign information
   - Retrieve budget and bidding strategy details

4. **AdGroupService.GetAdGroup**
   - Fetch ad group details
   - Retrieve targeting settings

### 5.2 Data Fields Retrieved

**Campaign Level:**
- `campaign.id`
- `campaign.name`
- `campaign.status`
- `campaign.advertising_channel_type`
- `campaign_budget.amount_micros`
- `metrics.impressions`
- `metrics.clicks`
- `metrics.cost_micros`
- `metrics.conversions`
- `metrics.conversions_value`
- `metrics.average_cpc`
- `metrics.ctr`

**Ad Group Level:**
- `ad_group.id`
- `ad_group.name`
- `ad_group.status`
- `metrics.impressions`
- `metrics.clicks`
- `metrics.cost_micros`
- `metrics.conversions`

**Keyword Level:**
- `ad_group_criterion.keyword.text`
- `ad_group_criterion.keyword.match_type`
- `metrics.impressions`
- `metrics.clicks`
- `metrics.cost_micros`
- `metrics.quality_score`

### 5.3 API Request Frequency

- **Initial Sync:** Full historical data pull (last 90 days) when account is first connected
- **Incremental Sync:** Daily updates at 2:00 AM UTC via scheduled Cloud Function
- **Real-time Queries:** On-demand refresh when user clicks "Refresh Data" (max once per hour)
- **Rate Limiting:** Maximum 1,000 requests per day per client account

### 5.4 Error Handling

- **Token Expiration:** Automatic refresh using refresh token
- **API Quota Exceeded:** Queue requests and retry with exponential backoff
- **Account Access Revoked:** Notify user via email and dashboard alert
- **Network Errors:** Retry up to 3 times with 5-second intervals
- **Invalid Queries:** Log error and display user-friendly message

---

## 6. Compliance and Privacy

### 6.1 Data Privacy

- **GDPR Compliance:** Users can request data deletion at any time
- **Data Minimization:** We only request and store necessary data fields
- **User Consent:** Explicit consent obtained before connecting Google Ads account
- **Transparency:** Privacy policy clearly explains data usage

### 6.2 Google Ads API Policies

We commit to:
- Using data solely for providing analytics services to account owners
- Not sharing Google Ads data with third parties
- Not using data for competitive analysis or benchmarking without consent
- Respecting user privacy and data protection regulations
- Maintaining secure storage and transmission of all data

### 6.3 User Control

Users can:
- Disconnect their Google Ads account at any time
- Delete all stored Google Ads data
- Control which team members can view Google Ads data
- Export their data in standard formats (CSV, PDF)

---

## 7. Benefits to Users

### 7.1 Unified Reporting

Instead of logging into multiple platforms (Adobe Commerce, Google Analytics, Google Ads, Facebook Ads), users access all metrics in one dashboard.

### 7.2 Advanced Attribution

By combining Google Ads data with eCommerce transaction data, we provide:
- Multi-touch attribution modeling
- Customer lifetime value by acquisition channel
- True ROAS calculations (not just Google's conversion tracking)

### 7.3 AI-Powered Insights

Our Gemini-powered AI assistant can:
- Answer natural language questions about Google Ads performance
- Identify optimization opportunities
- Predict campaign performance trends
- Generate automated reports

### 7.4 Time Savings

Automated data aggregation and reporting saves users 10+ hours per week compared to manual reporting.

---

## 8. Conclusion

The Google Ads API integration is a critical component of Insight's mission to provide comprehensive, actionable eCommerce analytics. By securely accessing our clients' Google Ads data with their explicit consent, we enable them to make data-driven marketing decisions, optimize ad spend, and maximize return on investment.

We are committed to maintaining the highest standards of data security, privacy, and compliance with Google's API policies.

---

**Contact Information:**

**Company:** Tom&Co  
**Developer Name:** Tom McCaul  
**Email:** tom@tomandco.co.uk  
**Website:** https://tomandco.co.uk  
**Application URL:** https://insight.tomandco.co.uk (production)

---

*This document is confidential and intended solely for Google's review as part of the Google Ads API access application process.*

