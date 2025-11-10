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
      if (!db || !auth) {
        return NextResponse.json(
          { success: false, error: 'Database not initialized' },
          { status: 500 }
        );
      }
      const usersSnapshot = await db.collection('users').get();
      
      // Enrich user data with Firebase Auth metadata
      const users: AppUser[] = await Promise.all(
        usersSnapshot.docs.map(async (doc) => {
          const userData = doc.data() as AppUser;
          const uid = doc.id;
          
          try {
            // Get Firebase Auth user metadata
            const firebaseUser = await auth.getUser(uid);
            
            // Sync lastSignInTime from Firebase Auth if available
            if (firebaseUser.metadata.lastSignInTime) {
              const lastSignInTime = new Date(firebaseUser.metadata.lastSignInTime).toISOString();
              // Only update if Firestore doesn't have it or Firebase Auth has a newer value
              if (!userData.lastLoggedInAt || lastSignInTime > userData.lastLoggedInAt) {
                userData.lastLoggedInAt = lastSignInTime;
              }
            }
            
            // Sync emailVerified status
            if (firebaseUser.emailVerified && !userData.verifiedAt) {
              // Email is verified but we don't have verifiedAt timestamp
              // We'll set it to creation time or current time as fallback
              userData.verifiedAt = firebaseUser.metadata.creationTime 
                ? new Date(firebaseUser.metadata.creationTime).toISOString()
                : new Date().toISOString();
            }
          } catch (error: any) {
            // If user doesn't exist in Firebase Auth, skip metadata sync
            if (error.code !== 'auth/user-not-found') {
              console.error(`Error fetching Firebase Auth data for user ${uid}:`, error);
            }
          }
          
          return {
            uid,
            ...userData,
          } as AppUser;
        })
      );

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
      let isExistingUser = false;
      try {
        userRecord = await auth.getUserByEmail(email);
        isExistingUser = true;
        // User exists, check if they already have an account
        const existingUserDoc = await db.collection('users').doc(userRecord.uid).get();
        if (existingUserDoc.exists) {
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

      // Sync Firebase Auth metadata if available
      if (isExistingUser) {
        // Set verifiedAt if email is already verified
        if (userRecord.emailVerified) {
          // Use creation time as verifiedAt (email was verified at account creation)
          // or lastSignInTime if that's earlier (conservative approach)
          const creationTime = userRecord.metadata.creationTime 
            ? new Date(userRecord.metadata.creationTime).getTime()
            : null;
          const lastSignInTime = userRecord.metadata.lastSignInTime
            ? new Date(userRecord.metadata.lastSignInTime).getTime()
            : null;
          
          // Use the earliest available timestamp, or current time as fallback
          if (creationTime) {
            userData.verifiedAt = new Date(Math.min(creationTime, lastSignInTime || creationTime)).toISOString();
          } else {
            userData.verifiedAt = now;
          }
        }
        
        // Sync lastSignInTime from Firebase Auth metadata
        if (userRecord.metadata.lastSignInTime) {
          userData.lastLoggedInAt = new Date(userRecord.metadata.lastSignInTime).toISOString();
        }
      }

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
        invitedBy: adminUser?.uid || 'system', // Use 'system' if no admin user (first admin creation)
        expiresAt: expiresAt.toISOString(),
        usedAt: null,
        createdAt: now,
      };

      await db.collection('invites').doc(inviteToken).set(inviteData);

      // Generate invite link
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const inviteLink = `${baseUrl}/invite/${inviteToken}`;

      // Generate password reset link using Firebase Auth
      // This will be sent via Firebase's email service if SMTP is configured
      let passwordResetLink: string | null = null;
      try {
        const actionCodeSettings = {
          url: inviteLink, // Redirect to our invite page
          handleCodeInApp: false,
        };
        passwordResetLink = await auth.generatePasswordResetLink(email, actionCodeSettings);
        
        // Store the password reset link in the invite document
        await db.collection('invites').doc(inviteToken).update({
          passwordResetLink,
        });
      } catch (linkError: any) {
        console.error('Error generating password reset link:', linkError);
        // Continue without password reset link - user can still use invite token
      }

      // Send invite email via Firebase Auth
      // Note: Firebase will send the password reset email automatically if SMTP is configured
      // Configure SMTP at: Firebase Console > Authentication > Templates > SMTP settings
      try {
        await sendInviteEmail({
          email,
          inviteLink,
          invitedBy: adminUser?.email || 'System',
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

