// Adobe Commerce REST API Types
// Based on Adobe Commerce 2.4.x REST API

export interface AdobeCommerceStoreView {
  id: number; // Store view ID (this is the store_id we use)
  code: string; // Store view code (e.g., "default", "harlequin_uk")
  name: string; // Store view name (e.g., "Default Store View", "Harlequin UK")
  website_id: number; // Website ID
  store_group_id: number; // Store group ID
  is_active: number; // 1 = active, 0 = inactive
}

export interface AdobeCommerceWebsite {
  id: number; // Website ID
  code: string; // Website code (e.g., "base", "harlequin")
  name: string; // Website name (e.g., "Main Website", "Harlequin")
  default_group_id: number; // Default store group ID
  is_default: number; // 1 = default website, 0 = not default
}

export interface AdobeCommerceStoreGroup {
  id: number; // Store group ID
  website_id: number; // Parent website ID
  code: string; // Store group code
  name: string; // Store group name (e.g., "Main Website Store")
  root_category_id: number; // Root category ID
  default_store_id: number; // Default store view ID
}

export interface AdobeCommerceApiConfig {
  endpoint: string; // Base URL (e.g., "https://example.com")
  accessToken: string; // Bearer token
}

export interface SyncStoresRequest {
  clientId: string;
  endpoint: string; // Adobe Commerce base URL
  accessToken: string; // Bearer token
}

export interface SyncStoresResponse {
  success: boolean;
  websitesCreated?: number;
  websites?: Array<{
    id: string;
    websiteName: string;
    storeId: string;
    adobeCommerceData: AdobeCommerceStoreView;
  }>;
  error?: string;
}

