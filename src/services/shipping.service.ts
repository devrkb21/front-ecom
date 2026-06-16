import { internalGet, internalPost } from './api';
import { ShippingMethod, ShippingCalculation, CalculateShippingData } from '@/types';
import { extractCollection, unwrapEnvelope } from './normalizers';

export interface GetShippingMethodsParams {
  amount?: number;
  item_count?: number;
  weight?: number;
  division_id?: number;
  district_id?: number;
  upazila_id?: number;
  location_text?: string;
}

export const shippingService = {
  async getShippingMethods(params?: GetShippingMethodsParams): Promise<ShippingMethod[]> {
    const searchParams = new URLSearchParams();
    
    // Use typeof check to allow 0 values
    if (typeof params?.amount === 'number') searchParams.append('amount', params.amount.toString());
    if (typeof params?.item_count === 'number') searchParams.append('item_count', params.item_count.toString());
    if (typeof params?.weight === 'number') searchParams.append('weight', params.weight.toString());
    if (typeof params?.division_id === 'number') searchParams.append('division_id', params.division_id.toString());
    if (typeof params?.district_id === 'number') searchParams.append('district_id', params.district_id.toString());
    if (typeof params?.upazila_id === 'number') searchParams.append('upazila_id', params.upazila_id.toString());
    if (params?.location_text) searchParams.append('location_text', params.location_text);
    
    const queryString = searchParams.toString();
    const url = `/shipping-methods${queryString ? `?${queryString}` : ''}`;
    
    const payload = await internalGet<unknown>(url.replace(/^\//, ''));
    return extractCollection<ShippingMethod>(payload);
  },

  async getShippingMethod(code: string): Promise<ShippingMethod> {
    const payload = await internalGet<unknown>(`shipping-methods/${code}`);
    return unwrapEnvelope<ShippingMethod>(payload);
  },

  async calculateShipping(data: CalculateShippingData): Promise<ShippingCalculation> {
    const payload = await internalPost<unknown>('shipping-methods/calculate', data);
    return unwrapEnvelope<ShippingCalculation>(payload);
  },
};

export default shippingService;
