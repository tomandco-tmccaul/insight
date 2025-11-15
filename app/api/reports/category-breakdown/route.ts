import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { ApiResponse } from '@/types';
import { getCategoryBreakdown } from '@/lib/data-layer/category-breakdown';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      
      const datasetId = searchParams.get('dataset_id');
      const websiteId = searchParams.get('website_id');
      const clientId = searchParams.get('client_id') || user.clientId;
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      const orderType = searchParams.get('order_type') || 'main'; // 'main' or 'sample'
      
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
      const data = await getCategoryBreakdown({
        datasetId,
        clientId,
        websiteId: websiteId || null,
        startDate,
        endDate,
        orderType: orderType as 'main' | 'sample',
      });

      return NextResponse.json<ApiResponse<typeof data>>({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Error fetching category breakdown:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

