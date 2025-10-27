import { NextResponse } from 'next/server';
import { db } from './admin';

/**
 * Check if Firestore database is initialized
 * Returns an error response if not initialized, null otherwise
 */
export function checkDb() {
  if (!db) {
    return NextResponse.json(
      { success: false, error: 'Database not initialized' },
      { status: 500 }
    );
  }
  return null;
}

/**
 * Get the Firestore database instance
 * Throws an error if not initialized
 */
export function getDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

