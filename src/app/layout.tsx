import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header, Footer, ScrollToTop } from '@/components/layout';
import { DeferredClientWidgets } from '@/components/layout/DeferredClientWidgets';

const inter = Inter({ subsets: ['latin'] });

const DEFAULT_METADATA: Metadata = {
  title: 'Your Everyday Store',
  description: 'Discover quality products',
};

type VerificationProvider = 'google' | 'bing' | 'yandex' | 'pinterest' | 'facebook' | 'custom';

type SiteVerificationEntry = {
  provider: VerificationProvider;
  code: string;
  meta_name?: string;
};

const VERIFICATION_META_NAME_BY_PROVIDER: Record<Exclude<VerificationProvider, 'custom'>, string> = {
  google: 'google-site-verification',
  bing: 'msvalidate.01',
  yandex: 'yandex-verification',
  pinterest: 'p:domain_verify',
  facebook: 'facebook-domain-verification',
};

const sanitizeText = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/[<>"'`\\]/g, '');
};

const sanitizeMetaName = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase().replace(/[^a-z0-9._:-]/g, '');
};

const normalizeApiUrl = (rawValue: string): string => {
  const value = rawValue.trim().replace(/\/+$/, '');
  if (!value) {
    return '';
  }

  if (/\/api\/v\d+$/i.test(value)) {
    return value;
  }

  if (/\/api$/i.test(value)) {
    return `${value}/v1`;
  }

  return `${value}/api/v1`;
};

const parseSiteVerificationEntries = (payload: unknown): SiteVerificationEntry[] => {
  const envelope =
    payload && typeof payload === 'object' && !Array.isArray(payload) && 'data' in payload
      ? (payload as { data?: unknown }).data
      : payload;

  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return [];
  }

  const source = envelope as Record<string, unknown>;
  const entries = source.site_verification_entries;

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => {
      const providerRaw = sanitizeText(entry.provider).toLowerCase();
      const provider: VerificationProvider =
        providerRaw === 'google' ||
        providerRaw === 'bing' ||
        providerRaw === 'yandex' ||
        providerRaw === 'pinterest' ||
        providerRaw === 'facebook' ||
        providerRaw === 'custom'
          ? providerRaw
          : 'google';

      return {
        provider,
        code: sanitizeText(entry.code),
        meta_name: sanitizeMetaName(entry.meta_name),
      };
    })
    .filter((entry) => entry.code.length > 0);
};

const buildVerificationMetadata = (entries: SiteVerificationEntry[]): Metadata['verification'] | undefined => {
  const groupedMeta: Record<string, string[]> = {};

  entries.forEach((entry) => {
    const metaName =
      entry.provider === 'custom'
        ? sanitizeMetaName(entry.meta_name)
        : VERIFICATION_META_NAME_BY_PROVIDER[entry.provider as Exclude<VerificationProvider, 'custom'>] || '';

    if (!metaName || !entry.code) {
      return;
    }

    if (!groupedMeta[metaName]) {
      groupedMeta[metaName] = [];
    }

    if (!groupedMeta[metaName].includes(entry.code)) {
      groupedMeta[metaName].push(entry.code);
    }
  });

  const keys = Object.keys(groupedMeta);
  if (keys.length === 0) {
    return undefined;
  }

  const other: Record<string, string | string[]> = {};
  keys.forEach((key) => {
    const values = groupedMeta[key];
    other[key] = values.length === 1 ? values[0] : values;
  });

  return { other };
};

