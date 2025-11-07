# Manual Deployment Instructions

## Current Situation

A new commit was pushed (fe53366) to trigger a rebuild, but the automatic deployment may take a few minutes to start, or it might need to be triggered manually.

---

## Option 1: Wait for Automatic Deployment (5-10 minutes)

Firebase App Hosting with GitHub integration should automatically deploy when you push to `main`. 

**Check if build started:**
```bash
# Run this command every minute to see if a new build appears
gcloud builds list --project=tomandco-hosting --limit=1
```

When you see a new build with CREATE_TIME after 16:25 UTC (today), that's your build!

---

## Option 2: Manual Deployment via Firebase Console (RECOMMENDED)

1. **Go to Firebase App Hosting Console:**
   ```
   https://console.firebase.google.com/project/tomandco-hosting/apphosting
   ```

2. **Find your backend** (should be named "insight" or similar)

3. **Click on the backend name** to open details

4. **Look for one of these options:**
   - **"Create Rollout"** button
   - **"Redeploy"** button  
   - **"Deploy"** or **"Build"** button

5. **Click the button** to trigger a manual deployment

6. **Wait for the build** (~3-5 minutes)
   - You'll see build progress in the console
   - Build logs will show environment variables being set

7. **Verify** the deployment completed successfully

---

## Option 3: Check GitHub Integration

The automatic deployment might not be enabled. To check:

1. **Go to Firebase App Hosting Console:**
   ```
   https://console.firebase.google.com/project/tomandco-hosting/apphosting
   ```

2. **Click on your backend**

3. **Look for "Source" or "Repository" settings**

4. **Verify:**
   - ✅ GitHub repo is connected: `tomandco-tmccaul/insight`
   - ✅ Branch is set to: `main`
   - ✅ Auto-deploy is enabled

5. **If not connected:**
   - Click "Connect Repository" or "Set up Git integration"
   - Follow the prompts to connect GitHub
   - Select branch: `main`
   - Enable automatic deployments

---

## Option 4: Deploy Using Firebase CLI

If the console method doesn't work, try CLI deployment:

```bash
cd /Users/tommccaul/Sites/FirebaseApps/insight

# Method 1: Deploy (if supported)
firebase deploy --only apphosting

# Method 2: If that doesn't work, check available commands
firebase apphosting --help

# Method 3: Trigger via gcloud (if App Hosting uses Cloud Build)
# First, find the trigger ID
gcloud builds triggers list --project=tomandco-hosting

# Then run the trigger (replace TRIGGER_ID)
gcloud builds triggers run TRIGGER_ID --project=tomandco-hosting --branch=main
```

---

## Verification Checklist

After deployment completes, verify:

### 1. Check Deployment Time
```bash
firebase apphosting:backends:list
```

Look for "Updated Date" showing current time (after 16:25 today).

### 2. Test the Application

**URL**: https://insight--insight-dashboard-1761555293.europe-west4.hosted.app

1. Open the URL in your browser
2. Open DevTools (F12) → Network tab
3. Try to sign in
4. Look for requests to `identitytoolkit.googleapis.com`
5. **Check the URL parameters** - should have:
   ```
   ?key=AIzaSyCkkB5Fcq51g1lmvoP0vgJLvVFJBEsS4A0
   ```
   **NOT**:
   ```
   ?key=demo-api-key
   ```

### 3. Console Errors

Check browser console - should NOT see:
```
❌ API key not valid. Please pass a valid API key.
```

Should see:
```
✅ No Firebase API key errors
✅ Authentication succeeds
```

---

## If Manual Deploy Also Fails

If manual deployment also shows the same `demo-api-key` issue:

### Check Build Logs

1. Go to the build that just completed
2. Look for environment variable injection
3. Search for: `NEXT_PUBLIC_FIREBASE_API_KEY`
4. Verify it shows the real key, not undefined

### Alternative: Use .env in Repo (NOT RECOMMENDED)

As a last resort (not secure, but works):

1. Create `.env.production` in your repo:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCkkB5Fcq51g1lmvoP0vgJLvVFJBEsS4A0
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=insight-dashboard-1761555293.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=insight-dashboard-1761555293
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=insight-dashboard-1761555293.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=292720819141
   NEXT_PUBLIC_FIREBASE_APP_ID=1:292720819141:web:13a548b1595558cffa29ac
   ```

2. Commit and push
3. This is less secure but will work

---

## Quick Command Reference

```bash
# Check deployment status
firebase apphosting:backends:list

# Check recent builds
gcloud builds list --project=tomandco-hosting --limit=5

# Check specific build log
gcloud builds log BUILD_ID --project=tomandco-hosting

# List build triggers
gcloud builds triggers list --project=tomandco-hosting

# Run a specific trigger
gcloud builds triggers run TRIGGER_ID --project=tomandco-hosting --branch=main
```

---

## Expected Result

After successful deployment with correct configuration:

✅ **Network request shows real API key:**
```
GET https://identitytoolkit.googleapis.com/v1/projects?key=AIzaSyCkkB5Fcq51g1lmvoP0vgJLvVFJBEsS4A0
```

✅ **No console errors**

✅ **Authentication works**

✅ **Users can sign in**

---

## Current Commits
- ✅ `5253d22` - Fixed apphosting.yaml with build-time env vars
- ✅ `fe53366` - Triggered rebuild

**Action Required:** Go to Firebase Console and manually trigger deployment, or wait 5-10 minutes for automatic deployment.

