// API Response Types
export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  data: T;
}

export interface ResourceCollectionResponse<T> {
  data: T[];
  links?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
