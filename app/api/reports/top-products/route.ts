import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { ApiResponse } from '@/types';
import { getTopProducts } from '@/lib/data-layer/top-products';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const datasetId = searchParams.get('dataset_id');
      const websiteId = searchParams.get('website_id');
      const clientId = searchParams.get('client_id') || user.clientId;
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const sortBy = searchParams.get('sort_by') || 'revenue'; // 'revenue' or 'quantity'

      if (!datasetId || !startDate || !endDate) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required parameters: dataset_id, start_date, end_date',
          },
          { status: 400 }
        );
      }

      if (!clientId) {
        return NextResponse.json(
          { success: false, error: 'client_id is required' },
          { status: 400 }
        );
      }

      // Fetch data using data layer
      const data = await getTopProducts({
        datasetId,
        clientId,
        websiteId: websiteId || null,
        startDate,
        endDate,
        limit,
        sortBy: sortBy as 'revenue' | 'quantity',
      });

      return NextResponse.json<ApiResponse<typeof data>>({
        success: true,
        data,
      });
    } catch (error: unknown) {
      console.error('Error fetching top products:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        },
        { status: 500 }
      );
    }
  });
}

