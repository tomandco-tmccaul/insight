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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Website } from '@/types/firestore';
import { auth } from '@/lib/firebase/config';

interface WebsiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  website?: Website | null;
  onSuccess: () => void;
}

export function WebsiteDialog({
  open,
  onOpenChange,
  clientId,
  website,
  onSuccess,
}: WebsiteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    websiteName: '',
    bigQueryWebsiteId: '',
    adobeCommerceWebsiteId: '',
    bigQueryTables: {
      googleAds: '',
      facebookAds: '',
      pinterestAds: '',
      googleSearchConsole: '',
      ga4: '',
      adobeCommerce: '',
    },
  });

  const isEdit = !!website;

  // Update form data when website prop changes or dialog opens
  useEffect(() => {
    if (open && website) {
      setFormData({
        id: website.id,
        websiteName: website.websiteName,
        bigQueryWebsiteId: website.bigQueryWebsiteId,
        adobeCommerceWebsiteId: website.adobeCommerceWebsiteId,
        bigQueryTables: {
          googleAds: website.bigQueryTables?.googleAds || '',
          facebookAds: website.bigQueryTables?.facebookAds || '',
          pinterestAds: website.bigQueryTables?.pinterestAds || '',
          googleSearchConsole: website.bigQueryTables?.googleSearchConsole || '',
          ga4: website.bigQueryTables?.ga4 || '',
          adobeCommerce: website.bigQueryTables?.adobeCommerce || '',
        },
      });
    } else if (open && !website) {
      // Reset form for new website
      setFormData({
        id: '',
        websiteName: '',
        bigQueryWebsiteId: '',
        adobeCommerceWebsiteId: '',
        bigQueryTables: {
          googleAds: '',
          facebookAds: '',
          pinterestAds: '',
          googleSearchConsole: '',
          ga4: '',
          adobeCommerce: '',
        },
      });
    }
  }, [open, website]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      const url = isEdit
        ? `/api/admin/clients/${clientId}/websites/${formData.id}`
        : `/api/admin/clients/${clientId}/websites`;

      const method = isEdit ? 'PATCH' : 'POST';

      const body = isEdit
        ? {
            websiteName: formData.websiteName,
            bigQueryWebsiteId: formData.bigQueryWebsiteId,
            adobeCommerceWebsiteId: formData.adobeCommerceWebsiteId,
            bigQueryTables: formData.bigQueryTables,
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
        throw new Error(data.error || 'Failed to save website');
      }

      onSuccess();
      onOpenChange(false);

      // Reset form
      setFormData({
        id: '',
        websiteName: '',
        bigQueryWebsiteId: '',
        adobeCommerceWebsiteId: '',
        bigQueryTables: {
          googleAds: '',
          facebookAds: '',
          pinterestAds: '',
          googleSearchConsole: '',
          ga4: '',
          adobeCommerce: '',
        },
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
          <DialogTitle>{isEdit ? 'Edit Website' : 'New Website'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the website information.'
              : 'Add a new website to this client.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="id">Website ID</Label>
                <Input
                  id="id"
                  placeholder="harlequin"
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
            )}

            <div className="space-y-2">
              <Label htmlFor="websiteName">Website Name</Label>
              <Input
                id="websiteName"
                placeholder="Harlequin"
                value={formData.websiteName}
                onChange={(e) =>
                  setFormData({ ...formData, websiteName: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bigQueryWebsiteId">BigQuery Website ID</Label>
              <Input
                id="bigQueryWebsiteId"
                placeholder="harlequin"
                value={formData.bigQueryWebsiteId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bigQueryWebsiteId: e.target.value,
                  })
                }
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                The website_id value used in aggregated BigQuery tables
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adobeCommerceWebsiteId">
                Adobe Commerce Website ID
              </Label>
              <Input
                id="adobeCommerceWebsiteId"
                placeholder="1"
                value={formData.adobeCommerceWebsiteId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    adobeCommerceWebsiteId: e.target.value,
                  })
                }
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                The website ID in Adobe Commerce/Magento
              </p>
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">
                BigQuery Source Tables
              </Label>
              <p className="text-xs text-gray-500">
                Raw data table names loaded by Airbyte (optional)
              </p>

              <div className="space-y-2">
                <Label htmlFor="googleAds" className="text-sm font-normal">
                  Google Ads
                </Label>
                <Input
                  id="googleAds"
                  placeholder="raw_google_ads_harlequin"
                  value={formData.bigQueryTables.googleAds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bigQueryTables: {
                        ...formData.bigQueryTables,
                        googleAds: e.target.value,
                      },
                    })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebookAds" className="text-sm font-normal">
                  Facebook Ads
                </Label>
                <Input
                  id="facebookAds"
                  placeholder="raw_facebook_ads_harlequin"
                  value={formData.bigQueryTables.facebookAds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bigQueryTables: {
                        ...formData.bigQueryTables,
                        facebookAds: e.target.value,
                      },
                    })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pinterestAds" className="text-sm font-normal">
                  Pinterest Ads
                </Label>
                <Input
                  id="pinterestAds"
                  placeholder="raw_pinterest_ads_harlequin"
                  value={formData.bigQueryTables.pinterestAds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bigQueryTables: {
                        ...formData.bigQueryTables,
                        pinterestAds: e.target.value,
                      },
                    })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="googleSearchConsole"
                  className="text-sm font-normal"
                >
                  Google Search Console
                </Label>
                <Input
                  id="googleSearchConsole"
                  placeholder="raw_gsc_harlequin"
                  value={formData.bigQueryTables.googleSearchConsole}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bigQueryTables: {
                        ...formData.bigQueryTables,
                        googleSearchConsole: e.target.value,
                      },
                    })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ga4" className="text-sm font-normal">
                  Google Analytics 4
                </Label>
                <Input
                  id="ga4"
                  placeholder="raw_ga4_harlequin"
                  value={formData.bigQueryTables.ga4}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bigQueryTables: {
                        ...formData.bigQueryTables,
                        ga4: e.target.value,
                      },
                    })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adobeCommerce" className="text-sm font-normal">
                  Adobe Commerce (Magento)
                </Label>
                <Input
                  id="adobeCommerce"
                  placeholder="raw_magento_harlequin"
                  value={formData.bigQueryTables.adobeCommerce}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bigQueryTables: {
                        ...formData.bigQueryTables,
                        adobeCommerce: e.target.value,
                      },
                    })
                  }
                  disabled={loading}
                />
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

