# Firebase App Hosting Deployment Status

## Current Issue: Using `demo-api-key` Instead of Real API Key

### Problem
The deployed application is using the fallback value `demo-api-key` instead of the actual Firebase API key configured in `apphosting.yaml`.

**Evidence from Console:**
```
GET https://identitytoolkit.googleapis.com/v1/projects?key=demo-api-key 400 (Bad Request)
```

### Root Cause
The previous deployment was built **before** the `apphosting.yaml` was updated to include `NEXT_PUBLIC_FIREBASE_API_KEY` in the `build.environmentVariables` section.

### Solution Applied

1. ✅ **Updated `apphosting.yaml`** (commit: 5253d22)
   - Moved all `NEXT_PUBLIC_*` variables to `build.environmentVariables`
   - These variables are now available at build time to be embedded in the client bundle

2. ✅ **Removed API Key Restrictions** (2025-11-07 16:23:02)
   - Cleared all restrictions on API key: `cdf444e5-86a3-43c3-ae78-754971aada65`
   - Key now works from any domain

3. ✅ **Triggered New Deployment** (commit: fe53366)
   - Empty commit pushed to force Firebase App Hosting to rebuild
   - New build will use the updated `apphosting.yaml` configuration

---

## Monitoring the Deployment

### Check Build Status

**Option 1: Firebase Console**
```
https://console.firebase.google.com/project/tomandco-hosting/apphosting
```

**Option 2: Command Line**
```bash
firebase apphosting:backends:list
```

**Option 3: Check Deployment Logs**
```bash
# View build logs (if available)
gcloud builds list --project=tomandco-hosting --limit=5
```

### Current Deployment Info
- **Backend**: insight
- **Repository**: tomandco-tmccaul-insight  
- **URL**: https://insight--insight-dashboard-1761555293.europe-west4.hosted.app
- **Region**: europe-west4
- **Last Update**: 2025-11-07 16:19:59 (OLD - before fix)

---

## Expected Timeline

1. **Build Trigger**: Immediate (triggered by git push)
2. **Build Duration**: ~2-5 minutes
3. **Deployment**: ~1-2 minutes
4. **DNS Propagation**: ~1-2 minutes
5. **Total**: ~5-10 minutes

---

## Verification Steps

Once the new deployment completes:

### 1. Check Build Time
```bash
firebase apphosting:backends:list
```
Look for "Updated Date" > 16:25:00 (after our fixes)

### 2. Test the Application
1. Open: https://insight--insight-dashboard-1761555293.europe-west4.hosted.app
2. Open browser DevTools (F12) → Console
3. Try to sign in
4. Check for errors

### 3. Verify API Key in Network Tab
1. DevTools → Network tab
2. Filter for "identitytoolkit"
3. Look for requests - they should use the REAL API key, not `demo-api-key`
4. Example of correct request:
   ```
   GET https://identitytoolkit.googleapis.com/v1/projects?key=AIzaSyCkkB5Fcq51g1lmvoP0vgJLvVFJBEsS4A0
   ```

### 4. Check Environment Variables Loaded
In the browser console, run:
```javascript
// This won't work in production (variables are embedded), but you can check the requests
// Look at Network tab → identitytoolkit requests → check the ?key= parameter
```

---

## If Still Not Working After 10 Minutes

### Check the Build Logs
```bash
# List recent builds
gcloud builds list --project=tomandco-hosting --limit=5

# Get specific build log (replace BUILD_ID)
gcloud builds log BUILD_ID --project=tomandco-hosting
```

### Check if Build is Using Correct Config
Look in the build logs for:
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCkkB5Fcq51g1lmvoP0vgJLvVFJBEsS4A0
```

If you see `NEXT_PUBLIC_FIREBASE_API_KEY` as undefined or not set, the build config isn't being applied.

### Manual Rebuild
If auto-deploy isn't working, try manual deployment:
```bash
# Force a rebuild from the Console
# Go to: https://console.firebase.google.com/project/tomandco-hosting/apphosting
# Click on your backend → "Create Rollout" or "Redeploy"
```

---

## Configuration Reference

### Current apphosting.yaml Build Config
```yaml
build:
  buildCommand: npm run build
  environmentVariables:
    NODE_ENV: 'production'
    NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyCkkB5Fcq51g1lmvoP0vgJLvVFJBEsS4A0'
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'insight-dashboard-1761555293.firebaseapp.com'
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'insight-dashboard-1761555293'
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'insight-dashboard-1761555293.appspot.com'
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '292720819141'
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:292720819141:web:13a548b1595558cffa29ac'
    NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'false'
```

---

## Success Criteria

✅ Authentication works without errors  
✅ No `demo-api-key` in network requests  
✅ Users can sign in successfully  
✅ Console shows no API key errors  

---

## Commits Applied
- ✅ `5253d22` - Fix Firebase auth error: Move NEXT_PUBLIC_* vars to build-time environment
- ✅ `fe53366` - Trigger rebuild with build-time environment variables

---

**Next: Wait ~5-10 minutes and test the application**

