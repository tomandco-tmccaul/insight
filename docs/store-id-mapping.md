# Store ID Mapping Guide

## Overview
Adobe Commerce uses `store_id` to identify different websites/brands. This document shows the store IDs found in the BigQuery data and needs to be mapped to website names in Firestore.

## Store IDs in BigQuery Data

Based on analysis of `sanderson_design_group.adobe_commerce_orders`:

| Store ID | Order Count | Total Revenue | First Order | Last Order | Likely Website |
|----------|-------------|---------------|-------------|------------|----------------|
| 1        | 18,781      | £2,491,000    | 2025-08-28  | 2025-10-20 | **Main site** (highest volume) |
| 10       | 3,874       | £1,064,000    | 2025-08-29  | 2025-10-20 | Brand/Region 2 |
| 11       | 3,559       | £1,061,000    | 2025-09-01  | 2025-10-20 | Brand/Region 3 |
| 12       | 390         | £2,592,000    | 2025-09-01  | 2025-10-20 | **High AOV** (£6,646 AOV) |
| 9        | 333         | £6,872        | 2025-09-19  | 2025-10-18 | Sample/Test store? |
| 13       | 46          | £98,036       | 2025-09-01  | 2025-10-15 | Small brand/region |
| 32       | 17          | £1,361        | 2025-09-23  | 2025-10-16 | Test/Development? |

## Action Required

You need to map these store IDs to the actual website names. For example:

- Store ID `1` → "Sanderson" (main UK site)
- Store ID `10` → "Harlequin" 
- Store ID `11` → "Morris & Co"
- Store ID `12` → "Zoffany"
- etc.

## How to Update Firestore

Once you know the mapping, you can update the websites in Firestore using the Admin UI:

1. **Log in** to http://localhost:3000
2. **Go to Admin → Websites**
3. **Edit each website** and set the correct `storeId` value
4. **Save** the changes

Or you can use the Firebase Console directly:
1. Go to https://console.firebase.google.com/project/insight-dashboard-1761555293/firestore
2. Navigate to `clients/{clientId}/websites/{websiteId}`
3. Edit the `storeId` field for each website

## Current Firestore Structure

The websites should be stored under:
```
/clients/{clientId}/websites/{websiteId}
```

Each website document should have:
- `websiteName`: Display name (e.g., "Harlequin")
- `storeId`: Adobe Commerce store_id (e.g., "10")
- `bigQueryWebsiteId`: Identifier used in aggregated tables (e.g., "harlequin_prod")
- `bigQueryTablePrefixes`: Object with prefixes for each data source

## Questions to Answer

1. **What is store_id 1?** (Main site with 18,781 orders)
2. **What is store_id 10?** (Second highest with 3,874 orders)
3. **What is store_id 11?** (Third highest with 3,559 orders)
4. **What is store_id 12?** (High-value orders, £6,646 AOV)
5. **What is store_id 9?** (Very low revenue, possibly samples?)
6. **What is store_id 13?** (Small volume)
7. **What is store_id 32?** (Very small, possibly test?)

## Next Steps

1. **Identify the brand/website for each store_id**
2. **Update Firestore websites** with correct storeId values
3. **Test the dashboard** to ensure data filters correctly by website
4. **Verify** that selecting different websites shows different data

Once this mapping is complete, the website selector will correctly filter all reports by the selected brand/website!

