import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_TIMEOUT_MS = 20000;
const NO_STORE_CACHE_CONTROL = 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0';

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

function jsonNoStore(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': NO_STORE_CACHE_CONTROL,
    },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiBase = resolveApiBase();

  if (!apiBase) {
    return jsonNoStore({ success: false, message: 'API URL is not configured.' }, 500);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${apiBase}/orders`, {
      method: 'POST',
      headers: buildForwardHeaders(request),
      body: await request.text(),
      cache: 'no-store',
      signal: controller.signal,
    });

    const bodyText = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json';

    return new NextResponse(bodyText, {
      status: upstream.status,
      headers: {
        'content-type': contentType,
        'Cache-Control': NO_STORE_CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error('Public order proxy request failed:', error);
    return jsonNoStore({ success: false, message: 'Failed to reach upstream API.' }, 502);
  } finally {
    clearTimeout(timeout);
  }
}