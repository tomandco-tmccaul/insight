import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { auth, db } from '@/lib/firebase/admin';
import { AppUser, UpdateAppUser } from '@/types/firestore';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/users/[userId]
 * Update a user (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return requireAdmin(request, async () => {
    try {
      const { userId } = await params;
      const body = await request.json();
      const updates = body as UpdateAppUser;

      // Validate role if being updated
      if (updates.role && updates.role !== 'admin' && updates.role !== 'client') {
        return NextResponse.json(
          { success: false, error: 'Role must be either "admin" or "client"' },
          { status: 400 }
        );
      }

      // If changing to client role, require clientId
      if (updates.role === 'client' && !updates.clientId) {
        return NextResponse.json(
          { success: false, error: 'clientId is required for client users' },
          { status: 400 }
        );
      }

      // If changing to admin role, clear clientId
      if (updates.role === 'admin') {
        updates.clientId = null;
      }

      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await db.collection('users').doc(userId).update(updatedData);

      const updatedUser: AppUser = {
        uid: userId,
        ...userDoc.data(),
        ...updatedData,
      } as AppUser;

      return NextResponse.json({
        success: true,
        data: updatedUser,
      });
    } catch (error: any) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/admin/users/[userId]
 * Delete a user (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return requireAdmin(request, async () => {
    try {
      const { userId } = await params;

      // Delete from Firebase Auth
      await auth.deleteUser(userId);

      // Delete from Firestore
      await db.collection('users').doc(userId).delete();

      return NextResponse.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

