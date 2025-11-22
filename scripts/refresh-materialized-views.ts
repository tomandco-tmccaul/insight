#!/usr/bin/env tsx
/**
 * Manual refresh script for BigQuery materialized views
 * 
 * This script manually refreshes the materialized views that
 * should be auto-refreshing but may have stopped.
 */

import { bigquery } from '../lib/bigquery/client';

const DATASET_ID = 'sanderson_design_group';
const PROJECT_ID = 'insight-dashboard-1761555293';

interface ViewToRefresh {
  name: string;
  fullPath: string;
  description: string;
}

const VIEWS_TO_REFRESH: ViewToRefresh[] = [
  {
    name: 'mv_adobe_commerce_orders_flattened',
    fullPath: `${PROJECT_ID}.${DATASET_ID}.mv_adobe_commerce_orders_flattened`,
    description: 'Orders Flattened (Main source for sales data)',
  },
  {
    name: 'mv_adobe_commerce_sales_items',
    fullPath: `${PROJECT_ID}.${DATASET_ID}.mv_adobe_commerce_sales_items`,
    description: 'Sales Items (Order line items)',
  },
];

async function refreshMaterializedView(view: ViewToRefresh): Promise<boolean> {
  console.log(`\n📊 Refreshing: ${view.name}`);
  console.log(`   ${view.description}`);

  try {
    // Check if view exists first
    const [table] = await bigquery
      .dataset(DATASET_ID)
      .table(view.name)
      .exists();

    if (!table) {
      console.log(`   ❌ View does not exist!`);
      return false;
    }

    console.log(`   ✅ View exists`);

    // Trigger manual refresh using BigQuery system procedure
    const query = `CALL BQ.REFRESH_MATERIALIZED_VIEW('${view.fullPath}')`;
    console.log(`   🔄 Executing refresh...`);

    const [job] = await bigquery.createQueryJob({
      query,
      location: 'europe-west2',
    });

    // Wait for the refresh to complete
    await job.getQueryResults();

    console.log(`   ✅ Refresh completed successfully`);
    return true;
  } catch (error) {
    console.error(`   ❌ Refresh failed:`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function checkLastRefreshTime(view: ViewToRefresh): Promise<void> {
  try {
    const query = `
      SELECT 
        last_refresh_time,
        TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), last_refresh_time, MINUTE) as minutes_since_refresh
      FROM \`${PROJECT_ID}.${DATASET_ID}.INFORMATION_SCHEMA.MATERIALIZED_VIEWS\`
      WHERE table_name = '${view.name}'
    `;

    const [rows] = await bigquery.query({
      query,
      location: 'europe-west2',
    });

    if (rows.length > 0) {
      const row = rows[0];
      const lastRefresh = row.last_refresh_time;
      const minutesAgo = row.minutes_since_refresh;

      console.log(`   📅 Last refresh: ${lastRefresh} (${minutesAgo} minutes ago)`);

      if (minutesAgo > 120) {
        console.log(`   ⚠️  WARNING: View hasn't been refreshed in ${minutesAgo} minutes!`);
      }
    }
  } catch (error) {
    console.log(`   ℹ️  Could not check last refresh time`);
  }
}

async function verifyDataAvailability(): Promise<void> {
  console.log('\n🔍 Verifying data availability after refresh...\n');

  try {
    // Check raw table
    const rawQuery = `
      SELECT 
        MAX(order_date) as last_order_date,
        COUNT(*) as total_orders
      FROM \`${PROJECT_ID}.${DATASET_ID}.adobe_commerce_orders\`
    `;

    const [rawRows] = await bigquery.query({
      query: rawQuery,
      location: 'europe-west2',
    });

    if (rawRows.length > 0) {
      const rawData = rawRows[0];
      console.log(`📦 Raw table (adobe_commerce_orders):`);
      console.log(`   Last order: ${rawData.last_order_date?.value || rawData.last_order_date}`);
      console.log(`   Total orders: ${rawData.total_orders}`);
    }

    // Check flattened view
    const flattenedQuery = `
      SELECT 
        MAX(order_date) as last_order_date,
        MAX(CASE WHEN COALESCE(CAST(ext_is_samples AS INT64), 0) = 0 THEN order_date END) as last_main_order,
        COUNT(*) as total_orders,
        COUNTIF(COALESCE(CAST(ext_is_samples AS INT64), 0) = 0) as main_orders,
        COUNTIF(COALESCE(CAST(ext_is_samples AS INT64), 0) = 1) as sample_orders
      FROM \`${PROJECT_ID}.${DATASET_ID}.mv_adobe_commerce_orders_flattened\`
      WHERE website_id = '9'
    `;

    const [flattenedRows] = await bigquery.query({
      query: flattenedQuery,
      location: 'europe-west2',
    });

    if (flattenedRows.length > 0) {
      const flatData = flattenedRows[0];
      console.log(`\n📊 Flattened view (mv_adobe_commerce_orders_flattened):`);
      console.log(`   Last order (any): ${flatData.last_order_date?.value || flatData.last_order_date}`);
      console.log(`   Last MAIN order: ${flatData.last_main_order?.value || flatData.last_main_order || 'N/A'}`);
      console.log(`   Total orders: ${flatData.total_orders}`);
      console.log(`   - Main orders: ${flatData.main_orders}`);
      console.log(`   - Sample orders: ${flatData.sample_orders}`);

      const lastMain = flatData.last_main_order?.value || flatData.last_main_order;
      const today = new Date().toISOString().split('T')[0];
      const daysDiff = lastMain
        ? Math.floor((new Date(today).getTime() - new Date(lastMain).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysDiff > 2) {
        console.log(`\n   ⚠️  WARNING: Last main order is ${daysDiff} days old!`);
        console.log(`   💡 If raw table has recent data, the view may need recreation.`);
      } else {
        console.log(`\n   ✅ Main orders are up to date!`);
      }
    }
  } catch (error) {
    console.error(`\n❌ Error verifying data:`, error instanceof Error ? error.message : error);
  }
}

async function main() {
  console.log('🔧 BigQuery Materialized View Manual Refresh Tool');
  console.log('='.repeat(70));
  console.log(`Dataset: ${DATASET_ID}`);
  console.log(`Project: ${PROJECT_ID}`);

  const results: boolean[] = [];

  for (const view of VIEWS_TO_REFRESH) {
    await checkLastRefreshTime(view);
    const success = await refreshMaterializedView(view);
    results.push(success);

    // Wait a bit between refreshes
    if (success) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Verify data is now available
  await verifyDataAvailability();

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📋 REFRESH SUMMARY');
  console.log('='.repeat(70));

  const successCount = results.filter((r) => r).length;
  const totalCount = results.length;

  console.log(`\n${successCount} of ${totalCount} views refreshed successfully\n`);

  if (successCount === totalCount) {
    console.log('✅ All materialized views refreshed!');
    console.log('💡 Your sales data should now be up to date.');
    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Reload your dashboard to see updated data');
    console.log('   2. Set up monitoring to detect future refresh issues');
    console.log('   3. Consider switching to scheduled queries if auto-refresh continues failing');
  } else {
    console.log('⚠️  Some views failed to refresh');
    console.log('💡 Check the errors above for details');
  }

  process.exit(successCount === totalCount ? 0 : 1);
}

main().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});

