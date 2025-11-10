import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { db, auth } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/users/me
 * Sync Firebase Auth metadata (lastSignInTime, emailVerified) to Firestore
 * Called automatically on successful login to keep Firestore in sync with Firebase Auth
 */
export async function POST(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      if (!db || !auth) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      // Get Firebase Auth user to sync metadata
      const firebaseUser = await auth.getUser(user.uid);
      const now = new Date().toISOString();

      const updates: Record<string, string> = {
        updatedAt: now,
      };

      // Sync lastSignInTime from Firebase Auth metadata
      if (firebaseUser.metadata.lastSignInTime) {
        updates.lastLoggedInAt = new Date(firebaseUser.metadata.lastSignInTime).toISOString();
      }

      // If email is verified and verifiedAt is not set, set it now
      if (firebaseUser.emailVerified && !user.verifiedAt) {
        updates.verifiedAt = now;
      }

      await db.collection('users').doc(user.uid).update(updates);

      return NextResponse.json({
        success: true,
        data: {
          ...user,
          ...updates,
        },
      });
    } catch (error: any) {
      console.error('Error syncing user metadata:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

