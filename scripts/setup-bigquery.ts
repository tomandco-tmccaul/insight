#!/usr/bin/env tsx

/**
 * BigQuery Setup Script
 * 
 * This script automates the creation of BigQuery tables and insertion of test data.
 * 
 * Prerequisites:
 * 1. Google Cloud project created
 * 2. BigQuery API enabled
 * 3. Service account created with BigQuery Admin role
 * 4. Service account key downloaded to ./bigquery-key.json
 * 5. Environment variables set in .env.local
 * 
 * Usage:
 *   npm run setup:bigquery
 */

import { BigQuery } from '@google-cloud/bigquery';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const DATASET_ID = process.env.BIGQUERY_DATASET_ID || 'insight_analytics';
const KEY_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS || './bigquery-key.json';
const BIGQUERY_LOCATION = process.env.BIGQUERY_LOCATION || 'europe-west2';

// Check if running in emulator mode
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  console.log('⚠️  WARNING: You are in Firebase Emulator mode.');
  console.log('⚠️  BigQuery setup requires real Google Cloud credentials.');
  console.log('⚠️  Please update .env.local with real credentials before continuing.\n');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('Continue anyway? (y/N): ', (answer: string) => {
    readline.close();
    if (answer.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      process.exit(0);
    }
    runSetup();
  });
} else {
  runSetup();
}

