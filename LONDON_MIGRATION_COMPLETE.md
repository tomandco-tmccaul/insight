# 🇬🇧 London Migration Complete!

**Date:** October 27, 2025  
**Project ID:** `insight-dashboard-1761555293`

---

## ✅ Migration Summary

Successfully migrated **all infrastructure** from US to **London (europe-west2)**:

### **1. Firestore Database** ✅
- **Previous Location:** us-central1 (Iowa, USA)
- **New Location:** europe-west2 (London, UK)
- **Status:** Active and ready
- **Free Tier:** Enabled
- **Security Rules:** Deployed

### **2. BigQuery Dataset** ✅
- **Previous Location:** US (multi-region)
- **New Location:** europe-west2 (London, UK)
- **Dataset ID:** `insight_analytics`
- **Tables:** 4 tables created
- **Test Data:** 690 rows inserted

### **3. Gemini API Key** ✅
- **API Key:** `AIzaSyBHXHoo2MkU-aR1O3MDthM5syxR4wP-C9w`
- **Services Enabled:** 
  - Generative Language API
  - AI Platform API
- **Added to:** `.env.local`

---

## 📊 BigQuery Data Verification

All test data successfully inserted in London:

| Table | Rows | Status |
|-------|------|--------|
| `agg_sales_overview_daily` | 180 | ✅ |
| `agg_product_performance_daily` | 150 | ✅ |
| `agg_marketing_channel_daily` | 180 | ✅ |
| `agg_website_behavior_daily` | 180 | ✅ |
| **Total** | **690** | ✅ |

---

## 🔧 Configuration Updates

### **Files Modified:**

#### **1. `.env.local`**
- Updated with production Firebase credentials
- Added `BIGQUERY_LOCATION=europe-west2`
- Added Gemini API key
- Set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false`

#### **2. `scripts/setup-bigquery.ts`**
- Added `BIGQUERY_LOCATION` environment variable
- Changed hardcoded 'US' to use `BIGQUERY_LOCATION`
- Now supports configurable location

#### **3. `lib/bigquery/client.ts`**
- Added `BIGQUERY_LOCATION` export
- Updated `queryBigQuery` to use `BIGQUERY_LOCATION`
- Changed from hardcoded 'US' to environment variable

#### **4. `.firebaserc`**
- Updated default project to `insight-dashboard-1761555293`

---

## 🌍 Location Verification

```bash
# Firestore Location
$ gcloud firestore databases describe --database="(default)" \
  --project=insight-dashboard-1761555293 --format="value(locationId)"
europe-west2 ✅

# BigQuery Location
$ bq show insight-dashboard-1761555293:insight_analytics
location: europe-west2 ✅
```

---

## 📝 Environment Variables

Your `.env.local` now contains:

```bash
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCkkB5Fcq51g1lmvoP0vgJLvVFJBEsS4A0
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=insight-dashboard-1761555293.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=insight-dashboard-1761555293
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=insight-dashboard-1761555293.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=292720819141
NEXT_PUBLIC_FIREBASE_APP_ID=1:292720819141:web:13a548b1595558cffa29ac

# Use Production Firebase
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false

# Firebase Admin
FIREBASE_PROJECT_ID=insight-dashboard-1761555293
FIREBASE_CLIENT_EMAIL=insight-service-account@insight-dashboard-1761555293.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=[Service Account Key]

# Google Cloud - London Region
GOOGLE_CLOUD_PROJECT=insight-dashboard-1761555293
BIGQUERY_DATASET_ID=insight_analytics
BIGQUERY_LOCATION=europe-west2
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json

# Gemini AI
GOOGLE_GENAI_API_KEY=AIzaSyBHXHoo2MkU-aR1O3MDthM5syxR4wP-C9w
```

---

## 🚀 Next Steps

### **1. Start Development Server**
```bash
npm run dev
```

### **2. Create Admin User**
1. Visit http://localhost:3000
2. Sign up with your email
3. Go to [Firestore Console](https://console.firebase.google.com/project/insight-dashboard-1761555293/firestore)
4. Find your user in `users` collection
5. Edit: Set `role` to `"admin"`
6. Refresh the app

### **3. Create Test Client Data**
In Firestore Console:
- Collection: `clients`
- Document ID: `sanderson-design-group`
- Fields:
  ```json
  {
    "id": "sanderson-design-group",
    "name": "Sanderson Design Group",
    "createdAt": [timestamp],
    "updatedAt": [timestamp]
  }
  ```
- Subcollection: `websites`
  - Document ID: `sanderson_uk`
    ```json
    {
      "id": "sanderson_uk",
      "websiteName": "Sanderson UK",
      "bigQueryWebsiteId": "sanderson_uk",
      "createdAt": [timestamp],
      "updatedAt": [timestamp]
    }
    ```

### **4. Test the Application**
1. Login as admin
2. Select "Sanderson Design Group"
3. View Sales Overview - real BigQuery data from London!
4. Test all reporting pages

---

## 💰 Cost Estimate

**All infrastructure in London (europe-west2):**

- **Firestore:** FREE (within free tier limits)
- **BigQuery Storage:** ~$0.0002/month (1 MB)
- **BigQuery Queries:** FREE (under 1 TB/month)
- **Firebase Auth:** FREE
- **Gemini API:** Pay-per-use (very low cost for dashboard usage)

**Total Estimated Cost:** ~$0.00/month (within free tier)

---

## 🔒 Data Residency & Compliance

✅ **All data now stored in London, UK:**
- Firestore: europe-west2 (London)
- BigQuery: europe-west2 (London)
- Better GDPR compliance
- Lower latency for UK users
- EU data residency requirements met

---

## 🔗 Important Links

- **Firebase Console:** https://console.firebase.google.com/project/insight-dashboard-1761555293
- **Firestore Console:** https://console.firebase.google.com/project/insight-dashboard-1761555293/firestore
- **BigQuery Console:** https://console.cloud.google.com/bigquery?project=insight-dashboard-1761555293
- **Google Cloud Console:** https://console.cloud.google.com/home/dashboard?project=insight-dashboard-1761555293

---

## ✅ Migration Checklist

- [x] Deleted Firestore database in us-central1
- [x] Created Firestore database in europe-west2
- [x] Deployed Firestore security rules
- [x] Deleted BigQuery dataset in US
- [x] Created BigQuery dataset in europe-west2
- [x] Created BigQuery tables in London
- [x] Inserted test data (690 rows)
- [x] Created Gemini API key
- [x] Updated `.env.local` with all credentials
- [x] Updated `scripts/setup-bigquery.ts` for London
- [x] Updated `lib/bigquery/client.ts` for London
- [x] Verified all locations are europe-west2
- [ ] Create admin user (manual step)
- [ ] Create test client data (manual step)
- [ ] Test application (manual step)

---

## 🎊 Summary

**Everything is now hosted in London!**

✅ Firestore: europe-west2  
✅ BigQuery: europe-west2  
✅ 690 rows of test data  
✅ Gemini API key configured  
✅ All code updated for London region  
✅ Security rules deployed  
✅ Ready for development  

**Your Insight Dashboard is now fully UK-based and ready to use!**

Start the dev server with `npm run dev` and begin building features.

