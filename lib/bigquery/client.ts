// BigQuery Client Configuration
import { BigQuery } from '@google-cloud/bigquery';

// Initialize BigQuery client
export const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  // Credentials will be automatically loaded from GOOGLE_APPLICATION_CREDENTIALS env var
  // or from the service account key file
});

export const DATASET_ID = process.env.BIGQUERY_DATASET_ID || 'analytics';
export const BIGQUERY_LOCATION = process.env.BIGQUERY_LOCATION || 'europe-west2';

/**
 * Execute a BigQuery query with parameters
 */
export async function queryBigQuery<T = any>(
  query: string,
  params?: { [key: string]: any }
): Promise<T[]> {
  const options = {
    query,
    params,
    location: BIGQUERY_LOCATION,
  };

  const [rows] = await bigquery.query(options);
  return rows as T[];
}

/**
 * Get a reference to a specific table
 */
export function getTable(tableId: string) {
  return bigquery.dataset(DATASET_ID).table(tableId);
}

