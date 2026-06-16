import axios from 'axios';
import { getAuthToken, initCsrf, internalGet } from './api';
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

const buildAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

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
    const response = await axios.get(`/api/proxy/payments/order/${orderId}`, {
      headers: buildAuthHeaders(),
    });
    return unwrapEnvelope<Payment>(response.data);
  },

  async getOrderPaymentSummary(orderId: number, guestToken?: string): Promise<Order> {
    const response = await axios.get(`/api/proxy/orders/${orderId}/payment-summary`, {
      params: guestToken ? { guest_token: guestToken } : undefined,
      headers: buildAuthHeaders(),
    });
    return unwrapEnvelope<Order>(response.data);
  },

  // Stripe Integration
  async getStripeConfig(): Promise<StripeConfig> {
    const response = await axios.get('/api/proxy/stripe/config', {
      headers: buildAuthHeaders(),
    });
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

    const response = await axios.post(
      '/api/proxy/stripe/create-payment-intent',
      payload,
      {
        headers: buildAuthHeaders(),
      }
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

    const response = await axios.post(
      '/api/proxy/stripe/confirm-payment',
      payload,
      {
        headers: buildAuthHeaders(),
      }
    );
    return unwrapEnvelope<StripeConfirmResult>(response.data);
  },

  // bKash Integration
  async getBkashConfig(): Promise<BkashConfig> {
    const response = await axios.get('/api/proxy/bkash/config', {
      headers: buildAuthHeaders(),
    });
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

    const response = await axios.post(
      '/api/proxy/bkash/create-payment',
      payload,
      {
        headers: buildAuthHeaders(),
      }
    );
    return unwrapEnvelope<BkashPayment>(response.data);
  },

  async checkBkashStatus(orderId: number): Promise<BkashStatus> {
    const response = await axios.get('/api/proxy/bkash/check-status', {
      params: { order_id: orderId },
      headers: buildAuthHeaders(),
    });
    return unwrapEnvelope<BkashStatus>(response.data);
  },

  async getSavedPaymentMethods(): Promise<SavedPaymentMethod[]> {
    const response = await axios.get('/api/proxy/saved-payment-methods', {
      headers: buildAuthHeaders(),
    });

    return extractCollection<SavedPaymentMethod>(response.data);
  },

  async setDefaultSavedPaymentMethod(savedPaymentMethodId: number): Promise<SavedPaymentMethod> {
    await initCsrf();
    const response = await axios.post(
      `/api/proxy/saved-payment-methods/${savedPaymentMethodId}/set-default`,
      {},
      {
        headers: buildAuthHeaders(),
      }
    );

    return unwrapEnvelope<SavedPaymentMethod>(response.data);
  },

  async removeSavedPaymentMethod(savedPaymentMethodId: number): Promise<void> {
    await initCsrf();
    await axios.post(
      `/api/proxy/saved-payment-methods/${savedPaymentMethodId}/remove`,
      {},
      {
        headers: buildAuthHeaders(),
      }
    );
  },
};

export default paymentService;
