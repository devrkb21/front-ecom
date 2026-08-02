import api, { initCsrf, internalGet } from './api';
import {
  PaymentMethod,
  Payment,
  StripeConfig,
  StripePaymentIntent,
  StripeConfirmResult,
  BkashConfig,
  BkashPayment,
  BkashStatus,
  SavedPaymentMethod,
  Order,
} from '@/types';
import { extractCollection, unwrapEnvelope } from './normalizers';

type RawPaymentMethod = Omit<PaymentMethod, 'extra_charge'> & {
  extra_charge?: PaymentMethod['extra_charge'] | number | null;
};

const normalizePaymentMethod = (method: RawPaymentMethod): PaymentMethod => {
  const extraCharge = method.extra_charge;

  if (!extraCharge) {
    return { ...method, extra_charge: null };
  }

  if (typeof extraCharge === 'number') {
    return {
      ...method,
      extra_charge: {
        type: 'fixed',
        value: extraCharge,
        calculated: extraCharge,
      },
    };
  }

  const calculated = typeof extraCharge.calculated === 'number' ? extraCharge.calculated : 0;
  const value = typeof extraCharge.value === 'number' ? extraCharge.value : calculated;

  return {
    ...method,
    extra_charge: {
      type: extraCharge.type,
      value,
      calculated,
      label: extraCharge.label,
    },
  };
};

// Authenticated payment endpoints are served through the allowlisted /api/proxy prefix.
// Routing these through the shared `api` axios instance (instead of raw axios calls)
// means they pick up the same interceptors as the rest of the app — most importantly the
// 401 interceptor that clears the auth token and redirects to /login if the session
// expires mid-checkout/payment.
const PROXY_BASE_URL = '/api/proxy';

export const paymentService = {
  // Payment Methods
  async getPaymentMethods(amount?: number, currency?: string): Promise<PaymentMethod[]> {
    const params: Record<string, string> = {};
    if (typeof amount === 'number') params.amount = amount.toString();
    if (currency) params.currency = currency;

    const payload = await internalGet<unknown>('payment-methods', {
      params,
    });

    return extractCollection<RawPaymentMethod>(payload).map(normalizePaymentMethod);
  },

  async getPaymentMethod(code: string): Promise<PaymentMethod> {
    const payload = await internalGet<unknown>(`payment-methods/${code}`);
    return normalizePaymentMethod(unwrapEnvelope<RawPaymentMethod>(payload));
  },

  // Payments
  async getPaymentForOrder(orderId: number): Promise<Payment> {
    const response = await api.get(`payments/order/${orderId}`, { baseURL: PROXY_BASE_URL });
    return unwrapEnvelope<Payment>(response.data);
  },

  async getOrderPaymentSummary(orderId: number, guestToken?: string): Promise<Order> {
    const response = await api.get(`orders/${orderId}/payment-summary`, {
      baseURL: PROXY_BASE_URL,
      params: guestToken ? { guest_token: guestToken } : undefined,
    });
    return unwrapEnvelope<Order>(response.data);
  },

  // Stripe Integration
  async getStripeConfig(): Promise<StripeConfig> {
    const response = await api.get('stripe/config', { baseURL: PROXY_BASE_URL });
    return unwrapEnvelope<StripeConfig>(response.data);
  },

  async createStripePaymentIntent(
    orderId: number,
    options?: {
      guestToken?: string;
      savePaymentMethod?: boolean;
    }
  ): Promise<StripePaymentIntent> {
    await initCsrf();
    const payload: Record<string, unknown> = {
      order_id: orderId,
    };

    if (options?.guestToken) {
      payload.guest_token = options.guestToken;
    }

    if (typeof options?.savePaymentMethod === 'boolean') {
      payload.save_payment_method = options.savePaymentMethod;
    }

    const response = await api.post(
      'stripe/create-payment-intent',
      payload,
      { baseURL: PROXY_BASE_URL }
    );
    return unwrapEnvelope<StripePaymentIntent>(response.data);
  },

  async confirmStripePayment(
    orderId: number,
    paymentIntentId: string,
    options?: {
      guestToken?: string;
      savePaymentMethod?: boolean;
    }
  ): Promise<StripeConfirmResult> {
    await initCsrf();
    const payload: Record<string, unknown> = {
      order_id: orderId,
      payment_intent_id: paymentIntentId,
    };

    if (options?.guestToken) {
      payload.guest_token = options.guestToken;
    }

    if (typeof options?.savePaymentMethod === 'boolean') {
      payload.save_payment_method = options.savePaymentMethod;
    }

    const response = await api.post(
      'stripe/confirm-payment',
      payload,
      { baseURL: PROXY_BASE_URL }
    );
    return unwrapEnvelope<StripeConfirmResult>(response.data);
  },

  // bKash Integration
  async getBkashConfig(): Promise<BkashConfig> {
    const response = await api.get('bkash/config', { baseURL: PROXY_BASE_URL });
    return unwrapEnvelope<BkashConfig>(response.data);
  },

  async createBkashPayment(orderId: number, guestToken?: string): Promise<BkashPayment> {
    await initCsrf();

    const payload: Record<string, unknown> = {
      order_id: orderId,
      frontend_origin: typeof window !== 'undefined' ? window.location.origin : undefined,
    };

    if (guestToken) {
      payload.guest_token = guestToken;
    }

    const response = await api.post(
      'bkash/create-payment',
      payload,
      { baseURL: PROXY_BASE_URL }
    );
    return unwrapEnvelope<BkashPayment>(response.data);
  },

  async checkBkashStatus(orderId: number): Promise<BkashStatus> {
    const response = await api.get('bkash/check-status', {
      baseURL: PROXY_BASE_URL,
      params: { order_id: orderId },
    });
    return unwrapEnvelope<BkashStatus>(response.data);
  },

  async getSavedPaymentMethods(): Promise<SavedPaymentMethod[]> {
    const response = await api.get('saved-payment-methods', { baseURL: PROXY_BASE_URL });

    return extractCollection<SavedPaymentMethod>(response.data);
  },

  async setDefaultSavedPaymentMethod(savedPaymentMethodId: number): Promise<SavedPaymentMethod> {
    await initCsrf();
    const response = await api.post(
      `saved-payment-methods/${savedPaymentMethodId}/set-default`,
      {},
      { baseURL: PROXY_BASE_URL }
    );

    return unwrapEnvelope<SavedPaymentMethod>(response.data);
  },

  async removeSavedPaymentMethod(savedPaymentMethodId: number): Promise<void> {
    await initCsrf();
    await api.post(
      `saved-payment-methods/${savedPaymentMethodId}/remove`,
      {},
      { baseURL: PROXY_BASE_URL }
    );
  },
};

export default paymentService;
