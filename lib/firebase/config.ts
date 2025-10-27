// Firebase Client Configuration
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

// Initialize Firebase (client-side)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);

  // Connect to emulators if in development
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
    if (typeof window !== 'undefined') {
      // Only connect to emulators in browser environment
      try {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log('🔥 Connected to Firebase Emulators');
      } catch (error) {
        // Emulators already connected
        console.log('🔥 Firebase Emulators already connected');
      }
    }
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Create a dummy app for build time
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
}

export { auth, db };
export default app;

