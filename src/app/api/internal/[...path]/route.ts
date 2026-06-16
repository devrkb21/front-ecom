import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_TIMEOUT_MS = 20000;
const NO_STORE_CACHE_CONTROL = 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0';
const SHARED_GET_CACHE_CONTROL = 'public, max-age=15, s-maxage=60, stale-while-revalidate=120, stale-if-error=86400';
const GET_CACHE_TTL_MS = 60_000;
const GET_CACHE_STALE_TTL_MS = 86_400_000;
const GET_CACHE_MAX_ENTRIES = 200;

interface CachedGetResponse {
  bodyText: string;
  status: number;
  contentType: string;
  freshUntil: number;
  staleUntil: number;
}

const cachedGetResponses = new Map<string, CachedGetResponse>();

const ALLOWED_PREFIXES = [
  'categories',
  'products',
  'attributes',
  'payment-methods',
  'shipping-methods',
  'settings',
  'flash-sales',
  'locations',
  'landing-pages',
] as const;

const ALLOWED_POST_PATHS = new Set([
  'shipping-methods/calculate',
  'flash-sales/validate-purchase',
]);

function normalizeApiBase(rawValue: string): string {
  const trimmed = rawValue.trim().replace(/\/+$/, '');
  if (!trimmed) return '';

  if (/\/api\/v\d+$/i.test(trimmed)) {
    return trimmed;
  }

  if (/\/api$/i.test(trimmed)) {
    return `${trimmed}/v1`;
  }

  return `${trimmed}/api/v1`;
}

function resolveApiBase(): string {
  const configured = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  return normalizeApiBase(configured);
}

function isAllowedPath(path: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function buildHeaders(secret: string, request: NextRequest): Headers {
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  headers.set('X-Internal-Secret', secret);

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  return headers;
}

function buildGetCacheKey(normalizedPath: string, request: NextRequest): string {
  return `${normalizedPath}?${request.nextUrl.searchParams.toString()}`;
}

function pruneGetCache(now: number): void {
  for (const [key, entry] of cachedGetResponses.entries()) {
    if (entry.staleUntil <= now) {
      cachedGetResponses.delete(key);
    }
  }

  if (cachedGetResponses.size <= GET_CACHE_MAX_ENTRIES) {
    return;
  }

  const extraEntries = cachedGetResponses.size - GET_CACHE_MAX_ENTRIES;
  const keys = cachedGetResponses.keys();

  for (let index = 0; index < extraEntries; index += 1) {
    const next = keys.next();
    if (next.done) {
      break;
    }
    cachedGetResponses.delete(next.value);
  }
}

function setCachedGetResponse(cacheKey: string, status: number, bodyText: string, contentType: string): void {
  const now = Date.now();
  pruneGetCache(now);

  cachedGetResponses.set(cacheKey, {
    bodyText,
    status,
    contentType,
    freshUntil: now + GET_CACHE_TTL_MS,
    staleUntil: now + GET_CACHE_STALE_TTL_MS,
  });
}

function responseFromCache(entry: CachedGetResponse, hitType: 'HIT' | 'STALE'): NextResponse {
  return new NextResponse(entry.bodyText, {
    status: entry.status,
    headers: {
      'content-type': entry.contentType,
      'Cache-Control': SHARED_GET_CACHE_CONTROL,
      'X-Internal-Cache': hitType,
    },
  });
}

function jsonNoStore(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': NO_STORE_CACHE_CONTROL,
    },
  });
}

async function handleProxy(request: NextRequest, pathSegments: string[], method: 'GET' | 'POST'): Promise<NextResponse> {
  const normalizedPath = pathSegments.join('/');
  const now = Date.now();
  const getCacheKey = method === 'GET' ? buildGetCacheKey(normalizedPath, request) : null;
  const cachedGetResponse = getCacheKey ? cachedGetResponses.get(getCacheKey) : undefined;

  if (cachedGetResponse && cachedGetResponse.freshUntil > now) {
    return responseFromCache(cachedGetResponse, 'HIT');
  }

  if (!normalizedPath || !isAllowedPath(normalizedPath)) {
    return jsonNoStore({ success: false, message: 'Not found' }, 404);
  }

  if (method === 'POST' && !ALLOWED_POST_PATHS.has(normalizedPath)) {
    return jsonNoStore({ success: false, message: 'Method not allowed' }, 405);
  }

  const apiBase = resolveApiBase();
  const internalSecret = process.env.INTERNAL_API_SECRET || '';

  if (!apiBase) {
    return jsonNoStore({ success: false, message: 'API URL is not configured.' }, 500);
  }

  if (!internalSecret) {
    return jsonNoStore({ success: false, message: 'Internal API secret is not configured.' }, 500);
  }

  const url = `${apiBase}/${normalizedPath}${request.nextUrl.search}`;
  const headers = buildHeaders(internalSecret, request);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      method,
      headers,
      body: method === 'POST' ? await request.text() : undefined,
      cache: 'no-store',
      signal: controller.signal,
    });

    const bodyText = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json';

    if (method === 'GET' && getCacheKey) {
      const shouldServeStale = upstream.status === 408 || upstream.status === 429 || upstream.status >= 500;
      if (upstream.ok) {
        setCachedGetResponse(getCacheKey, upstream.status, bodyText, contentType);
      } else if (shouldServeStale && cachedGetResponse && cachedGetResponse.staleUntil > Date.now()) {
        return responseFromCache(cachedGetResponse, 'STALE');
      }
    }

    return new NextResponse(bodyText, {
      status: upstream.status,
      headers: {
        'content-type': contentType,
        'Cache-Control': method === 'GET' ? SHARED_GET_CACHE_CONTROL : NO_STORE_CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error('Internal proxy request failed:', error);

    if (method === 'GET' && cachedGetResponse && cachedGetResponse.staleUntil > Date.now()) {
      return responseFromCache(cachedGetResponse, 'STALE');
    }

    return jsonNoStore({ success: false, message: 'Failed to reach upstream API.' }, 502);
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  return handleProxy(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  return handleProxy(request, path, 'POST');
}
