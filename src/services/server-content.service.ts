/**
 * Server-only helpers for fetching CMS pages / general settings directly from the
 * Laravel backend during server-side rendering (Server Components, generateMetadata).
 *
 * This intentionally does NOT go through the regular services layer (src/services/api.ts
 * and friends). That layer is built around axios calls to *relative* Next.js route
 * handler paths (/api/public, /api/proxy, /api/internal) which only resolve correctly
 * from a browser (relative to window.location) or from within a Next.js Route Handler.
 * Calling it directly from a React Server Component would throw, since axios has no
 * absolute base URL to resolve a relative path against when running under Node during
 * SSR/RSC rendering. Server Components therefore call the backend directly, the same way
 * the Next.js internal/proxy/public route handlers themselves do, using the server-only
 * INTERNAL_API_SECRET.
 *
 * This module centralizes what used to be a near-identical `fetchPage`/`fetchGeneral`
 * pair copy-pasted across about-us, contact, privacy-policy, refund-policy,
 * terms-of-service, [slug], and Footer.
 *
 * IMPORTANT: import this module directly (`from '@/services/server-content.service'`),
 * not via the `@/services` barrel — keeping it out of the barrel avoids it ever being
 * pulled into a client bundle by mistake (it reads a server-only secret).
 */

export interface ServerCmsPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  // Backend page payloads may carry additional fields we don't model here.
  [key: string]: unknown;
}

export interface ServerGeneralSettings {
  site_name?: string;
  site_title?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  // Settings payloads are large and vary; consumers narrow the fields they need.
  [key: string]: unknown;
}

function resolveApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

async function serverFetchJson<T>(path: string): Promise<T | null> {
  const apiBase = resolveApiBase();
  if (!apiBase) {
    return null;
  }

  try {
    const res = await fetch(`${apiBase}${path}`, {
      headers: { 'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '' },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return null;
    }

    const payload = await res.json();
    return (payload?.data ?? null) as T | null;
  } catch {
    return null;
  }
}

/** Fetch a single CMS page by slug (e.g. 'about-us', 'privacy-policy'). */
export const fetchServerPage = (slug: string): Promise<ServerCmsPage | null> =>
  serverFetchJson<ServerCmsPage>(`/pages/${slug}`);

/** Fetch all CMS pages (used to build dynamic footer links, etc). */
export const fetchServerPages = async (): Promise<ServerCmsPage[]> =>
  (await serverFetchJson<ServerCmsPage[]>('/pages')) || [];

/** Fetch the store's general settings (site name, contact info, etc). */
export const fetchServerGeneralSettings = (): Promise<ServerGeneralSettings | null> =>
  serverFetchJson<ServerGeneralSettings>('/settings/general');

export interface ServerSitemapEntry {
  slug: string;
  updated_at?: string;
}

/** Fetch all categories (a small, non-paginated list) for sitemap generation. */
export const fetchServerCategoriesForSitemap = async (): Promise<ServerSitemapEntry[]> => {
  const categories = await serverFetchJson<ServerSitemapEntry[]>('/categories');
  return Array.isArray(categories) ? categories : [];
};

/**
 * Fetch a bounded batch of active products for sitemap generation. The listing endpoint
 * is paginated (max 100 per page server-side), so this intentionally caps at a single
 * page of the most recently updated products rather than paging through the full catalog
 * — good enough for a "cheap" sitemap without adding an unbounded number of backend
 * requests at build/request time. If the catalog is large, search engines will still
 * discover the rest via normal crawling/category pages.
 */
export const fetchServerProductsForSitemap = async (limit = 100): Promise<ServerSitemapEntry[]> => {
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  const apiBase = resolveApiBase();
  if (!apiBase) {
    return [];
  }

  try {
    const res = await fetch(
      `${apiBase}/products?per_page=${boundedLimit}&sort_by=created_at&sort_order=desc`,
      {
        headers: { 'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '' },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      return [];
    }

    const payload = await res.json();
    // The products index endpoint wraps a Laravel paginator under `data`, so the actual
    // product array is at `data.data` (unlike /categories or /pages, which return the
    // array directly under `data`).
    const products = payload?.data?.data;
    return Array.isArray(products) ? products : [];
  } catch {
    return [];
  }
};
