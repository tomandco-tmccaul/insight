'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardProvider } from '@/lib/context/dashboard-context';
import { AIChatProvider } from '@/lib/context/ai-chat-context';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { ChatPanel } from '@/components/ai/chat-panel';
import { ChatToggleButton } from '@/components/ai/chat-toggle-button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardProvider>
        <AIChatProvider>
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

            {/* AI Chat Panel */}
            <ChatPanel />

            {/* AI Chat Toggle Button */}
            <ChatToggleButton />
          </div>
        </AIChatProvider>
      </DashboardProvider>
    </ProtectedRoute>
  );
}

