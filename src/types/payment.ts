export interface PaymentExtraCharge {
  type: 'fixed' | 'percentage';
  value: number;
  calculated: number;
  label?: string;
}

export interface PaymentMethod {
  code: string;
  name: string;
  description: string;
  instructions: string | null;
  icon: string;
  requires_redirect: boolean;
  is_pay_on_delivery: boolean;
  extra_charge: PaymentExtraCharge | null;
}

export interface Payment {
  id: number;
  order_id: number;
  payment_method: string;
  transaction_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// Stripe types
export interface StripeConfig {
  public_key: string;
  test_mode: boolean;
}

export interface StripePaymentIntent {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
}

export interface StripeConfirmResult {
  status: string;
  order_id: number;
  order_number: string;
  saved_payment_method?: boolean;
}

export interface SavedPaymentMethod {
  id: number;
  gateway: string;
  card_brand: string | null;
  card_last_four: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  cardholder_name: string | null;
  is_default: boolean;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// bKash types
export interface BkashConfig {
  available: boolean;
  sandbox_mode: boolean;
  currency: string;
}

export interface BkashPayment {
  payment_id: string;
  bkash_url: string;
  order_id: number;
  amount: number;
}

export interface BkashStatus {
  status: string;
  order_number: string;
  transaction_id?: string;
}
