# URL-Based Data Source Linking Strategy

## Overview

The `url` field has been added to the `Website` interface at the store/website level to enable linking Adobe Commerce data with other data sources. This document explains how URLs can be used and whether URL alone is sufficient for connecting all data sources.

## Current Implementation

### Website Configuration

Each website/store in Firestore now has an optional `url` field:

```typescript
interface Website {
  id: string;
  websiteName: string;
  bigQueryWebsiteId: string;
  storeId: string; // Adobe Commerce store_id
  url?: string; // Base URL for the website/store
  // ... other fields
}
```

### Setting URLs

URLs can be set via the Admin UI:
1. Go to **Admin → Websites**
2. Edit a website
3. Enter the **Website URL** field (e.g., `https://www.harlequin.com`)
4. Save

The URL field is optional but recommended for better data source linking.

## Is URL Sufficient?

### ✅ **URL is Useful For:**

1. **Google Search Console**
   - Already extracts `website_id` from `site_url` using regex
   - Can match GSC `site_url` to website `url` to link data
   - **Status:** ✅ Works well

2. **Domain-Based Matching**
   - Can match domains across sources (e.g., GA4 hostname to website URL)
   - Useful for filtering and grouping data
   - **Status:** ✅ Useful

3. **Human Readability**
   - Makes it easier to identify which website/store a URL belongs to
   - Helps with debugging and manual verification
   - **Status:** ✅ Helpful

### ⚠️ **URL May Not Be Sufficient For:**

1. **GA4 (Google Analytics 4)**
   - GA4 uses `property_id` as the primary identifier, not URLs
   - Multiple properties can track the same domain
   - **Recommendation:** Consider adding `ga4PropertyId` field if needed

2. **Google Ads / Facebook Ads**
   - These platforms track conversions via pixels/UTM parameters
   - Linking happens at the conversion level, not just domain level
   - **Recommendation:** URL helps but may need additional fields like `googleAdsAccountId` or `facebookPixelId`

3. **Multiple Stores on Same Domain**
   - If multiple Adobe Commerce stores share the same domain (subdomains/paths)
   - URL alone won't distinguish between them
   - **Recommendation:** Use `storeId` + `url` combination

4. **URL Variations**
   - www vs non-www
   - http vs https
   - Trailing slashes
   - **Solution:** Use URL normalization utilities (see `lib/utils/url-matcher.ts`)

## Recommended Approach

### Phase 1: URL-Based Linking (Current)

Use URL for:
- ✅ Google Search Console site matching
- ✅ Domain-based filtering
- ✅ Human-readable identification

### Phase 2: Enhanced Linking (Future)

Consider adding additional fields if needed:
- `ga4PropertyId?: string` - For GA4 property matching
- `googleAdsAccountId?: string` - For Google Ads account linking
- `facebookPixelId?: string` - For Facebook Pixel tracking
- `googleTagManagerId?: string` - For GTM container ID

## URL Normalization

The `lib/utils/url-matcher.ts` utility provides functions to normalize URLs for matching:

```typescript
import { normalizeUrl, extractDomain, urlsMatch, domainsMatch } from '@/lib/utils/url-matcher';

// Normalize URLs for comparison
const normalized = normalizeUrl("https://www.harlequin.com/");
// Returns: "harlequin.com"

// Extract domain
const domain = extractDomain("https://www.harlequin.com/path");
// Returns: "harlequin.com"

// Check if URLs match
const match = urlsMatch("https://www.harlequin.com", "http://harlequin.com");
// Returns: true (normalized comparison)

// Check if domains match
const sameDomain = domainsMatch("https://www.harlequin.com", "https://harlequin.com");
// Returns: true
```

## Usage Examples

### Linking Google Search Console Data

```typescript
// In aggregation queries, match GSC site_url to website url
const websiteUrl = website.url; // e.g., "https://www.harlequin.com"
const gscSiteUrl = gscRow.site_url; // e.g., "https://www.harlequin.com"

if (domainsMatch(websiteUrl, gscSiteUrl)) {
  // Link this GSC data to this website
}
```

### Filtering GA4 Data by Domain

```typescript
// Filter GA4 data by matching hostname to website URL
const websiteDomain = extractDomain(website.url);
// Filter GA4 rows where hostname matches websiteDomain
```

### Matching Adobe Commerce Orders

```typescript
// Adobe Commerce orders already use storeId
// URL can be used for additional validation or display
const orderStoreId = order.store_id;
const website = websites.find(w => w.storeId === orderStoreId.toString());
if (website?.url) {
  // Use URL for display or additional matching
}
```

## Best Practices

1. **Always include protocol** in URLs: `https://www.harlequin.com` (not `www.harlequin.com`)
2. **Use consistent format**: Prefer `https://` over `http://` if both exist
3. **Include www. if that's the canonical domain**: `https://www.harlequin.com` vs `https://harlequin.com`
4. **Don't include trailing slashes**: `https://www.harlequin.com` (not `https://www.harlequin.com/`)
5. **Use normalization utilities** when comparing URLs programmatically

## Conclusion

**URL is a good starting point** for linking data sources, especially for:
- Google Search Console (already works)
- Domain-based filtering
- Human-readable identification

**URL alone may not be sufficient** for:
- GA4 (needs `property_id`)
- Marketing platforms (may need account/pixel IDs)
- Multiple stores on same domain (needs `storeId` + `url`)

**Recommendation:** Start with URL-based linking and add additional fields (`ga4PropertyId`, etc.) as needed based on your specific use cases.

