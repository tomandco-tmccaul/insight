import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { adminDb } from '@/lib/firebase/admin';
import { Client } from '@/types/firestore';

// GET - List all clients (admin only)
export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      if (!adminDb) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      // Only admins can list all clients
      if (user.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Admin access required' },
          { status: 403 }
        );
      }

      // Fetch all clients
      const clientsRef = adminDb.collection('clients');
      const snapshot = await clientsRef.get();
      const clients: Client[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        clients.push({
          id: doc.id,
          clientName: data.clientName || doc.id,
          bigQueryDatasetId: data.bigQueryDatasetId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      // Sort clients by name
      clients.sort((a, b) => a.clientName.localeCompare(b.clientName));

      return NextResponse.json({
        success: true,
        data: clients,
      });
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

