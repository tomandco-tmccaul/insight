import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { db } from '@/lib/firebase/admin';
import { Target } from '@/types/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/clients/[clientId]/targets
 * List all targets for a client
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  return requireAuth(request, async (req, user) => {
    try {
      const { clientId } = await params;

      // Check authorization
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

      const targetsSnapshot = await db
        .collection('clients')
        .doc(clientId)
        .collection('targets')
        .get();

      const targets: Target[] = targetsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Target));

      return NextResponse.json({
        success: true,
        data: targets,
      });
    } catch (error: any) {
      console.error('Error fetching targets:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/admin/clients/[clientId]/targets
 * Create a new target for a client
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  return requireAuth(request, async (req, user) => {
    try {
      const { clientId } = await params;

      // Check authorization
      if (user.role !== 'admin' && user.clientId !== clientId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const { metric, granularity, startDate, endDate, value, websiteId, periodName } = body;

      if (!metric || !granularity || !startDate || !endDate || value === undefined || !websiteId) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      if (new Date(startDate) > new Date(endDate)) {
        return NextResponse.json(
          { success: false, error: 'Start date must be before end date' },
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
      const targetData: Omit<Target, 'id'> = {
        metric,
        granularity,
        periodName: periodName || '',
        startDate,
        endDate,
        value,
        websiteId,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await db
        .collection('clients')
        .doc(clientId)
        .collection('targets')
        .add(targetData);

      return NextResponse.json({
        success: true,
        data: { id: docRef.id, ...targetData },
      });
    } catch (error: any) {
      console.error('Error creating target:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

