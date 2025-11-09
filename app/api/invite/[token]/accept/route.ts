import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase/admin';
import { Invite } from '@/types/firestore';
import { verifyAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * POST /api/invite/[token]/accept
 * Mark invite as used (called after successful Google auth)
 * Verifies the authenticated user's email matches the invite
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!db || !auth) {
      return NextResponse.json(
        { success: false, error: 'Database not initialized' },
        { status: 500 }
      );
    }

    // Verify user is authenticated
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
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

    // Verify email matches the authenticated user
    if (inviteData.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Email does not match invite' },
        { status: 400 }
      );
    }

    // Check if invite has expired
    if (new Date(inviteData.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Invite has expired' },
        { status: 410 }
      );
    }

    // Mark invite as used
    await db.collection('invites').doc(token).update({
      usedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Invite accepted',
    });
  } catch (error: any) {
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

