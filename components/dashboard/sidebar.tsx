'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useDashboard } from '@/lib/context/dashboard-context';
import { cn } from '@/lib/utils';
import { CustomLink } from '@/types/firestore';
import { auth } from '@/lib/firebase/config';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ExternalLink } from 'lucide-react';
import { dashboardNavItems, adminNavItems } from '@/lib/constants/navigation';

export function DashboardSidebar() {
  const pathname = usePathname();
  const { appUser } = useAuth();
  const { selectedClientId, disabledMenuItems } = useDashboard();
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  // Determine which clientId to use
  // For client users: use their clientId
  // For admin users: use selectedClientId from dashboard context
  const clientId = appUser?.role === 'client' ? appUser.clientId : selectedClientId;

  // Fetch custom links for the current client
  useEffect(() => {
    const fetchCustomLinks = async () => {
      if (!clientId) {
        setCustomLinks([]);
        return;
      }

      setLoadingLinks(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          console.error('No auth token available');
          setLoadingLinks(false);
          return;
        }

        const response = await fetch(
          `/api/admin/clients/${clientId}/custom-links`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to fetch custom links:', response.status, errorData);
          setLoadingLinks(false);
          return;
        }

        const data = await response.json();
        if (data.success) {
          setCustomLinks(data.data || []);
        } else {
          console.error('API returned error:', data.error);
        }
      } catch (error) {
        console.error('Error fetching custom links:', error);
      } finally {
        setLoadingLinks(false);
      }
    };

    fetchCustomLinks();
  }, [clientId]);

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex w-64 flex-col border-r border-border/50 bg-background/80 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.03)]"
    >
      {/* Logo */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex h-16 items-center border-b border-border/50 px-6"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <Sparkles className="h-5 w-5 text-primary" />
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/20 blur-lg"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Insight
            </h1>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="text-base text-muted-foreground"
              style={{ fontFamily: 'var(--font-caveat), cursive' }}
            >
              by Tom&Co.
            </motion.span>
          </div>
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {/* Dashboard Section - Always visible */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dashboard
          </h3>
          <div className="space-y-1">
            {dashboardNavItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isDisabled = disabledMenuItems.includes(item.href);

              if (isDisabled) {
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.2 + index * 0.03 }}
                  >
                    <div
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-not-allowed opacity-50',
                        'text-muted-foreground'
                      )}
                      title="This feature is not available for your account"
                    >
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="relative z-10">{item.title}</span>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.2 + index * 0.03 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <motion.div
                      animate={isActive ? { scale: 1.1, rotate: [0, -5, 5, 0] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon className={cn(
                        "h-5 w-5 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )} />
                    </motion.div>
                    <span className="relative z-10">{item.title}</span>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Useful links section - show for client users or admins viewing a client */}
        <AnimatePresence>
          {clientId && customLinks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-8"
            >
              <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Useful links
              </h3>
              <div className="space-y-1">
                {customLinks.map((link, index) => (
                  <motion.a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground"
                  >
                    <motion.div
                      whileHover={{ rotate: [0, -15, 15, 0] }}
                      transition={{ duration: 0.3 }}
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                    </motion.div>
                    <span>{link.name}</span>
                  </motion.a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Section - Only for admins */}
        <AnimatePresence>
          {appUser?.role === 'admin' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-8"
            >
              <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Admin
              </h3>
              <div className="space-y-1">
                {adminNavItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                    >
                      <Link
                        href={item.href}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 text-primary shadow-sm'
                            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="adminActiveIndicator"
                            className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        <motion.div
                          animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Icon className={cn(
                            "h-5 w-5 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )} />
                        </motion.div>
                        <span className="relative z-10">{item.title}</span>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
                          />
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* User info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="border-t border-border/50 p-4"
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
        >
          <motion.div
            whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.3 }}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-semibold text-primary-foreground shadow-md"
          >
            <span>{appUser?.email?.[0].toUpperCase()}</span>
            <motion.div
              className="absolute inset-0 rounded-full bg-white/20"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-foreground">{appUser?.email}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground capitalize">{appUser?.role}</p>
              {appUser?.role === 'admin' && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                />
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.aside>
  );
}

