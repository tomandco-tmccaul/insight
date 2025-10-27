'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppUser, Client } from '@/types/firestore';
import { auth } from '@/lib/firebase/config';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: AppUser | null;
  onSuccess: () => void;
}

export function UserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    role: user?.role || 'client',
    clientId: user?.clientId || '',
  });

  const isEdit = !!user;

  // Fetch clients for dropdown
  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

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
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      const url = isEdit
        ? `/api/admin/users/${user.uid}`
        : '/api/admin/users';

      const method = isEdit ? 'PATCH' : 'POST';

      // For edit, only send changed fields
      const body = isEdit
        ? {
            role: formData.role,
            clientId: formData.role === 'client' ? formData.clientId : null,
          }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save user');
      }

      onSuccess();
      onOpenChange(false);

      // Reset form
      setFormData({ email: '', password: '', role: 'client', clientId: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Invite User'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update user role and client assignment.'
              : 'Create a new user account.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {!isEdit && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
              </>
            )}

            {isEdit && (
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {user.email}
                </div>
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as 'admin' | 'client' })
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === 'client' && (
              <div className="space-y-2">
                <Label htmlFor="clientId">Client</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, clientId: value })
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
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
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

