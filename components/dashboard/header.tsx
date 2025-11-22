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
import { ChevronDown } from 'lucide-react';
import { apiRequest } from '@/lib/utils/api';
import { Client, Website } from '@/types/firestore';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

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

  const pathname = usePathname();

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loadingWebsites, setLoadingWebsites] = useState(false);

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

  // Fetch websites when client is selected
  useEffect(() => {
    async function fetchWebsites() {
      // For client users, use their clientId
      const clientId = appUser?.role === 'admin' ? selectedClientId : appUser?.clientId;

      if (!clientId) {
        setWebsites([]);
        return;
      }

      setLoadingWebsites(true);
      try {
        const idToken = await getIdToken();
        const response = await apiRequest<Website[]>(
          `/api/admin/clients/${clientId}/websites`,
          {},
          idToken || undefined
        );

        if (response.success && response.data) {
          // Sort websites: grouped websites first, then regular websites
          const sortedWebsites = [...response.data].sort((a, b) => {
            if (a.isGrouped && !b.isGrouped) return -1;
            if (!a.isGrouped && b.isGrouped) return 1;
            return a.websiteName.localeCompare(b.websiteName);
          });
          setWebsites(sortedWebsites);

          // Validate and restore website selection
          if (selectedWebsiteId) {
            // Check if the stored websiteId is still valid for this client
            const isValidWebsite =
              selectedWebsiteId === 'all_combined' ||
              response.data.some((w) => w.id === selectedWebsiteId);

            if (!isValidWebsite) {
              // Stored websiteId is no longer valid, auto-select "all_combined" or first website
              if (response.data.length > 0) {
                setSelectedWebsiteId('all_combined');
              }
            }
          } else {
            // No website selected, auto-select "all_combined" if websites are available
            if (response.data.length > 0) {
              setSelectedWebsiteId('all_combined');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching websites:', error);
      } finally {
        setLoadingWebsites(false);
      }
    }

    fetchWebsites();
  }, [selectedClientId, appUser, getIdToken, selectedWebsiteId, setSelectedWebsiteId]);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
    >
      {/* Left side - Report selector and filters */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-4 px-6"
      >
        {/* Client Selector (Admin only) */}
        {appUser?.role === 'admin' && (
          <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-[220px] h-9 text-sm font-medium transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-primary/20">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {loadingClients ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading clients...</div>
              ) : clients.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No clients found</div>
              ) : (
                clients.map((client) => (
                  <SelectItem key={client.id} value={client.id} className="text-sm">
                    {client.clientName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}

        {/* Report/Website Selector */}
        <Select
          value={pathname === '/' ? 'all_combined' : (selectedWebsiteId || '')}
          onValueChange={setSelectedWebsiteId}
          disabled={pathname === '/'}
        >
          <SelectTrigger className="w-[200px] h-9 text-sm font-medium transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-primary/20 disabled:opacity-100 disabled:bg-muted/50">
            <SelectValue placeholder="Select website" />
          </SelectTrigger>
          <SelectContent>
            {loadingWebsites ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading websites...</div>
            ) : websites.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">No websites found</div>
            ) : (
              <>
                <SelectItem value="all_combined" className="text-sm font-medium">All Websites</SelectItem>
                {websites.map((website) => (
                  <SelectItem key={website.id} value={website.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span>{website.websiteName}</span>
                      {website.isGrouped && (
                        <span className="text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          Grouped
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>

        {/* Date Range Picker */}
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        {/* Comparison Period */}
        <Select value={comparisonPeriod} onValueChange={(value) => setComparisonPeriod(value as any)}>
          <SelectTrigger className="w-[180px] h-9 text-sm font-medium transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-primary/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-sm">No Comparison</SelectItem>
            <SelectItem value="previous_period" className="text-sm">Previous Period</SelectItem>
            <SelectItem value="previous_year" className="text-sm">Previous Year</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Right side - User menu */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="flex items-center gap-4 px-6"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Button variant="ghost" className="relative h-10 w-10 rounded-full overflow-hidden">
                <Avatar className="ring-2 ring-primary/20 transition-all hover:ring-primary/50">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold shadow-md">
                    {appUser?.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0"
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: 'easeInOut',
                  }}
                />
              </Button>
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 border-border/50 shadow-lg backdrop-blur-xl bg-popover/95"
          >
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1.5">
                <p className="text-sm font-semibold text-foreground">{appUser?.email}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground capitalize">{appUser?.role}</p>
                  {appUser?.role === 'admin' && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="h-1.5 w-1.5 rounded-full bg-primary"
                    />
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-sm font-medium transition-colors cursor-pointer focus:bg-destructive/10 focus:text-destructive"
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
    </motion.header>
  );
}