const fetchVerificationMetadata = async (): Promise<Metadata['verification'] | undefined> => {
  const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL || '');
  if (!apiUrl) {
    return undefined;
  }

  try {
    const response = await fetch(`${apiUrl}/settings/integration`, {
      headers: {
        Accept: 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as unknown;
    const entries = parseSiteVerificationEntries(payload);

    return buildVerificationMetadata(entries);
  } catch {
    return undefined;
  }
};

const fetchGeneralMetadata = async (): Promise<{ site_favicon?: string; site_title?: string; site_description?: string } | undefined> => {
  const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL || '');
  if (!apiUrl) {
    return undefined;
  }

  try {
    const response = await fetch(`${apiUrl}/settings/general`, {
      headers: {
        Accept: 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as any;
    return {
      site_favicon: payload?.data?.site_favicon,
      site_title: payload?.data?.site_title,
      site_description: payload?.data?.site_description,
    };
  } catch {
    return undefined;
  }
};

const fetchAppearanceSettings = async (): Promise<{ primary_color?: string; primary_hover_color?: string } | undefined> => {
  const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL || '');
  if (!apiUrl) {
    return undefined;
  }

  try {
    const response = await fetch(`${apiUrl}/settings/appearance`, {
      headers: {
        Accept: 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as any;
    return {
      primary_color: payload?.data?.primary_color,
      primary_hover_color: payload?.data?.primary_hover_color,
    };
  } catch {
    return undefined;
  }
};

export async function generateMetadata(): Promise<Metadata> {
  const [verification, general] = await Promise.all([
    fetchVerificationMetadata(),
    fetchGeneralMetadata(),
  ]);

  const metadata: Metadata = { ...DEFAULT_METADATA };

  if (verification) {
    metadata.verification = verification;
  }

  if (general?.site_title) {
    metadata.title = general.site_title;
  }

  if (general?.site_description) {
    metadata.description = general.site_description;
  }

  if (general?.site_favicon) {
    metadata.icons = {
      icon: general.site_favicon,
      shortcut: general.site_favicon,
      apple: general.site_favicon,
    };
  }

  return metadata;
}

function hexToRgb(hex: string) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 16, g: 132, b: 116 };
}

function mixColors(color1: {r: number, g: number, b: number}, color2: {r: number, g: number, b: number}, weight: number) {
  const w = weight / 100;
  return {
    r: Math.round(color1.r * w + color2.r * (1 - w)),
    g: Math.round(color1.g * w + color2.g * (1 - w)),
    b: Math.round(color1.b * w + color2.b * (1 - w))
  };
}

function generatePalette(primaryHex: string, hoverHex: string) {
  const base = hexToRgb(primaryHex);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  
  const toHex = (c: {r: number, g: number, b: number}) => 
    "#" + ((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1);

  return {
    50: toHex(mixColors(base, white, 10)),
    100: toHex(mixColors(base, white, 20)),
    200: toHex(mixColors(base, white, 40)),
    300: toHex(mixColors(base, white, 60)),
    400: toHex(mixColors(base, white, 80)),
    500: toHex(mixColors(base, white, 90)),
    600: primaryHex,
    700: hoverHex,
    800: toHex(mixColors(base, black, 60)),
    900: toHex(mixColors(base, black, 40)),
    950: toHex(mixColors(base, black, 20)),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appearance = await fetchAppearanceSettings();
  const primaryColor = appearance?.primary_color || '#108474'; // default accent-600
  const primaryHoverColor = appearance?.primary_hover_color || '#0f766e'; // default accent-700
  
  const palette = generatePalette(primaryColor, primaryHoverColor);

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
        />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --color-accent-50: ${palette[50]};
            --color-accent-100: ${palette[100]};
            --color-accent-200: ${palette[200]};
            --color-accent-300: ${palette[300]};
            --color-accent-400: ${palette[400]};
            --color-accent-500: ${palette[500]};
            --color-accent-600: ${palette[600]};
            --color-accent-700: ${palette[700]};
            --color-accent-800: ${palette[800]};
            --color-accent-900: ${palette[900]};
            --color-accent-950: ${palette[950]};
          }
        `}} />
      </head>
      <body className={inter.className}>
        <Providers>
          <Suspense fallback={null}>
            <ScrollToTop />
          </Suspense>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
            <Suspense fallback={null}>
              <DeferredClientWidgets />
            </Suspense>
          </div>
        </Providers>
      </body>
    </html>
  );
}
