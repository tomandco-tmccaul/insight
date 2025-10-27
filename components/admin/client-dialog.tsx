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
import { Client } from '@/types/firestore';
import { auth } from '@/lib/firebase/config';

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSuccess: () => void;
}

export function ClientDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: ClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    clientName: '',
    bigQueryDatasetId: '',
    adobeCommerceEndpoint: '',
    adobeCommerceAccessToken: '',
  });

  const isEdit = !!client;

  // Update form data when client prop changes or dialog opens
  useEffect(() => {
    if (open && client) {
      setFormData({
        id: client.id || '',
        clientName: client.clientName || '',
        bigQueryDatasetId: client.bigQueryDatasetId || '',
        adobeCommerceEndpoint: client.adobeCommerceEndpoint || '',
        adobeCommerceAccessToken: client.adobeCommerceAccessToken || '',
      });
    } else if (open && !client) {
      // Reset form for new client
      setFormData({
        id: '',
        clientName: '',
        bigQueryDatasetId: '',
        adobeCommerceEndpoint: '',
        adobeCommerceAccessToken: '',
      });
    }
  }, [open, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Form submission:', { isEdit, formData, client });

      // Validation: ensure we have an ID when editing
      if (isEdit && !formData.id) {
        setError('Client ID is missing. Please close and reopen the dialog.');
        setLoading(false);
        return;
      }

      const token = await auth.currentUser?.getIdToken();
      const url = isEdit
        ? `/api/admin/clients/${formData.id}`
        : '/api/admin/clients';

      console.log('API URL:', url);

      const method = isEdit ? 'PATCH' : 'POST';

      const body = isEdit
        ? {
            clientName: formData.clientName,
            bigQueryDatasetId: formData.bigQueryDatasetId,
            adobeCommerceEndpoint: formData.adobeCommerceEndpoint,
            adobeCommerceAccessToken: formData.adobeCommerceAccessToken,
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
        throw new Error(data.error || 'Failed to save client');
      }

      onSuccess();
      onOpenChange(false);

      // Reset form
      setFormData({
        id: '',
        clientName: '',
        bigQueryDatasetId: '',
        adobeCommerceEndpoint: '',
        adobeCommerceAccessToken: '',
      });
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
          <DialogTitle>{isEdit ? 'Edit Client' : 'New Client'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the client information.'
              : 'Create a new client. The ID will be used in URLs and cannot be changed.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="id">Client ID</Label>
                <Input
                  id="id"
                  placeholder="sanderson-design-group"
                  value={formData.id}
                  onChange={(e) =>
                    setFormData({ ...formData, id: e.target.value })
                  }
                  required
                  disabled={loading}
                  pattern="[a-z0-9-]+"
                  title="Only lowercase letters, numbers, and hyphens"
                />
                <p className="text-xs text-gray-500">
                  Use lowercase letters, numbers, and hyphens only
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                placeholder="Sanderson Design Group"
                value={formData.clientName}
                onChange={(e) =>
                  setFormData({ ...formData, clientName: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bigQueryDatasetId">BigQuery Dataset ID</Label>
              <Input
                id="bigQueryDatasetId"
                placeholder="sanderson_design_group"
                value={formData.bigQueryDatasetId}
                onChange={(e) =>
                  setFormData({ ...formData, bigQueryDatasetId: e.target.value })
                }
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                The BigQuery dataset ID where this client's data is stored
              </p>
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">
                Adobe Commerce API Configuration
              </Label>
              <p className="text-xs text-gray-500">
                Optional: Configure Adobe Commerce API to enable automatic store syncing
              </p>

              <div className="space-y-2">
                <Label htmlFor="adobeCommerceEndpoint">API Endpoint</Label>
                <Input
                  id="adobeCommerceEndpoint"
                  placeholder="https://example.com"
                  value={formData.adobeCommerceEndpoint}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      adobeCommerceEndpoint: e.target.value,
                    })
                  }
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  Base URL without /rest/V1 (e.g., https://example.com)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adobeCommerceAccessToken">Access Token</Label>
                <Input
                  id="adobeCommerceAccessToken"
                  type="password"
                  placeholder="Bearer token"
                  value={formData.adobeCommerceAccessToken}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      adobeCommerceAccessToken: e.target.value,
                    })
                  }
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  Bearer token for API authentication
                </p>
              </div>
            </div>

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

