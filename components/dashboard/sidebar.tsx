'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  Globe,
  MessageSquare,
  Users,
  Settings,
  ExternalLink,
  Database,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const dashboardNavItems: NavItem[] = [
  {
    title: 'Overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Product',
    href: '/product',
    icon: Package,
  },
  {
    title: 'Marketing',
    href: '/marketing',
    icon: TrendingUp,
  },
  {
    title: 'Website',
    href: '/website',
    icon: Globe,
  },
  {
    title: 'Annotations',
    href: '/annotations',
    icon: MessageSquare,
  },
];

const adminNavItems: NavItem[] = [
  {
    title: 'Clients',
    href: '/admin/clients',
    icon: Users,
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Settings,
  },
  {
    title: 'BigQuery',
    href: '/admin/bigquery',
    icon: Database,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { appUser } = useAuth();

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <h1 className="text-xl font-bold text-gray-900">Insight</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {/* Dashboard Section - Always visible */}
        <div>
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Dashboard
          </h3>
          {dashboardNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </div>

        {/* Admin Section - Only for admins */}
        {appUser?.role === 'admin' && (
          <div className="mt-8">
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Admin
            </h3>
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        )}

        {/* Resources section for clients */}
        {appUser?.role === 'client' && (
          <div className="mt-8">
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Resources
            </h3>
            {/* Custom links will be loaded dynamically here */}
            <div className="space-y-1">
              <a
                href="https://clickup.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <ExternalLink className="h-4 w-4" />
                ClickUp Roadmap
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* User info */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
            {appUser?.email?.[0].toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-gray-900">{appUser?.email}</p>
            <p className="text-xs text-gray-500 capitalize">{appUser?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

