# Google Ads API Access Application - Complete Checklist

This document helps you prepare and submit your Google Ads API access application.

## Application URL
https://developers.google.com/google-ads/api/docs/access-levels

## Required Information

### 1. Basic Information
- [x] **Application Name:** Insight - Multi-Tenant eCommerce Reporting Dashboard
- [x] **Developer Name:** Tom McCaul
- [x] **Company Name:** Tom&Co
- [x] **Email:** tom@tomandco.co.uk
- [x] **Website:** https://tomandco.co.uk
- [ ] **Application URL:** https://insight.tomandco.co.uk (update when deployed)

### 2. OAuth 2.0 Client ID
- [ ] Create OAuth 2.0 credentials in Google Cloud Console
- [ ] Add authorized redirect URIs:
  - `https://insight.tomandco.co.uk/api/auth/google-ads/callback`
  - `http://localhost:3000/api/auth/google-ads/callback` (for testing)
- [ ] Copy Client ID and Client Secret
- [ ] Add to environment variables

**How to create:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: "Web application"
4. Add authorized redirect URIs
5. Save and copy credentials

### 3. Developer Token
- [ ] Apply for developer token at https://ads.google.com/aw/apicenter
- [ ] Wait for approval (can take 24-48 hours)
- [ ] Add to environment variables

### 4. API Access Level

You need to apply for **Standard Access** (not Basic Access) because:
- You're building a multi-tenant application
- You'll access multiple client accounts
- You need production-level quota

### 5. Use Case Description

**Template Answer:**

"Insight is a SaaS eCommerce analytics platform that provides unified reporting for online retailers. We aggregate data from multiple sources (Adobe Commerce, Google Analytics, Google Ads, Facebook Ads) into a single dashboard.

We need Google Ads API access to retrieve campaign performance data (impressions, clicks, conversions, costs) for our clients' Google Ads accounts. This data is combined with their eCommerce transaction data to calculate true ROAS, multi-touch attribution, and provide AI-powered optimization recommendations.

Our clients explicitly authorize access to their Google Ads accounts via OAuth 2.0. We only access accounts they own or manage, and we use the data solely to provide analytics services to them. Data is stored securely in Google BigQuery and displayed in our dashboard alongside other marketing metrics."

### 6. Data Usage Description

**Template Answer:**

"We retrieve the following data from the Google Ads API:

**Campaign Level:**
- Campaign names, IDs, status, budgets
- Performance metrics: impressions, clicks, CTR, CPC, conversions, conversion value, cost

**Ad Group Level:**
- Ad group names, IDs, status
- Performance metrics: impressions, clicks, cost, conversions

**Keyword Level:**
- Keyword text, match type, quality score
- Performance metrics: impressions, clicks, cost

**Data Flow:**
1. User authorizes access via OAuth 2.0
2. We make daily API calls to retrieve previous day's performance data
3. Data is stored in Google BigQuery (encrypted at rest)
4. Aggregated metrics are displayed in our dashboard
5. Users can export reports as PDF/CSV

**Data Retention:**
- Access tokens: Until user disconnects integration
- Performance data: 24 months for trend analysis
- Aggregated metrics: Indefinitely

**Security:**
- All tokens encrypted in Firebase Firestore
- API calls made server-side only (never client-side)
- Multi-factor authentication for admin users
- Regular security audits
- GDPR compliant with data deletion on request"

### 7. Design Documentation ✅

- [x] Created: `docs/GOOGLE_ADS_API_DESIGN_DOCUMENT.md`
- [ ] Convert to PDF or DOCX (see `docs/CONVERSION_INSTRUCTIONS.md`)
- [ ] Add screenshots (see `docs/screenshots/README.md`)
- [ ] Add diagrams (optional but recommended)
- [ ] Review for accuracy and completeness
- [ ] Ensure file size is under 10MB

### 8. Privacy Policy URL

- [ ] Create privacy policy page on your website
- [ ] Include sections on:
  - What data you collect
  - How you use Google Ads data
  - How users can revoke access
  - Data retention and deletion
  - GDPR compliance
- [ ] Publish at: https://tomandco.co.uk/privacy or https://insight.tomandco.co.uk/privacy
- [ ] Add URL to application

**Template Privacy Policy Section for Google Ads:**

