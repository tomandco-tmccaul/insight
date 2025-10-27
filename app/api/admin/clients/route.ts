import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/auth/middleware';
import { db } from '@/lib/firebase/admin';
import { Client, CreateClient } from '@/types/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/clients
 * List all clients (admin only)
 */
export async function GET(request: NextRequest) {
  return requireAdmin(request, async () => {
    try {
      const clientsSnapshot = await db.collection('clients').get();
      
      const clients: Client[] = clientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Client));

      return NextResponse.json({
        success: true,
        data: clients,
      });
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/admin/clients
 * Create a new client (admin only)
 */
export async function POST(request: NextRequest) {
  return requireAdmin(request, async () => {
    try {
      const body = await request.json();
      const { id, clientName, bigQueryDatasetId } = body as CreateClient & { id: string };

      if (!id || !clientName || !bigQueryDatasetId) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: id, clientName, bigQueryDatasetId' },
          { status: 400 }
        );
      }

      // Check if client already exists
      const existingClient = await db.collection('clients').doc(id).get();
      if (existingClient.exists) {
        return NextResponse.json(
          { success: false, error: 'Client ID already exists' },
          { status: 409 }
        );
      }

      const now = new Date().toISOString();
      const clientData: Client = {
        id,
        clientName,
        bigQueryDatasetId,
        createdAt: now,
        updatedAt: now,
      };

      await db.collection('clients').doc(id).set(clientData);

      return NextResponse.json({
        success: true,
        data: clientData,
      });
    } catch (error: any) {
      console.error('Error creating client:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

