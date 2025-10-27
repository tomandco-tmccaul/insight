'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardProvider } from '@/lib/context/dashboard-context';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardProvider>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <DashboardSidebar />

          {/* Main content area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <DashboardHeader />

            {/* Page content */}
            <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
              {children}
            </main>
          </div>
        </div>
      </DashboardProvider>
    </ProtectedRoute>
  );
}

