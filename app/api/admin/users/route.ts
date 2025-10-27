import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { auth, db } from '@/lib/firebase/admin';
import { AppUser } from '@/types/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
export async function GET(request: NextRequest) {
  return requireAdmin(request, async () => {
    try {
      const usersSnapshot = await db.collection('users').get();
      
      const users: AppUser[] = usersSnapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      } as AppUser));

      return NextResponse.json({
        success: true,
        data: users,
      });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
export async function POST(request: NextRequest) {
  return requireAdmin(request, async () => {
    try {
      const body = await request.json();
      const { email, password, role, clientId } = body;

      if (!email || !password || !role) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: email, password, role' },
          { status: 400 }
        );
      }

      if (role !== 'admin' && role !== 'client') {
        return NextResponse.json(
          { success: false, error: 'Role must be either "admin" or "client"' },
          { status: 400 }
        );
      }

      if (role === 'client' && !clientId) {
        return NextResponse.json(
          { success: false, error: 'clientId is required for client users' },
          { status: 400 }
        );
      }

      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        emailVerified: true,
      });

      // Create user document in Firestore
      const now = new Date().toISOString();
      const userData: AppUser = {
        uid: userRecord.uid,
        email: userRecord.email!,
        role,
        clientId: role === 'client' ? clientId : null,
        createdAt: now,
        updatedAt: now,
      };

      await db.collection('users').doc(userRecord.uid).set(userData);

      return NextResponse.json({
        success: true,
        data: userData,
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 409 }
        );
      }
      
      if (error.code === 'auth/invalid-password') {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

