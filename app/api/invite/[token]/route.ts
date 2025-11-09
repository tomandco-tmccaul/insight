import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase/admin';
import { Invite } from '@/types/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/invite/[token]
 * Verify invite token and return invite details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const inviteDoc = await db.collection('invites').doc(token).get();

    if (!inviteDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Invalid invite token' },
        { status: 404 }
      );
    }

    const inviteData = inviteDoc.data() as Invite;

    // Check if invite has expired
    if (new Date(inviteData.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Invite has expired' },
        { status: 410 }
      );
    }

    // Check if invite has already been used
    if (inviteData.usedAt) {
      return NextResponse.json(
        { success: false, error: 'Invite has already been used' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        email: inviteData.email,
        role: inviteData.role,
        clientId: inviteData.clientId,
      },
    });
  } catch (error: any) {
    console.error('Error verifying invite:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invite/[token]
 * Accept invite by setting password
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (!db || !auth) {
      return NextResponse.json(
        { success: false, error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const inviteDoc = await db.collection('invites').doc(token).get();

    if (!inviteDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Invalid invite token' },
        { status: 404 }
      );
    }

    const inviteData = inviteDoc.data() as Invite;

    // Check if invite has expired
    if (new Date(inviteData.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Invite has expired' },
        { status: 410 }
      );
    }

    // Check if invite has already been used
    if (inviteData.usedAt) {
      return NextResponse.json(
        { success: false, error: 'Invite has already been used' },
        { status: 410 }
      );
    }

    // Get user by email
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(inviteData.email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { success: false, error: 'User account not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Update user password
    await auth.updateUser(userRecord.uid, {
      password,
      emailVerified: true,
    });

    // Mark invite as used
    await db.collection('invites').doc(token).update({
      usedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
    });
  } catch (error: any) {
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

