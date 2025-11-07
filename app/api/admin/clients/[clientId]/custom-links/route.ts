import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { db } from '@/lib/firebase/admin';
import { CustomLink, CreateCustomLink } from '@/types/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/clients/[clientId]/custom-links
 * List all custom links for a client (admin can read all, clients can read their own)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  return requireAuth(request, async (req, user) => {
    try {
      const { clientId } = await params;

      // Check authorization - clients can read their own links
      if (user.role !== 'admin' && user.clientId !== clientId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }

      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      const linksRef = db
        .collection('clients')
        .doc(clientId)
        .collection('customLinks');

      // Try to order by sortOrder, but if that fails due to missing index or field, get all and sort in memory
      let linksSnapshot;
      try {
        linksSnapshot = await linksRef.orderBy('sortOrder', 'asc').get();
      } catch (error: any) {
        // If orderBy fails (e.g., missing index), fetch all and sort in memory
        console.warn('Failed to order by sortOrder, fetching all and sorting in memory:', error.message);
        linksSnapshot = await linksRef.get();
      }

      const links: CustomLink[] = linksSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as CustomLink));

      // Sort by sortOrder if not already sorted, defaulting to 0 for missing values
      links.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      return NextResponse.json({
        success: true,
        data: links,
      });
    } catch (error: any) {
      console.error('Error fetching custom links:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/admin/clients/[clientId]/custom-links
 * Create a new custom link for a client (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  return requireAuth(request, async (req, user) => {
    try {
      const { clientId } = await params;

      // Only admins can create custom links
      if (user.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Admin only' },
          { status: 403 }
        );
      }

      const body: CreateCustomLink = await request.json();
      const { name, url, sortOrder } = body;

      if (!name || !url) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: name and url' },
          { status: 400 }
        );
      }

      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      const now = new Date().toISOString();
      const linkData: Omit<CustomLink, 'id'> = {
        name,
        url,
        sortOrder: sortOrder ?? 0,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await db
        .collection('clients')
        .doc(clientId)
        .collection('customLinks')
        .add(linkData);

      return NextResponse.json({
        success: true,
        data: { id: docRef.id, ...linkData },
      });
    } catch (error: any) {
      console.error('Error creating custom link:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

