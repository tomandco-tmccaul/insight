'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function CustomersPage() {
  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Insights</h1>
          <p className="mt-2 text-gray-600">
            Analyze customer behavior, demographics, and lifetime value
          </p>
        </div>

        {/* Coming Soon Notice */}
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="rounded-full bg-blue-100 p-3">
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Coming Soon</h2>
              <p className="mt-2 text-gray-600 max-w-md">
                Customer Insights will be available in a future release. This section will include:
              </p>
            </div>
            <div className="mt-4 text-left max-w-2xl">
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span><strong>Active Users:</strong> Daily, weekly, and monthly active user counts from GA4</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span><strong>New vs. Returning Customers:</strong> Customer segmentation with revenue breakdown</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span><strong>Customer Demographics:</strong> Age, gender, and location analysis with revenue attribution</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span><strong>Customer Lifetime Value (CLV):</strong> Long-term customer value analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span><strong>Customer Acquisition Cost (CAC):</strong> Overall cost to acquire new customers</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

