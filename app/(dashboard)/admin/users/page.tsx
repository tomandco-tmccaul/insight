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
import { UserPlus, Pencil, Trash2, Shield, User } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { UserDialog } from '@/components/admin/user-dialog';
import { AppUser, Client } from '@/types/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { auth } from '@/lib/firebase/config';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      // Fetch users and clients in parallel
      const [usersResponse, clientsResponse] = await Promise.all([
        fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch('/api/admin/clients', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
      ]);

      const usersData = await usersResponse.json();
      const clientsData = await clientsResponse.json();

      if (usersData.success) {
        setUsers(usersData.data);
      }

      if (clientsData.success) {
        // Convert clients array to object for easy lookup
        const clientsMap: Record<string, Client> = {};
        clientsData.data.forEach((client: Client) => {
          clientsMap[client.id] = client;
        });
        setClients(clientsMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (!confirm(`Delete user "${user.email}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/admin/users/${user.uid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="mt-2 text-gray-600">
              Manage user accounts and permissions
            </p>
          </div>
          <Button onClick={() => setUserDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </div>

        <Card>
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No users yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setUserDialogOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite your first user
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className="flex items-center gap-1 w-fit"
                      >
                        {user.role === 'admin' ? (
                          <Shield className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.clientId ? (
                        <span className="text-sm">
                          {clients[user.clientId]?.clientName || user.clientId}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setUserDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
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

      <UserDialog
        open={userDialogOpen}
        onOpenChange={(open) => {
          setUserDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={fetchData}
      />
    </ProtectedRoute>
  );
}

