// Server-side authentication middleware
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { AppUser } from '@/types/firestore';

export interface AuthenticatedRequest extends NextRequest {
  user?: AppUser;
}

/**
 * Verify Firebase ID token and get user data
 */
export async function verifyAuth(request: NextRequest): Promise<AppUser | null> {
  try {
    // Check if Firebase Admin is initialized
    if (!adminAuth || !adminDb) {
      console.error('Firebase Admin not initialized');
      return null;
    }

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the token
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Get user data from Firestore
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return null;
    }

    return userDoc.data() as AppUser;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

/**
 * Middleware to protect API routes
 */
export async function requireAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: AppUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = await verifyAuth(request);

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return handler(request, user);
}

/**
 * Middleware to require admin role
 */
export async function requireAdmin(
  request: NextRequest,
  handler: (req: NextRequest, user: AppUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = await verifyAuth(request);

  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  return handler(request, user);
}

/**
 * Middleware to require client access to specific client data
 */
export async function requireClientAccess(
  request: NextRequest,
  clientId: string,
  handler: (req: NextRequest, user: AppUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = await verifyAuth(request);

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Admins can access all clients
  if (user.role === 'admin') {
    return handler(request, user);
  }

  // Clients can only access their own data
  if (user.role === 'client' && user.clientId === clientId) {
    return handler(request, user);
  }

  return NextResponse.json(
    { success: false, error: 'Forbidden: Access denied to this client' },
    { status: 403 }
  );
}

