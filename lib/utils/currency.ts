import { adminDb } from '@/lib/firebase/admin';
import { Client, Website } from '@/types/firestore';

export interface CurrencyConversionContext {
  baseCurrency: string;
  monthlyRates: NonNullable<Client['currencySettings']>['monthlyRates'];
  websiteCurrencyMap: Record<string, string | undefined>;
}

/**
 * Build a currency conversion context for a client by loading the client's currency settings
 * and mapped website/store currencies from Firestore.
 */
export async function getCurrencyConversionContext(
  clientId: string
): Promise<CurrencyConversionContext | null> {
  if (!adminDb) {
    console.error('Admin database not initialized');
    return null;
  }

  try {
    const clientDoc = await adminDb.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) {
      console.warn('Client not found when fetching currency context', { clientId });
      return null;
    }

    const clientData = clientDoc.data() as Client;
    const currencySettings: NonNullable<Client['currencySettings']> = clientData.currencySettings ?? {
      baseCurrency: 'GBP',
      monthlyRates: {},
    };

    const websitesSnapshot = await adminDb
      .collection('clients')
      .doc(clientId)
      .collection('websites')
      .get();

    const websiteCurrencyMap: Record<string, string | undefined> = {};

    websitesSnapshot.forEach((doc) => {
      const websiteData = doc.data() as Website;
      const currencyCode =
        websiteData.storeCurrencyCode ||
        websiteData.displayCurrencyCode ||
        websiteData.baseCurrencyCode;

      if (websiteData.bigQueryWebsiteId) {
        websiteCurrencyMap[websiteData.bigQueryWebsiteId] = currencyCode;
      }

      if (websiteData.storeId) {
        websiteCurrencyMap[websiteData.storeId] = currencyCode;
      }
    });

    return {
      baseCurrency: currencySettings.baseCurrency || 'GBP',
      monthlyRates: currencySettings.monthlyRates || {},
      websiteCurrencyMap,
    };
  } catch (error) {
    console.error('Failed to build currency conversion context', error);
    return null;
  }
}

interface ConvertToBaseCurrencyOptions {
  websiteId?: string | null;
  storeId?: string | null;
  currencyCode?: string | null;
  date?: string | Date | null;
  fallbackMonth?: string | null;
}

/**
 * Convert a monetary value from a website/store currency to the client's base currency (GBP).
 * If no matching rate is found, the original value is returned unchanged.
 */
export function convertToBaseCurrency(
  value: number | null | undefined,
  context: CurrencyConversionContext | null,
  options: ConvertToBaseCurrencyOptions = {}
): number {
  if (!value || !context) {
    return value ?? 0;
  }

  const { baseCurrency, monthlyRates, websiteCurrencyMap } = context;

  let sourceCurrency =
    options.currencyCode?.toUpperCase() ||
    (options.websiteId ? websiteCurrencyMap[options.websiteId] : undefined) ||
    (options.storeId ? websiteCurrencyMap[options.storeId] : undefined);

  if (!sourceCurrency || sourceCurrency.toUpperCase() === baseCurrency.toUpperCase()) {
    return value;
  }

  const monthKey = resolveMonthKey(options.date, options.fallbackMonth);
  if (!monthKey) {
    console.warn('Unable to determine month for currency conversion', {
      sourceCurrency,
      options,
    });
    return value;
  }

  const currencyRates = monthlyRates[sourceCurrency];
  const rate = currencyRates ? currencyRates[monthKey] : undefined;

  if (!rate || rate <= 0) {
    console.warn('Missing or invalid conversion rate', {
      sourceCurrency,
      monthKey,
    });
    return value;
  }

  // Rates are stored as GBP -> Currency (e.g. 1 GBP = rate in target currency)
  // To convert from the source currency back to GBP we divide by the rate.
  return value / rate;
}

