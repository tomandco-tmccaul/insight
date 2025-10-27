'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { DateRange, ComparisonPeriod } from '@/types';
import { useAuth } from '@/lib/auth/context';

interface DashboardContextType {
  // Selected client (for admins)
  selectedClientId: string | null;
  setSelectedClientId: (clientId: string | null) => void;

  // Selected website/report
  selectedWebsiteId: string | null;
  setSelectedWebsiteId: (websiteId: string | null) => void;

  // Date range
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;

  // Comparison period
  comparisonPeriod: ComparisonPeriod;
  setComparisonPeriod: (period: ComparisonPeriod) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { appUser } = useAuth();
  
  // For clients, use their clientId; for admins, allow selection
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null);

  // Default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('previous_period');

  // Set client ID based on user role
  useEffect(() => {
    if (appUser) {
      if (appUser.role === 'client' && appUser.clientId) {
        setSelectedClientId(appUser.clientId);
      }
      // Admin users will select client via the header dropdown
    }
  }, [appUser]);

  const value = {
    selectedClientId,
    setSelectedClientId,
    selectedWebsiteId,
    setSelectedWebsiteId,
    dateRange,
    setDateRange,
    comparisonPeriod,
    setComparisonPeriod,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

