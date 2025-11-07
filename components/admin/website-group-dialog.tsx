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
import { Website } from '@/types/firestore';
import { auth } from '@/lib/firebase/config';
import { Checkbox } from '@/components/ui/checkbox';

interface WebsiteGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  websites: Website[];
  onSuccess: () => void;
}

export function WebsiteGroupDialog({
  open,
  onOpenChange,
  clientId,
  websites,
  onSuccess,
}: WebsiteGroupDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWebsiteIds, setSelectedWebsiteIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    id: '',
    websiteName: '',
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedWebsiteIds([]);
      setFormData({
        id: '',
        websiteName: '',
      });
      setError(null);
    }
  }, [open]);

  const handleToggleWebsite = (websiteId: string) => {
    setSelectedWebsiteIds((prev) =>
      prev.includes(websiteId)
        ? prev.filter((id) => id !== websiteId)
        : [...prev, websiteId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (selectedWebsiteIds.length < 2) {
        setError('Please select at least 2 websites to group together');
        setLoading(false);
        return;
      }

      if (!formData.id || !formData.websiteName) {
        setError('Please provide both Website ID and Website Name');
        setLoading(false);
        return;
      }

      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(
        `/api/admin/clients/${clientId}/websites`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: formData.id,
            websiteName: formData.websiteName,
            bigQueryWebsiteId: formData.id, // Use the same ID for BigQuery
            storeId: '', // Not applicable for grouped websites
            bigQueryTablePrefixes: {}, // Will be handled by individual websites
            isGrouped: true,
            groupedWebsiteIds: selectedWebsiteIds,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create grouped website');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter out already grouped websites
  const availableWebsites = websites.filter(
    (website) => !website.isGrouped
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Grouped Website</DialogTitle>
          <DialogDescription>
            Group multiple websites together to create an overview website that
            aggregates data from all selected websites.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="id">Website ID</Label>
              <Input
                id="id"
                placeholder="harlequin-overview"
                value={formData.id}
                onChange={(e) =>
                  setFormData({ ...formData, id: e.target.value })
                }
                required
                disabled={loading}
                pattern="[a-z0-9_-]+"
                title="Only lowercase letters, numbers, underscores, and hyphens"
              />
              <p className="text-xs text-gray-500">
                Use lowercase letters, numbers, underscores, and hyphens only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteName">Website Name</Label>
              <Input
                id="websiteName"
                placeholder="Harlequin Overview"
                value={formData.websiteName}
                onChange={(e) =>
                  setFormData({ ...formData, websiteName: e.target.value })
                }
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Display name for the grouped website
              </p>
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">
                Select Websites to Group
              </Label>
              <p className="text-xs text-gray-500">
                Select at least 2 websites to include in this group. Already
                grouped websites cannot be selected.
              </p>

              {availableWebsites.length === 0 ? (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  No available websites to group. All websites are already
                  grouped or there are no websites.
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-3">
                  {availableWebsites.map((website) => (
                    <div
                      key={website.id}
                      className="flex items-center space-x-2 rounded-md p-2 hover:bg-gray-50"
                    >
                      <Checkbox
                        id={website.id}
                        checked={selectedWebsiteIds.includes(website.id)}
                        onCheckedChange={() => handleToggleWebsite(website.id)}
                        disabled={loading}
                      />
                      <Label
                        htmlFor={website.id}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        <div className="font-medium">{website.websiteName}</div>
                        <div className="text-xs text-gray-500">
                          ID: {website.id}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {selectedWebsiteIds.length > 0 && (
                <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                  {selectedWebsiteIds.length} website
                  {selectedWebsiteIds.length !== 1 ? 's' : ''} selected
                </div>
              )}
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
            <Button
              type="submit"
              disabled={loading || selectedWebsiteIds.length < 2}
            >
              {loading ? 'Creating...' : 'Create Grouped Website'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


