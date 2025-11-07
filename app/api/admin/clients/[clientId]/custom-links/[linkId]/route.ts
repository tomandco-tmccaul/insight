import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { db } from '@/lib/firebase/admin';
import { CustomLink, UpdateCustomLink } from '@/types/firestore';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/clients/[clientId]/custom-links/[linkId]
 * Update a custom link (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; linkId: string }> }
) {
  return requireAuth(request, async (req, user) => {
    try {
      const { clientId, linkId } = await params;

      // Only admins can update custom links
      if (user.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Admin only' },
          { status: 403 }
        );
      }

      const body: UpdateCustomLink = await request.json();

      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      const linkRef = db
        .collection('clients')
        .doc(clientId)
        .collection('customLinks')
        .doc(linkId);

      const linkDoc = await linkRef.get();

      if (!linkDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Custom link not found' },
          { status: 404 }
        );
      }

      const updates = {
        ...body,
        updatedAt: new Date().toISOString(),
      };

      await linkRef.update(updates);

      const updatedLink: CustomLink = {
        id: linkId,
        ...linkDoc.data(),
        ...updates,
      } as CustomLink;

      return NextResponse.json({
        success: true,
        data: updatedLink,
      });
    } catch (error: any) {
      console.error('Error updating custom link:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/admin/clients/[clientId]/custom-links/[linkId]
 * Delete a custom link (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; linkId: string }> }
) {
  return requireAuth(request, async (req, user) => {
    try {
      const { clientId, linkId } = await params;

      // Only admins can delete custom links
      if (user.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Admin only' },
          { status: 403 }
        );
      }

      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      const linkRef = db
        .collection('clients')
        .doc(clientId)
        .collection('customLinks')
        .doc(linkId);

      const linkDoc = await linkRef.get();

      if (!linkDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Custom link not found' },
          { status: 404 }
        );
      }

      await linkRef.delete();

      return NextResponse.json({
        success: true,
        message: 'Custom link deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting custom link:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

