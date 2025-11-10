// Firebase Admin SDK Configuration (Server-side only)
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { applicationDefault } from 'firebase-admin/app';

let adminApp: App | null = null;
let adminAuth: ReturnType<typeof getAuth> | null = null;
let adminDb: ReturnType<typeof getFirestore> | null = null;

// Check if using emulators
const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

// Get project ID from various sources
const projectId = 
  process.env.FIREBASE_PROJECT_ID || 
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
  process.env.GOOGLE_CLOUD_PROJECT ||
  'demo-project';

if (useEmulator) {
  // When using emulators, set environment variables BEFORE initializing
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

  if (getApps().length === 0) {
    // Initialize without credentials for emulator
    adminApp = initializeApp({
      projectId,
    });
  } else {
    adminApp = getApps()[0];
  }

  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
  console.log('🔥 Firebase Admin connected to emulators');
} else {
  // Production: Try different initialization methods
  if (getApps().length === 0) {
    try {
      // Method 1: Explicit service account credentials (if all env vars are present)
      if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        adminApp = initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
        console.log('🔥 Firebase Admin initialized with explicit credentials');
      } else {
        // Method 2: Application Default Credentials (ADC)
        // This works automatically in Firebase App Hosting, Cloud Run, etc.
        console.log(`🔧 Attempting to initialize Firebase Admin with ADC (projectId: ${projectId})`);
        adminApp = initializeApp({
          credential: applicationDefault(),
          projectId,
        });
        console.log('🔥 Firebase Admin initialized with Application Default Credentials');
      }
    } catch (error: any) {
      console.error('❌ Firebase Admin initialization error:', error?.message || error);
      console.error('❌ Error details:', {
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        projectId,
        nodeEnv: process.env.NODE_ENV,
      });
      // adminApp remains null, which will cause "Database not initialized" errors
    }
  } else {
    adminApp = getApps()[0];
    console.log('🔥 Firebase Admin using existing app instance');
  }

  if (adminApp) {
    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
    console.log('✅ Firebase Admin Auth and Firestore initialized');
  } else {
    console.error('❌ Firebase Admin app is null - database operations will fail');
  }
}

// Export with null checks
export { adminAuth, adminDb };
export { adminAuth as auth, adminDb as db }; // Aliases for convenience
export default adminApp;

