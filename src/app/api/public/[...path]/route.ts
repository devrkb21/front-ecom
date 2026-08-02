import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_TIMEOUT_MS = 20000;
const NO_STORE_CACHE_CONTROL = 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0';
const GET_CACHE_TTL_MS = 30_000;
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

const ALLOWED_GET_PREFIXES = [
  'auth/me',
  'profile',
  'cart',
  'wishlist',
  'wishlist/check',
  'wishlist/count',
  'addresses',
  'track',
  'public/loyalty',
] as const;

const ALLOWED_POST_PATHS = [
  /^auth\/login$/,
  /^auth\/register$/,
  /^auth\/logout$/,
  /^auth\/change-password$/,
  /^auth\/forgot-password$/,
  /^auth\/reset-password$/,
  /^cart\/items$/,
  /^cart\/coupon$/,
  /^checkout\/track$/,
  /^wishlist\/toggle$/,
  /^wishlist\/\d+\/move-to-cart$/,
  /^addresses$/,
  /^addresses\/\d+\/set-default$/,
  /^contact$/,
] as const;

const ALLOWED_PUT_PATHS = [
  /^profile$/,
  /^cart\/items\/\d+$/,
  /^addresses\/\d+$/,
] as const;

const ALLOWED_DELETE_PATHS = [
  /^cart$/,
  /^cart\/items\/\d+$/,
  /^cart\/coupon$/,
  /^wishlist\/clear$/,
  /^wishlist\/\d+$/,
  /^addresses\/\d+$/,
] as const;

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

function isAllowedGetPath(path: string): boolean {
  return ALLOWED_GET_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function hasTraversalSegment(pathSegments: string[]): boolean {
  return pathSegments.some((segment) => {
    if (segment === '.' || segment === '..') {
      return true;
    }
    try {
      const decoded = decodeURIComponent(segment);
      return decoded === '.' || decoded === '..';
    } catch {
      // Malformed URI component — treat as suspicious and reject.
      return true;
    }
  });
}

function isAllowedPath(path: string, method: string): boolean {
  if (method === 'GET') {
    return isAllowedGetPath(path);
  }

  if (method === 'POST') {
    return ALLOWED_POST_PATHS.some((pattern) => pattern.test(path));
  }

  if (method === 'PUT') {
    return ALLOWED_PUT_PATHS.some((pattern) => pattern.test(path));
  }

  if (method === 'DELETE') {
    return ALLOWED_DELETE_PATHS.some((pattern) => pattern.test(path));
  }

  return false;
}

function buildForwardHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  headers.set('Accept', 'application/json');

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  const authorization = request.headers.get('authorization');
  if (authorization) {
    headers.set('Authorization', authorization);
  }

  const sessionId = request.headers.get('x-session-id');
  if (sessionId) {
    headers.set('X-Session-ID', sessionId);
  }

  const userAgent = request.headers.get('user-agent');
  if (userAgent) {
    headers.set('User-Agent', userAgent);
  }

  let forwardedFor = request.headers.get('cf-pseudo-ipv4') 
    || request.headers.get('cf-connecting-ipv4') 
    || request.headers.get('cf-connecting-ip') 
    || request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    headers.set('X-Forwarded-For', firstIp);
  }

  return headers;
}

function buildGetCacheKey(normalizedPath: string, request: NextRequest): string {
  const search = request.nextUrl.searchParams.toString();
  const authorization = request.headers.get('authorization') || '';
  const sessionId = request.headers.get('x-session-id') || '';

  return `${normalizedPath}?${search}|auth:${authorization}|session:${sessionId}`;
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

  const overflow = cachedGetResponses.size - GET_CACHE_MAX_ENTRIES;
  const keys = cachedGetResponses.keys();

  for (let index = 0; index < overflow; index += 1) {
    const next = keys.next();
    if (next.done) {
      break;
    }

    cachedGetResponses.delete(next.value);
  }
}

function invalidateGetCacheForPrefix(prefix: string, request: NextRequest): void {
  const authorization = request.headers.get('authorization') || '';
  const sessionId = request.headers.get('x-session-id') || '';
  const scopeSuffix = `|auth:${authorization}|session:${sessionId}`;

  for (const key of cachedGetResponses.keys()) {
    const [keyPath] = key.split('?');
    const matchesPrefix = keyPath === prefix || keyPath.startsWith(`${prefix}/`) || prefix.startsWith(`${keyPath}/`);
    if (matchesPrefix && key.endsWith(scopeSuffix)) {
      cachedGetResponses.delete(key);
    }
  }
}

const MUTATION_RELATED_GET_PREFIXES: Record<string, string[]> = {
  cart: ['cart'],
  checkout: ['cart'],
  wishlist: ['wishlist', 'wishlist/check', 'wishlist/count'],
  addresses: ['addresses'],
  profile: ['profile', 'auth/me'],
  auth: ['auth/me', 'profile', 'cart', 'wishlist', 'addresses'],
};

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
      'Cache-Control': NO_STORE_CACHE_CONTROL,
      'X-Public-Cache': hitType,
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

async function handleProxy(request: NextRequest, pathSegments: string[], method: 'GET' | 'POST' | 'PUT' | 'DELETE'): Promise<NextResponse> {
  if (hasTraversalSegment(pathSegments)) {
    return jsonNoStore({ success: false, message: 'Invalid path.' }, 400);
  }

  const normalizedPath = pathSegments.join('/');
  const now = Date.now();
  const getCacheKey = method === 'GET' ? buildGetCacheKey(normalizedPath, request) : null;
  const cachedGetResponse = getCacheKey ? cachedGetResponses.get(getCacheKey) : undefined;

  if (cachedGetResponse && cachedGetResponse.freshUntil > now) {
    return responseFromCache(cachedGetResponse, 'HIT');
  }

  if (!normalizedPath) {
    return jsonNoStore({ success: false, message: 'Not found' }, 404);
  }

  if (!isAllowedPath(normalizedPath, method)) {
    return jsonNoStore({ success: false, message: 'Not found' }, 404);
  }

  const apiBase = resolveApiBase();
  if (!apiBase) {
    return jsonNoStore({ success: false, message: 'API URL is not configured.' }, 500);
  }

  const url = `${apiBase}/${normalizedPath}${request.nextUrl.search}`;
  const headers = buildForwardHeaders(request);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      method,
      headers,
      body: method === 'GET' ? undefined : await request.text(),
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

    if (method !== 'GET' && upstream.ok) {
      const resourceKey = normalizedPath.split('/')[0];
      const relatedPrefixes = MUTATION_RELATED_GET_PREFIXES[resourceKey] || [resourceKey];
      for (const prefix of relatedPrefixes) {
        invalidateGetCacheForPrefix(prefix, request);
      }
    }

    return new NextResponse(bodyText, {
      status: upstream.status,
      headers: {
        'content-type': contentType,
        'Cache-Control': NO_STORE_CACHE_CONTROL,
        'X-Public-Cache': method === 'GET' ? 'MISS' : 'BYPASS',
      },
    });
  } catch (error) {
    console.error('Public proxy request failed:', error);

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  return handleProxy(request, path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  return handleProxy(request, path, 'DELETE');
}