async function runSetup() {
  console.log('🚀 Starting BigQuery Setup...\n');

  // Validate environment
  if (!PROJECT_ID) {
    console.error('❌ Error: GOOGLE_CLOUD_PROJECT not set in .env.local');
    process.exit(1);
  }

  if (!fs.existsSync(KEY_FILE)) {
    console.error(`❌ Error: Service account key not found at ${KEY_FILE}`);
    console.error('   Please download your service account key and save it as bigquery-key.json');
    process.exit(1);
  }

  console.log(`✅ Project ID: ${PROJECT_ID}`);
  console.log(`✅ Dataset ID: ${DATASET_ID}`);
  console.log(`✅ Key File: ${KEY_FILE}\n`);

  // Initialize BigQuery client
  const bigquery = new BigQuery({
    projectId: PROJECT_ID,
    keyFilename: KEY_FILE,
  });

  try {
    // Step 1: Create dataset
    await createDataset(bigquery);

    // Step 2: Create tables
    await createTables(bigquery);

    // Step 3: Insert test data
    await insertTestData(bigquery);

    console.log('\n✅ BigQuery setup complete!');
    console.log('\n📊 Next steps:');
    console.log('   1. Update .env.local with BigQuery credentials');
    console.log('   2. Restart your dev server');
    console.log('   3. Test the Sales Overview page');
    
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

async function createDataset(bigquery: BigQuery) {
  console.log('📁 Creating dataset...');
  
  const dataset = bigquery.dataset(DATASET_ID);
  const [exists] = await dataset.exists();

  if (exists) {
    console.log(`   ℹ️  Dataset ${DATASET_ID} already exists`);
    return;
  }

  await bigquery.createDataset(DATASET_ID, {
    location: BIGQUERY_LOCATION,
  });

  console.log(`   ✅ Created dataset: ${DATASET_ID}`);
}

async function createTables(bigquery: BigQuery) {
  console.log('\n📋 Creating tables...');
  
  const dataset = bigquery.dataset(DATASET_ID);

  // Sales Overview Table
  await createTableIfNotExists(dataset, 'agg_sales_overview_daily', {
    schema: [
      { name: 'date', type: 'DATE', mode: 'REQUIRED' },
      { name: 'website_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'total_sales', type: 'FLOAT64', mode: 'REQUIRED' },
      { name: 'total_orders', type: 'INT64', mode: 'REQUIRED' },
      { name: 'total_sessions', type: 'INT64', mode: 'REQUIRED' },
      { name: 'total_media_spend', type: 'FLOAT64', mode: 'REQUIRED' },
      { name: 'total_revenue', type: 'FLOAT64', mode: 'REQUIRED' },
      { name: 'total_returns', type: 'INT64', mode: 'NULLABLE' },
      { name: 'total_return_value', type: 'FLOAT64', mode: 'NULLABLE' },
    ],
    timePartitioning: { type: 'DAY', field: 'date' },
    clustering: { fields: ['website_id'] },
  });

  // Product Performance Table
  await createTableIfNotExists(dataset, 'agg_product_performance_daily', {
    schema: [
      { name: 'date', type: 'DATE', mode: 'REQUIRED' },
      { name: 'website_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'product_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'product_name', type: 'STRING', mode: 'REQUIRED' },
      { name: 'product_sku', type: 'STRING', mode: 'REQUIRED' },
      { name: 'category', type: 'STRING', mode: 'NULLABLE' },
      { name: 'quantity_sold', type: 'INT64', mode: 'REQUIRED' },
      { name: 'revenue', type: 'FLOAT64', mode: 'REQUIRED' },
      { name: 'stock_level', type: 'INT64', mode: 'NULLABLE' },
      { name: 'return_count', type: 'INT64', mode: 'NULLABLE' },
      { name: 'return_rate', type: 'FLOAT64', mode: 'NULLABLE' },
    ],
    timePartitioning: { type: 'DAY', field: 'date' },
    clustering: { fields: ['website_id', 'product_id'] },
  });

  // Marketing Channel Table
  await createTableIfNotExists(dataset, 'agg_marketing_channel_daily', {
    schema: [
      { name: 'date', type: 'DATE', mode: 'REQUIRED' },
      { name: 'website_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'channel', type: 'STRING', mode: 'REQUIRED' },
      { name: 'campaign_name', type: 'STRING', mode: 'NULLABLE' },
      { name: 'spend', type: 'FLOAT64', mode: 'REQUIRED' },
      { name: 'sessions', type: 'INT64', mode: 'REQUIRED' },
      { name: 'revenue', type: 'FLOAT64', mode: 'REQUIRED' },
      { name: 'conversions', type: 'INT64', mode: 'REQUIRED' },
      { name: 'impressions', type: 'INT64', mode: 'NULLABLE' },
      { name: 'clicks', type: 'INT64', mode: 'NULLABLE' },
    ],
    timePartitioning: { type: 'DAY', field: 'date' },
    clustering: { fields: ['website_id', 'channel'] },
  });

  // Website Behavior Table
  await createTableIfNotExists(dataset, 'agg_website_behavior_daily', {
    schema: [
      { name: 'date', type: 'DATE', mode: 'REQUIRED' },
      { name: 'website_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'page_path', type: 'STRING', mode: 'REQUIRED' },
      { name: 'page_title', type: 'STRING', mode: 'NULLABLE' },
      { name: 'sessions', type: 'INT64', mode: 'REQUIRED' },
      { name: 'pageviews', type: 'INT64', mode: 'REQUIRED' },
      { name: 'unique_pageviews', type: 'INT64', mode: 'REQUIRED' },
      { name: 'avg_time_on_page', type: 'FLOAT64', mode: 'REQUIRED' },
      { name: 'bounce_rate', type: 'FLOAT64', mode: 'REQUIRED' },
      { name: 'exit_rate', type: 'FLOAT64', mode: 'REQUIRED' },
      { name: 'entrances', type: 'INT64', mode: 'REQUIRED' },
      { name: 'exits', type: 'INT64', mode: 'REQUIRED' },
    ],
    timePartitioning: { type: 'DAY', field: 'date' },
    clustering: { fields: ['website_id'] },
  });

  console.log('   ✅ All tables created');
}

async function createTableIfNotExists(dataset: any, tableId: string, options: any) {
  const table = dataset.table(tableId);
  const [exists] = await table.exists();

  if (exists) {
    console.log(`   ℹ️  Table ${tableId} already exists`);
    return;
  }

  await dataset.createTable(tableId, options);
  console.log(`   ✅ Created table: ${tableId}`);
}

async function insertTestData(bigquery: BigQuery) {
  console.log('\n📊 Inserting test data...');
  console.log('   This may take a minute...\n');

  // Read and execute the SQL file
  const sqlFile = path.join(__dirname, 'setup-bigquery.sql');
  
  if (!fs.existsSync(sqlFile)) {
    console.error('   ❌ SQL file not found:', sqlFile);
    return;
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');
  
  // Split by INSERT statements and execute each one
  const insertStatements = sql
    .split('INSERT INTO')
    .filter(s => s.trim().length > 0)
    .map(s => 'INSERT INTO' + s);

  for (const statement of insertStatements) {
    if (statement.includes('CREATE TABLE') || statement.includes('CREATE SCHEMA')) {
      continue; // Skip CREATE statements, we already created tables
    }

    try {
      const [job] = await bigquery.createQueryJob({
        query: statement,
        location: BIGQUERY_LOCATION,
      });

      await job.getQueryResults();
      
      // Extract table name from statement
      const match = statement.match(/INSERT INTO `[^`]+\.([^`]+)`/);
      const tableName = match ? match[1] : 'unknown';
      console.log(`   ✅ Inserted data into: ${tableName}`);
      
    } catch (error: any) {
      console.error(`   ⚠️  Warning: ${error.message}`);
    }
  }

  console.log('\n   ✅ Test data inserted');
}

