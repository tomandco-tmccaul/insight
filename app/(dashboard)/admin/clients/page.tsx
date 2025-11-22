'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Client } from '@/types/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { auth } from '@/lib/firebase/config';
import { PageHeader } from '@/components/dashboard/page-header';

// Extended Client type with website count
type ClientWithCount = Client & { websiteCount: number };

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientWithCount[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <ProtectedRoute requireAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Client Management"
          description="Manage all clients and their websites"
          actions={
            <Button onClick={() => router.push('/admin/clients/new')}>
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
                onClick={() => router.push('/admin/clients/new')}
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
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => router.push(`/admin/clients/${client.id}`)}
                        className="hover:underline text-left"
                      >
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
                          onClick={() => router.push(`/admin/clients/${client.id}`)}
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
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}