function resolveMonthKey(date: string | Date | null | undefined, fallback?: string | null) {
  if (date instanceof Date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  if (typeof date === 'string' && date.trim().length >= 7) {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    // If the string is already in YYYY-MM format, return it directly
    if (/^\d{4}-\d{2}$/.test(date.trim())) {
      return date.trim();
    }
  }

  if (fallback && /^\d{4}-\d{2}$/.test(fallback)) {
    return fallback;
  }

  return null;
}

export interface MonetaryFieldConfig {
  field: string;
  websiteField?: string;
  storeField?: string;
  currencyField?: string;
  dateField?: string;
  fallbackMonth?: string;
}

/**
 * Convenience helper to convert selected monetary fields on an object into the base currency.
 */
export function convertMonetaryFields<T extends Record<string, any>>(
  row: T,
  context: CurrencyConversionContext | null,
  fields: MonetaryFieldConfig[]
): T {
  if (!context || !fields.length) {
    return row;
  }

  let updatedRow = row;

  fields.forEach((config) => {
    const value = row[config.field];
    if (typeof value !== 'number') {
      return;
    }

    const convertedValue = convertToBaseCurrency(value, context, {
      websiteId: config.websiteField ? row[config.websiteField] : undefined,
      storeId: config.storeField ? row[config.storeField] : undefined,
      currencyCode: config.currencyField ? row[config.currencyField] : undefined,
      date: config.dateField ? row[config.dateField] : undefined,
      fallbackMonth: config.fallbackMonth,
    });

    if (updatedRow === row) {
      updatedRow = { ...row };
    }

    updatedRow[config.field] = convertedValue;
  });

  return updatedRow;
}

/**
 * Aggregates rows from grouped websites by combining data from multiple website_ids.
 * This should be called after currency conversion to combine data from all websites in a group.
 * 
 * @param rows - Array of rows with website_id field
 * @param groupBy - Array of field names to group by (e.g., ['date'] or ['date', 'hour'])
 * @param sumFields - Array of field names that should be summed when aggregating
 * @param maxFields - Array of field names that should take the maximum value (e.g., unique_customers)
 * @returns Aggregated rows with website_id removed or set to null
 */
export function aggregateGroupedWebsiteData<T extends Record<string, any>>(
  rows: T[],
  groupBy: string[],
  sumFields: string[],
  maxFields: string[] = []
): T[] {
  if (rows.length === 0) {
    return rows;
  }

  // Check if we have multiple website_ids - if not, no aggregation needed
  const uniqueWebsiteIds = new Set(rows.map((row) => row.website_id).filter(Boolean));
  if (uniqueWebsiteIds.size <= 1) {
    return rows;
  }

  // Group rows by the specified keys
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const key = groupBy.map((field) => String(row[field] || '')).join('|');
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  }

  // Aggregate each group
  const aggregated: T[] = [];

  for (const [key, groupRows] of grouped) {
    if (groupRows.length === 1) {
      // Single row, no aggregation needed
      const row = { ...groupRows[0] };
      // Remove website_id for grouped websites
      delete row.website_id;
      aggregated.push(row);
      continue;
    }

    // Aggregate multiple rows
    const firstRow = groupRows[0];
    const aggregatedRow: T = { ...firstRow };

    // Remove website_id for grouped websites
    delete aggregatedRow.website_id;

    // Sum fields
    for (const field of sumFields) {
      aggregatedRow[field] = groupRows.reduce((sum, row) => {
        const value = typeof row[field] === 'number' ? row[field] : 0;
        return sum + (value || 0);
      }, 0);
    }

    // Max fields (for fields that should take the maximum value rather than sum)
    // Note: unique_customers should typically be summed, not maxed, but this is here for flexibility
    for (const field of maxFields) {
      aggregatedRow[field] = Math.max(
        ...groupRows.map((row) => {
          const value = typeof row[field] === 'number' ? row[field] : 0;
          return value || 0;
        })
      );
    }

    aggregated.push(aggregatedRow);
  }

  return aggregated;
}

