import { bigquery } from '@/lib/bigquery/client';
import { resolveWebsiteToBigQueryIds } from '@/lib/utils/website-resolver';
import {
  getCurrencyConversionContext,
  convertMonetaryFields,
  aggregateGroupedWebsiteData,
  CurrencyConversionContext,
  MonetaryFieldConfig,
} from '@/lib/utils/currency';

export interface QueryOptions {
  datasetId: string;
  clientId: string;
  websiteId: string | null; // Firestore website ID or 'all_combined'
  startDate: string;
  endDate: string;
}

export interface WebsiteFilter {
  filterClause: string;
  params: Record<string, any>;
}

/**
 * Resolves a website ID to BigQuery website IDs and builds the appropriate filter clause.
 * Returns the SQL filter clause and parameters needed for the query.
 */
export async function buildWebsiteFilter(
  clientId: string,
  websiteId: string | null
): Promise<WebsiteFilter> {
  // If 'all_combined' or no website selected, return empty filter
  if (!websiteId || websiteId === 'all_combined') {
    return {
      filterClause: '',
      params: {},
    };
  }

  // Resolve website ID to BigQuery website IDs (handles grouped websites)
  const bigQueryWebsiteIds = await resolveWebsiteToBigQueryIds(clientId, websiteId);

  if (!bigQueryWebsiteIds || bigQueryWebsiteIds.length === 0) {
    // If resolution fails, return empty filter (will query all websites)
    console.warn('[Data Layer] Failed to resolve website to BigQuery IDs:', { clientId, websiteId });
    return {
      filterClause: '',
      params: {},
    };
  }

  // Build filter clause and parameters
  if (bigQueryWebsiteIds.length === 1) {
    return {
      filterClause: 'AND website_id = @website_id',
      params: { website_id: bigQueryWebsiteIds[0] },
    };
  } else {
    // Multiple websites (grouped) - use IN clause
    const placeholders = bigQueryWebsiteIds.map((_, i) => `@website_id${i}`).join(', ');
    const params: Record<string, any> = {};
    bigQueryWebsiteIds.forEach((id, i) => {
      params[`website_id${i}`] = id;
    });
    return {
      filterClause: `AND website_id IN (${placeholders})`,
      params,
    };
  }
}

/**
 * Processes raw BigQuery rows by:
 * 1. Converting BigQuery DATE objects to strings
 * 2. Applying currency conversion
 * 3. Aggregating grouped website data
 */
export async function processQueryResults<T extends Record<string, any>>(
  rows: T[],
  options: {
    clientId: string;
    startDate: string;
    monetaryFields: MonetaryFieldConfig[];
    groupBy: string[];
    sumFields: string[];
    maxFields?: string[];
  }
): Promise<T[]> {
  if (rows.length === 0) {
    return rows;
  }

  // Get currency conversion context
  const currencyContext = await getCurrencyConversionContext(options.clientId);
  const fallbackMonth =
    options.startDate && /^\d{4}-\d{2}-\d{2}$/.test(options.startDate)
      ? options.startDate.slice(0, 7)
      : null;

  // Transform BigQuery DATE objects to strings
  const transformedRows = rows.map((row: any) => {
    const transformed: any = { ...row };
    // Convert date fields (common pattern)
    if (row.date) {
      transformed.date = row.date?.value || row.date;
    }
    if (row.order_date) {
      transformed.order_date = row.order_date?.value || row.order_date;
    }
    return transformed;
  });

  // Apply currency conversion
  const convertedRows = transformedRows.map((row: any) =>
    convertMonetaryFields(row, currencyContext, options.monetaryFields.map((field) => ({
      ...field,
      fallbackMonth: fallbackMonth || undefined,
    })))
  );

  // Aggregate grouped website data if needed
  const aggregatedRows = aggregateGroupedWebsiteData(
    convertedRows,
    options.groupBy,
    options.sumFields,
    options.maxFields || []
  );

  return aggregatedRows as T[];
}

/**
 * Executes a BigQuery query and processes the results.
 * This is the main entry point for data layer functions.
 */
export async function executeQuery<T extends Record<string, any>>(
  query: string,
  params: Record<string, any>,
  options: {
    clientId: string;
    startDate: string;
    monetaryFields: MonetaryFieldConfig[];
    groupBy: string[];
    sumFields: string[];
    maxFields?: string[];
  }
): Promise<T[]> {
  // Execute query
  const [rows] = await bigquery.query({
    query,
    params,
  });

  // Process results (currency conversion + aggregation)
  return processQueryResults(rows as T[], options);
}

