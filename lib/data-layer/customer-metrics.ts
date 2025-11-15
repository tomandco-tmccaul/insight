import { bigquery } from '@/lib/bigquery/client';
import { buildWebsiteFilter, executeQuery } from './base';
import { QueryOptions } from './base';

export interface CustomerMetricsRow {
  date: string;
  website_id?: string;
  unique_customers: number;
  registered_customers: number;
  guest_customers: number;
  revenue_per_customer: number;
}

export interface CustomerMetricsData {
  daily: CustomerMetricsRow[];
  summary: {
    total_unique_customers: number;
    total_registered_customers: number;
    total_guest_customers: number;
    avg_revenue_per_customer: number;
  };
}

/**
 * Fetches customer metrics data with currency conversion and grouped website aggregation.
 */
export async function getCustomerMetrics(
  options: QueryOptions
): Promise<CustomerMetricsData> {
  const { datasetId, clientId, websiteId, startDate, endDate } = options;

  // Build website filter
  const websiteFilter = await buildWebsiteFilter(clientId, websiteId);

  const query = `
    SELECT 
      date,
      website_id,
      unique_customers,
      registered_customers,
      guest_customers,
      revenue_per_customer
    FROM \`${bigquery.projectId}.${datasetId}.mv_agg_customer_metrics_daily\`
    WHERE date BETWEEN @start_date AND @end_date
      ${websiteFilter.filterClause}
    ORDER BY date DESC
  `;

  const queryParams: Record<string, any> = {
    start_date: startDate,
    end_date: endDate,
    ...websiteFilter.params,
  };

  // Execute query and process results
  const daily = await executeQuery<CustomerMetricsRow>(query, queryParams, {
    clientId,
    startDate,
    monetaryFields: [
      { field: 'revenue_per_customer', websiteField: 'website_id', dateField: 'date' },
    ],
    groupBy: ['date'],
    sumFields: [
      'unique_customers',
      'registered_customers',
      'guest_customers',
      'revenue_per_customer',
    ],
    maxFields: [],
  });

  // Calculate summary
  const summary = daily.reduce(
    (acc, row) => {
      acc.total_unique_customers += row.unique_customers || 0;
      acc.total_registered_customers += row.registered_customers || 0;
      acc.total_guest_customers += row.guest_customers || 0;
      acc.total_revenue_per_customer += row.revenue_per_customer || 0;
      acc.count += 1;
      return acc;
    },
    {
      total_unique_customers: 0,
      total_registered_customers: 0,
      total_guest_customers: 0,
      total_revenue_per_customer: 0,
      count: 0,
    }
  );

  const finalSummary = {
    total_unique_customers: summary.total_unique_customers,
    total_registered_customers: summary.total_registered_customers,
    total_guest_customers: summary.total_guest_customers,
    avg_revenue_per_customer:
      summary.count > 0 ? summary.total_revenue_per_customer / summary.count : 0,
  };

  return {
    daily,
    summary: finalSummary,
  };
}

