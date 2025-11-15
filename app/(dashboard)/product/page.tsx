'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useIdToken } from '@/lib/auth/hooks';
import { apiRequest, buildQueryString } from '@/lib/utils/api';
import { formatCurrency, formatNumber } from '@/lib/utils/date';
import { TrendingUp, TrendingDown, Package } from 'lucide-react';
import { ReportAnnotations } from '@/components/dashboard/report-annotations';
import { PageHeader } from '@/components/dashboard/page-header';

interface ProductData {
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity_sold: number;
  total_revenue: number;
  total_orders: number;
  avg_price: number;
  quantity_returned: number;
  stock_level: number;
  return_rate: number;
}

export default function ProductPage() {
  const { selectedClientId, selectedWebsiteId, dateRange } = useDashboard();
  const getIdToken = useIdToken();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Fetch website's store ID when selection changes
  useEffect(() => {
    async function fetchWebsiteData() {
      if (!selectedClientId || !selectedWebsiteId || selectedWebsiteId === 'all_combined') {
        setStoreId(null);
        return;
      }

      try {
        const idToken = await getIdToken();
        const response = await apiRequest<{ id: string; websiteName: string; storeId: string; isGrouped?: boolean }>(
          `/api/admin/clients/${selectedClientId}/websites/${selectedWebsiteId}`,
          {},
          idToken || undefined
        );

        if (response.success && response.data) {
          // Grouped websites don't need a storeId - they aggregate data from multiple websites
          if (response.data.isGrouped) {
            setStoreId(null); // Grouped websites don't use storeId
          } else {
            setStoreId(response.data.storeId);
          }
        } else {
          setError('Failed to fetch website data');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      }
    }

    fetchWebsiteData();
  }, [selectedClientId, selectedWebsiteId, getIdToken]);

  useEffect(() => {
    async function fetchData() {
      if (!selectedWebsiteId) {
        setLoading(false);
        return;
      }

      // Wait for storeId if we have a specific website selected
      if (selectedWebsiteId !== 'all_combined' && !storeId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const idToken = await getIdToken();
        
        // Always use selectedWebsiteId - the data layer will resolve it to BigQuery website IDs
        const websiteFilter = selectedWebsiteId === 'all_combined' ? 'all_combined' : selectedWebsiteId || 'all_combined';

        const queryString = buildQueryString({
          websiteId: websiteFilter,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          limit: '100',
        });

        const response = await apiRequest<ProductData[]>(
          `/api/products/performance${queryString}`,
          {},
          idToken || undefined
        );

        if (response.success && response.data) {
          setProducts(response.data);
        } else {
          setError(response.error || 'Failed to fetch data');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedWebsiteId, dateRange, getIdToken]);

  if (!selectedWebsiteId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Website Selected</h3>
          <p className="mt-2 text-gray-600">Please select a website from the header to view data</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <ProductSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600">Error Loading Data</h3>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Sort products by different criteria
  const bestSelling = [...products].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 20);
  const slowSelling = [...products].sort((a, b) => a.quantity_sold - b.quantity_sold).slice(0, 20);
  const highReturns = [...products]
    .filter((p) => p.quantity_returned > 0)
    .sort((a, b) => b.return_rate - a.return_rate)
    .slice(0, 20);
  const lowStock = [...products]
    .filter((p) => p.stock_level < 10)
    .sort((a, b) => a.stock_level - b.stock_level)
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Performance"
        description="Analyze product sales, inventory, and returns"
      />

      <ReportAnnotations />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6 h-full flex flex-col">
          <div className="text-sm font-medium text-gray-600">Total Products</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 flex-1">
            {formatNumber(products.length)}
          </div>
        </Card>
        <Card className="p-6 h-full flex flex-col">
          <div className="text-sm font-medium text-gray-600">Total Revenue</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 flex-1">
            {formatCurrency(products.reduce((sum, p) => sum + p.total_revenue, 0))}
          </div>
        </Card>
        <Card className="p-6 h-full flex flex-col">
          <div className="text-sm font-medium text-gray-600">Units Sold</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 flex-1">
            {formatNumber(products.reduce((sum, p) => sum + p.quantity_sold, 0))}
          </div>
        </Card>
        <Card className="p-6 h-full flex flex-col">
          <div className="text-sm font-medium text-gray-600">Low Stock Items</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 flex-1">
            {formatNumber(lowStock.length)}
          </div>
        </Card>
      </div>

      {/* Product Tables */}
      <Tabs defaultValue="best-selling" className="space-y-4">
        <TabsList>
          <TabsTrigger value="best-selling">Best Selling</TabsTrigger>
          <TabsTrigger value="slow-selling">Slow Selling</TabsTrigger>
          <TabsTrigger value="high-returns">High Returns</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="best-selling">
          <ProductTable products={bestSelling} showRevenue />
        </TabsContent>

        <TabsContent value="slow-selling">
          <ProductTable products={slowSelling} showRevenue />
        </TabsContent>

        <TabsContent value="high-returns">
          <ProductTable products={highReturns} showReturns />
        </TabsContent>

        <TabsContent value="low-stock">
          <ProductTable products={lowStock} showStock />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductTable({
  products,
  showRevenue = false,
  showReturns = false,
  showStock = false,
}: {
  products: ProductData[];
  showRevenue?: boolean;
  showReturns?: boolean;
  showStock?: boolean;
}) {
  if (products.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-gray-500">No products found</div>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Qty Sold</TableHead>
            {showRevenue && <TableHead className="text-right">Revenue</TableHead>}
            {showReturns && <TableHead className="text-right">Returns</TableHead>}
            {showReturns && <TableHead className="text-right">Return Rate</TableHead>}
            {showStock && <TableHead className="text-right">Stock Level</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.product_id}>
              <TableCell className="font-medium">{product.product_name}</TableCell>
              <TableCell className="text-gray-600">{product.product_sku}</TableCell>
              <TableCell className="text-right">{formatNumber(product.quantity_sold)}</TableCell>
              {showRevenue && (
                <TableCell className="text-right font-medium">
                  {formatCurrency(product.total_revenue)}
                </TableCell>
              )}
              {showReturns && (
                <TableCell className="text-right">{formatNumber(product.quantity_returned)}</TableCell>
              )}
              {showReturns && (
                <TableCell className="text-right">
                  <span
                    className={
                      product.return_rate > 10
                        ? 'text-red-600'
                        : product.return_rate > 5
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }
                  >
                    {product.return_rate.toFixed(1)}%
                  </span>
                </TableCell>
              )}
              {showStock && (
                <TableCell className="text-right">
                  <span
                    className={
                      product.stock_level < 5
                        ? 'text-red-600 font-semibold'
                        : product.stock_level < 10
                        ? 'text-yellow-600'
                        : 'text-gray-900'
                    }
                  >
                    {formatNumber(product.stock_level)}
                  </span>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ProductSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-8 w-32" />
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <Skeleton className="h-96 w-full" />
      </Card>
    </div>
  );
}

