import api, { initCsrf } from './api';
import { getCheckoutSessionHeaders } from './checkout-session';
import { Order, CreateOrderData, OrderSummary, OrderTracking } from '@/types';
import { normalizePaginated, unwrapEnvelope } from './normalizers';

// Requests below go through the shared `api` axios instance so they pick up the same
// request/response interceptors as the rest of the app (Bearer token attachment, CSRF
// handling, and — importantly — the 401 interceptor that clears the auth token and
// redirects to /login when a session expires mid-checkout).
//
// `api`'s default baseURL is the public proxy prefix (/api/public); the authenticated
// order endpoints are served through the allowlisted /api/proxy prefix instead, so those
// calls override baseURL per-request while still running through the shared instance.
const PROXY_BASE_URL = '/api/proxy';

export const orderService = {
  async getOrders(): Promise<Order[]> {
    const response = await api.get('orders', { baseURL: PROXY_BASE_URL });
    return normalizePaginated<Order>(response.data).data;
  },

  async getOrder(id: number): Promise<Order> {
    const response = await api.get(`orders/${id}`, { baseURL: PROXY_BASE_URL });
    return unwrapEnvelope<Order>(response.data);
  },

  async getOrderByNumber(orderNumber: string, options?: { guestToken?: string }): Promise<OrderSummary> {
    const normalizedOrderNumber = orderNumber.trim().toUpperCase();
    const guestToken = options?.guestToken?.trim();
    const targetPath = guestToken
      ? `orders/number/${encodeURIComponent(normalizedOrderNumber)}/guest`
      : `orders/number/${encodeURIComponent(normalizedOrderNumber)}`;

    const response = await api.get(targetPath, {
      baseURL: PROXY_BASE_URL,
      params: guestToken ? { guest_token: guestToken } : undefined,
    });
    return unwrapEnvelope<OrderSummary>(response.data);
  },

  async trackOrderByNumber(orderNumber: string): Promise<OrderTracking> {
    const normalizedOrderNumber = orderNumber.trim().toUpperCase();
    // Public endpoint — uses the api instance's default /api/public baseURL.
    const response = await api.get(`track/order/${encodeURIComponent(normalizedOrderNumber)}`);
    return unwrapEnvelope<OrderTracking>(response.data);
  },

  async createOrder(data: CreateOrderData): Promise<OrderSummary> {
    await initCsrf();
    // Public endpoint — uses the api instance's default /api/public baseURL.
    const response = await api.post('orders', data, {
      headers: getCheckoutSessionHeaders(),
    });
    return unwrapEnvelope<OrderSummary>(response.data);
  },

  async cancelOrder(id: number): Promise<Order> {
    await initCsrf();
    const response = await api.post(`orders/${id}/cancel`, undefined, { baseURL: PROXY_BASE_URL });
    return unwrapEnvelope<Order>(response.data);
  },
};

export default orderService;
