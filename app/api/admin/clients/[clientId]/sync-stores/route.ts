import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/auth/middleware';
import { db } from '@/lib/firebase/admin';
import { AdobeCommerceClient } from '@/lib/adobe-commerce/client';
import { SyncStoresResponse } from '@/types/adobe-commerce';
import { Website } from '@/types/firestore';
import { ApiResponse } from '@/types';

/**
 * POST /api/admin/clients/[clientId]/sync-stores
 * Sync stores from Adobe Commerce API and create website documents in Firestore
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  return requireAdmin(request, async (req) => {
    try {
      const { clientId } = await params;

      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      // Get client document to retrieve Adobe Commerce credentials
      const clientDoc = await db.collection('clients').doc(clientId).get();

      if (!clientDoc.exists) {
        return NextResponse.json(
          {
            success: false,
            error: 'Client not found',
          },
          { status: 404 }
        );
      }

      const clientData = clientDoc.data();
      const endpoint = clientData?.adobeCommerceEndpoint;
      const accessToken = clientData?.adobeCommerceAccessToken;

      if (!endpoint || !accessToken) {
        return NextResponse.json(
          {
            success: false,
            error: 'Adobe Commerce API credentials not configured for this client. Please edit the client and add endpoint and access token.',
          },
          { status: 400 }
        );
      }

      // Initialize Adobe Commerce API client
      const adobeClient = new AdobeCommerceClient({
        endpoint,
        accessToken,
      });

      // Test connection first
      const isConnected = await adobeClient.testConnection();
      if (!isConnected) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to connect to Adobe Commerce API. Please check endpoint and access token.',
          },
          { status: 400 }
        );
      }

      // Fetch store views from Adobe Commerce
      const storeViews = await adobeClient.getStoreViews();

      // Filter out inactive stores
      const activeStores = storeViews.filter((store) => store.is_active === 1);

      if (activeStores.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No active stores found in Adobe Commerce',
          },
          { status: 400 }
        );
      }

      // Create website documents in Firestore
      const websitesRef = db.collection('clients').doc(clientId).collection('websites');
      const createdWebsites: SyncStoresResponse['websites'] = [];

      for (const store of activeStores) {
        // Generate website ID from store code (lowercase, replace spaces/special chars with hyphens)
        const websiteId = store.code.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        // Check if website already exists
        const existingDoc = await websitesRef.doc(websiteId).get();
        const existingData = existingDoc.exists ? (existingDoc.data() as Website) : null;

        // Prepare website data - preserve existing fields when updating
        const websiteData: Omit<Website, 'id'> = {
          websiteName: store.name, // Always update name from Adobe Commerce
          bigQueryWebsiteId: existingData?.bigQueryWebsiteId || websiteId, // Preserve existing or use websiteId
          storeId: store.id.toString(), // Always update storeId from Adobe Commerce (this is critical!)
          url: existingData?.url || undefined, // Preserve existing URL if set
          bigQueryTablePrefixes: existingData?.bigQueryTablePrefixes || {
            adobeCommerce: 'adobe_commerce_',
            googleAds: 'google_ads_',
            facebookAds: 'facebook_ads_',
            pinterestAds: 'pinterest_ads_',
            googleSearchConsole: 'gsc_',
            ga4: 'ga4_',
          },
          createdAt: existingData?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (existingDoc.exists) {
          // Update existing website - especially important for missing storeId
          console.log(`Updating existing website ${websiteId} (${store.name}) with storeId: ${store.id.toString()}`);
          await websitesRef.doc(websiteId).update(websiteData);
        } else {
          // Create new website document
          console.log(`Creating new website ${websiteId} (${store.name}) with storeId: ${store.id.toString()}`);
          await websitesRef.doc(websiteId).set(websiteData);
        }

        createdWebsites.push({
          id: websiteId,
          websiteName: store.name,
          storeId: store.id.toString(),
          adobeCommerceData: store,
        });
      }

      return NextResponse.json<ApiResponse<SyncStoresResponse>>({
        success: true,
        data: {
          success: true,
          websitesCreated: createdWebsites.length,
          websites: createdWebsites,
        },
        message: `Successfully synced ${createdWebsites.length} website(s) from Adobe Commerce. Existing websites were updated with latest storeId values.`,
      });
    } catch (error: unknown) {
      console.error('Error syncing stores:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        },
        { status: 500 }
      );
    }
  });
}