```
## Google Ads Integration

When you connect your Google Ads account to Insight, we access the following data:
- Campaign, ad group, and keyword performance metrics
- Advertising costs and conversion data
- Account structure and settings

We use this data solely to:
- Display your advertising performance in our dashboard
- Calculate return on ad spend (ROAS) and other marketing metrics
- Provide AI-powered optimization recommendations

You can disconnect your Google Ads account at any time from the Integrations page. Upon disconnection, we will delete all stored Google Ads data within 30 days.

We do not share your Google Ads data with third parties. We comply with Google's API Services User Data Policy.
```

### 9. Terms of Service URL

- [ ] Create terms of service page
- [ ] Include sections on:
  - Service description
  - User responsibilities
  - Data usage and privacy
  - Limitation of liability
  - Termination
- [ ] Publish at: https://tomandco.co.uk/terms or https://insight.tomandco.co.uk/terms
- [ ] Add URL to application

### 10. Compliance with Google Ads API Policies

Review and confirm compliance with:
- [ ] **Limited Use Requirements:** Only use data for providing services to the user
- [ ] **No Unauthorized Access:** Only access accounts user has authorized
- [ ] **No Data Sharing:** Don't share Google Ads data with third parties without consent
- [ ] **Secure Storage:** Encrypt tokens and data at rest and in transit
- [ ] **User Control:** Allow users to disconnect and delete data
- [ ] **Transparency:** Clearly explain data usage in privacy policy

Policy URL: https://developers.google.com/google-ads/api/docs/api-access-policy

## Application Submission Steps

### Step 1: Prepare Documents
1. Convert design document to PDF/DOCX
2. Add screenshots to the document
3. Create privacy policy page
4. Create terms of service page

### Step 2: Set Up Google Cloud Project
1. Create or select a Google Cloud project
2. Enable Google Ads API
3. Create OAuth 2.0 credentials
4. Apply for developer token

### Step 3: Submit Application
1. Go to https://developers.google.com/google-ads/api/docs/access-levels
2. Click "Apply for Standard Access"
3. Fill in all required fields
4. Upload design documentation
5. Submit application

### Step 4: Wait for Review
- Google typically reviews applications within 3-5 business days
- You may receive follow-up questions
- Be prepared to provide additional information or clarification

### Step 5: After Approval
1. Update environment variables with approved credentials
2. Implement OAuth flow in application
3. Test with a test Google Ads account
4. Deploy to production
5. Monitor API usage and quota

## Common Rejection Reasons (and How to Avoid Them)

1. **Insufficient Documentation**
   - ✅ We've created comprehensive design documentation
   - ✅ Include screenshots and diagrams

2. **Unclear Use Case**
   - ✅ Clearly explain you're building an analytics dashboard
   - ✅ Explain how Google Ads data fits into the bigger picture

3. **Privacy Concerns**
   - ✅ Create detailed privacy policy
   - ✅ Explain data security measures
   - ✅ Show user control over data

4. **Incomplete OAuth Implementation**
   - ⚠️ Implement OAuth flow before applying (or show detailed mockups)
   - ⚠️ Test with Google's OAuth playground

5. **Vague Data Usage**
   - ✅ Specifically list which API endpoints and data fields you'll use
   - ✅ Explain why you need each piece of data

## Tips for Success

1. **Be Specific:** Don't say "we need campaign data" - say "we need campaign.name, campaign.status, metrics.impressions, metrics.clicks, metrics.cost_micros"

2. **Show, Don't Tell:** Include screenshots and diagrams showing exactly where Google Ads data will appear

3. **Emphasize User Benefit:** Focus on how this helps your users make better marketing decisions

4. **Demonstrate Security:** Show you take data security seriously with encryption, access controls, etc.

5. **Be Professional:** Use proper grammar, formatting, and professional language throughout

6. **Follow Up:** If you don't hear back in 5 business days, follow up politely

## Contact for Questions

If you have questions during the application process:
- **Google Ads API Forum:** https://groups.google.com/g/adwords-api
- **Google Ads API Support:** https://developers.google.com/google-ads/api/support

## After Approval

Once approved, you'll need to:
1. Implement the OAuth flow (see `lib/auth/google-ads-oauth.ts` - to be created)
2. Create API client wrapper (see `lib/google-ads/client.ts` - to be created)
3. Build data sync pipeline (see `app/api/integrations/google-ads/sync/route.ts` - to be created)
4. Create UI for connecting accounts (see `app/(dashboard)/admin/integrations/page.tsx` - to be created)
5. Add Google Ads data to marketing dashboard (update `app/(dashboard)/marketing/page.tsx`)

Would you like me to start implementing any of these components?

---

**Good luck with your application! 🚀**

