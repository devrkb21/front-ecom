import { PaginatedResponse } from '@/types';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const unwrapEnvelope = <T>(payload: unknown): T => {
  if (isRecord(payload) && 'data' in payload) {
    return payload.data as T;
  }
  return payload as T;
};

export const extractCollection = <T>(payload: unknown): T[] => {
  const unwrapped = unwrapEnvelope<unknown>(payload);

  if (Array.isArray(unwrapped)) {
    return unwrapped as T[];
  }

  if (isRecord(unwrapped) && Array.isArray(unwrapped.data)) {
    return unwrapped.data as T[];
  }

  return [];
};

const toNumber = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

export const normalizePaginated = <T>(payload: unknown, defaultPerPage = 15): PaginatedResponse<T> => {
  const unwrapped = unwrapEnvelope<unknown>(payload);

  if (Array.isArray(unwrapped)) {
    return {
      data: unwrapped as T[],
      current_page: 1,
      last_page: 1,
      per_page: unwrapped.length || defaultPerPage,
      total: unwrapped.length,
    };
  }

  if (!isRecord(unwrapped)) {
    return {
      data: [],
      current_page: 1,
      last_page: 1,
      per_page: defaultPerPage,
      total: 0,
    };
  }

  const data = Array.isArray(unwrapped.data) ? (unwrapped.data as T[]) : [];
  const meta = isRecord(unwrapped.meta) ? unwrapped.meta : null;

  const currentPage = toNumber(unwrapped.current_page ?? meta?.current_page, 1);
  const lastPage = toNumber(unwrapped.last_page ?? meta?.last_page, 1);
  const perPage = toNumber(unwrapped.per_page ?? meta?.per_page, defaultPerPage);
  const total = toNumber(unwrapped.total ?? meta?.total, data.length);

  return {
    data,
    current_page: currentPage,
    last_page: lastPage,
    per_page: perPage,
    total,
  };
};
