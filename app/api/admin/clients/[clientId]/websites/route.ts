import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { db } from '@/lib/firebase/admin';
import { Website, CreateWebsite } from '@/types/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/clients/[clientId]/websites
 * List all websites for a client (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  return requireAdmin(request, async () => {
    try {
      const { clientId } = await params;

      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      const websitesSnapshot = await db
        .collection('clients')
        .doc(clientId)
        .collection('websites')
        .get();

      const websites: Website[] = websitesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Website));

      return NextResponse.json({
        success: true,
        data: websites,
      });
    } catch (error: any) {
      console.error('Error fetching websites:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/admin/clients/[clientId]/websites
 * Create a new website for a client (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  return requireAdmin(request, async () => {
    try {
      const { clientId } = await params;
      const body = await request.json();
      const { 
        id, 
        websiteName, 
        bigQueryWebsiteId, 
        storeId, 
        url,
        bigQueryTablePrefixes,
        isGrouped,
        groupedWebsiteIds
      } = body as CreateWebsite & { 
        id: string;
        url?: string;
        isGrouped?: boolean;
        groupedWebsiteIds?: string[];
      };

      // For grouped websites, storeId is optional
      if (!id || !websiteName || !bigQueryWebsiteId) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: id, websiteName, bigQueryWebsiteId' },
          { status: 400 }
        );
      }

      // For non-grouped websites, storeId is required
      if (!isGrouped && !storeId) {
        return NextResponse.json(
          { success: false, error: 'Missing required field: storeId (required for non-grouped websites)' },
          { status: 400 }
        );
      }

      // For grouped websites, groupedWebsiteIds is required
      if (isGrouped && (!groupedWebsiteIds || groupedWebsiteIds.length < 2)) {
        return NextResponse.json(
          { success: false, error: 'Grouped websites must have at least 2 website IDs in groupedWebsiteIds' },
          { status: 400 }
        );
      }

      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      // Check if website already exists
      const existingWebsite = await db
        .collection('clients')
        .doc(clientId)
        .collection('websites')
        .doc(id)
        .get();

      if (existingWebsite.exists) {
        return NextResponse.json(
          { success: false, error: 'Website ID already exists for this client' },
          { status: 409 }
        );
      }

      const now = new Date().toISOString();
      const websiteData: Website = {
        id,
        websiteName,
        bigQueryWebsiteId,
        storeId: storeId || '', // Empty string for grouped websites
        url: url || undefined,
        bigQueryTablePrefixes: bigQueryTablePrefixes || {},
        isGrouped: isGrouped || false,
        groupedWebsiteIds: groupedWebsiteIds || undefined,
        createdAt: now,
        updatedAt: now,
      };

      await db
        .collection('clients')
        .doc(clientId)
        .collection('websites')
        .doc(id)
        .set(websiteData);

      return NextResponse.json({
        success: true,
        data: websiteData,
      });
    } catch (error: any) {
      console.error('Error creating website:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

