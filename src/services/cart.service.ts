import api from './api';
import { ApiResponse, Cart, AddToCartData, UpdateCartItemData } from '@/types';

export interface GuestCouponItemPayload {
  product_id: number;
  variant_id?: number | null;
  quantity: number;
}

export interface GuestCouponApplyResult {
  coupon_code: string;
  discount_amount: number;
  message: string;
}

export const cartService = {
  async getCart(): Promise<Cart> {
    const response = await api.get<ApiResponse<Cart>>('/cart');
    return response.data.data;
  },

  async addItem(data: AddToCartData): Promise<Cart> {
    const response = await api.post<ApiResponse<Cart>>('/cart/items', data);
    return response.data.data;
  },

  async updateItem(productId: number, data: UpdateCartItemData): Promise<Cart> {
    const response = await api.put<ApiResponse<Cart>>(`/cart/items/${productId}`, data);
    return response.data.data;
  },

  async removeItem(productId: number, variantId?: number | null): Promise<Cart> {
    const response = await api.delete<ApiResponse<Cart>>(`/cart/items/${productId}`, {
      params:
        variantId !== undefined && variantId !== null
          ? { variant_id: variantId }
          : undefined,
    });
    return response.data.data;
  },

  async clearCart(): Promise<void> {
    await api.delete('/cart');
  },

  async applyCoupon(code: string): Promise<Cart> {
    await api.post('/cart/coupon', { code });
    return cartService.getCart();
  },

  async applyCouponForGuest(code: string, items: GuestCouponItemPayload[]): Promise<GuestCouponApplyResult> {
    const response = await api.post<ApiResponse<{ coupon?: { code?: string }; discount?: number }>>('/cart/coupon', {
      code,
      items,
    });

    const couponCode = response.data?.data?.coupon?.code;
    if (!couponCode) {
      throw new Error('Invalid coupon response from server.');
    }

    return {
      coupon_code: couponCode,
      discount_amount: Number(response.data?.data?.discount ?? 0),
      message: response.data?.message || 'Coupon applied successfully!',
    };
  },

  async removeCoupon(): Promise<Cart> {
    await api.delete('/cart/coupon');
    return cartService.getCart();
  },
};

export default cartService;
