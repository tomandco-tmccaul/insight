import {
    LayoutDashboard,
    Package,
    Globe,
    MessageSquare,
    Users,
    Settings,
    Database,
    UserCircle,
    ShoppingCart,
    Megaphone,
    Search,
    Brain,
    Target,
} from 'lucide-react';

export interface NavItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

export const dashboardNavItems: NavItem[] = [
    {
        title: 'Insights',
        href: '/insights',
        icon: Brain,
    },
    {
        title: 'Overview',
        href: '/',
        icon: LayoutDashboard,
    },
    {
        title: 'Sales Performance',
        href: '/sales',
        icon: ShoppingCart,
    },
    {
        title: 'Customer Insights',
        href: '/customers',
        icon: UserCircle,
    },
    {
        title: 'Product Performance',
        href: '/product',
        icon: Package,
    },
    {
        title: 'Digital Marketing',
        href: '/marketing',
        icon: Megaphone,
    },
    {
        title: 'Website Behaviour',
        href: '/website',
        icon: Globe,
    },
    {
        title: 'SEO Insights',
        href: '/seo-insights',
        icon: Search,
    },
    {
        title: 'Annotations',
        href: '/annotations',
        icon: MessageSquare,
    },
    {
        title: 'Targets',
        href: '/targets/manage',
        icon: Target,
    },
];

export const adminNavItems: NavItem[] = [
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
