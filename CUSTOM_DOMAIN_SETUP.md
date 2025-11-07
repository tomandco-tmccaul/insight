# Custom Domain Setup for insight.tomandco.co.uk

## ✅ What I've Already Fixed

### 1. API Key Restrictions Updated (Just Now)
✅ **Added your custom domain to API key allowed referrers:**
- `https://insight.tomandco.co.uk/*`
- `https://*.web.app/*`
- `https://*.firebaseapp.com/*`
- `https://*.appspot.com/*`
- `http://localhost:*/*`
- `https://localhost:*/*`

**Update Time**: 2025-11-07 16:28:49

This allows the Firebase API key to work from your custom domain.

---

## ⚠️ Additional Steps Required

### Step 1: Add Custom Domain to Firebase Auth Authorized Domains

Firebase Authentication needs to know your custom domain is authorized:

1. **Go to Firebase Authentication Settings:**
   ```
   https://console.firebase.google.com/project/insight-dashboard-1761555293/authentication/settings
   ```

2. **Scroll down to "Authorized domains"**

3. **Check if `insight.tomandco.co.uk` is in the list**
   - If YES: ✅ You're good
   - If NO: Continue to step 4

4. **Click "Add domain"**

5. **Enter**: `insight.tomandco.co.uk`

6. **Click "Add"**

---

### Step 2: Verify Custom Domain in Firebase App Hosting

1. **Go to Firebase App Hosting Console:**
   ```
   https://console.firebase.google.com/project/tomandco-hosting/apphosting
   ```

2. **Click on your backend (insight)**

3. **Look for "Custom domains" section**

4. **Verify `insight.tomandco.co.uk` is configured:**
   - Status should be: ✅ Connected
   - SSL should be: ✅ Active

5. **If not configured:**
   - Click "Add custom domain"
   - Enter: `insight.tomandco.co.uk`
   - Follow DNS configuration instructions
   - Wait for SSL certificate provisioning (~15 minutes)

---

### Step 3: Update Firebase Config (Optional but Recommended)

For better Firebase Auth experience with your custom domain, update the `authDomain`:

**Current Configuration:**
```javascript
authDomain: 'insight-dashboard-1761555293.firebaseapp.com'
```

**Recommended for Custom Domain:**
```javascript
authDomain: 'insight.tomandco.co.uk'
```

This can be done by updating `apphosting.yaml`:

```yaml
build:
  environmentVariables:
    # Change this line:
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'insight.tomandco.co.uk'  # Instead of .firebaseapp.com
```

**Note**: This is optional. The `.firebaseapp.com` domain will still work, but using your custom domain provides a better user experience.

---

## Current Configuration Status

### ✅ Completed
- [x] API key restrictions include custom domain
- [x] Custom domain is serving the application (verified via curl)
- [x] Environment variables configured in apphosting.yaml

### ⚠️ To Verify
- [ ] Custom domain in Firebase Auth authorized domains
- [ ] Custom domain properly configured in App Hosting
- [ ] New deployment with correct build-time env vars

---

## Testing Checklist

After completing the steps above AND after the new deployment:

### 1. Open Your Custom Domain
```
https://insight.tomandco.co.uk
```

### 2. Open Browser DevTools (F12)
- Go to **Console** tab
- Go to **Network** tab

### 3. Try to Sign In

### 4. Check Network Requests
Look for requests to `identitytoolkit.googleapis.com`:

**Should see:**
```
✅ GET https://identitytoolkit.googleapis.com/v1/projects?key=AIzaSyCkkB5Fcq51g1lmvoP0vgJLvVFJBEsS4A0
```

**Should NOT see:**
```
❌ GET https://identitytoolkit.googleapis.com/v1/projects?key=demo-api-key
```

### 5. Check Console for Errors

**Should NOT see:**
```
❌ API key not valid. Please pass a valid API key.
❌ Firebase: Error (auth/unauthorized-domain)
```

**Should see:**
```
✅ No Firebase errors
✅ Authentication succeeds
```

---

## Common Issues & Solutions

### Issue 1: "unauthorized-domain" Error

**Error:**
```
Firebase: Error (auth/unauthorized-domain). This domain (insight.tomandco.co.uk) is not authorized...
```

**Solution:**
Add `insight.tomandco.co.uk` to Firebase Auth authorized domains (Step 1 above)

---

### Issue 2: Still Seeing "demo-api-key"

**Cause:** New deployment hasn't completed yet with build-time environment variables

**Solution:**
1. Go to Firebase Console: https://console.firebase.google.com/project/tomandco-hosting/apphosting
2. Manually trigger a new rollout/deployment
3. Wait 3-5 minutes for build
4. Test again

---

### Issue 3: SSL Certificate Error

**Error:**
```
NET::ERR_CERT_AUTHORITY_INVALID
```

**Solution:**
- Wait for SSL certificate to provision (can take up to 24 hours, usually 15 minutes)
- Check custom domain status in Firebase Console
- Verify DNS records are correct

---

## DNS Configuration Reference

Your custom domain should have these DNS records (if using Firebase App Hosting):

**Check with:**
```bash
dig insight.tomandco.co.uk
nslookup insight.tomandco.co.uk
```

**Typical setup:**
```
Type: A or CNAME
Name: insight.tomandco.co.uk
Value: [Firebase App Hosting IP or CNAME]
```

---

## URLs Reference

### Primary URLs
- **Custom Domain**: https://insight.tomandco.co.uk (production)
- **Firebase Default**: https://insight--insight-dashboard-1761555293.europe-west4.hosted.app
- **Local Dev**: http://localhost:3000

### Console URLs
- **Firebase Console**: https://console.firebase.google.com/project/insight-dashboard-1761555293
- **App Hosting**: https://console.firebase.google.com/project/tomandco-hosting/apphosting
- **Auth Settings**: https://console.firebase.google.com/project/insight-dashboard-1761555293/authentication/settings
- **API Keys**: https://console.cloud.google.com/apis/credentials?project=tomandco-hosting

---

## Summary of Changes

### What Was Wrong
1. API key had restrictions that didn't include `insight.tomandco.co.uk`
2. Build-time environment variables not configured correctly
3. Deployment using `demo-api-key` fallback

### What's Fixed
1. ✅ API key now allows requests from `insight.tomandco.co.uk`
2. ✅ `apphosting.yaml` configured with build-time env vars
3. ✅ Rebuild triggered (commit fe53366)

### What You Need to Do
1. ⚠️ Verify/add `insight.tomandco.co.uk` to Firebase Auth authorized domains
2. ⚠️ Ensure new deployment completes (manual trigger if needed)
3. ⚠️ Test authentication on your custom domain

---

## Quick Action Items

**Right Now:**
1. Add custom domain to Firebase Auth (2 minutes)
2. Trigger manual deployment in Firebase Console (if not auto-deployed)
3. Wait 5 minutes for build
4. Test at https://insight.tomandco.co.uk

**Expected Result:**
✅ Sign in works on `insight.tomandco.co.uk` with no API key errors!

