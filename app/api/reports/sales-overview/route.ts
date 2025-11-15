import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getSalesOverview } from '@/lib/data-layer/sales-overview';

export async function GET(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      
      // Get query parameters
      const datasetId = searchParams.get('dataset_id');
      const websiteId = searchParams.get('website_id');
      const clientId = searchParams.get('client_id') || user.clientId;
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      const excludeSampleOrders = searchParams.get('exclude_sample_orders') === 'true';
      
      // Validation
      if (!datasetId) {
        return NextResponse.json(
          { success: false, error: 'dataset_id is required' },
          { status: 400 }
        );
      }
      
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'start_date and end_date are required' },
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
      const data = await getSalesOverview({
        datasetId,
        clientId,
        websiteId: websiteId || null,
        startDate,
        endDate,
        excludeSampleOrders,
      });
      
      return NextResponse.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Error fetching sales overview:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

