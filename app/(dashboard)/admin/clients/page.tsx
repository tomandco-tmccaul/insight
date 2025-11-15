'use client';

import React, { useState, useEffect } from 'react';
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
import { Plus, Pencil, Trash2, Globe, ChevronRight, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ClientDialog } from '@/components/admin/client-dialog';
import { WebsiteDialog } from '@/components/admin/website-dialog';
import { WebsiteGroupDialog } from '@/components/admin/website-group-dialog';
import { SyncStoresDialog } from '@/components/admin/sync-stores-dialog';
import { Client, Website } from '@/types/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { auth } from '@/lib/firebase/config';
import { PageHeader } from '@/components/dashboard/page-header';

// Extended Client type with website count
type ClientWithCount = Client & { websiteCount: number };

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [websiteDialogOpen, setWebsiteDialogOpen] = useState(false);
  const [websiteGroupDialogOpen, setWebsiteGroupDialogOpen] = useState(false);
  const [syncStoresDialogOpen, setSyncStoresDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [websites, setWebsites] = useState<Record<string, Website[]>>({});

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/clients', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setClients(data.data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebsites = async (clientId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/admin/clients/${clientId}/websites`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setWebsites((prev) => ({ ...prev, [clientId]: data.data }));
      }
    } catch (error) {
      console.error('Error fetching websites:', error);
    }
  };

  const handleExpandClient = (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
    } else {
      setExpandedClientId(clientId);
      if (!websites[clientId]) {
        fetchWebsites(clientId);
      }
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`Delete "${client.clientName}"? This will delete all websites and data.`)) {
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        fetchClients();
      }
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const handleDeleteWebsite = async (clientId: string, website: Website) => {
    if (!confirm(`Delete "${website.websiteName}"?`)) {
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(
        `/api/admin/clients/${clientId}/websites/${website.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        fetchWebsites(clientId);
      }
    } catch (error) {
      console.error('Error deleting website:', error);
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Client Management"
          description="Manage all clients and their websites"
          actions={
            <Button onClick={() => setClientDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Client
            </Button>
          }
        />

        <Card>
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : clients.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No clients yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setClientDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create your first client
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Websites</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <React.Fragment key={client.id}>
                    <TableRow>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => handleExpandClient(client.id)}
                          className="flex items-center gap-2 hover:text-gray-900"
                        >
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              expandedClientId === client.id ? 'rotate-90' : ''
                            }`}
                          />
                          {client.clientName}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-600">
                        {client.id}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {client.websiteCount || 0} websites
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedClient(client);
                              setClientDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClient(client)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded websites section */}
                    {expandedClientId === client.id && (
                      <TableRow>
                        <TableCell colSpan={4} className="bg-gray-50 p-0">
                          <div className="p-4 pl-12">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                Websites
                              </h3>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedClient(client);
                                    setSyncStoresDialogOpen(true);
                                  }}
                                  disabled={!client.adobeCommerceEndpoint || !client.adobeCommerceAccessToken}
                                  title={
                                    !client.adobeCommerceEndpoint || !client.adobeCommerceAccessToken
                                      ? 'Configure Adobe Commerce API credentials in client settings first'
                                      : 'Sync stores from Adobe Commerce'
                                  }
                                >
                                  <RefreshCw className="mr-2 h-3 w-3" />
                                  Sync Stores
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedClient(client);
                                    setWebsiteGroupDialogOpen(true);
                                  }}
                                  disabled={!websites[client.id] || websites[client.id].length < 2}
                                  title={
                                    !websites[client.id] || websites[client.id].length < 2
                                      ? 'Need at least 2 websites to create a group'
                                      : 'Group websites together'
                                  }
                                >
                                  <Plus className="mr-2 h-3 w-3" />
                                  Group Websites
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedClient(client);
                                    setSelectedWebsite(null);
                                    setWebsiteDialogOpen(true);
                                  }}
                                >
                                  <Plus className="mr-2 h-3 w-3" />
                                  Add Website
                                </Button>
                              </div>
                            </div>

                            {!websites[client.id] ? (
                              <div className="text-sm text-gray-500">Loading...</div>
                            ) : websites[client.id].length === 0 ? (
                              <div className="text-sm text-gray-500">No websites yet</div>
                            ) : (
                              <div className="space-y-2">
                                {websites[client.id].map((website) => (
                                  <div
                                    key={website.id}
                                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                                  >
                                    <div className="flex-1">
                                      <div className="font-medium text-sm flex items-center gap-2">
                                        {website.websiteName}
                                        {website.isGrouped && (
                                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                            Grouped
                                          </span>
                                        )}
                                        {!website.url && !website.isGrouped && (
                                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            No URL
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500 space-y-1 mt-1">
                                        <div>
                                          ID: <span className="font-mono">{website.id}</span>
                                          {' • '}
                                          BigQuery: <span className="font-mono">{website.bigQueryWebsiteId}</span>
                                          {!website.isGrouped && website.storeId && (
                                            <>
                                              {' • '}
                                              Store ID: <span className="font-mono">{website.storeId}</span>
                                            </>
                                          )}
                                        </div>
                                        {!website.isGrouped && (
                                          <div className="flex flex-wrap gap-x-2 gap-y-1">
                                            {website.storeCurrencyCode && (
                                              <span>
                                                Store currency:{' '}
                                                <span className="font-mono uppercase">
                                                  {website.storeCurrencyCode}
                                                </span>
                                              </span>
                                            )}
                                            {website.baseCurrencyCode && (
                                              <span>
                                                Base currency:{' '}
                                                <span className="font-mono uppercase">
                                                  {website.baseCurrencyCode}
                                                </span>
                                              </span>
                                            )}
                                            {website.displayCurrencyCode &&
                                              website.displayCurrencyCode !== website.storeCurrencyCode && (
                                                <span>
                                                  Display currency:{' '}
                                                  <span className="font-mono uppercase">
                                                    {website.displayCurrencyCode}
                                                  </span>
                                                </span>
                                              )}
                                            {!website.storeCurrencyCode &&
                                              !website.baseCurrencyCode &&
                                              !website.displayCurrencyCode && (
                                                <span className="text-yellow-600 flex items-center gap-1">
                                                  <AlertCircle className="h-3 w-3" />
                                                  <span>Currency data not synced yet</span>
                                                </span>
                                              )}
                                          </div>
                                        )}
                                        {website.url ? (
                                          <div className="flex items-center gap-1 text-blue-600">
                                            <ExternalLink className="h-3 w-3" />
                                            <a
                                              href={website.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="hover:underline"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {website.url}
                                            </a>
                                          </div>
                                        ) : !website.isGrouped ? (
                                          <div className="text-yellow-600 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            <span>URL not set - recommended for data source linking</span>
                                          </div>
                                        ) : null}
                                        {website.isGrouped && website.groupedWebsiteIds && (
                                          <div>
                                            Includes: {website.groupedWebsiteIds.join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedClient(client);
                                          setSelectedWebsite(website);
                                          setWebsiteDialogOpen(true);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteWebsite(client.id, website)}
                                      >
                                        <Trash2 className="h-3 w-3 text-red-600" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <ClientDialog
        open={clientDialogOpen}
        onOpenChange={(open) => {
          setClientDialogOpen(open);
          if (!open) setSelectedClient(null);
        }}
        client={selectedClient}
        onSuccess={fetchClients}
      />

      {selectedClient && (
        <>
          <WebsiteDialog
            open={websiteDialogOpen}
            onOpenChange={(open) => {
              setWebsiteDialogOpen(open);
              if (!open) setSelectedWebsite(null);
            }}
            clientId={selectedClient.id}
            website={selectedWebsite}
            onSuccess={() => fetchWebsites(selectedClient.id)}
          />

          <WebsiteGroupDialog
            open={websiteGroupDialogOpen}
            onOpenChange={(open) => {
              setWebsiteGroupDialogOpen(open);
            }}
            clientId={selectedClient.id}
            websites={websites[selectedClient.id] || []}
            onSuccess={() => fetchWebsites(selectedClient.id)}
          />

          <SyncStoresDialog
            open={syncStoresDialogOpen}
            onOpenChange={(open) => {
              setSyncStoresDialogOpen(open);
            }}
            clientId={selectedClient.id}
            onSuccess={() => fetchWebsites(selectedClient.id)}
          />
        </>
      )}
    </ProtectedRoute>
  );
}

