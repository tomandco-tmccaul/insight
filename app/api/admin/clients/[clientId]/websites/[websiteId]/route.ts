import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { db } from '@/lib/firebase/admin';
import { Website, UpdateWebsite } from '@/types/firestore';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/clients/[clientId]/websites/[websiteId]
 * Update a website (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; websiteId: string }> }
) {
  return requireAdmin(request, async () => {
    try {
      const { clientId, websiteId } = await params;
      const body = await request.json();
      const updates = body as UpdateWebsite;

      const websiteDoc = await db
        .collection('clients')
        .doc(clientId)
        .collection('websites')
        .doc(websiteId)
        .get();

      if (!websiteDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Website not found' },
          { status: 404 }
        );
      }

      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await db
        .collection('clients')
        .doc(clientId)
        .collection('websites')
        .doc(websiteId)
        .update(updatedData);

      const updatedWebsite: Website = {
        id: websiteId,
        ...websiteDoc.data(),
        ...updatedData,
      } as Website;

      return NextResponse.json({
        success: true,
        data: updatedWebsite,
      });
    } catch (error: any) {
      console.error('Error updating website:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/admin/clients/[clientId]/websites/[websiteId]
 * Delete a website (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; websiteId: string }> }
) {
  return requireAdmin(request, async () => {
    try {
      const { clientId, websiteId } = await params;

      await db
        .collection('clients')
        .doc(clientId)
        .collection('websites')
        .doc(websiteId)
        .delete();

      return NextResponse.json({
        success: true,
        message: 'Website deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting website:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

