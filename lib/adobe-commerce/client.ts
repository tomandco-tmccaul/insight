// Adobe Commerce REST API Client
import {
  AdobeCommerceStoreView,
  AdobeCommerceWebsite,
  AdobeCommerceStoreGroup,
  AdobeCommerceApiConfig,
} from '@/types/adobe-commerce';

export class AdobeCommerceClient {
  private endpoint: string;
  private accessToken: string;

  constructor(config: AdobeCommerceApiConfig) {
    // Remove trailing slash from endpoint
    this.endpoint = config.endpoint.replace(/\/$/, '');
    this.accessToken = config.accessToken;
  }

  /**
   * Make a GET request to the Adobe Commerce REST API
   */
  private async get<T>(path: string): Promise<T> {
    const url = `${this.endpoint}/rest/V1${path}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Adobe Commerce API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Get all store views
   * Endpoint: GET /rest/V1/store/storeViews
   */
  async getStoreViews(): Promise<AdobeCommerceStoreView[]> {
    return this.get<AdobeCommerceStoreView[]>('/store/storeViews');
  }

  /**
   * Get all websites
   * Endpoint: GET /rest/V1/store/websites
   */
  async getWebsites(): Promise<AdobeCommerceWebsite[]> {
    return this.get<AdobeCommerceWebsite[]>('/store/websites');
  }

  /**
   * Get all store groups
   * Endpoint: GET /rest/V1/store/storeGroups
   */
  async getStoreGroups(): Promise<AdobeCommerceStoreGroup[]> {
    return this.get<AdobeCommerceStoreGroup[]>('/store/storeGroups');
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getStoreViews();
      return true;
    } catch (error) {
      console.error('Adobe Commerce API connection test failed:', error);
      return false;
    }
  }
}

