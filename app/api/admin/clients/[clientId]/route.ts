import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { db } from '@/lib/firebase/admin';
import { Client, UpdateClient } from '@/types/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/clients/[clientId]
 * Get a specific client (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  return requireAdmin(request, async () => {
    try {
      const { clientId } = await params;
      const clientDoc = await db.collection('clients').doc(clientId).get();

      if (!clientDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Client not found' },
          { status: 404 }
        );
      }

      const client: Client = {
        id: clientDoc.id,
        ...clientDoc.data(),
      } as Client;

      return NextResponse.json({
        success: true,
        data: client,
      });
    } catch (error: any) {
      console.error('Error fetching client:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * PATCH /api/admin/clients/[clientId]
 * Update a client (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  return requireAdmin(request, async () => {
    try {
      const { clientId } = await params;
      const body = await request.json();
      const updates = body as UpdateClient;

      const clientDoc = await db.collection('clients').doc(clientId).get();
      if (!clientDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Client not found' },
          { status: 404 }
        );
      }

      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await db.collection('clients').doc(clientId).update(updatedData);

      const updatedClient: Client = {
        id: clientId,
        ...clientDoc.data(),
        ...updatedData,
      } as Client;

      return NextResponse.json({
        success: true,
        data: updatedClient,
      });
    } catch (error: any) {
      console.error('Error updating client:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/admin/clients/[clientId]
 * Delete a client and all subcollections (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  return requireAdmin(request, async () => {
    try {
      const { clientId } = await params;

      // Delete all subcollections first
      const subcollections = ['websites', 'targets', 'annotations', 'customLinks'];
      
      for (const subcollection of subcollections) {
        const snapshot = await db
          .collection('clients')
          .doc(clientId)
          .collection(subcollection)
          .get();
        
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      // Delete the client document
      await db.collection('clients').doc(clientId).delete();

      return NextResponse.json({
        success: true,
        message: 'Client deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting client:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

