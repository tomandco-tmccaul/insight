'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface InviteData {
  email: string;
  role: 'admin' | 'client';
  clientId: string | null;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { signInWithGoogle } = useAuth();
  
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<'password' | 'google' | null>(null);

  useEffect(() => {
    fetchInviteData();
  }, [token]);

  const fetchInviteData = async () => {
    try {
      const response = await fetch(`/api/invite/${token}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Invalid invite link');
        setLoading(false);
        return;
      }

      setInviteData(data.data);
      setLoading(false);
    } catch (err: any) {
      setError('Failed to load invite');
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setSubmitting(true);
    setMethod('google');

    try {
      if (!inviteData) {
        throw new Error('Invite data not loaded');
      }

      // Sign in with Google
      await signInWithGoogle();
      
      // Wait a moment for auth state to update and get the auth token
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // After Google auth, verify the email matches and mark invite as used
      // Get the auth token from Firebase
      const { auth } = await import('@/lib/firebase/config');
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      await markInviteAsUsed(token);
      
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setSubmitting(false);
      setMethod(null);
    }
  };

  const markInviteAsUsed = async (authToken: string) => {
    if (!inviteData) return;
    
    try {
      const response = await fetch(`/api/invite/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      const data = await response.json();
      if (!data.success) {
        console.error('Error marking invite as used:', data.error);
      }
    } catch (err) {
      console.error('Error marking invite as used:', err);
      // Don't fail the flow if this fails
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    setMethod('password');

    try {
      const response = await fetch(`/api/invite/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to set password');
      }

      // Sign in with the new password
      const { signIn } = useAuth();
      await signIn(inviteData!.email, password);
      
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to set password');
      setSubmitting(false);
      setMethod(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <p className="text-gray-600">Loading invite...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invite</h1>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/login')}>Go to Login</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Insight</h1>
          <p className="mt-2 text-gray-600">eCommerce Analytics Dashboard</p>
        </div>

        {inviteData && (
          <div className="mb-6 rounded-md bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              You've been invited to join as <strong>{inviteData.role}</strong>
            </p>
            <p className="mt-1 text-sm text-blue-700">{inviteData.email}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Choose how to sign in:
            </h2>

            {/* Google Sign In Option */}
            <div className="mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleAuth}
                disabled={submitting}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {submitting && method === 'google' ? 'Signing in...' : 'Sign in with Google'}
              </Button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Or set a password</span>
              </div>
            </div>

            {/* Password Setting Form */}
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  disabled={submitting}
                  minLength={6}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  disabled={submitting}
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && method === 'password' ? 'Setting password...' : 'Set Password & Sign In'}
              </Button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          By Tom&Co - eCommerce Agency
        </p>
      </Card>
    </div>
  );
}

