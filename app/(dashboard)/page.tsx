'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { Card } from '@/components/ui/card';
import { useDashboard } from '@/lib/context/dashboard-context';
import { 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  MousePointerClick,
  DollarSign,
  Target
} from 'lucide-react';

export default function OverviewPage() {
  const { selectedClientId } = useDashboard();

  if (!selectedClientId) {
    return (
      <ProtectedRoute>
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">No Client Selected</h3>
            <p className="mt-2 text-gray-600">Please select a client to view the overview</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
          <p className="mt-2 text-gray-600">
            High-level performance across all stores and data sources
          </p>
        </div>

        {/* Coming Soon Notice */}
        <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="rounded-full bg-blue-100 p-4">
              <TrendingUp className="h-10 w-10 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Comprehensive Overview Dashboard</h2>
              <p className="mt-2 text-gray-600 max-w-2xl">
                This page will provide a unified view of your performance across all stores and data sources.
              </p>
            </div>
          </div>
        </Card>

        {/* Planned Metrics Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Sales Metrics */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-green-100 p-2">
                <ShoppingCart className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Sales Metrics</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Total Sales (Adobe Commerce)</li>
              <li>• Number of Orders</li>
              <li>• Average Order Value</li>
              <li>• Items per Order</li>
            </ul>
          </Card>

          {/* Traffic & Conversion */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-blue-100 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Traffic & Conversion</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Total Sessions (GA4)</li>
              <li>• Unique Visitors (GA4)</li>
              <li>• Conversion Rate</li>
              <li>• Bounce Rate (GA4)</li>
            </ul>
          </Card>

          {/* Marketing Performance */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-purple-100 p-2">
                <MousePointerClick className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Marketing Performance</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Total Media Spend</li>
              <li>• Blended ROAS</li>
              <li>• Cost per Acquisition</li>
              <li>• Channel Breakdown</li>
            </ul>
          </Card>

          {/* Returns & Targets */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-orange-100 p-2">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Returns & Targets</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Return Rate (%)</li>
              <li>• Revenue vs Target</li>
              <li>• Target Achievement</li>
              <li>• Period Comparison</li>
            </ul>
          </Card>
        </div>

        {/* Planned Features */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Sales Trends Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Sales Trends</h3>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500">Line chart showing sales trends over time</p>
              <p className="text-sm text-gray-400 mt-2">Filterable by date range</p>
            </div>
          </Card>

          {/* Revenue vs Target */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Revenue vs Target</h3>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500">Bar chart comparing actual vs target revenue</p>
              <p className="text-sm text-gray-400 mt-2">Targets from Firestore</p>
            </div>
          </Card>

          {/* Top Products Snapshot */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Products</h3>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500">Snapshot of best-selling products</p>
              <p className="text-sm text-gray-400 mt-2">By revenue and quantity</p>
            </div>
          </Card>

          {/* Channel Performance */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Channel Performance</h3>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500">Marketing channel comparison</p>
              <p className="text-sm text-gray-400 mt-2">Google Ads, META, Pinterest, Organic</p>
            </div>
          </Card>
        </div>

        {/* Data Sources Info */}
        <Card className="p-6 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📡 Data Sources</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">E-Commerce</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Adobe Commerce (Magento)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Analytics</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Google Analytics 4</li>
                <li>• Google Search Console</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Advertising</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Google Ads</li>
                <li>• Facebook/META Ads</li>
                <li>• Pinterest Ads</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Implementation Note */}
        <Card className="p-6 border-l-4 border-blue-500">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="rounded-full bg-blue-100 p-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Implementation Roadmap</h4>
              <p className="text-sm text-gray-600 mb-3">
                This overview page will aggregate data from all sources to provide a comprehensive view of performance:
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span><strong>Phase 1:</strong> Adobe Commerce sales data (orders, revenue, AOV)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">○</span>
                  <span><strong>Phase 2:</strong> GA4 integration (traffic, sessions, conversion rate)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">○</span>
                  <span><strong>Phase 3:</strong> Advertising platforms (spend, ROAS, CPA)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">○</span>
                  <span><strong>Phase 4:</strong> Returns calculation and target tracking</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

