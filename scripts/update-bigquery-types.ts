/**
 * Script to update BigQuery types based on current table schemas
 * Run with: npx tsx scripts/update-bigquery-types.ts
 */

import { BigQuery } from '@google-cloud/bigquery';
import * as path from 'path';

const KEY_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '../service-account-key.json');

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'insight-dashboard-1761555293',
  keyFilename: KEY_FILE,
});

// Get dataset ID from command line argument or environment variable
const DATASET_ID = process.argv[2] || process.env.BIGQUERY_DATASET_ID || 'sanderson_design_group';

interface TableField {
  name: string;
  type: string;
  mode: string;
  description?: string;
}

interface TableSchema {
  tableId: string;
  fields: TableField[];
}

/**
 * Convert BigQuery type to TypeScript type
 */
function bigQueryTypeToTS(bqType: string, mode: string): string {
  const isNullable = mode === 'NULLABLE' || mode === 'REPEATED';
  const nullable = isNullable ? ' | null' : '';
  const array = mode === 'REPEATED' ? '[]' : '';

  switch (bqType.toUpperCase()) {
    case 'STRING':
      return `string${array}${nullable}`;
    case 'INTEGER':
    case 'INT64':
      return `number${array}${nullable}`;
    case 'FLOAT':
    case 'FLOAT64':
    case 'NUMERIC':
    case 'BIGNUMERIC':
      return `number${array}${nullable}`;
    case 'BOOLEAN':
    case 'BOOL':
      return `boolean${array}${nullable}`;
    case 'DATE':
      return `string${array}${nullable}`; // YYYY-MM-DD format
    case 'DATETIME':
      return `string${array}${nullable}`; // ISO 8601 format
    case 'TIMESTAMP':
      return `string${array}${nullable}`; // ISO 8601 format
    case 'TIME':
      return `string${array}${nullable}`;
    case 'BYTES':
      return `string${array}${nullable}`; // Base64 encoded
    case 'RECORD':
    case 'STRUCT':
      return `any${array}${nullable}`; // Complex types
    case 'JSON':
      return `any${array}${nullable}`;
    default:
      return `any${array}${nullable}`;
  }
}

/**
 * Convert table name to TypeScript interface name
 */
function tableNameToInterfaceName(tableId: string): string {
  // Extract granularity suffix first (daily, hourly, monthly, etc.)
  let granularity = '';
  if (tableId.endsWith('_daily')) {
    granularity = 'Daily';
    tableId = tableId.replace(/_daily$/, '');
  } else if (tableId.endsWith('_hourly')) {
    granularity = 'Hourly';
    tableId = tableId.replace(/_hourly$/, '');
  } else if (tableId.endsWith('_monthly')) {
    granularity = 'Monthly';
    tableId = tableId.replace(/_monthly$/, '');
  } else if (tableId.endsWith('_weekly')) {
    granularity = 'Weekly';
    tableId = tableId.replace(/_weekly$/, '');
  }

  // Remove common prefixes and convert to PascalCase
  let name = tableId
    .replace(/^agg_/, '')
    .replace(/^mv_/, '')
    .replace(/_flattened$/, 'Flattened')
    .replace(/_materialized_view$/, 'MaterializedView');

  // Convert snake_case to PascalCase
  const parts = name.split('_');
  name = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  // Add granularity and Row suffix
  return `${name}${granularity}Row`;
}

/**
 * Get schema for a table
 */
async function getTableSchema(tableId: string): Promise<TableSchema | null> {
  try {
    const table = bigquery.dataset(DATASET_ID).table(tableId);
    const [metadata] = await table.getMetadata();
    const schema = metadata.schema;

    return {
      tableId,
      fields: schema.fields.map((field: any) => ({
        name: field.name,
        type: field.type,
        mode: field.mode || 'NULLABLE',
        description: field.description,
      })),
    };
  } catch (error) {
    console.error(`Error getting schema for ${tableId}:`, error);
    return null;
  }
}

