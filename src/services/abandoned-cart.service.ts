import axios from 'axios';
import { getAuthToken } from './api';
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

const buildHeaders = (): Record<string, string> => {
  const token = getAuthToken();

  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...getCheckoutSessionHeaders(),
  };
};

export const abandonedCartService = {
  async track(payload: AbandonedCartTrackPayload): Promise<AbandonedCartTrackResponse> {
    const response = await axios.post('/api/public/checkout/track', payload, {
      headers: buildHeaders(),
    });

    return unwrapEnvelope<AbandonedCartTrackResponse>(response.data);
  },
};

export default abandonedCartService;
