import { Payment } from './payment';
import { Product, ProductVariant } from './product';

export interface OrderTrackingEvent {
  id: number;
  status: string;
  status_label?: string;
  status_icon?: string;
  location?: string | null;
  description?: string | null;
  carrier_status?: string | null;
  occurred_at: string;
  occurred_at_human?: string;
}

export interface OrderTrackingTimelineEntry {
  status: string;
  label: string;
  icon?: string;
  completed: boolean;
  date?: string | null;
  is_current?: boolean;
}

export interface OrderTracking {
  order_number: string;
  status: OrderStatus;
  progress?: number;
  tracking_number?: string | null;
  carrier?: string | null;
  carrier_tracking_url?: string | null;
  shipped_at?: string | null;
  estimated_delivery_at?: string | null;
  delivered_at?: string | null;
  shipping_city?: string | null;
  shipping_country?: string | null;
  timeline?: OrderTrackingTimelineEntry[];
  history?: OrderTrackingEvent[];
}

export interface OrderItem {
  id: number;
  product_id: number;
  variant_id?: number | null;
  variant_name?: string | null;
  variant_sku?: string | null;
  variant_attributes?: Array<{
    attribute_name?: string | null;
    value: string;
  }>;
  variant_summary?: string | null;
  product_name: string;
  product_sku: string;
  quantity: number;
  price: number;
  total: number;
  product?: Product | null;
  variant?: ProductVariant | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  payment_method: string;
  payment_status: string;
  transaction_id?: string | null;
  shipping_method?: string;
  shipping_method_name?: string;
  coupon_code?: string | null;
  discount_amount: number;
  payment_charge: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shipping_name: string;
  shipping_email: string;
  shipping_phone?: string;
  shipping_address: string;
  shipping_location_text?: string | null;
  shipping_area?: string | null;
  shipping_division_id?: number | null;
  shipping_district_id?: number | null;
  shipping_upazila_id?: number | null;
  shipping_union_id?: number | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_zip?: string | null;
  shipping_country?: string | null;
  shipping_division?: string | null;
  shipping_district?: string | null;
  shipping_upazila?: string | null;
  shipping_union?: string | null;
  notes?: string;
  checkout_fields_payload?: Record<string, string | number | null> | null;
  tracking_number?: string | null;
  carrier?: string | null;
  carrier_tracking_url?: string | null;
  shipped_at?: string | null;
  estimated_delivery_at?: string | null;
  delivered_at?: string | null;
  tracking_progress?: number;
  has_tracking?: boolean;
  tracking_history?: OrderTrackingEvent[];
  items?: OrderItem[];
  payment?: Payment | null;
  payment_url?: string;
  can_be_cancelled: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderSummary {
  id: number;
  order_number: string;
  guest_access_token?: string | null;
  status: OrderStatus;
  payment_status: string;
  payment_method: string;
  total: number;
  payment_url?: string;
}

export type OrderStatus = 
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

// Form data structure for UI
export interface ShippingFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  area: string;
  location_text: string;
  division_id: number;
  district_id: number;
  upazila_id: number;
  union_id: number;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface GuestOrderItemData {
  product_id: number;
  quantity: number;
}

// API request format
export interface CreateOrderData {
  shipping_name?: string;
  shipping_email?: string;
  shipping_phone?: string;
  shipping_address?: string;
  shipping_location_text?: string;
  shipping_area?: string;
  shipping_division_id?: number;
  shipping_district_id?: number;
  shipping_upazila_id?: number;
  shipping_union_id?: number;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  shipping_method: string;
  notes?: string;
  checkout_fields?: Record<string, string | number>;
  use_billing_address?: boolean;
  coupon_code?: string;
  payment_method: string;
  items?: GuestOrderItemData[];
}

