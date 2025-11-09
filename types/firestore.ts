// Firestore Data Models
// Database structure uses hierarchical subcollections

// Root Collection: /users/{auth_user_id}
export interface AppUser {
  uid: string;
  email: string;
  role: 'admin' | 'client';
  clientId: string | null; // e.g., "sanderson_design_group"
  createdAt?: string;
  updatedAt?: string;
}

// Root Collection: /clients/{client_id}
export interface Client {
  id: string; // "sanderson_design_group"
  clientName: string; // "Sanderson Design Group"
  bigQueryDatasetId: string; // "sanderson_design_group" (The BigQuery dataset ID for this client)

  // Adobe Commerce API Configuration (shared across all websites)
  adobeCommerceEndpoint?: string; // "https://example.com" (base URL without /rest/V1)
  adobeCommerceAccessToken?: string; // Bearer token for API authentication

  createdAt?: string;
  updatedAt?: string;
}

// Subcollection: /clients/{client_id}/websites/{website_id}
export interface Website {
  id: string; // "harlequin"
  websiteName: string; // "Harlequin"
  bigQueryWebsiteId: string; // "harlequin_prod" (The website_id value used in aggregated BQ tables)

  // Adobe Commerce Configuration
  storeId: string; // "1" or "9" or "10" (The store_id in Adobe Commerce - maps to website)

  // BigQuery Table Prefixes (used to construct full table names)
  // Final table name = {prefix}{table_name}
  // e.g., "adobe_commerce_" + "orders" = "adobe_commerce_orders"
  bigQueryTablePrefixes: {
    googleAds?: string; // e.g., "google_ads_" or "google_ads_harlequin_"
    facebookAds?: string; // e.g., "facebook_ads_" or "facebook_ads_harlequin_"
    pinterestAds?: string; // e.g., "pinterest_ads_" or "pinterest_ads_harlequin_"
    googleSearchConsole?: string; // e.g., "gsc_" or "gsc_harlequin_"
    ga4?: string; // e.g., "ga4_" or "ga4_harlequin_"
    adobeCommerce?: string; // e.g., "adobe_commerce_" or "adobe_commerce_harlequin_"
  };

  // Website Grouping (for overview websites)
  isGrouped?: boolean; // true if this is a grouped/overview website
  groupedWebsiteIds?: string[]; // Array of website IDs that are grouped together (e.g., ["harlequin_uk", "harlequin_us"])

  createdAt?: string;
  updatedAt?: string;
}

// Subcollection: /clients/{client_id}/targets/{target_id}
export interface Target {
  id: string;
  metric: 'revenue' | 'roas' | 'cpa' | 'sessions';
  granularity: 'monthly' | 'yearly';
  startDate: string; // ISO 8601 Timestamp
  value: number;
  websiteId: string; // "harlequin" or "all_combined"
  createdAt?: string;
  updatedAt?: string;
}

// Subcollection: /clients/{client_id}/annotations/{annotation_id}
export type AnnotationType = 'event' | 'insight' | 'note' | 'alert';

export interface Annotation {
  id: string;
  clientId: string;
  websiteId: string | null;
  title: string;
  description: string;
  type: AnnotationType;
  startDate: string; // ISO 8601 date (YYYY-MM-DD)
  endDate: string; // ISO 8601 date (YYYY-MM-DD)
  createdBy: string; // User ID
  createdAt: string;
  updatedAt: string;
}

// Subcollection: /clients/{client_id}/customLinks/{link_id}
export interface CustomLink {
  id: string;
  name: string; // "ClickUp Roadmap"
  url: string; // "https://clickup.com/..."
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

// Helper types for creating/updating documents
export type CreateAppUser = Omit<AppUser, 'uid' | 'createdAt' | 'updatedAt'>;
export type UpdateAppUser = Partial<Omit<AppUser, 'uid'>>;

export type CreateClient = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateClient = Partial<Omit<Client, 'id'>>;

export type CreateWebsite = Omit<Website, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateWebsite = Partial<Omit<Website, 'id'>>;

export type CreateTarget = Omit<Target, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTarget = Partial<Omit<Target, 'id'>>;

export type CreateAnnotation = Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAnnotation = Partial<Omit<Annotation, 'id'>>;

export type CreateCustomLink = Omit<CustomLink, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCustomLink = Partial<Omit<CustomLink, 'id'>>;

// Root Collection: /invites/{invite_token}
export interface Invite {
  token: string; // The invite token (used as document ID)
  email: string;
  role: 'admin' | 'client';
  clientId: string | null;
  invitedBy: string; // User ID of the admin who sent the invite
  expiresAt: string; // ISO 8601 timestamp
  usedAt: string | null; // ISO 8601 timestamp when invite was used
  createdAt: string; // ISO 8601 timestamp
}

