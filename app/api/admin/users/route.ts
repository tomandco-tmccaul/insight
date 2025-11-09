import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { auth, db } from '@/lib/firebase/admin';
import { AppUser, Invite } from '@/types/firestore';
import { sendInviteEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
export async function GET(request: NextRequest) {
  return requireAdmin(request, async () => {
    try {
      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }
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
 * Create a new user invitation (admin only)
 * Creates a user account without a password and sends an invite email
 */
export async function POST(request: NextRequest) {
  return requireAdmin(request, async (req, adminUser) => {
    try {
      const body = await request.json();
      const { email, role, clientId } = body;

      if (!email || !role) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: email, role' },
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

      if (!db || !auth) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }

      // Check if user already exists
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
        // User exists, check if they already have an account
        const existingUserDoc = await db.collection('users').doc(userRecord.uid).get();
        if (existingUserDoc.exists()) {
          return NextResponse.json(
            { success: false, error: 'User with this email already exists' },
            { status: 409 }
          );
        }
      } catch (error: any) {
        // User doesn't exist, create new one
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
        
        // Create user in Firebase Auth without password (disabled)
        userRecord = await auth.createUser({
          email,
          emailVerified: false,
          disabled: false, // User is enabled but needs to set password
        });
      }

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

      // Generate invite token
      const inviteToken = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const inviteData: Invite = {
        token: inviteToken,
        email,
        role,
        clientId: role === 'client' ? clientId : null,
        invitedBy: adminUser.uid,
        expiresAt: expiresAt.toISOString(),
        usedAt: null,
        createdAt: now,
      };

      await db.collection('invites').doc(inviteToken).set(inviteData);

      // Generate invite link
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const inviteLink = `${baseUrl}/invite/${inviteToken}`;

      // Send invite email
      try {
        await sendInviteEmail({
          email,
          inviteLink,
          invitedBy: adminUser.email,
        });
      } catch (emailError) {
        console.error('Error sending invite email:', emailError);
        // Don't fail the request if email fails, but log it
      }

      return NextResponse.json({
        success: true,
        data: {
          ...userData,
          inviteSent: true,
        },
      });
    } catch (error: any) {
      console.error('Error creating user invitation:', error);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

