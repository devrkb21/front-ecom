import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '@/types';

const CSRF_ENABLED = (process.env.NEXT_PUBLIC_ENABLE_CSRF || 'false').toLowerCase() === 'true';

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

const API_URL_RAW = process.env.NEXT_PUBLIC_API_URL || '';
const API_URL = normalizeApiUrl(API_URL_RAW);
const PUBLIC_PROXY_PREFIX = '/api/public';

// Base URL without /api/v1 for Sanctum CSRF cookie endpoint.
const BASE_URL = API_URL.replace(/\/api\/v\d+$/i, '');
const INTERNAL_PROXY_PREFIX = '/api/internal';
const INTERNAL_GET_RETRY_COUNT = 2;
const INTERNAL_GET_RETRY_DELAY_MS = 200;
const INTERNAL_GET_CACHE_PREFIX = 'api.internal.get.v1:';

interface InternalGetCacheEntry<T = unknown> {
  savedAt: number;
  data: T;
}

const internalGetMemoryCache = new Map<string, InternalGetCacheEntry<unknown>>();
const internalGetInFlight = new Map<string, Promise<unknown>>();

if (!API_URL && typeof window !== 'undefined') {
  console.warn('[API] NEXT_PUBLIC_API_URL is not set. API requests will fail. Create a .env.local file with NEXT_PUBLIC_API_URL=https://your-api-domain/api/v1');
}

if (API_URL_RAW && API_URL_RAW !== API_URL && typeof window !== 'undefined') {
  console.warn(`[API] Normalized NEXT_PUBLIC_API_URL from "${API_URL_RAW}" to "${API_URL}".`);
}

// Token storage (in-memory for security)
let authToken: string | null = null;
let csrfInitialized = false;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }
};

export const getAuthToken = (): string | null => {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('auth_token');
  }
  return authToken;
};

export const clearAuthToken = () => {
  authToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
};

// Get CSRF token from cookie
const getCsrfToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  return null;
};

// Fetch CSRF cookie from Laravel Sanctum
export const initCsrf = async (): Promise<void> => {
  if (!CSRF_ENABLED) return;
  if (csrfInitialized) return;
  if (!BASE_URL) return;
  try {
    await axios.get(`${BASE_URL}/sanctum/csrf-cookie`, {
      withCredentials: true,
    });
    csrfInitialized = true;
  } catch (error) {
    console.error('Failed to initialize CSRF:', error);
  }
};

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: PUBLIC_PROXY_PREFIX,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: CSRF_ENABLED,
});

// Internal endpoints are called through Next.js route handlers to avoid exposing internal secrets in the browser.
const internalApi: AxiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
  timeout: 15000,
});

const normalizeInternalPath = (path: string): string => path.replace(/^\/+/, '');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toStableObject = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => toStableObject(item));
  }

  if (value !== null && typeof value === 'object') {
    const sortedEntries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, toStableObject(nestedValue)] as const);

    return Object.fromEntries(sortedEntries);
  }

  return value;
};

const buildInternalGetCacheKey = (target: string, config?: AxiosRequestConfig): string => {
  const params = config?.params;
  const normalizedParams = params === undefined ? null : toStableObject(params);
  return `${target}|${JSON.stringify(normalizedParams)}`;
};

const readInternalGetCache = <T = unknown>(cacheKey: string): InternalGetCacheEntry<T> | null => {
  const memoryCached = internalGetMemoryCache.get(cacheKey) as InternalGetCacheEntry<T> | undefined;
  if (memoryCached) {
    return memoryCached;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(`${INTERNAL_GET_CACHE_PREFIX}${cacheKey}`);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<InternalGetCacheEntry<T>>;
    if (!parsed || !('data' in parsed)) {
      return null;
    }

    const entry: InternalGetCacheEntry<T> = {
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      data: parsed.data as T,
    };

    internalGetMemoryCache.set(cacheKey, entry as InternalGetCacheEntry<unknown>);
    return entry;
  } catch {
    return null;
  }
};

const writeInternalGetCache = <T = unknown>(cacheKey: string, data: T): void => {
  const entry: InternalGetCacheEntry<T> = {
    savedAt: Date.now(),
    data,
  };

  internalGetMemoryCache.set(cacheKey, entry as InternalGetCacheEntry<unknown>);

  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(`${INTERNAL_GET_CACHE_PREFIX}${cacheKey}`, JSON.stringify(entry));
  } catch {
    // Ignore localStorage quota or serialization failures and keep memory cache.
  }
};

const shouldRetryInternalGet = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;

  // Retry on transient upstream/network/rate-limit failures.
  if (!status) {
    return true;
  }

  return status === 408 || status === 429 || status >= 500;
};

export const internalGet = async <T = unknown>(path: string, config?: AxiosRequestConfig): Promise<T> => {
  const target = `${INTERNAL_PROXY_PREFIX}/${normalizeInternalPath(path)}`;
  const cacheKey = buildInternalGetCacheKey(target, config);
  const inFlight = internalGetInFlight.get(cacheKey);

  if (inFlight) {
    return inFlight as Promise<T>;
  }

  const requestPromise = (async (): Promise<T> => {
    const cachedEntry = readInternalGetCache<T>(cacheKey);

    let lastError: unknown;

    for (let attempt = 0; attempt <= INTERNAL_GET_RETRY_COUNT; attempt += 1) {
      try {
        const response = await internalApi.get<T>(target, config);
        writeInternalGetCache(cacheKey, response.data);
        return response.data;
      } catch (error) {
        lastError = error;

        if (attempt >= INTERNAL_GET_RETRY_COUNT || !shouldRetryInternalGet(error)) {
          break;
        }

        await wait(INTERNAL_GET_RETRY_DELAY_MS * (attempt + 1));
      }
    }

    if (cachedEntry) {
      return cachedEntry.data;
    }

    throw lastError;
  })();

  internalGetInFlight.set(cacheKey, requestPromise as Promise<unknown>);

  try {
    return await requestPromise;
  } finally {
    internalGetInFlight.delete(cacheKey);
  }
};

export const internalPost = async <T = unknown>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
  const response = await internalApi.post<T>(`${INTERNAL_PROXY_PREFIX}/${normalizeInternalPath(path)}`, data, config);
  return response.data;
};

// Request interceptor to attach token and CSRF
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Attach Bearer token if available
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Attach CSRF token for non-GET requests
    const method = (config.method || 'get').toLowerCase();
    const csrfToken = getCsrfToken();
    if (CSRF_ENABLED && csrfToken && config.headers && method !== 'get') {
      config.headers['X-XSRF-TOKEN'] = csrfToken;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Validate that the response is JSON (not an HTML error page)
    if (typeof response.data === 'string' && response.data.startsWith('<!')) {
      return Promise.reject(new Error('API returned HTML instead of JSON. Check NEXT_PUBLIC_API_URL configuration.'));
    }
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle CSRF token expiry - retry once
    if (CSRF_ENABLED && error.response?.status === 419 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      csrfInitialized = false;
      await initCsrf();
      return api(originalRequest);
    }

    if (error.response?.status === 401) {
      clearAuthToken();
      // Redirect to login on 401
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
