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
    storeId: '',
    adobeCommerceEndpoint: '',
    adobeCommerceAccessToken: '',
    bigQueryTablePrefixes: {
      googleAds: 'google_ads_',
      facebookAds: 'facebook_ads_',
      pinterestAds: 'pinterest_ads_',
      googleSearchConsole: 'gsc_',
      ga4: 'ga4_',
      adobeCommerce: 'adobe_commerce_',
    },
  });

  const isEdit = !!website;

  // Update form data when website prop changes or dialog opens
  useEffect(() => {
    if (open && website) {
      setFormData({
        id: website.id || '',
        websiteName: website.websiteName || '',
        bigQueryWebsiteId: website.bigQueryWebsiteId || '',
        storeId: website.storeId || '',
        adobeCommerceEndpoint: website.adobeCommerceEndpoint || '',
        adobeCommerceAccessToken: website.adobeCommerceAccessToken || '',
        bigQueryTablePrefixes: {
          googleAds: website.bigQueryTablePrefixes?.googleAds || 'google_ads_',
          facebookAds: website.bigQueryTablePrefixes?.facebookAds || 'facebook_ads_',
          pinterestAds: website.bigQueryTablePrefixes?.pinterestAds || 'pinterest_ads_',
          googleSearchConsole: website.bigQueryTablePrefixes?.googleSearchConsole || 'gsc_',
          ga4: website.bigQueryTablePrefixes?.ga4 || 'ga4_',
          adobeCommerce: website.bigQueryTablePrefixes?.adobeCommerce || 'adobe_commerce_',
        },
      });
    } else if (open && !website) {
      // Reset form for new website with default prefixes
      setFormData({
        id: '',
        websiteName: '',
        bigQueryWebsiteId: '',
        storeId: '',
        adobeCommerceEndpoint: '',
        adobeCommerceAccessToken: '',
        bigQueryTablePrefixes: {
          googleAds: 'google_ads_',
          facebookAds: 'facebook_ads_',
          pinterestAds: 'pinterest_ads_',
          googleSearchConsole: 'gsc_',
          ga4: 'ga4_',
          adobeCommerce: 'adobe_commerce_',
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
            storeId: formData.storeId,
            adobeCommerceEndpoint: formData.adobeCommerceEndpoint,
            adobeCommerceAccessToken: formData.adobeCommerceAccessToken,
            bigQueryTablePrefixes: formData.bigQueryTablePrefixes,
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
        storeId: '',
        adobeCommerceEndpoint: '',
        adobeCommerceAccessToken: '',
        bigQueryTablePrefixes: {
          googleAds: 'google_ads_',
          facebookAds: 'facebook_ads_',
          pinterestAds: 'pinterest_ads_',
          googleSearchConsole: 'gsc_',
          ga4: 'ga4_',
          adobeCommerce: 'adobe_commerce_',
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
              <Label htmlFor="storeId">
                Adobe Commerce Store ID
              </Label>
              <Input
                id="storeId"
                placeholder="1"
                value={formData.storeId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    storeId: e.target.value,
                  })
                }
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                The store_id in Adobe Commerce (maps to website)
              </p>
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">
                Adobe Commerce API Configuration
              </Label>
              <p className="text-xs text-gray-500">
                Optional: Configure Adobe Commerce API access for this website
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

            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">
                BigQuery Table Prefixes
              </Label>
              <p className="text-xs text-gray-500">
                Table prefixes for each data source. Defaults are provided but can be customized. Final table name = prefix + table name (e.g., "adobe_commerce_" + "orders" = "adobe_commerce_orders")
              </p>

              <div className="space-y-2">
                <Label htmlFor="googleAds" className="text-sm font-normal">
                  Google Ads Prefix
                </Label>
                <Input
                  id="googleAds"
                  placeholder="google_ads_"
                  value={formData.bigQueryTablePrefixes.googleAds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bigQueryTablePrefixes: {
                        ...formData.bigQueryTablePrefixes,
                        googleAds: e.target.value,
                      },
                    })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebookAds" className="text-sm font-normal">
                  Facebook Ads Prefix
                </Label>
                <Input
                  id="facebookAds"
                  placeholder="facebook_ads_"
                  value={formData.bigQueryTablePrefixes.facebookAds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bigQueryTablePrefixes: {
                        ...formData.bigQueryTablePrefixes,
                        facebookAds: e.target.value,
                      },
                    })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pinterestAds" className="text-sm font-normal">
                  Pinterest Ads Prefix
                </Label>
                <Input
                  id="pinterestAds"
                  placeholder="pinterest_ads_"
                  value={formData.bigQueryTablePrefixes.pinterestAds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bigQueryTablePrefixes: {
                        ...formData.bigQueryTablePrefixes,
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
                  Google Search Console Prefix
                </Label>
                <Input
                  id="googleSearchConsole"
                  placeholder="gsc_"
                  value={formData.bigQueryTablePrefixes.googleSearchConsole}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bigQueryTablePrefixes: {
                        ...formData.bigQueryTablePrefixes,
                        googleSearchConsole: e.target.value,
                      },
                    })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ga4" className="text-sm font-normal">
                  Google Analytics 4 Prefix
                </Label>
                <Input
                  id="ga4"
                  placeholder="ga4_"
                  value={formData.bigQueryTablePrefixes.ga4}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bigQueryTablePrefixes: {
                        ...formData.bigQueryTablePrefixes,
                        ga4: e.target.value,
                      },
                    })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adobeCommerce" className="text-sm font-normal">
                  Adobe Commerce Prefix
                </Label>
                <Input
                  id="adobeCommerce"
                  placeholder="adobe_commerce_"
                  value={formData.bigQueryTablePrefixes.adobeCommerce}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bigQueryTablePrefixes: {
                        ...formData.bigQueryTablePrefixes,
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

