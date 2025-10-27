/**
 * Seed Firebase Emulator with test data
 * Run with: npx tsx scripts/seed-emulator.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Set emulator environment variables
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Initialize Firebase Admin
const app = initializeApp({
  projectId: 'demo-project',
});

const auth = getAuth(app);
const db = getFirestore(app);

async function seedData() {
  console.log('🌱 Seeding Firebase Emulator with test data...\n');

  try {
    // Create test users
    console.log('👤 Creating test users...');
    
    // Admin user
    const adminUser = await auth.createUser({
      uid: 'admin-user-1',
      email: 'admin@tomandco.co.uk',
      password: 'password123',
      displayName: 'Tom McCaul (Admin)',
      emailVerified: true,
    });
    console.log('✅ Created admin user:', adminUser.email);

    // Client user
    const clientUser = await auth.createUser({
      uid: 'client-user-1',
      email: 'client@sanderson.com',
      password: 'password123',
      displayName: 'Sanderson Client',
      emailVerified: true,
    });
    console.log('✅ Created client user:', clientUser.email);

    // Create user documents in Firestore
    console.log('\n📄 Creating user documents...');
    
    await db.collection('users').doc(adminUser.uid).set({
      uid: adminUser.uid,
      email: adminUser.email,
      displayName: adminUser.displayName,
      role: 'admin',
      clientId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Created admin user document');

    await db.collection('users').doc(clientUser.uid).set({
      uid: clientUser.uid,
      email: clientUser.email,
      displayName: clientUser.displayName,
      role: 'client',
      clientId: 'sanderson-design',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Created client user document');

    // Create test client
    console.log('\n🏢 Creating test client...');
    
    const clientRef = db.collection('clients').doc('sanderson-design');
    await clientRef.set({
      id: 'sanderson-design',
      name: 'Sanderson Design Group',
      logo: 'https://via.placeholder.com/150',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Created client: Sanderson Design Group');

    // Create test websites
    console.log('\n🌐 Creating test websites...');
    
    await clientRef.collection('websites').doc('sanderson-uk').set({
      id: 'sanderson-uk',
      clientId: 'sanderson-design',
      name: 'Sanderson UK',
      url: 'https://www.sanderson-uk.com',
      bigQueryTableId: 'sanderson_uk',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Created website: Sanderson UK');

    await clientRef.collection('websites').doc('harlequin').set({
      id: 'harlequin',
      clientId: 'sanderson-design',
      name: 'Harlequin',
      url: 'https://www.harlequin.uk.com',
      bigQueryTableId: 'harlequin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Created website: Harlequin');

    // Create test annotations
    console.log('\n📝 Creating test annotations...');
    
    await clientRef.collection('annotations').doc('anno-1').set({
      id: 'anno-1',
      clientId: 'sanderson-design',
      websiteId: 'sanderson-uk',
      title: 'Black Friday Sale Started',
      description: 'Major promotional campaign launched with 30% off sitewide',
      type: 'event',
      startDate: '2024-11-29',
      endDate: '2024-12-02',
      createdBy: adminUser.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Created annotation: Black Friday Sale');

    await clientRef.collection('annotations').doc('anno-2').set({
      id: 'anno-2',
      clientId: 'sanderson-design',
      websiteId: null,
      title: 'Website Performance Issue',
      description: 'Slow page load times reported, investigating CDN issues',
      type: 'alert',
      startDate: '2024-10-15',
      endDate: '2024-10-15',
      createdBy: clientUser.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Created annotation: Performance Issue');

    // Create test targets
    console.log('\n🎯 Creating test targets...');
    
    await clientRef.collection('targets').doc('target-1').set({
      id: 'target-1',
      clientId: 'sanderson-design',
      websiteId: 'sanderson-uk',
      metric: 'revenue',
      target: 100000,
      period: 'monthly',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Created target: Monthly Revenue £100k');

    // Create test custom links
    console.log('\n🔗 Creating test custom links...');
    
    await clientRef.collection('customLinks').doc('link-1').set({
      id: 'link-1',
      clientId: 'sanderson-design',
      title: 'Google Analytics',
      url: 'https://analytics.google.com',
      icon: 'BarChart',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Created custom link: Google Analytics');

    console.log('\n✨ Seeding complete!\n');
    console.log('📋 Test Credentials:');
    console.log('   Admin: admin@tomandco.co.uk / password123');
    console.log('   Client: client@sanderson.com / password123');
    console.log('\n🔥 Firebase Emulator UI: http://localhost:4000');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedData();

