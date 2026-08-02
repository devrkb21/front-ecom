import api from './api';
import { unwrapEnvelope } from './normalizers';
import { getCheckoutSessionHeaders } from './checkout-session';

export type AbandonedCheckoutStep = 'cart' | 'shipping' | 'payment';
export type AbandonedCartCheckoutFieldValue = string | number | boolean;

export interface AbandonedCartTrackItem {
  product_id: number;
  product_name?: string;
  product_sku?: string | null;
  product_image?: string | null;
  variant_id?: number | null;
  variant_name?: string | null;
  variant_sku?: string | null;
  variant_attributes?: string | null;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface AbandonedCartTrackPayload {
  checkout_step: AbandonedCheckoutStep;
  landing_page_slug?: string;
  email?: string;
  phone?: string;
  name?: string;
  checkout_fields?: Record<string, AbandonedCartCheckoutFieldValue>;
  shipping_address?: string;
  shipping_location_text?: string;
  shipping_area?: string;
  shipping_division?: string;
  shipping_district?: string;
  shipping_upazila?: string;
  shipping_union?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  payment_method?: string;
  shipping_method?: string;
  cart_items?: AbandonedCartTrackItem[];
  subtotal?: number;
  total?: number;
  coupon_code?: string;
  discount_amount?: number;
}

interface AbandonedCartTrackResponse {
  abandoned_cart_id: number;
}

export const abandonedCartService = {
  async track(payload: AbandonedCartTrackPayload): Promise<AbandonedCartTrackResponse> {
    // Uses the shared api instance (default baseURL /api/public) so this call picks up
    // the same auth-token attachment, CSRF, and 401 interceptor behavior as the rest of
    // the app instead of a raw axios call with a hand-rolled auth header.
    const response = await api.post('checkout/track', payload, {
      headers: getCheckoutSessionHeaders(),
    });

    return unwrapEnvelope<AbandonedCartTrackResponse>(response.data);
  },
};

export default abandonedCartService;
