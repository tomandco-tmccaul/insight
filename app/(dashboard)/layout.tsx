'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardProvider } from '@/lib/context/dashboard-context';
import { AIChatProvider } from '@/lib/context/ai-chat-context';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { ChatPanel } from '@/components/ai/chat-panel';
import { ChatToggleButton } from '@/components/ai/chat-toggle-button';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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
              <main className="relative flex-1 overflow-y-auto bg-gradient-to-br from-gray-50/50 via-white to-indigo-50/20 p-6">
                {/* Subtle animated background gradient */}
                <div className="fixed inset-0 -z-10 bg-gradient-to-br from-indigo-50/30 via-transparent to-purple-50/20 animate-gradient opacity-50 pointer-events-none" />
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ 
                      duration: 0.3, 
                      ease: [0.4, 0, 0.2, 1],
                      scale: { duration: 0.2 }
                    }}
                    className="relative z-0"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
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

