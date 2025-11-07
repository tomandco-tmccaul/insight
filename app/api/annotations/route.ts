import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { adminDb } from '@/lib/firebase/admin';
import { Annotation, CreateAnnotation } from '@/types/firestore';

// GET - List annotations for a client
export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      if (!adminDb) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      const { searchParams } = new URL(req.url);
      const clientId = searchParams.get('clientId');

      if (!clientId) {
        return NextResponse.json(
          { success: false, error: 'Missing clientId parameter' },
          { status: 400 }
        );
      }

      // Check authorization
      if (user.role === 'client' && user.clientId !== clientId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Fetch annotations
      const annotationsRef = adminDb
        .collection('clients')
        .doc(clientId)
        .collection('annotations')
        .orderBy('startDate', 'desc');

      const snapshot = await annotationsRef.get();
      const annotations: Annotation[] = [];

      snapshot.forEach((doc) => {
        annotations.push(doc.data() as Annotation);
      });

      return NextResponse.json({
        success: true,
        data: annotations,
      });
    } catch (error: any) {
      console.error('Error fetching annotations:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// POST - Create new annotation
export async function POST(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      if (!adminDb) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      const body: CreateAnnotation = await req.json();

      // Validate required fields
      if (!body.clientId || !body.title || !body.startDate) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Check authorization
      if (user.role === 'client' && user.clientId !== body.clientId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Create annotation
      const annotationRef = adminDb
        .collection('clients')
        .doc(body.clientId)
        .collection('annotations')
        .doc();

      // Ensure user.uid is defined
      if (!user.uid) {
        console.error('User object missing uid:', user);
        return NextResponse.json(
          { success: false, error: 'User authentication error: missing uid' },
          { status: 500 }
        );
      }

      const annotation: Annotation = {
        id: annotationRef.id,
        clientId: body.clientId,
        websiteId: body.websiteId || null,
        title: body.title,
        description: body.description || '',
        type: body.type,
        startDate: body.startDate,
        endDate: body.endDate || body.startDate,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await annotationRef.set(annotation);

      return NextResponse.json({
        success: true,
        data: annotation,
      });
    } catch (error: any) {
      console.error('Error creating annotation:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

