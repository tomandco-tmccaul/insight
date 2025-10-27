'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useIdToken } from '@/lib/auth/hooks';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, ChevronDown } from 'lucide-react';
import { apiRequest } from '@/lib/utils/api';
import { Client } from '@/types/firestore';

export function DashboardHeader() {
  const { appUser, signOut } = useAuth();
  const getIdToken = useIdToken();
  const {
    selectedClientId,
    setSelectedClientId,
    selectedWebsiteId,
    setSelectedWebsiteId,
    dateRange,
    setDateRange,
    comparisonPeriod,
    setComparisonPeriod,
  } = useDashboard();

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Fetch clients for admin users
  useEffect(() => {
    async function fetchClients() {
      if (appUser?.role !== 'admin') return;

      setLoadingClients(true);
      try {
        const idToken = await getIdToken();
        const response = await apiRequest<Client[]>(
          '/api/clients',
          {},
          idToken || undefined
        );

        if (response.success && response.data) {
          setClients(response.data);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoadingClients(false);
      }
    }

    fetchClients();
  }, [appUser, getIdToken]);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left side - Report selector and filters */}
      <div className="flex items-center gap-4">
        {/* Client Selector (Admin only) */}
        {appUser?.role === 'admin' && (
          <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {loadingClients ? (
                <div className="px-2 py-1.5 text-sm text-gray-500">Loading clients...</div>
              ) : clients.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-gray-500">No clients found</div>
              ) : (
                clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.clientName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}

        {/* Report/Website Selector */}
        <Select value={selectedWebsiteId || ''} onValueChange={setSelectedWebsiteId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select website" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_combined">All Websites</SelectItem>
            <SelectItem value="harlequin">Harlequin</SelectItem>
            <SelectItem value="sanderson">Sanderson Brand</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Picker */}
        <Button variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">
            {dateRange.startDate} - {dateRange.endDate}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>

        {/* Comparison Period */}
        <Select value={comparisonPeriod} onValueChange={(value) => setComparisonPeriod(value as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Comparison</SelectItem>
            <SelectItem value="previous_period">Previous Period</SelectItem>
            <SelectItem value="previous_year">Previous Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right side - User menu */}
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                <AvatarFallback className="bg-gray-200 text-gray-600">
                  {appUser?.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{appUser?.email}</p>
                <p className="text-xs text-gray-500 capitalize">{appUser?.role}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

