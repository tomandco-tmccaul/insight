import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { ApiResponse } from '@/types';
import { getSampleOrdersSummary } from '@/lib/data-layer/sample-orders-summary';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      
      const datasetId = searchParams.get('dataset_id');
      const websiteId = searchParams.get('website_id');
      const clientId = searchParams.get('client_id') || user.clientId;
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      
      if (!datasetId || !startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameters' },
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
      const data = await getSampleOrdersSummary({
        datasetId,
        clientId,
        websiteId: websiteId || null,
        startDate,
        endDate,
      });

      return NextResponse.json<ApiResponse<typeof data>>({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Error fetching sample orders summary:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

