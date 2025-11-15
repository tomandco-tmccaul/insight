import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { ApiResponse } from '@/types';
import { getCollectionsPerformance } from '@/lib/data-layer/collections-performance';

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
      const sortBy = searchParams.get('sort_by') || 'revenue'; // 'revenue' for main, 'qty' for sample
      
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
      const data = await getCollectionsPerformance({
        datasetId,
        clientId,
        websiteId: websiteId || null,
        startDate,
        endDate,
        orderType: orderType as 'main' | 'sample',
        sortBy: sortBy as 'revenue' | 'qty',
        limit: 20,
      });

      return NextResponse.json<ApiResponse<typeof data>>({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Error fetching collections performance:', error);
      // If the products table doesn't exist or query fails, return empty array
      // This allows the UI to still render without breaking
      return NextResponse.json<ApiResponse<[]>>({
        success: true,
        data: [],
      });
    }
  });
}

