#!/usr/bin/env node
/**
 * Seed Test Data Script
 * 
 * This script creates test client and website data in Firestore.
 * This data matches the BigQuery test data we already have.
 * 
 * Usage:
 *   npm run seed:data
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
const serviceAccount = require('../service-account-key.json');

initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = getFirestore();

async function seedTestData() {
  console.log('🌱 Seeding test data...\n');

  try {
    // Create Sanderson Design Group client
    const clientId = 'sanderson-design-group';
    const clientData = {
      id: clientId,
      clientName: 'Sanderson Design Group',
      bigQueryDatasetId: 'insight_analytics', // For now, using the shared dataset
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('📦 Creating client: Sanderson Design Group...');
    await db.collection('clients').doc(clientId).set(clientData);
    console.log('✅ Client created\n');

    // Create websites
    const websites = [
      {
        id: 'sanderson_uk',
        websiteName: 'Sanderson UK',
        bigQueryWebsiteId: 'sanderson_uk',
      },
      {
        id: 'harlequin',
        websiteName: 'Harlequin',
        bigQueryWebsiteId: 'harlequin',
      },
    ];

    console.log('🌐 Creating websites...');
    for (const website of websites) {
      const websiteData = {
        ...website,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db
        .collection('clients')
        .doc(clientId)
        .collection('websites')
        .doc(website.id)
        .set(websiteData);

      console.log(`✅ Website created: ${website.websiteName}`);
    }

    console.log('\n🎉 Test data seeded successfully!\n');
    console.log('📊 Created:');
    console.log('   • 1 Client: Sanderson Design Group');
    console.log('   • 2 Websites: Sanderson UK, Harlequin');
    console.log('\n💡 These match the BigQuery test data in europe-west2');
    console.log('\n🌐 Go to: http://localhost:3000');
    console.log('   Login and select "Sanderson Design Group" to see data!\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error seeding data:', error.message);
    process.exit(1);
  }
}

// Run the script
seedTestData();

