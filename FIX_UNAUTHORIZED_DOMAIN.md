# Fix: Firebase Auth Unauthorized Domain Error

## ✅ Good News!
The `auth/unauthorized-domain` error means your API key is now working correctly! This is just a simple authorization issue.

## Problem
Firebase Authentication needs `insight.tomandco.co.uk` added to its list of authorized domains.

---

## SOLUTION (2 minutes)

### Step 1: Open Firebase Authentication Settings
Click this link to go directly to the settings page:
```
https://console.firebase.google.com/project/insight-dashboard-1761555293/authentication/settings
```

### Step 2: Add Your Custom Domain

1. **Scroll down** to the "Authorized domains" section

2. **Click "Add domain"** button

3. **Enter**: `insight.tomandco.co.uk`

4. **Click "Add"**

5. **Done!** The change takes effect immediately (no rebuild needed)

---

## Alternative: Check Current Authorized Domains

Your authorized domains should include:
- ✅ `localhost` (for development)
- ✅ `insight-dashboard-1761555293.firebaseapp.com` (default Firebase domain)
- ✅ `insight-dashboard-1761555293.web.app` (if using Firebase Hosting)
- ⚠️ `insight.tomandco.co.uk` (YOUR CUSTOM DOMAIN - needs to be added)

---

## Test After Adding

1. **Wait 10 seconds** for the change to propagate
2. **Refresh** https://insight.tomandco.co.uk
3. **Try signing in**
4. **Expected result**: Authentication should work! ✅

---

## Verification

After adding the domain, the error should change from:
```
❌ Firebase: Error (auth/unauthorized-domain)
```

To:
```
✅ Successful authentication with no errors
```

---

## What Fixed

1. ✅ **API Key Issue**: Fixed by correcting `apphosting.yaml` syntax
   - Changed from wrong `build.environmentVariables` to correct `env` format
   - API key now properly embedded in client bundle

2. ⚠️ **Domain Authorization**: Needs to be added (you're doing this now)
   - Add `insight.tomandco.co.uk` to Firebase Auth authorized domains
   - Takes effect immediately, no deployment needed

---

## Direct Link

**Go here NOW:**
https://console.firebase.google.com/project/insight-dashboard-1761555293/authentication/settings

Scroll to "Authorized domains" → Click "Add domain" → Enter `insight.tomandco.co.uk` → Click "Add"

**That's it!** 🚀

