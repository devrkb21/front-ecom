import { internalGet } from './api';
import {
  PaginatedResponse,
  Product,
  ProductVariant,
  Attribute,
  Category,
  Review,
  ReviewSummary,
  ResourceCollectionResponse,
} from '@/types';
import { extractCollection, normalizePaginated, unwrapEnvelope } from './normalizers';

export interface ProductFilters {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number | string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  is_featured?: boolean;
  is_on_sale?: boolean;
  sort_by?: 'name' | 'price' | 'created_at' | 'sales_count';
  sort_order?: 'asc' | 'desc';
}

const buildProductParams = (filters: ProductFilters): Record<string, string | number | boolean> => {
  const params: Record<string, string | number | boolean> = {};

  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;
  if (filters.search?.trim()) params.search = filters.search.trim();
  if (filters.category_id) params.category_id = filters.category_id;
  if (typeof filters.min_price === 'number' && !Number.isNaN(filters.min_price)) params.min_price = filters.min_price;
  if (typeof filters.max_price === 'number' && !Number.isNaN(filters.max_price)) params.max_price = filters.max_price;
  if (typeof filters.in_stock === 'boolean') params.in_stock = filters.in_stock;
  if (typeof filters.is_featured === 'boolean') params.is_featured = filters.is_featured;
  if (typeof filters.is_on_sale === 'boolean') params.is_on_sale = filters.is_on_sale;
  if (filters.sort_by) params.sort_by = filters.sort_by;
  if (filters.sort_order) params.sort_order = filters.sort_order;

  return params;
};

export const productService = {
  async getAll(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
    const params = buildProductParams(filters);
    const payload = await internalGet<unknown>('products', { params });
    return normalizePaginated<Product>(payload, filters.per_page ?? 15);
  },

  async getFeatured(): Promise<Product[]> {
    const payload = await internalGet<unknown>('products/featured');
    return extractCollection<Product>(payload);
  },

  async getNew(): Promise<Product[]> {
    const payload = await internalGet<unknown>('products/new');
    return extractCollection<Product>(payload);
  },

  async getBestsellers(): Promise<Product[]> {
    const payload = await internalGet<unknown>('products/bestsellers');
    return extractCollection<Product>(payload);
  },

  async getById(id: number): Promise<Product> {
    const payload = await internalGet<unknown>(`products/${id}`);
    return unwrapEnvelope<Product>(payload);
  },

  async getBySlug(slug: string): Promise<Product> {
    const payload = await internalGet<unknown>(`products/slug/${slug}`);
    return unwrapEnvelope<Product>(payload);
  },

  async getVariants(productId: number): Promise<ProductVariant[]> {
    const payload = await internalGet<unknown>(`products/${productId}/variants`);
    return extractCollection<ProductVariant>(payload);
  },

  async getByCategory(categoryId: number, page = 1): Promise<PaginatedResponse<Product>> {
    const payload = await internalGet<unknown>(`products/category/${categoryId}`, {
      params: { page },
    });
    return normalizePaginated<Product>(payload);
  },

  async search(query: string): Promise<Product[]> {
    const payload = await internalGet<unknown>('products/search', {
      params: { q: query },
    });
    return extractCollection<Product>(payload);
  },

  async getProductReviews(productId: number, page: number = 1): Promise<ResourceCollectionResponse<Review>> {
    return internalGet<ResourceCollectionResponse<Review>>(`products/${productId}/reviews`, {
      params: { page },
    });
  },

  async getReviewSummary(productId: number): Promise<ReviewSummary> {
    const payload = await internalGet<unknown>(`products/${productId}/reviews/summary`);
    return unwrapEnvelope<ReviewSummary>(payload);
  },

  async getRelatedProducts(productId: number): Promise<Product[]> {
    const payload = await internalGet<unknown>(`products/${productId}/related`);
    return extractCollection<Product>(payload);
  },
 
  async canReview(productId: number): Promise<{ can_review: boolean; reason?: string; is_verified_purchase?: boolean }> {
    const payload = await internalGet<unknown>(`products/${productId}/reviews/can-review`);
    return unwrapEnvelope<{ can_review: boolean; reason?: string; is_verified_purchase?: boolean }>(payload);
  },
};

export const attributeService = {
  async getAll(): Promise<Attribute[]> {
    const payload = await internalGet<unknown>('attributes');
    return extractCollection<Attribute>(payload);
  },
};

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const payload = await internalGet<unknown>('categories');
    return extractCollection<Category>(payload);
  },

  async getMenu(): Promise<Category[]> {
    const payload = await internalGet<unknown>('categories/menu');
    return extractCollection<Category>(payload);
  },

  async getBySlug(slug: string): Promise<Category> {
    const payload = await internalGet<unknown>(`categories/slug/${slug}`);
    return unwrapEnvelope<Category>(payload);
  },

  async getById(id: number): Promise<Category> {
    const payload = await internalGet<unknown>(`categories/${id}`);
    return unwrapEnvelope<Category>(payload);
  },
};

export default productService;
