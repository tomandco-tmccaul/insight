'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useDashboard } from '@/lib/context/dashboard-context';

/**
 * Hook to sync dashboard context (website, client, date range) with URL parameters
 * This ensures that filters are always reflected in the URL for shareable links
 */
export function useUrlSync() {
  const { selectedWebsiteId, selectedClientId, dateRange } = useDashboard();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Don't run until we have all required values
    if (!selectedWebsiteId || !selectedClientId || !dateRange?.startDate || !dateRange?.endDate) {
      return;
    }

    // Build params from current dashboard context
    const params = new URLSearchParams();
    params.set('websiteId', selectedWebsiteId);
    params.set('clientId', selectedClientId);
    params.set('startDate', dateRange.startDate);
    params.set('endDate', dateRange.endDate);
    
    // Preserve any existing params (like tab, etc.) that aren't dashboard filters
    searchParams.forEach((value, key) => {
      if (!['websiteId', 'clientId', 'startDate', 'endDate'].includes(key)) {
        params.set(key, value);
      }
    });

    // Build the new URL
    const newUrl = `${pathname}?${params.toString()}`;
    
    // Get current URL params
    const currentWebsiteId = searchParams.get('websiteId');
    const currentClientId = searchParams.get('clientId');
    const currentStartDate = searchParams.get('startDate');
    const currentEndDate = searchParams.get('endDate');

    // Check if URL needs updating
    const needsUpdate = 
      !currentWebsiteId || // URL is missing params - always update on initial load
      !currentStartDate ||
      currentWebsiteId !== selectedWebsiteId ||
      currentClientId !== selectedClientId ||
      currentStartDate !== dateRange.startDate ||
      currentEndDate !== dateRange.endDate;

    if (needsUpdate) {
      // Update the URL immediately
      router.replace(newUrl, { scroll: false });
    }
  }, [selectedWebsiteId, selectedClientId, dateRange?.startDate, dateRange?.endDate, pathname, router, searchParams]);
}