/**
 * Generate TypeScript interface from schema
 */
function generateInterface(schema: TableSchema): string {
  const interfaceName = tableNameToInterfaceName(schema.tableId);
  const lines: string[] = [];

  lines.push(`// ${schema.tableId}`);
  lines.push(`export interface ${interfaceName} {`);

  for (const field of schema.fields) {
    const tsType = bigQueryTypeToTS(field.type, field.mode);
    const optional = field.mode === 'NULLABLE' ? '?' : '';
    const comment = field.description ? ` // ${field.description}` : '';
    lines.push(`  ${field.name}${optional}: ${tsType};${comment}`);
  }

  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

/**
 * Main function
 */
async function listDatasets(): Promise<string[]> {
  try {
    const [datasets] = await bigquery.getDatasets();
    return datasets.map((d) => d.id || '').filter(Boolean);
  } catch (error) {
    console.error('Error listing datasets:', error);
    return [];
  }
}

async function main() {
  // If no dataset specified, list available datasets
  if (!process.argv[2] && !process.env.BIGQUERY_DATASET_ID) {
    console.log('No dataset specified. Available datasets:');
    const datasets = await listDatasets();
    if (datasets.length === 0) {
      console.error('No datasets found. Please specify a dataset ID.');
      process.exit(1);
    }
    datasets.forEach((d) => console.log(`  - ${d}`));
    console.log(`\nUsing first dataset: ${datasets[0]}`);
    const firstDataset = datasets[0];
    // Update DATASET_ID - but we can't reassign const, so we'll use it directly
    const datasetId = firstDataset;
    await processDataset(datasetId);
    return;
  }

  await processDataset(DATASET_ID);
}

async function processDataset(datasetId: string) {
  console.log(`Fetching tables from dataset: ${datasetId}...`);

  try {
    const dataset = bigquery.dataset(datasetId);
    const [tables] = await dataset.getTables();

    // Filter out adobe_commerce_sql_ tables
    const filteredTables = tables.filter(
      (table) => !table.id.includes('adobe_commerce_sql_')
    );

    console.log(`Found ${filteredTables.length} tables (excluding adobe_commerce_sql_ tables)`);

    const schemas: TableSchema[] = [];

    for (const table of filteredTables) {
      console.log(`  Fetching schema for: ${table.id}...`);
      const schema = await getTableSchema(table.id);
      if (schema) {
        schemas.push(schema);
      }
    }

    // Group schemas by category
    const aggregatedSchemas = schemas.filter((s) => s.tableId.startsWith('agg_'));
    const materializedViewSchemas = schemas.filter((s) => s.tableId.startsWith('mv_'));
    const ga4Schemas = schemas.filter((s) => s.tableId.startsWith('ga4_'));
    const gscSchemas = schemas.filter((s) => s.tableId.startsWith('gsc_'));
    const adobeCommerceSchemas = schemas.filter(
      (s) => s.tableId.startsWith('adobe_commerce_') && !s.tableId.startsWith('adobe_commerce_sql_')
    );
    const otherSchemas = schemas.filter(
      (s) =>
        !s.tableId.startsWith('agg_') &&
        !s.tableId.startsWith('mv_') &&
        !s.tableId.startsWith('ga4_') &&
        !s.tableId.startsWith('gsc_') &&
        !s.tableId.startsWith('adobe_commerce_')
    );

    // Generate TypeScript code
    const output: string[] = [];

    output.push('// BigQuery Data Models');
    output.push('// These interfaces represent the schema of tables in BigQuery');
    output.push('// Auto-generated from BigQuery schemas');
    output.push('');

    // Aggregated tables
    if (aggregatedSchemas.length > 0) {
      output.push('// ============================================================================');
      output.push('// Aggregated Reporting Tables');
      output.push('// ============================================================================');
      output.push('');
      for (const schema of aggregatedSchemas.sort((a, b) => a.tableId.localeCompare(b.tableId))) {
        output.push(generateInterface(schema));
      }
    }

    // Materialized views
    if (materializedViewSchemas.length > 0) {
      output.push('// ============================================================================');
      output.push('// Materialized Views');
      output.push('// ============================================================================');
      output.push('');
      for (const schema of materializedViewSchemas.sort((a, b) => a.tableId.localeCompare(b.tableId))) {
        output.push(generateInterface(schema));
      }
    }

    // Adobe Commerce tables
    if (adobeCommerceSchemas.length > 0) {
      output.push('// ============================================================================');
      output.push('// Adobe Commerce Tables (from Airbyte Adobe Commerce connector)');
      output.push('// ============================================================================');
      output.push('');
      for (const schema of adobeCommerceSchemas.sort((a, b) => a.tableId.localeCompare(b.tableId))) {
        output.push(generateInterface(schema));
      }
    }

    // GA4 tables
    if (ga4Schemas.length > 0) {
      output.push('// ============================================================================');
      output.push('// GA4 Data Models (from Airbyte GA4 connector)');
      output.push('// ============================================================================');
      output.push('');
      for (const schema of ga4Schemas.sort((a, b) => a.tableId.localeCompare(b.tableId))) {
        output.push(generateInterface(schema));
      }
    }

    // GSC tables
    if (gscSchemas.length > 0) {
      output.push('// ============================================================================');
      output.push('// Google Search Console Tables (from Airbyte GSC connector)');
      output.push('// ============================================================================');
      output.push('');
      for (const schema of gscSchemas.sort((a, b) => a.tableId.localeCompare(b.tableId))) {
        output.push(generateInterface(schema));
      }
    }

    // Other tables
    if (otherSchemas.length > 0) {
      output.push('// ============================================================================');
      output.push('// Other Tables');
      output.push('// ============================================================================');
      output.push('');
      for (const schema of otherSchemas.sort((a, b) => a.tableId.localeCompare(b.tableId))) {
        output.push(generateInterface(schema));
      }
    }

    // Add utility types at the end
    output.push('// ============================================================================');
    output.push('// Utility Types');
    output.push('// ============================================================================');
    output.push('');

    output.push('// Date range filter');
    output.push('export interface DateRange {');
    output.push('  startDate: string; // ISO 8601 or YYYY-MM-DD');
    output.push('  endDate: string;');
    output.push('}');
    output.push('');

    output.push('// Comparison period');
    output.push("export type ComparisonPeriod = 'previous_period' | 'previous_year' | 'none';");
    output.push('');

    output.push('// Report context (used for filtering)');
    output.push('export interface ReportContext {');
    output.push('  clientId: string;');
    output.push("  websiteId: string | 'all_combined'; // 'all_combined' for combined totals");
    output.push('  dateRange: DateRange;');
    output.push('  comparisonPeriod: ComparisonPeriod;');
    output.push('}');
    output.push('');

    output.push('// Aggregated metrics (calculated in-app)');
    output.push('export interface CalculatedMetrics {');
    output.push('  aov: number; // Average Order Value = total_revenue / total_orders');
    output.push('  items_per_order: number; // total_items / total_orders');
    output.push('  cvr?: number; // Conversion Rate = (total_orders / total_sessions) * 100 (requires session data)');
    output.push('  returnRate?: number; // Return Rate = (total_returns / total_orders) * 100 (requires return data)');
    output.push('  blendedROAS?: number; // Return on Ad Spend = total_revenue / total_media_spend (requires ad spend data)');
    output.push('  cpa?: number; // Cost Per Acquisition = total_media_spend / total_orders (requires ad spend data)');
    output.push('}');
    output.push('');

    // Write to file
    const fs = await import('fs/promises');
    const outputPath = './types/bigquery.ts';
    await fs.writeFile(outputPath, output.join('\n'), 'utf-8');

    console.log(`\n✅ Successfully updated ${outputPath}`);
    console.log(`   Generated ${schemas.length} table interfaces`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

