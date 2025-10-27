// Shared types and re-exports
export * from './firestore';
export * from './bigquery';
export * from './adobe-commerce';
export * from './ai-chat';

// Navigation and UI types
export type UserRole = 'admin' | 'client';

export interface NavItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface SidebarNavItem extends NavItem {
  items?: NavItem[];
}

// Report types
export type ReportType = 'overview' | 'product' | 'marketing' | 'website';

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

