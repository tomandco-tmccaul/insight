// Date utility functions
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';
import { DateRange, ComparisonPeriod } from '@/types';

/**
 * Format a date string for display
 */
export function formatDate(date: string | Date, formatStr: string = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Get date range for comparison period
 */
export function getComparisonDateRange(
  dateRange: DateRange,
  comparisonPeriod: ComparisonPeriod
): DateRange | null {
  if (comparisonPeriod === 'none') {
    return null;
  }

  const start = new Date(dateRange.startDate);
  const end = new Date(dateRange.endDate);
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (comparisonPeriod === 'previous_period') {
    return {
      startDate: format(subDays(start, daysDiff), 'yyyy-MM-dd'),
      endDate: format(subDays(end, daysDiff), 'yyyy-MM-dd'),
    };
  }

  if (comparisonPeriod === 'previous_year') {
    return {
      startDate: format(subYears(start, 1), 'yyyy-MM-dd'),
      endDate: format(subYears(end, 1), 'yyyy-MM-dd'),
    };
  }

  return null;
}

/**
 * Get preset date ranges
 */
export const dateRangePresets = {
  today: (): DateRange => ({
    startDate: format(startOfDay(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfDay(new Date()), 'yyyy-MM-dd'),
  }),
  yesterday: (): DateRange => ({
    startDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    endDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
  }),
  last7Days: (): DateRange => ({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  }),
  last30Days: (): DateRange => ({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  }),
  last90Days: (): DateRange => ({
    startDate: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  }),
  thisMonth: (): DateRange => ({
    startDate: format(startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  }),
  lastMonth: (): DateRange => {
    const lastMonth = subMonths(new Date(), 1);
    const start = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const end = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  },
};

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format number with commas
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

