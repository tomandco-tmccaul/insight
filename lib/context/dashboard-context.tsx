'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

const STORAGE_KEYS = {
  SELECTED_CLIENT_ID: 'dashboard_selected_client_id',
  SELECTED_WEBSITE_ID: 'dashboard_selected_website_id',
  DATE_RANGE: 'dashboard_date_range',
  COMPARISON_PERIOD: 'dashboard_comparison_period',
} as const;

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { appUser } = useAuth();
  
  // Initialize state with localStorage values (only on client side)
  const [selectedClientId, setSelectedClientIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.SELECTED_CLIENT_ID) || null;
  });
  
  const [selectedWebsiteId, setSelectedWebsiteIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.SELECTED_WEBSITE_ID) || null;
  });

  // Initialize dateRange from localStorage or default to last 30 days
  const [dateRange, setDateRangeState] = useState<DateRange>(() => {
    if (typeof window === 'undefined') {
      return {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      };
    }
    const stored = localStorage.getItem(STORAGE_KEYS.DATE_RANGE);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.startDate && parsed.endDate) {
          return parsed;
        }
      } catch (e) {
        // Invalid JSON, use default
      }
    }
    return {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    };
  });

  // Initialize comparisonPeriod from localStorage or default to 'previous_period'
  const [comparisonPeriod, setComparisonPeriodState] = useState<ComparisonPeriod>(() => {
    if (typeof window === 'undefined') return 'previous_period';
    const stored = localStorage.getItem(STORAGE_KEYS.COMPARISON_PERIOD);
    if (stored && (stored === 'previous_period' || stored === 'previous_year' || stored === 'none')) {
      return stored as ComparisonPeriod;
    }
    return 'previous_period';
  });

  // Wrapper to persist clientId to localStorage
  const setSelectedClientId = useCallback((clientId: string | null) => {
    setSelectedClientIdState(clientId);
    if (typeof window !== 'undefined') {
      if (clientId) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_CLIENT_ID, clientId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_CLIENT_ID);
      }
    }
  }, []);

  // Wrapper to persist websiteId to localStorage
  const setSelectedWebsiteId = useCallback((websiteId: string | null) => {
    setSelectedWebsiteIdState(websiteId);
    if (typeof window !== 'undefined') {
      if (websiteId) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_WEBSITE_ID, websiteId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_WEBSITE_ID);
      }
    }
  }, []);

  // Wrapper to persist dateRange to localStorage
  const setDateRange = useCallback((range: DateRange) => {
    setDateRangeState(range);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DATE_RANGE, JSON.stringify(range));
    }
  }, []);

  // Wrapper to persist comparisonPeriod to localStorage
  const setComparisonPeriod = useCallback((period: ComparisonPeriod) => {
    setComparisonPeriodState(period);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.COMPARISON_PERIOD, period);
    }
  }, []);

  // Set client ID based on user role
  useEffect(() => {
    if (appUser) {
      if (appUser.role === 'client' && appUser.clientId) {
        // For client users, always use their clientId (ignore stored value)
        setSelectedClientId(appUser.clientId);
      }
      // For admin users, use the stored value if available, otherwise let them select
    }
  }, [appUser, setSelectedClientId]);

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

