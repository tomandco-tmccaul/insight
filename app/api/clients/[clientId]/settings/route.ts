import { NextRequest, NextResponse } from 'next/server';
import { requireClientAccess } from '@/lib/auth/middleware';
import { db } from '@/lib/firebase/admin';
import { Client } from '@/types/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clients/[clientId]/settings
 * Get client settings (accessible by the client and admins)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ clientId: string }> }
) {
    const { clientId } = await params;

    return requireClientAccess(request, clientId, async () => {
        try {
            if (!db) {
                return NextResponse.json(
                    { success: false, error: 'Database not initialized' },
                    { status: 500 }
                );
            }

            const clientDoc = await db.collection('clients').doc(clientId).get();

            if (!clientDoc.exists) {
                return NextResponse.json(
                    { success: false, error: 'Client not found' },
                    { status: 404 }
                );
            }

            const data = clientDoc.data();

            // Only return necessary settings, not sensitive info if any
            const settings = {
                disabledMenuItems: data?.disabledMenuItems || [],
                currencySettings: data?.currencySettings,
            };

            return NextResponse.json({
                success: true,
                data: settings,
            });
        } catch (error: any) {
            console.error('Error fetching client settings:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }
    });
}
