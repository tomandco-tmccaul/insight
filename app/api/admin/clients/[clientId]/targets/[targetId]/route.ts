import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { db } from '@/lib/firebase/admin';
import { Target } from '@/types/firestore';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/clients/[clientId]/targets/[targetId]
 * Update a target
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ clientId: string; targetId: string }> }
) {
    return requireAuth(request, async (req, user) => {
        try {
            const { clientId, targetId } = await params;

            // Check authorization
            if (user.role !== 'admin' && user.clientId !== clientId) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized' },
                    { status: 403 }
                );
            }

            if (!db) {
                return NextResponse.json(
                    { success: false, error: 'Database not initialized' },
                    { status: 500 }
                );
            }

            const body = await request.json();
            const { metric, granularity, startDate, endDate, value, websiteId, periodName } = body;

            // Validate required fields if they are present (partial update allowed, but critical fields shouldn't be nullified)
            // For simplicity, we'll assume a full update payload or check what's provided.
            // But usually PUT implies replacing the resource or at least providing the main fields.
            // Let's allow partial updates (PATCH style) or full updates.
            // However, if dates are provided, validate them.

            if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
                return NextResponse.json(
                    { success: false, error: 'Start date must be before end date' },
                    { status: 400 }
                );
            }

            const updateData: Partial<Target> = {
                updatedAt: new Date().toISOString(),
            };

            if (metric) updateData.metric = metric;
            if (granularity) updateData.granularity = granularity;
            if (periodName !== undefined) updateData.periodName = periodName;
            if (startDate) updateData.startDate = startDate;
            if (endDate) updateData.endDate = endDate;
            if (value !== undefined) updateData.value = value;
            if (websiteId) updateData.websiteId = websiteId;

            await db
                .collection('clients')
                .doc(clientId)
                .collection('targets')
                .doc(targetId)
                .update(updateData);

            return NextResponse.json({
                success: true,
                data: { id: targetId, ...updateData },
            });
        } catch (error: any) {
            console.error('Error updating target:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }
    });
}

/**
 * DELETE /api/admin/clients/[clientId]/targets/[targetId]
 * Delete a target
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ clientId: string; targetId: string }> }
) {
    return requireAuth(request, async (req, user) => {
        try {
            const { clientId, targetId } = await params;

            // Check authorization
            if (user.role !== 'admin' && user.clientId !== clientId) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized' },
                    { status: 403 }
                );
            }

            if (!db) {
                return NextResponse.json(
                    { success: false, error: 'Database not initialized' },
                    { status: 500 }
                );
            }

            await db
                .collection('clients')
                .doc(clientId)
                .collection('targets')
                .doc(targetId)
                .delete();

            return NextResponse.json({
                success: true,
                data: { id: targetId },
            });
        } catch (error: any) {
            console.error('Error deleting target:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }
    });
}
