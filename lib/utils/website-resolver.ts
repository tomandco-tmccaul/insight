import { adminDb } from '@/lib/firebase/admin';
import { Website } from '@/types/firestore';

/**
 * Resolves a website ID to one or more BigQuery website IDs.
 * If the website is grouped, returns all BigQuery website IDs from the grouped websites.
 * Otherwise, returns the single BigQuery website ID.
 * 
 * @param clientId - The client ID
 * @param websiteId - The website ID to resolve
 * @returns Array of BigQuery website IDs, or null if website not found
 */
export async function resolveWebsiteToBigQueryIds(
  clientId: string,
  websiteId: string
): Promise<string[] | null> {
  if (!adminDb) {
    console.error('Admin database not initialized');
    return null;
  }

  try {
    // Fetch the website document
    const websiteDoc = await adminDb
      .collection('clients')
      .doc(clientId)
      .collection('websites')
      .doc(websiteId)
      .get();

    if (!websiteDoc.exists) {
      return null;
    }

    const websiteData = websiteDoc.data() as Website;

    console.log('[Website Resolver] Resolving website:', {
      clientId,
      websiteId,
      isGrouped: websiteData.isGrouped,
      groupedWebsiteIds: websiteData.groupedWebsiteIds,
      storeId: websiteData.storeId,
      bigQueryWebsiteId: websiteData.bigQueryWebsiteId,
    });

    // If it's a grouped website, fetch all grouped websites and get their BigQuery IDs
    if (websiteData.isGrouped && websiteData.groupedWebsiteIds) {
      const groupedWebsiteIds = websiteData.groupedWebsiteIds;
      const bigQueryIds: string[] = [];

      console.log('[Website Resolver] Grouped website detected, fetching', groupedWebsiteIds.length, 'websites');

      // Fetch all grouped websites
      for (const groupedWebsiteId of groupedWebsiteIds) {
        const groupedWebsiteDoc = await adminDb
          .collection('clients')
          .doc(clientId)
          .collection('websites')
          .doc(groupedWebsiteId)
          .get();

        if (groupedWebsiteDoc.exists) {
          const groupedWebsiteData = groupedWebsiteDoc.data() as Website;
          // Materialized views use CAST(store_id AS STRING) as website_id, so we need to use storeId
          if (groupedWebsiteData.storeId) {
            bigQueryIds.push(groupedWebsiteData.storeId);
            console.log('[Website Resolver] Added store ID:', groupedWebsiteData.storeId, 'from website:', groupedWebsiteId);
          } else {
            console.warn('[Website Resolver] Website', groupedWebsiteId, 'missing storeId');
          }
        } else {
          console.warn('[Website Resolver] Grouped website', groupedWebsiteId, 'not found');
        }
      }

      console.log('[Website Resolver] Resolved to BigQuery IDs:', bigQueryIds);
      return bigQueryIds.length > 0 ? bigQueryIds : null;
    }

    // For non-grouped websites, return the store ID (which is used as website_id in materialized views)
    // Materialized views use CAST(store_id AS STRING) as website_id, so we need to use storeId
    return websiteData.storeId
      ? [websiteData.storeId]
      : null;
  } catch (error) {
    console.error('Error resolving website to BigQuery IDs:', error);
    return null;
  }
}

/**
 * Resolves a website ID to one or more store IDs (for Adobe Commerce).
 * If the website is grouped, returns all store IDs from the grouped websites.
 * Otherwise, returns the single store ID.
 * 
 * @param clientId - The client ID
 * @param websiteId - The website ID to resolve
 * @returns Array of store IDs, or null if website not found
 */
export async function resolveWebsiteToStoreIds(
  clientId: string,
  websiteId: string
): Promise<string[] | null> {
  if (!adminDb) {
    console.error('Admin database not initialized');
    return null;
  }

  try {
    // Fetch the website document
    const websiteDoc = await adminDb
      .collection('clients')
      .doc(clientId)
      .collection('websites')
      .doc(websiteId)
      .get();

    if (!websiteDoc.exists) {
      return null;
    }

    const websiteData = websiteDoc.data() as Website;

    // If it's a grouped website, fetch all grouped websites and get their store IDs
    if (websiteData.isGrouped && websiteData.groupedWebsiteIds) {
      const groupedWebsiteIds = websiteData.groupedWebsiteIds;
      const storeIds: string[] = [];

      // Fetch all grouped websites
      for (const groupedWebsiteId of groupedWebsiteIds) {
        const groupedWebsiteDoc = await adminDb
          .collection('clients')
          .doc(clientId)
          .collection('websites')
          .doc(groupedWebsiteId)
          .get();

        if (groupedWebsiteDoc.exists) {
          const groupedWebsiteData = groupedWebsiteDoc.data() as Website;
          if (groupedWebsiteData.storeId) {
            storeIds.push(groupedWebsiteData.storeId);
          }
        }
      }

      return storeIds.length > 0 ? storeIds : null;
    }

    // For non-grouped websites, return the single store ID
    return websiteData.storeId ? [websiteData.storeId] : null;
  } catch (error) {
    console.error('Error resolving website to store IDs:', error);
    return null;
  }
}

