import axios from 'axios';
import { getAuthToken, initCsrf } from './api';
import { getCheckoutSessionHeaders } from './checkout-session';
import { Order, CreateOrderData, OrderSummary, OrderTracking } from '@/types';
import { normalizePaginated, unwrapEnvelope } from './normalizers';

const buildAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const orderService = {
  async getOrders(): Promise<Order[]> {
    const response = await axios.get('/api/proxy/orders', {
      headers: buildAuthHeaders(),
    });
    return normalizePaginated<Order>(response.data).data;
  },

  async getOrder(id: number): Promise<Order> {
    const response = await axios.get(`/api/proxy/orders/${id}`, {
      headers: buildAuthHeaders(),
    });
    return unwrapEnvelope<Order>(response.data);
  },

  async getOrderByNumber(orderNumber: string, options?: { guestToken?: string }): Promise<OrderSummary> {
    const normalizedOrderNumber = orderNumber.trim().toUpperCase();
    const guestToken = options?.guestToken?.trim();
    const targetPath = guestToken
      ? `/api/proxy/orders/number/${encodeURIComponent(normalizedOrderNumber)}/guest`
      : `/api/proxy/orders/number/${encodeURIComponent(normalizedOrderNumber)}`;

    const response = await axios.get(targetPath, {
      headers: buildAuthHeaders(),
      params: guestToken ? { guest_token: guestToken } : undefined,
    });
    return unwrapEnvelope<OrderSummary>(response.data);
  },

  async trackOrderByNumber(orderNumber: string): Promise<OrderTracking> {
    const normalizedOrderNumber = orderNumber.trim().toUpperCase();
    const response = await axios.get(`/api/public/track/order/${encodeURIComponent(normalizedOrderNumber)}`, {
      headers: {
        Accept: 'application/json',
      },
    });
    return unwrapEnvelope<OrderTracking>(response.data);
  },

  async createOrder(data: CreateOrderData): Promise<OrderSummary> {
    await initCsrf();
    const response = await axios.post('/api/public/orders', data, {
      headers: {
        ...buildAuthHeaders(),
        ...getCheckoutSessionHeaders(),
      },
    });
    return unwrapEnvelope<OrderSummary>(response.data);
  },

  async cancelOrder(id: number): Promise<Order> {
    await initCsrf();
    const response = await axios.post(`/api/proxy/orders/${id}/cancel`, undefined, {
      headers: buildAuthHeaders(),
    });
    return unwrapEnvelope<Order>(response.data);
  },
};

export default orderService;
