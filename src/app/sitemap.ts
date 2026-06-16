import type { MetadataRoute } from 'next';

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

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = resolveSiteUrl();
  const now = new Date();

  return [
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
}
