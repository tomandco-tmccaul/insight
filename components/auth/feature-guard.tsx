'use client';

import { usePathname } from 'next/navigation';
import { useDashboard } from '@/lib/context/dashboard-context';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

interface FeatureGuardProps {
    children: React.ReactNode;
}

export function FeatureGuard({ children }: FeatureGuardProps) {
    const pathname = usePathname();
    const { disabledMenuItems, isLoadingSettings } = useDashboard();

    // Check if the current path starts with any of the disabled menu items
    // We use startsWith to handle sub-routes (e.g., /sales/details)
    // But we need to be careful not to match partial segments (e.g., /sales vs /sales-force)
    // So we append a slash if it's not the exact match, or check for exact match
    const isFeatureDisabled = disabledMenuItems.some((disabledPath) => {
        if (pathname === disabledPath) return true;
        if (pathname.startsWith(`${disabledPath}/`)) return true;
        return false;
    });

    if (isLoadingSettings) {
        // Optionally show a loading spinner or just render children (optimistic)
        // For now, we render children to avoid flickering, as the sidebar handles the visual cue
        // But if we want strict security, we should wait.
        // Let's render children but maybe with a loading overlay if needed.
        // Actually, for better UX, let's just return children. 
        // The sidebar is the primary navigation, direct access is the edge case.
        return <>{children}</>;
    }

    if (isFeatureDisabled) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="rounded-full bg-muted p-6 mb-6"
                >
                    <Lock className="h-12 w-12 text-muted-foreground" />
                </motion.div>
                <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-2xl font-bold tracking-tight mb-2"
                >
                    Feature Unavailable
                </motion.h2>
                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-muted-foreground max-w-md"
                >
                    This feature is currently not available for your account.
                    Please contact your administrator if you believe this is an error.
                </motion.p>
            </div>
        );
    }

    return <>{children}</>;
}
