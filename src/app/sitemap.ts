import type { MetadataRoute } from 'next';
import {
  fetchServerCategoriesForSitemap,
  fetchServerPages,
  fetchServerProductsForSitemap,
} from '@/services/server-content.service';

const normalizeSiteUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const resolveSiteUrl = (): string => {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    'https://innercollection.com.bd',
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalized = normalizeSiteUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return 'https://innercollection.com.bd';
};

const toAbsoluteUrl = (siteUrl: string, path: string): string => {
  return `${siteUrl}${path}`;
};

const parseLastModified = (value: string | undefined, fallback: Date): Date => {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = resolveSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: toAbsoluteUrl(siteUrl, '/'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: toAbsoluteUrl(siteUrl, '/products'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: toAbsoluteUrl(siteUrl, '/categories'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Best-effort: augment the static entries with products, categories, and CMS pages
  // fetched cheaply from the backend. Any failure here (backend unreachable, etc.) just
  // falls back to the static entries above rather than breaking sitemap generation.
  const [categories, products, pages] = await Promise.all([
    fetchServerCategoriesForSitemap().catch(() => []),
    fetchServerProductsForSitemap().catch(() => []),
    fetchServerPages().catch(() => []),
  ]);

  const categoryEntries: MetadataRoute.Sitemap = categories
    .filter((category) => Boolean(category.slug))
    .map((category) => ({
      url: toAbsoluteUrl(siteUrl, `/categories/${category.slug}`),
      lastModified: parseLastModified(category.updated_at, now),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const productEntries: MetadataRoute.Sitemap = products
    .filter((product) => Boolean(product.slug))
    .map((product) => ({
      url: toAbsoluteUrl(siteUrl, `/products/${product.slug}`),
      lastModified: parseLastModified(product.updated_at, now),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  const pageEntries: MetadataRoute.Sitemap = pages
    .filter((page) => Boolean(page.slug))
    .map((page) => ({
      url: toAbsoluteUrl(siteUrl, `/${page.slug}`),
      lastModified: parseLastModified(page.updated_at as string | undefined, now),
      changeFrequency: 'monthly',
      priority: 0.5,
    }));

  return [...staticEntries, ...categoryEntries, ...productEntries, ...pageEntries];
}
