/**
 * URL matching utilities for linking data sources
 * 
 * These functions help normalize and match URLs across different data sources
 * to enable cross-source data linking.
 */

/**
 * Normalizes a URL for comparison by:
 * - Converting to lowercase
 * - Removing protocol (http://, https://)
 * - Removing www. prefix
 * - Removing trailing slashes
 * - Removing query parameters and fragments
 * 
 * @param url - The URL to normalize
 * @returns Normalized domain/path string, or null if invalid
 * 
 * @example
 * normalizeUrl("https://www.harlequin.com/") => "harlequin.com"
 * normalizeUrl("http://harlequin.com/path?query=1") => "harlequin.com/path"
 */
export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    // Parse the URL
    const urlObj = new URL(url);
    
    // Get hostname (removes www. automatically via URL parsing)
    let hostname = urlObj.hostname.toLowerCase();
    
    // Remove www. prefix if present
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    // Get pathname and remove trailing slash
    let pathname = urlObj.pathname;
    if (pathname.endsWith('/') && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }
    
    // Combine hostname and pathname
    const normalized = hostname + pathname.toLowerCase();
    
    return normalized || null;
  } catch (error) {
    // Invalid URL, return null
    return null;
  }
}

/**
 * Extracts the domain from a URL
 * 
 * @param url - The URL to extract domain from
 * @returns Domain string (without www.), or null if invalid
 * 
 * @example
 * extractDomain("https://www.harlequin.com/path") => "harlequin.com"
 * extractDomain("http://harlequin.com") => "harlequin.com"
 */
export function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname.toLowerCase();
    
    // Remove www. prefix if present
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    return hostname || null;
  } catch (error) {
    return null;
  }
}

/**
 * Checks if two URLs match (same domain and path)
 * Uses normalization for comparison
 * 
 * @param url1 - First URL
 * @param url2 - Second URL
 * @returns true if URLs match, false otherwise
 */
export function urlsMatch(url1: string | null | undefined, url2: string | null | undefined): boolean {
  const normalized1 = normalizeUrl(url1);
  const normalized2 = normalizeUrl(url2);
  
  if (!normalized1 || !normalized2) return false;
  
  return normalized1 === normalized2;
}

/**
 * Checks if two URLs share the same domain
 * 
 * @param url1 - First URL
 * @param url2 - Second URL
 * @returns true if domains match, false otherwise
 */
export function domainsMatch(url1: string | null | undefined, url2: string | null | undefined): boolean {
  const domain1 = extractDomain(url1);
  const domain2 = extractDomain(url2);
  
  if (!domain1 || !domain2) return false;
  
  return domain1 === domain2;
}

/**
 * Finds a website by matching URL
 * Useful for linking Google Search Console site_url to websites
 * 
 * @param websites - Array of websites to search
 * @param targetUrl - URL to match against
 * @returns Matching website or null
 */
export function findWebsiteByUrl(
  websites: Array<{ url?: string | null }>,
  targetUrl: string | null | undefined
): { url?: string | null } | null {
  if (!targetUrl) return null;
  
  const normalizedTarget = normalizeUrl(targetUrl);
  if (!normalizedTarget) return null;
  
  for (const website of websites) {
    if (website.url) {
      const normalizedWebsite = normalizeUrl(website.url);
      if (normalizedWebsite === normalizedTarget) {
        return website;
      }
    }
  }
  
  return null;
}

