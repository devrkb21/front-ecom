import api from './api';
import { ResourceCollectionResponse } from '@/types';

export interface WishlistItem {
  id: number;
  product_id: number;
  product_variant_id?: number | null;
  product: {
    id: number;
    name: string;
    slug: string;
    regular_price: number;
    sale_price?: number | null;
    current_price: number;
    image_url?: string;
    in_stock: boolean;
  };
  variant?: {
    id: number;
    sku: string;
    name: string;
    attributes: Record<string, unknown>;
  } | null;
  created_at?: string;
  added_at?: string;
}

export const wishlistService = {
  async getWishlist(): Promise<WishlistItem[]> {
    const response = await api.get<ResourceCollectionResponse<WishlistItem>>('/wishlist');
    return response.data.data;
  },

  async toggleItem(productId: number): Promise<{ added: boolean }> {
    const response = await api.post<{ added: boolean }>('/wishlist/toggle', { product_id: productId });
    return { added: Boolean(response.data.added) };
  },

  async checkItem(productId: number): Promise<boolean> {
    const response = await api.get<{ in_wishlist: boolean }>('/wishlist/check', {
      params: { product_id: productId },
    });
    return Boolean(response.data.in_wishlist);
  },

  async getCount(): Promise<number> {
    const response = await api.get<{ count: number }>('/wishlist/count');
    return Number(response.data.count || 0);
  },

  async removeItem(wishlistId: number): Promise<void> {
    await api.delete(`/wishlist/${wishlistId}`);
  },

  async moveToCart(wishlistId: number): Promise<void> {
    await api.post(`/wishlist/${wishlistId}/move-to-cart`);
  },

  async clear(): Promise<void> {
    await api.delete('/wishlist/clear');
  },
};

export default wishlistService;
