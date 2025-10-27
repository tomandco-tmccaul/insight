'use client';

import { useAuth } from './context';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';

/**
 * Hook to require authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  return { user, loading };
}

/**
 * Hook to require admin role
 * Redirects to home if not admin
 */
export function useRequireAdmin() {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!appUser || appUser.role !== 'admin')) {
      router.push('/');
    }
  }, [appUser, loading, router]);

  return { appUser, loading };
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin() {
  const { appUser } = useAuth();
  return appUser?.role === 'admin';
}

/**
 * Hook to get current client ID
 * For admins, this should be set via context/state
 * For clients, this comes from their user profile
 */
export function useClientId() {
  const { appUser } = useAuth();
  return appUser?.clientId || null;
}

/**
 * Hook to get user's ID token for API calls
 */
export function useIdToken() {
  const { user } = useAuth();

  const getIdToken = useCallback(async () => {
    if (!user) return null;
    return await user.getIdToken();
  }, [user]);

  return getIdToken;
}

