#!/usr/bin/env node
/**
 * Create Admin User Script
 * 
 * This script creates a new Firebase user and sets their role to 'admin'.
 * 
 * Usage:
 *   npm run create:admin
 * 
 * You will be prompted for:
 *   - Email address
 *   - Password (min 6 characters)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
const serviceAccount = require('../service-account-key.json');

initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const auth = getAuth();
const db = getFirestore();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function createAdminUser() {
  console.log('🔐 Create Admin User\n');

  try {
    // Get email
    const email = await question('Enter admin email: ');
    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      rl.close();
      process.exit(1);
    }

    // Get password
    const password = await question('Enter password (min 6 characters): ');
    if (!password || password.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      rl.close();
      process.exit(1);
    }

    console.log('\n🚀 Creating admin user...\n');

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: true, // Auto-verify for admin
    });

    console.log(`✅ User created in Firebase Auth`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);

    // Create user document in Firestore with admin role
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email: userRecord.email,
      role: 'admin', // Set as admin
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ User document created in Firestore`);
    console.log(`   Role: admin`);

    console.log('\n🎉 Admin user created successfully!\n');
    console.log('You can now login with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: [the password you entered]`);
    console.log('\n🌐 Go to: http://localhost:3000/login\n');

    rl.close();
  } catch (error: any) {
    console.error('\n❌ Error creating admin user:', error.message);
    
    if (error.code === 'auth/email-already-exists') {
      console.log('\n💡 This email already exists. Would you like to update the existing user to admin?');
      const update = await question('Update to admin? (yes/no): ');
      
      if (update.toLowerCase() === 'yes' || update.toLowerCase() === 'y') {
        try {
          const email = error.message.match(/[\w\.-]+@[\w\.-]+\.\w+/)?.[0];
          if (email) {
            const existingUser = await auth.getUserByEmail(email);
            await db.collection('users').doc(existingUser.uid).set({
              id: existingUser.uid,
              email: existingUser.email,
              role: 'admin',
              updatedAt: new Date(),
            }, { merge: true });
            
            console.log(`\n✅ User ${email} updated to admin role!`);
          }
        } catch (updateError: any) {
          console.error('❌ Error updating user:', updateError.message);
        }
      }
    }
    
    rl.close();
    process.exit(1);
  }
}

// Run the script
createAdminUser();

