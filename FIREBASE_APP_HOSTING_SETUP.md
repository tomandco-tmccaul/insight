# Firebase App Hosting Setup Guide

## ✅ Completed Steps

### 1. Configuration Files Created
- ✅ `apphosting.yaml` - App Hosting runtime configuration
- ✅ `setup-secrets.sh` - Automated secrets setup script

### 2. Secrets Created in Google Secret Manager
All secrets have been successfully created in the `tomandco-hosting` project:
- ✅ `GOOGLE_GENAI_API_KEY` - Gemini AI API key
- ✅ `FIREBASE_PROJECT_ID` - Firebase project ID
- ✅ `FIREBASE_CLIENT_EMAIL` - Service account email
- ✅ `FIREBASE_PRIVATE_KEY` - Service account private key
- ✅ `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase client API key
- ✅ `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- ✅ `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID
- ✅ `GOOGLE_CLOUD_PROJECT` - Google Cloud project ID

### 3. TypeScript Build Fixed
- ✅ Fixed compilation error in `app/api/insights/route.ts`
- ✅ Project now builds successfully for production

### 4. Git Repository Updated
- ✅ All files committed and pushed to origin/main

---

## 🚀 Next Steps: Deploy to Firebase App Hosting

### Option 1: Create Backend via Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `tomandco-hosting`
3. Navigate to **App Hosting** in the left sidebar
4. Click **Get started** or **Add backend**
5. Connect your GitHub repository: `tomandco-tmccaul/insight`
6. Select branch: `main`
7. Configure build settings (should auto-detect `apphosting.yaml`)
8. Deploy!

### Option 2: Deploy via Firebase CLI
```bash
# Install/update Firebase CLI if needed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize App Hosting (first time only)
firebase apphosting:backends:create

# Or deploy directly
firebase deploy --only apphosting
```

### Option 3: GitHub Integration (Automatic Deploys)
Once you create the backend in the console:
1. It will automatically deploy on every push to `main`
2. Preview deploys will be created for pull requests
3. View deployments in the Firebase Console

---

## 🔐 Grant Service Account Access to Secrets

After your first deployment, the App Hosting service account will be created. Then run:

```bash
gcloud projects add-iam-policy-binding tomandco-hosting \
  --member='serviceAccount:firebase-app-hosting@tomandco-hosting.iam.gserviceaccount.com' \
  --role='roles/secretmanager.secretAccessor' \
  --condition=None
```

Or grant access via the [IAM Console](https://console.cloud.google.com/iam-admin/iam):
1. Find the service account: `firebase-app-hosting@tomandco-hosting.iam.gserviceaccount.com`
2. Click **Edit**
3. Add role: **Secret Manager Secret Accessor**
4. Save

---

## 📋 Configuration Summary

### Runtime Configuration
- **Runtime**: Node.js 22
- **Memory**: 1GB
- **CPU**: 1 vCPU
- **Concurrency**: 100 requests per instance
- **Scaling**: 0-10 instances (autoscaling)

### Environment Variables (Non-sensitive)
- `BIGQUERY_DATASET_ID`: insight_analytics
- `BIGQUERY_LOCATION`: europe-west2
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: insight-dashboard-1761555293
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: insight-dashboard-1761555293.firebaseapp.com
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: insight-dashboard-1761555293.appspot.com
- `NEXT_PUBLIC_USE_FIREBASE_EMULATOR`: false

### Secrets (Stored in Secret Manager)
All sensitive credentials are stored securely in Google Secret Manager and injected at runtime.

---

## 🔧 Managing Secrets

### View All Secrets
```bash
gcloud secrets list --project=tomandco-hosting
```

### View Secret Details
```bash
gcloud secrets describe SECRET_NAME --project=tomandco-hosting
```

### Update a Secret
```bash
echo -n 'new-secret-value' | gcloud secrets versions add SECRET_NAME \
  --project=tomandco-hosting \
  --data-file=-
```

### View Secret Versions
```bash
gcloud secrets versions list SECRET_NAME --project=tomandco-hosting
```

---

## 🧪 Testing Before Deploy

### Local Build Test
```bash
npm run build
```

### Local Development (with emulators)
```bash
npm run dev:emulator
```

### Production Environment Variables Test
Make sure all secrets are accessible by the service account before deploying.

---

## 📊 Monitoring After Deployment

### View Logs
```bash
# Via Firebase CLI
firebase apphosting:backends:logs

# Via gcloud
gcloud logging read "resource.type=cloud_run_revision" --project=tomandco-hosting --limit=50
```

### View Deployment Status
```bash
firebase apphosting:backends:list
```

### Firebase Console
- View real-time logs in the Firebase Console
- Monitor performance metrics
- View deployment history
- Rollback to previous versions if needed

---

## 🎯 Key Benefits of App Hosting

1. **Automatic Scaling**: Scales from 0 to 10 instances based on traffic
2. **Integrated Secrets**: Secure secret management with Google Secret Manager
3. **GitHub Integration**: Automatic deployments on git push
4. **Preview Deployments**: Preview changes before merging PRs
5. **Firebase Integration**: Seamless integration with Firestore, Auth, etc.
6. **Zero Cold Starts**: When scaled to 0, no cost; fast cold starts
7. **Custom Domains**: Easy custom domain setup
8. **SSL Certificates**: Automatic SSL certificate provisioning

---

## 📞 Support

If you encounter issues:

1. Check [Firebase App Hosting Documentation](https://firebase.google.com/docs/app-hosting)
2. View logs: `firebase apphosting:backends:logs`
3. Check build status in Firebase Console
4. Verify all secrets are accessible
5. Ensure service account has proper IAM roles

---

## 🎉 Summary

You're all set! Your configuration is ready for Firebase App Hosting. Just deploy and the platform will handle the rest:
- ✅ Secrets configured
- ✅ Runtime settings optimized
- ✅ Build process defined
- ✅ Auto-scaling enabled
- ✅ Production-ready

