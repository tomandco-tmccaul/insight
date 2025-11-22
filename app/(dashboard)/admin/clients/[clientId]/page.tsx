'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Client, CustomLink, Website } from '@/types/firestore';
import { auth } from '@/lib/firebase/config';
import { Plus, Trash2, X, Check, Settings, Database, Globe, Menu, Link as LinkIcon, ArrowLeft, RefreshCw, AlertCircle, ExternalLink, Pencil } from 'lucide-react';
import { dashboardNavItems } from '@/lib/constants/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/dashboard/page-header';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Card } from '@/components/ui/card';
import { WebsiteDialog } from '@/components/admin/website-dialog';
import { WebsiteGroupDialog } from '@/components/admin/website-group-dialog';
import { SyncStoresDialog } from '@/components/admin/sync-stores-dialog';

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
        console.log('Removed rate for month:', _removed); // Use variable to silence warning

        if (Object.keys(restMonthRates).length === 0) {
            const { [currencyCode]: _removedCurrency, ...restCurrencies } = updatedMonthlyRates;
            console.log('Removed currency:', _removedCurrency); // Use variable to silence warning
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
                        <Label htmlFor="newMonth">Month (YYYY-MM)</Label>
                        <Input
                            id="newMonth"
                            type="month"
                            value={newMonth}
                            onChange={(e) => setNewMonth(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="newRate">Rate (1 GBP = ?)</Label>
                        <Input
                            id="newRate"
                            type="number"
                            step="0.0001"
                            placeholder="1.25"
                            value={newRate}
                            onChange={(e) => setNewRate(e.target.value)}
                        />
                    </div>
                    <div className="flex items-end">
                        <Button type="button" onClick={handleAddRate} className="w-full">
                            Add Rate
                        </Button>
                    </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="space-y-4">
                {currencyEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No custom exchange rates defined.
                    </p>
                ) : (
                    currencyEntries.map(([currencyCode, rates]) => (
                        <div key={currencyCode} className="rounded-md border p-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                {currencyCode}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries(rates)
                                    .sort(([a], [b]) => b.localeCompare(a)) // Sort by month descending
                                    .map(([month, rate]) => (
                                        <div
                                            key={month}
                                            className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm"
                                        >
                                            <span className="font-mono font-medium">{month}:</span>
                                            <Input
                                                type="number"
                                                step="0.0001"
                                                className="h-7 w-20 px-2"
                                                value={rate}
                                                onChange={(e) =>
                                                    handleUpdateRate(currencyCode, month, e.target.value)
                                                }
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                className="h-7 w-7"
                                                onClick={() => handleRemoveRate(currencyCode, month)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default function ClientEditPage() {
    const router = useRouter();
    const params = useParams();
    const clientId = params.clientId as string;
    const isNew = clientId === 'new';

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!isNew);
    const [error, setError] = useState<string | null>(null);
    const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);
    const [isEditingLink, setIsEditingLink] = useState<string | null>(null);
    const [editingLinkData, setEditingLinkData] = useState<{ name: string; url: string } | null>(null);
    const [newLink, setNewLink] = useState({ name: '', url: '', sortOrder: 0 });

    // Website management state
    const [websites, setWebsites] = useState<Website[]>([]);
    const [websiteDialogOpen, setWebsiteDialogOpen] = useState(false);
    const [websiteGroupDialogOpen, setWebsiteGroupDialogOpen] = useState(false);
    const [syncStoresDialogOpen, setSyncStoresDialogOpen] = useState(false);
    const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);

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
        disabledMenuItems: [] as string[],
    });

    const fetchWebsites = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`/api/admin/clients/${clientId}/websites`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setWebsites(data.data);
            }
        } catch (error) {
            console.error('Error fetching websites:', error);
        }
    };

    useEffect(() => {
        const fetchClientData = async () => {
            try {
                const token = await auth.currentUser?.getIdToken();
                const response = await fetch(`/api/admin/clients`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await response.json();
                if (data.success) {
                    const client = data.data.find((c: Client) => c.id === clientId);
                    if (client) {
                        setFormData({
                            id: client.id || '',
                            clientName: client.clientName || '',
                            bigQueryDatasetId: client.bigQueryDatasetId || '',
                            adobeCommerceEndpoint: client.adobeCommerceEndpoint || '',
                            adobeCommerceAccessToken: client.adobeCommerceAccessToken || '',
                            currencySettings: client.currencySettings || defaultCurrencySettings,
                            disabledMenuItems: client.disabledMenuItems || [],
                        });
                    } else {
                        setError('Client not found');
                    }
                }
            } catch (err) {
                console.error('Error fetching client:', err);
                setError('Failed to load client data');
            } finally {
                setInitialLoading(false);
            }
        };

        const fetchCustomLinks = async () => {
            try {
                const token = await auth.currentUser?.getIdToken();
                const response = await fetch(`/api/admin/clients/${clientId}/custom-links`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) setCustomLinks(data.data || []);
                }
            } catch (error) {
                console.error('Error fetching custom links:', error);
            }
        };

        if (!isNew) {
            fetchClientData();
            fetchCustomLinks();
            fetchWebsites();
        }
    }, [clientId, isNew]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!isNew && !formData.id) {
                setError('Client ID is missing.');
                setLoading(false);
                return;
            }

            const token = await auth.currentUser?.getIdToken();
            const url = !isNew
                ? `/api/admin/clients/${formData.id}`
                : '/api/admin/clients';
            const method = !isNew ? 'PATCH' : 'POST';

            const body = !isNew
                ? {
                    clientName: formData.clientName,
                    bigQueryDatasetId: formData.bigQueryDatasetId,
                    adobeCommerceEndpoint: formData.adobeCommerceEndpoint,
                    adobeCommerceAccessToken: formData.adobeCommerceAccessToken,
                    currencySettings: formData.currencySettings,
                    disabledMenuItems: formData.disabledMenuItems,
                }
                : formData;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to save client');
            }

            if (isNew) {
                router.push(`/admin/clients/${formData.id}`);
            } else {
                // Show success message or toast? For now just refresh data
                fetchClientData();
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred');
            }
        } finally {
            setLoading(false);
        }
    };

    // ... (Link handlers similar to Dialog)
    const handleAddLink = async () => {
        if (!newLink.name || !newLink.url || isNew) return;
        try {
            const token = await auth.currentUser?.getIdToken();
            const maxSortOrder = customLinks.length > 0 ? Math.max(...customLinks.map(l => l.sortOrder || 0)) : -1;
            const response = await fetch(`/api/admin/clients/${clientId}/custom-links`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...newLink, sortOrder: maxSortOrder + 1 }),
            });
            const data = await response.json();
            if (data.success) {
                setCustomLinks([...customLinks, data.data]);
                setNewLink({ name: '', url: '', sortOrder: 0 });
            }
        } catch (err) { console.error(err); }
    };

    const handleSaveLink = async (linkId: string) => {
        if (isNew || !editingLinkData) return;
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`/api/admin/clients/${clientId}/custom-links/${linkId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(editingLinkData),
            });
            const data = await response.json();
            if (data.success) {
                setCustomLinks(customLinks.map(link => (link.id === linkId ? data.data : link)));
                setIsEditingLink(null);
                setEditingLinkData(null);
            }
        } catch (err) { console.error(err); }
    };

    const handleDeleteLink = async (linkId: string) => {
        if (isNew) return;
        if (!confirm('Delete this link?')) return;
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`/api/admin/clients/${clientId}/custom-links/${linkId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) setCustomLinks(customLinks.filter(link => link.id !== linkId));
        } catch (err) { console.error(err); }
    };

    const handleDeleteWebsite = async (website: Website) => {
        if (!confirm(`Delete "${website.websiteName}"?`)) return;
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`/api/admin/clients/${clientId}/websites/${website.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) fetchWebsites();
        } catch (error) { console.error('Error deleting website:', error); }
    };

    if (initialLoading) {
        return <div className="p-8">Loading client data...</div>;
    }

    return (
        <ProtectedRoute requireAdmin>
            <div className="space-y-6">
                <PageHeader
                    title={isNew ? 'New Client' : `Edit ${formData.clientName || 'Client'}`}
                    description={isNew ? 'Create a new client' : `Manage settings for ${formData.id}`}
                    actions={
                        <Button variant="outline" onClick={() => router.push('/admin/clients')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Clients
                        </Button>
                    }
                />

                <form onSubmit={handleSubmit} className="space-y-8">
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-6">
                            <TabsTrigger value="general" className="flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                <span className="hidden sm:inline">General</span>
                            </TabsTrigger>
                            <TabsTrigger value="websites" disabled={isNew} className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                <span className="hidden sm:inline">Websites</span>
                            </TabsTrigger>
                            <TabsTrigger value="integrations" className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                <span className="hidden sm:inline">Integrations</span>
                            </TabsTrigger>
                            <TabsTrigger value="localization" className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                <span className="hidden sm:inline">Localization</span>
                            </TabsTrigger>
                            <TabsTrigger value="navigation" className="flex items-center gap-2">
                                <Menu className="h-4 w-4" />
                                <span className="hidden sm:inline">Navigation</span>
                            </TabsTrigger>
                            <TabsTrigger value="resources" disabled={isNew} className="flex items-center gap-2">
                                <LinkIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Resources</span>
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-6">
                            <TabsContent value="general">
                                <Card className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        {!isNew && (
                                            <div className="space-y-2">
                                                <Label htmlFor="id">Client ID</Label>
                                                <Input
                                                    id="id"
                                                    value={formData.id}
                                                    disabled
                                                    className="bg-muted"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Client ID cannot be changed once created.
                                                </p>
                                            </div>
                                        )}
                                        {isNew && (
                                            <div className="space-y-2">
                                                <Label htmlFor="new-id">Client ID</Label>
                                                <Input
                                                    id="new-id"
                                                    placeholder="sanderson-design-group"
                                                    value={formData.id}
                                                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                                    required
                                                    pattern="[a-z0-9-]+"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Use lowercase letters, numbers, and hyphens only.
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="clientName">Client Name</Label>
                                            <Input
                                                id="clientName"
                                                placeholder="Sanderson Design Group"
                                                value={formData.clientName}
                                                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="bigQueryDatasetId">BigQuery Dataset ID</Label>
                                            <Input
                                                id="bigQueryDatasetId"
                                                placeholder="sanderson_design_group"
                                                value={formData.bigQueryDatasetId}
                                                onChange={(e) => setFormData({ ...formData, bigQueryDatasetId: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={loading}>
                                            {loading ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </Card>
                            </TabsContent>

                            <TabsContent value="websites">
                                <Card className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-lg font-medium">Websites</h3>
                                            <p className="text-sm text-muted-foreground">Manage websites associated with this client.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setSyncStoresDialogOpen(true)}
                                                disabled={!formData.adobeCommerceEndpoint || !formData.adobeCommerceAccessToken}
                                            >
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                Sync Stores
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setWebsiteGroupDialogOpen(true)}
                                                disabled={websites.length < 2}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Group Websites
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedWebsite(null);
                                                    setWebsiteDialogOpen(true);
                                                }}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Website
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {websites.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                                                No websites found. Add one manually or sync from Adobe Commerce.
                                            </div>
                                        ) : (
                                            websites.map((website) => (
                                                <div
                                                    key={website.id}
                                                    className="flex items-center justify-between rounded-lg border p-4"
                                                >
                                                    <div className="flex-1">
                                                        <div className="font-medium flex items-center gap-2">
                                                            {website.websiteName}
                                                            {website.isGrouped && (
                                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Grouped</span>
                                                            )}
                                                            {!website.url && !website.isGrouped && (
                                                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded flex items-center gap-1">
                                                                    <AlertCircle className="h-3 w-3" /> No URL
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                                            <div>ID: <span className="font-mono">{website.id}</span> • BigQuery: <span className="font-mono">{website.bigQueryWebsiteId}</span></div>
                                                            {website.url && (
                                                                <a href={website.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                                    <ExternalLink className="h-3 w-3" /> {website.url}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedWebsite(website);
                                                                setWebsiteDialogOpen(true);
                                                            }}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteWebsite(website)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>
                            </TabsContent>

                            <TabsContent value="integrations">
                                <Card className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="adobeCommerceEndpoint">Adobe Commerce API Endpoint</Label>
                                            <Input
                                                id="adobeCommerceEndpoint"
                                                placeholder="https://example.com"
                                                value={formData.adobeCommerceEndpoint}
                                                onChange={(e) => setFormData({ ...formData, adobeCommerceEndpoint: e.target.value })}
                                            />
                                            <p className="text-xs text-muted-foreground">Base URL without /rest/V1</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="adobeCommerceAccessToken">Access Token</Label>
                                            <Input
                                                id="adobeCommerceAccessToken"
                                                type="password"
                                                placeholder="Bearer token"
                                                value={formData.adobeCommerceAccessToken}
                                                onChange={(e) => setFormData({ ...formData, adobeCommerceAccessToken: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={loading}>
                                            {loading ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </Card>
                            </TabsContent>

                            <TabsContent value="localization">
                                <Card className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Base Currency</Label>
                                                <Input value={formData.currencySettings.baseCurrency} disabled />
                                            </div>
                                        </div>
                                        <CurrencyRatesEditor
                                            currencySettings={formData.currencySettings}
                                            onChange={(currencySettings) => setFormData((prev) => ({ ...prev, currencySettings }))}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={loading}>
                                            {loading ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </Card>
                            </TabsContent>

                            <TabsContent value="navigation">
                                <Card className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {dashboardNavItems.map((item) => {
                                            const isDisabled = formData.disabledMenuItems.includes(item.href);
                                            return (
                                                <div key={item.href} className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50">
                                                    <Checkbox
                                                        id={`menu-${item.href}`}
                                                        checked={!isDisabled}
                                                        onCheckedChange={(checked) => {
                                                            const newDisabledItems = checked
                                                                ? formData.disabledMenuItems.filter((href) => href !== item.href)
                                                                : [...formData.disabledMenuItems, item.href];
                                                            setFormData({ ...formData, disabledMenuItems: newDisabledItems });
                                                        }}
                                                    />
                                                    <label htmlFor={`menu-${item.href}`} className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                                                        {item.icon && <item.icon className="h-4 w-4 text-muted-foreground" />}
                                                        {item.title}
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={loading}>
                                            {loading ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </Card>
                            </TabsContent>

                            <TabsContent value="resources">
                                <Card className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        {customLinks.map((link) => (
                                            <div key={link.id} className="flex items-center gap-2 rounded-md border p-2">
                                                {isEditingLink === link.id && editingLinkData ? (
                                                    <>
                                                        <div className="flex-1 space-y-2">
                                                            <Input
                                                                value={editingLinkData.name}
                                                                onChange={(e) => setEditingLinkData({ ...editingLinkData, name: e.target.value })}
                                                            />
                                                            <Input
                                                                value={editingLinkData.url}
                                                                onChange={(e) => setEditingLinkData({ ...editingLinkData, url: e.target.value })}
                                                            />
                                                        </div>
                                                        <Button size="sm" variant="ghost" onClick={() => handleSaveLink(link.id)}><Check className="h-4 w-4" /></Button>
                                                        <Button size="sm" variant="ghost" onClick={() => { setIsEditingLink(null); setEditingLinkData(null); }}><X className="h-4 w-4" /></Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex-1">
                                                            <p className="font-medium">{link.name}</p>
                                                            <p className="text-xs text-muted-foreground">{link.url}</p>
                                                        </div>
                                                        <Button size="sm" variant="ghost" onClick={() => { setIsEditingLink(link.id); setEditingLinkData({ name: link.name, url: link.url }); }}>Edit</Button>
                                                        <Button size="sm" variant="ghost" onClick={() => handleDeleteLink(link.id)}><Trash2 className="h-4 w-4" /></Button>
                                                    </>
                                                )}
                                            </div>
                                        ))}

                                        <div className="border p-4 rounded-md bg-muted/30 space-y-3">
                                            <h4 className="text-sm font-medium">Add New Link</h4>
                                            <div className="grid gap-2">
                                                <Input placeholder="Name" value={newLink.name} onChange={(e) => setNewLink({ ...newLink, name: e.target.value })} />
                                                <Input placeholder="URL" value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} />
                                            </div>
                                            <Button size="sm" variant="secondary" onClick={handleAddLink} disabled={!newLink.name || !newLink.url}>
                                                <Plus className="mr-2 h-4 w-4" /> Add Link
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>
                </form>

                {/* Dialogs for Website Management */}
                {!isNew && (
                    <>
                        <WebsiteDialog
                            open={websiteDialogOpen}
                            onOpenChange={(open) => {
                                setWebsiteDialogOpen(open);
                                if (!open) setSelectedWebsite(null);
                            }}
                            clientId={clientId}
                            website={selectedWebsite}
                            onSuccess={fetchWebsites}
                        />
                        <WebsiteGroupDialog
                            open={websiteGroupDialogOpen}
                            onOpenChange={setWebsiteGroupDialogOpen}
                            clientId={clientId}
                            websites={websites}
                            onSuccess={fetchWebsites}
                        />
                        <SyncStoresDialog
                            open={syncStoresDialogOpen}
                            onOpenChange={setSyncStoresDialogOpen}
                            clientId={clientId}
                            onSuccess={fetchWebsites}
                        />
                    </>
                )}
            </div>
        </ProtectedRoute>
    );
}
