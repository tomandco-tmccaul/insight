# Fix Firebase API Key Authentication Error

## Problem
`Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)`

This error occurs because the Firebase Web API key has **application restrictions** that block requests from Firebase App Hosting domains.

## Solution: Remove API Key Restrictions

### Option 1: Quick Fix via Google Cloud Console (Recommended - 2 minutes)

1. **Open the API Key page** (click this link):
   ```
   https://console.cloud.google.com/apis/credentials/key/cdf444e5-86a3-43c3-ae78-754971aada65?project=tomandco-hosting
   ```

2. **Under "Application restrictions":**
   - Change from "HTTP referrers (web sites)" to **"None"**
   - This allows the key to work from any domain (Firebase App Hosting, localhost, etc.)

3. **Under "API restrictions":**
   - Keep it as "Don't restrict key" OR
   - Ensure these APIs are checked:
     - ✅ Identity Toolkit API
     - ✅ Token Service API
     - ✅ Cloud Firestore API

4. **Click "SAVE"** at the bottom

5. **Wait 1-2 minutes** for the changes to propagate

6. **Test** - Refresh your app and try signing in again

---

### Option 2: If Option 1 Doesn't Work - Add Specific Referrers

If you prefer to keep restrictions for security:

1. Open the same link: https://console.cloud.google.com/apis/credentials/key/cdf444e5-86a3-43c3-ae78-754971aada65?project=tomandco-hosting

2. Under "Application restrictions", select **"HTTP referrers (web sites)"**

3. Click **"ADD AN ITEM"** and add each of these patterns:
   ```
   http://localhost:3000/*
   http://localhost:*
   https://*.web.app/*
   https://*.firebaseapp.com/*
   https://*.appspot.com/*
   https://tomandco-hosting.web.app/*
   https://insight-dashboard-1761555293.web.app/*
   https://insight-dashboard-1761555293.firebaseapp.com/*
   ```

4. Click **"SAVE"**

---

### Option 3: Command Line (If you have the right permissions)

```bash
# Update the API key to remove restrictions
gcloud alpha services api-keys update cdf444e5-86a3-43c3-ae78-754971aada65 \
  --project=tomandco-hosting \
  --clear-restrictions
```

---

## Why This Happens

Firebase Web API keys can have restrictions that limit which domains can use them:
- **Development**: Works on `localhost:3000` (allowed by default)
- **Production**: Firebase App Hosting uses domains like `*.web.app` which may not be in the allowed list

The API key in your `.env.local` works locally because `localhost` might be in the allowed referrers, but the production domain is not.

---

## After Fixing

Once you've removed the restrictions or added the App Hosting domains:

1. ✅ The authentication error will be resolved
2. ✅ Users can sign in on the production app
3. ✅ No code changes needed - just the API key configuration

---

## Verification

After making the change, check the browser console. The error should change from:
```
❌ API key not valid. Please pass a valid API key.
```

To successful authentication with no errors.

---

## Security Note

**Option 1** (No restrictions) is safe for Firebase Client API keys because:
- They are designed to be public (embedded in client-side code)
- Security is enforced by Firebase Security Rules, not API key restrictions
- Firebase automatically protects against abuse with rate limiting

**Option 2** (HTTP referrers) provides an extra layer of protection if you want to restrict which domains can use your Firebase project.

---

## Current Configuration

- **Project**: tomandco-hosting (728184793501)
- **API Key ID**: cdf444e5-86a3-43c3-ae78-754971aada65
- **Display Name**: API key 5
- **Key Value**: AIzaSyCkkB5Fcq51g1lmvoP0vgJLvVFJBEsS4A0
- **App Hosting URL**: https://tomandco-hosting.web.app (or similar)
- **Firebase Auth Domain**: insight-dashboard-1761555293.firebaseapp.com

