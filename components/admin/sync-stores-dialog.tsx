'use client';

import { useState } from 'react';
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
import { auth } from '@/lib/firebase/config';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

interface SyncStoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess: () => void;
}

export function SyncStoresDialog({
  open,
  onOpenChange,
  clientId,
  onSuccess,
}: SyncStoresDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/admin/clients/${clientId}/sync-stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to sync stores');
      }

      const result = data.data;
      setSuccess(
        `Successfully synced ${result.websitesCreated} website(s) from Adobe Commerce!`
      );

      // Wait 2 seconds then close and refresh
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setSuccess(null);
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sync Stores from Adobe Commerce</DialogTitle>
          <DialogDescription>
            This will connect to Adobe Commerce API using the credentials configured for this client
            and automatically import all active stores as websites.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </div>
          )}

          <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
            <p className="font-medium">What will happen:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Connect to Adobe Commerce REST API</li>
              <li>Fetch all active store views</li>
              <li>Create website documents in Firestore</li>
              <li>Skip existing websites (no duplicates)</li>
            </ul>
          </div>
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
          <Button onClick={handleSync} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Stores
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

