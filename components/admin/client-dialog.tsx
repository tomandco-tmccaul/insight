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
import { Client, CustomLink } from '@/types/firestore';
import { auth } from '@/lib/firebase/config';
import { Plus, Trash2, X, Check } from 'lucide-react';

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
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);
  const [isEditingLink, setIsEditingLink] = useState<string | null>(null);
  const [editingLinkData, setEditingLinkData] = useState<{ name: string; url: string } | null>(null);
  const [newLink, setNewLink] = useState({ name: '', url: '', sortOrder: 0 });
  const defaultCurrencySettings: NonNullable<Client['currencySettings']> = {
    baseCurrency: 'GBP',
    monthlyRates: {},
  };

  const [formData, setFormData] = useState({
    id: '',
    clientName: '',
    bigQueryDatasetId: '',
    adobeCommerceEndpoint: '',
    adobeCommerceAccessToken: '',
    currencySettings: defaultCurrencySettings,
  });

  const isEdit = !!client;

  // Fetch custom links when editing
  useEffect(() => {
    const fetchCustomLinks = async () => {
      if (!open || !isEdit || !client?.id) {
        setCustomLinks([]);
        return;
      }

      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch(
          `/api/admin/clients/${client.id}/custom-links`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setCustomLinks(data.data || []);
          }
        }
      } catch (error) {
        console.error('Error fetching custom links:', error);
      }
    };

    fetchCustomLinks();
  }, [open, isEdit, client?.id]);

  // Update form data when client prop changes or dialog opens
  useEffect(() => {
    if (open && client) {
      setFormData({
        id: client.id || '',
        clientName: client.clientName || '',
        bigQueryDatasetId: client.bigQueryDatasetId || '',
        adobeCommerceEndpoint: client.adobeCommerceEndpoint || '',
        adobeCommerceAccessToken: client.adobeCommerceAccessToken || '',
        currencySettings: client.currencySettings || defaultCurrencySettings,
      });
    } else if (open && !client) {
      // Reset form for new client
      setFormData({
        id: '',
        clientName: '',
        bigQueryDatasetId: '',
        adobeCommerceEndpoint: '',
        adobeCommerceAccessToken: '',
        currencySettings: defaultCurrencySettings,
      });
      setCustomLinks([]);
    }
    setIsEditingLink(null);
    setEditingLinkData(null);
    setNewLink({ name: '', url: '', sortOrder: 0 });
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
            currencySettings: formData.currencySettings,
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
        currencySettings: defaultCurrencySettings,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async () => {
    if (!newLink.name || !newLink.url || !client?.id) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const maxSortOrder = customLinks.length > 0
        ? Math.max(...customLinks.map(l => l.sortOrder || 0))
        : -1;

      const response = await fetch(
        `/api/admin/clients/${client.id}/custom-links`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...newLink,
            sortOrder: maxSortOrder + 1,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setCustomLinks([...customLinks, data.data]);
        setNewLink({ name: '', url: '', sortOrder: 0 });
      } else {
        setError(data.error || 'Failed to add link');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add link');
    }
  };

  const handleStartEditLink = (link: CustomLink) => {
    setIsEditingLink(link.id);
    setEditingLinkData({ name: link.name, url: link.url });
  };

  const handleSaveLink = async (linkId: string) => {
    if (!client?.id || !editingLinkData) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(
        `/api/admin/clients/${client.id}/custom-links/${linkId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editingLinkData),
        }
      );

      const data = await response.json();
      if (data.success) {
        setCustomLinks(
          customLinks.map(link => (link.id === linkId ? data.data : link))
        );
        setIsEditingLink(null);
        setEditingLinkData(null);
      } else {
        setError(data.error || 'Failed to update link');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update link');
    }
  };

  const handleCancelEditLink = () => {
    setIsEditingLink(null);
    setEditingLinkData(null);
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!client?.id) return;
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(
        `/api/admin/clients/${client.id}/custom-links/${linkId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setCustomLinks(customLinks.filter(link => link.id !== linkId));
      } else {
        setError(data.error || 'Failed to delete link');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete link');
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

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Currency Settings
                </Label>
              </div>
              <p className="text-xs text-gray-500">
                Manage monthly conversion rates from GBP to other currencies. These rates will be used to convert all reports to GBP.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Base Currency</Label>
                  <Input value={formData.currencySettings.baseCurrency} disabled />
                  <p className="text-xs text-gray-500">
                    Base currency is fixed to GBP for reporting.
                  </p>
                </div>
              </div>

              <CurrencyRatesEditor
                currencySettings={formData.currencySettings}
                onChange={(currencySettings) =>
                  setFormData((prev) => ({ ...prev, currencySettings }))
                }
              />
            </div>

            {/* Custom Links Section - Only show when editing */}
            {isEdit && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Useful Links
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  Add custom links that will appear in the sidebar for this client
                </p>

                {/* Existing Links */}
                <div className="space-y-2">
                  {customLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center gap-2 rounded-md border p-2"
                    >
                      {isEditingLink === link.id && editingLinkData ? (
                        <>
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="Link name"
                              value={editingLinkData.name}
                              onChange={(e) =>
                                setEditingLinkData({ ...editingLinkData, name: e.target.value })
                              }
                              autoFocus
                            />
                            <Input
                              placeholder="URL"
                              value={editingLinkData.url}
                              onChange={(e) =>
                                setEditingLinkData({ ...editingLinkData, url: e.target.value })
                              }
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleSaveLink(link.id)}
                              title="Save"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={handleCancelEditLink}
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {link.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {link.url}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleStartEditLink(link)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDeleteLink(link.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add New Link */}
                <div className="space-y-2 rounded-md border p-3">
                  <div className="space-y-2">
                    <Input
                      placeholder="Link name"
                      value={newLink.name}
                      onChange={(e) =>
                        setNewLink({ ...newLink, name: e.target.value })
                      }
                    />
                    <Input
                      placeholder="URL (e.g., https://example.com)"
                      value={newLink.url}
                      onChange={(e) =>
                        setNewLink({ ...newLink, url: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLink}
                    disabled={!newLink.name || !newLink.url}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Link
                  </Button>
                </div>
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

interface CurrencyRatesEditorProps {
  currencySettings: NonNullable<Client['currencySettings']>;
  onChange: (settings: NonNullable<Client['currencySettings']>) => void;
}

function CurrencyRatesEditor({ currencySettings, onChange }: CurrencyRatesEditorProps) {
  const [newCurrency, setNewCurrency] = useState('');
  const [newMonth, setNewMonth] = useState('');
  const [newRate, setNewRate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddRate = () => {
    const currencyCode = newCurrency.trim().toUpperCase();
    if (!currencyCode || currencyCode === currencySettings.baseCurrency) {
      setError('Enter a currency code different from the base currency.');
      return;
    }

    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      setError('Currency code must be a 3-letter ISO code (e.g. USD).');
      return;
    }

    if (!newMonth) {
      setError('Select a month.');
      return;
    }

    const rateValue = parseFloat(newRate);
    if (!Number.isFinite(rateValue) || rateValue <= 0) {
      setError('Enter a valid conversion rate greater than 0.');
      return;
    }

    const updatedSettings: NonNullable<Client['currencySettings']> = {
      ...currencySettings,
      monthlyRates: {
        ...currencySettings.monthlyRates,
        [currencyCode]: {
          ...(currencySettings.monthlyRates[currencyCode] || {}),
          [newMonth]: rateValue,
        },
      },
    };

    onChange(updatedSettings);
    setNewCurrency('');
    setNewMonth('');
    setNewRate('');
    setError(null);
  };

  const handleUpdateRate = (currencyCode: string, month: string, value: string) => {
    const rateValue = parseFloat(value);
    if (!Number.isFinite(rateValue) || rateValue <= 0) {
      return;
    }

    onChange({
      ...currencySettings,
      monthlyRates: {
        ...currencySettings.monthlyRates,
        [currencyCode]: {
          ...(currencySettings.monthlyRates[currencyCode] || {}),
          [month]: rateValue,
        },
      },
    });
  };

  const handleRemoveRate = (currencyCode: string, month: string) => {
    const updatedMonthlyRates = {
      ...currencySettings.monthlyRates,
    };

    if (!updatedMonthlyRates[currencyCode]) {
      return;
    }

    const { [month]: _removed, ...restMonthRates } = updatedMonthlyRates[currencyCode];

    if (Object.keys(restMonthRates).length === 0) {
      const { [currencyCode]: _removedCurrency, ...restCurrencies } = updatedMonthlyRates;
      onChange({
        ...currencySettings,
        monthlyRates: restCurrencies,
      });
    } else {
      updatedMonthlyRates[currencyCode] = restMonthRates;
      onChange({
        ...currencySettings,
        monthlyRates: updatedMonthlyRates,
      });
    }
  };

  const currencyEntries = Object.entries(currencySettings.monthlyRates).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="newCurrency">Currency Code</Label>
            <Input
              id="newCurrency"
              placeholder="USD"
              value={newCurrency}
              onChange={(e) => setNewCurrency(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="newMonth">Month</Label>
            <Input
              id="newMonth"
              type="month"
              value={newMonth}
              onChange={(e) => setNewMonth(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="newRate">GBP → Currency Rate</Label>
            <Input
              id="newRate"
              type="number"
              step="0.0001"
              min="0"
              placeholder="1.2500"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: If 1 GBP = 1.25 USD, enter 1.25.
            </p>
          </div>
          <div className="flex items-end">
            <Button type="button" className="w-full" onClick={handleAddRate}>
              Add Rate
            </Button>
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      {currencyEntries.length === 0 ? (
        <p className="text-sm text-gray-500">
          No additional currency rates configured. Reports will use GBP values only.
        </p>
      ) : (
        <div className="space-y-3">
          {currencyEntries.map(([currencyCode, monthRates]) => {
            const monthEntries = Object.entries(monthRates).sort(([a], [b]) =>
              a.localeCompare(b)
            );

            return (
              <div key={currencyCode} className="rounded-md border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{currencyCode}</p>
                    <p className="text-xs text-gray-500">
                      Conversion from {currencySettings.baseCurrency} to {currencyCode}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {monthEntries.map(([month, rate]) => (
                    <div
                      key={`${currencyCode}-${month}`}
                      className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 border rounded-md p-3"
                    >
                      <div className="text-sm font-medium min-w-[120px]">
                        {month}
                      </div>
                      <div className="flex-1">
                        <Label className="sr-only">Conversion rate</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={rate}
                          onChange={(e) =>
                            handleUpdateRate(currencyCode, month, e.target.value)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRate(currencyCode, month)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

