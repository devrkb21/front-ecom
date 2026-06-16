export interface ShippingMethod {
  code: string;
  name: string;
  description: string;
  cost: number;
  formatted_cost: string;
  division_id?: number | null;
  district_id?: number | null;
  upazila_id?: number | null;
  location_text?: string | null;
  location_resolution?: Record<string, unknown> | null;
  delivery_estimate: string;
  min_delivery_days: number;
  max_delivery_days: number;
  free_shipping_threshold: number | null;
  is_free: boolean;
  // Optional fields for detailed endpoint
  base_cost?: number;
  cost_per_item?: number;
  cost_per_kg?: number;
  calculated_cost?: number;
  min_order_amount?: number | null;
  max_order_amount?: number | null;
  max_weight?: number | null;
  allowed_countries?: string[];
  excluded_countries?: string[];
}

export interface ShippingCalculation {
  shipping_method: string;
  division_id?: number | null;
  district_id?: number | null;
  upazila_id?: number | null;
  location_text?: string | null;
  location_resolution?: Record<string, unknown> | null;
  cost: number;
  is_free: boolean;
  free_shipping_threshold: number | null;
  amount_needed_for_free: number | null;
  formatted_cost?: string;
  delivery_estimate: string;
}

export interface CalculateShippingData {
  shipping_method: string;
  amount: number;
  item_count?: number;
  weight?: number;
  division_id?: number;
  district_id?: number;
  upazila_id?: number;
  location_text?: string;
}
