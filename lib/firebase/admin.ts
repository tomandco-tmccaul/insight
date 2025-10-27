// Firebase Admin SDK Configuration (Server-side only)
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminAuth: ReturnType<typeof getAuth> | null = null;
let adminDb: ReturnType<typeof getFirestore> | null = null;

// Check if using emulators
const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

if (useEmulator) {
  // When using emulators, set environment variables BEFORE initializing
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

  if (getApps().length === 0) {
    // Initialize without credentials for emulator
    adminApp = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
    });
  } else {
    adminApp = getApps()[0];
  }

  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
  console.log('🔥 Firebase Admin connected to emulators');
} else if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {
  // Production: Initialize with service account credentials
  if (getApps().length === 0) {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    adminApp = getApps()[0];
  }

  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
}

// Export with null checks
export { adminAuth, adminDb };
export { adminAuth as auth, adminDb as db }; // Aliases for convenience
export default adminApp;

