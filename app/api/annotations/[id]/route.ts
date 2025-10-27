import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { adminDb } from '@/lib/firebase/admin';
import { UpdateAnnotation } from '@/types/firestore';

// PUT - Update annotation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(request, async (req, user) => {
    try {
      if (!adminDb) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      const { id: annotationId } = await params;
      const body: UpdateAnnotation & { clientId: string } = await req.json();

      if (!body.clientId) {
        return NextResponse.json(
          { success: false, error: 'Missing clientId' },
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

      const annotationRef = adminDb
        .collection('clients')
        .doc(body.clientId)
        .collection('annotations')
        .doc(annotationId);

      const doc = await annotationRef.get();
      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: 'Annotation not found' },
          { status: 404 }
        );
      }

      // Update annotation
      const updateData: any = {
        ...body,
        updatedAt: new Date().toISOString(),
      };

      delete updateData.clientId; // Don't update clientId

      await annotationRef.update(updateData);

      const updated = await annotationRef.get();

      return NextResponse.json({
        success: true,
        data: updated.data(),
      });
    } catch (error: any) {
      console.error('Error updating annotation:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// DELETE - Delete annotation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(request, async (req, user) => {
    try {
      if (!adminDb) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      const { id: annotationId } = await params;
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

      const annotationRef = adminDb
        .collection('clients')
        .doc(clientId)
        .collection('annotations')
        .doc(annotationId);

      const doc = await annotationRef.get();
      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: 'Annotation not found' },
          { status: 404 }
        );
      }

      // Only allow deletion by creator or admin
      const annotation = doc.data();
      if (user.role !== 'admin' && annotation?.createdBy !== user.uid) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized to delete this annotation' },
          { status: 403 }
        );
      }

      await annotationRef.delete();

      return NextResponse.json({
        success: true,
        message: 'Annotation deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting annotation:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

