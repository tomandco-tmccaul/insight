'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Database, RefreshCw, Plus, CheckCircle2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Client } from '@/types/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { auth } from '@/lib/firebase/config';
import { BigQueryTableInfo } from '@/app/api/admin/bigquery/tables/route';

export default function AdminBigQueryPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [tables, setTables] = useState<BigQueryTableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [creatingAggregation, setCreatingAggregation] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchTables();
    }
  }, [selectedClientId]);

  const fetchClients = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/clients', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setClients(data.data);
        if (data.data.length > 0) {
          setSelectedClientId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    if (!selectedClientId) return;

    setTablesLoading(true);
    setError(null);

    try {
      const client = clients.find((c) => c.id === selectedClientId);
      if (!client?.bigQueryDatasetId) {
        setError('Client does not have a BigQuery dataset configured');
        setTables([]);
        return;
      }

      const token = await auth.currentUser?.getIdToken();
      const params = new URLSearchParams({
        dataset_id: client.bigQueryDatasetId,
      });

      const response = await fetch(`/api/admin/bigquery/tables?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setTables(data.data);
      } else {
        setError(data.error || 'Failed to fetch tables');
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      setError('An error occurred while fetching tables');
    } finally {
      setTablesLoading(false);
    }
  };

  const createAggregation = async (aggregationType: 'sales_overview' | 'product_performance' | 'seo_performance') => {
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client?.bigQueryDatasetId) return;

    setCreatingAggregation(aggregationType);
    setError(null);
    setSuccess(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/bigquery/aggregations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          datasetId: client.bigQueryDatasetId,
          aggregationType,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`Successfully created ${aggregationType} aggregation table!`);
        // Refresh tables list
        await fetchTables();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to create aggregation table');
      }
    } catch (error) {
      console.error('Error creating aggregation:', error);
      setError('An error occurred while creating aggregation table');
    } finally {
      setCreatingAggregation(null);
    }
  };

  const formatBytes = (bytes: string) => {
    const num = parseInt(bytes);
    if (num === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return Math.round(num / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatNumber = (num: string) => {
    return parseInt(num).toLocaleString();
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <ProtectedRoute requireAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">BigQuery Tables</h1>
          <p className="mt-2 text-gray-600">
            Manage BigQuery tables and create aggregation tables for faster reporting
          </p>
        </div>

        {loading ? (
          <Card className="p-6">
            <Skeleton className="h-10 w-full" />
          </Card>
        ) : (
          <>
            {/* Client Selector */}
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Select Client</label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.clientName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedClient && (
                  <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                    <p>
                      <strong>Dataset ID:</strong> {selectedClient.bigQueryDatasetId || 'Not configured'}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Create Aggregation Tables */}
            {selectedClient?.bigQueryDatasetId && (
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Create Aggregation Tables
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Create pre-aggregated tables for faster dashboard performance
                    </p>
                  </div>

                  {success && (
                    <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800">
                      <CheckCircle2 className="h-4 w-4" />
                      {success}
                    </div>
                  )}

                  {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                      {error}
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <h3 className="font-medium text-gray-900">Sales Overview</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Daily aggregation of orders, revenue, and customer metrics
                      </p>
                      <Button
                        className="mt-3"
                        size="sm"
                        onClick={() => createAggregation('sales_overview')}
                        disabled={creatingAggregation === 'sales_overview'}
                      >
                        {creatingAggregation === 'sales_overview' ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Database className="mr-2 h-4 w-4" />
                            Create Table
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <h3 className="font-medium text-gray-900">Product Performance</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Daily aggregation of product sales, quantities, and pricing
                      </p>
                      <Button
                        className="mt-3"
                        size="sm"
                        onClick={() => createAggregation('product_performance')}
                        disabled={creatingAggregation === 'product_performance'}
                      >
                        {creatingAggregation === 'product_performance' ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Database className="mr-2 h-4 w-4" />
                            Create Table
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <h3 className="font-medium text-gray-900">SEO Performance</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Daily aggregation of search queries, clicks, impressions, and positions from GSC
                      </p>
                      <Button
                        className="mt-3"
                        size="sm"
                        onClick={() => createAggregation('seo_performance')}
                        disabled={creatingAggregation === 'seo_performance'}
                      >
                        {creatingAggregation === 'seo_performance' ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Database className="mr-2 h-4 w-4" />
                            Create Table
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Tables List */}
            {selectedClient?.bigQueryDatasetId && (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Tables in Dataset
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchTables}
                      disabled={tablesLoading}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${tablesLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>

                  {tablesLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : tables.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No tables found in this dataset
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Table Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Rows</TableHead>
                            <TableHead className="text-right">Size</TableHead>
                            <TableHead>Last Modified</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tables.map((table) => (
                            <TableRow key={table.tableId}>
                              <TableCell className="font-medium">
                                {table.tableId}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                  table.type === 'TABLE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {table.type}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(table.numRows)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatBytes(table.numBytes)}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {new Date(table.lastModifiedTime).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

