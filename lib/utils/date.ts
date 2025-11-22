// Date utility functions
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { DateRange, ComparisonPeriod } from '@/types';

/**
 * Generate an array of dates (YYYY-MM-DD) between start and end date inclusive
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  try {
    const interval = eachDayOfInterval({ start, end });
    return interval.map(date => format(date, 'yyyy-MM-dd'));
  } catch (e) {
    console.warn('Error generating date range:', e);
    return [];
  }
}

/**
 * Format a date string for display
 */
export function formatDate(date: string | Date, formatStr: string = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format a date for chart x-axis display (e.g., "24 Mar 24")
 */
export function formatChartDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd MMM yy');
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
    // Calculate duration in days
    // Add 1 day because the difference between start and end is inclusive
    // e.g. Jan 1 to Jan 7 is 7 days, but difference is 6 days
    const durationInDays = daysDiff + 1;
    
    return {
      startDate: format(subDays(start, durationInDays), 'yyyy-MM-dd'),
      endDate: format(subDays(end, durationInDays), 'yyyy-MM-dd'),
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
 * Format percentage for display with sign
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format percentage value without sign (for use with arrows)
 */
export function formatPercentageValue(value: number, decimals: number = 1): string {
  return `${Math.abs(value).toFixed(decimals)}%`;
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
 * Format currency without decimal places (for chart y-axis)
 */
export function formatCurrencyNoDecimals(value: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

