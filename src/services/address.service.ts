import api, { internalGet } from './api';
import { ResourceCollectionResponse } from '@/types';
import { extractCollection, unwrapEnvelope } from './normalizers';
import { isAxiosError } from 'axios';

export interface Address {
  id: number;
  label?: string | null;
  type: 'shipping' | 'billing' | 'both';
  is_default: boolean;
  name: string;
  phone: string;
  email?: string | null;
  address_line_1: string;
  address_line_2?: string | null;
  division_id: number;
  district_id: number;
  upazila_id: number;
  union_id?: number | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country: string;
  instructions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  full_address?: string;
  formatted_address?: string;
  division?: { id: number; name: string; bn_name?: string | null } | null;
  district?: { id: number; name: string; bn_name?: string | null } | null;
  upazila?: { id: number; name: string; bn_name?: string | null } | null;
  union?: { id: number; name: string; bn_name?: string | null } | null;
  created_at: string;
  updated_at: string;
}

export interface AddressFormData {
  label?: string;
  type?: 'shipping' | 'billing' | 'both';
  is_default?: boolean;
  name: string;
  phone: string;
  email?: string;
  address_line_1: string;
  address_line_2?: string;
  division_id: number;
  district_id: number;
  upazila_id: number;
  union_id?: number;
  area?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  instructions?: string;
  latitude?: number;
  longitude?: number;
}

export interface BdLocationItem {
  id: number;
  name: string;
  bn_name?: string | null;
  division_id?: number;
  district_id?: number;
  upazila_id?: number;
}

export const addressService = {
  async getAddresses(): Promise<Address[]> {
    const response = await api.get<ResourceCollectionResponse<Address>>('/addresses');
    return response.data.data;
  },

  async createAddress(data: AddressFormData): Promise<Address> {
    const response = await api.post('/addresses', data);
    return unwrapEnvelope<Address>(response.data);
  },

  async updateAddress(id: number, data: AddressFormData): Promise<Address> {
    const response = await api.put(`/addresses/${id}`, data);
    return unwrapEnvelope<Address>(response.data);
  },

  async deleteAddress(id: number): Promise<void> {
    await api.delete(`/addresses/${id}`);
  },

  async setDefault(id: number): Promise<void> {
    await api.post(`/addresses/${id}/set-default`);
  },

  async getDefaultShippingAddress(): Promise<Address | null> {
    try {
      const response = await api.get('/addresses/default/shipping');
      return unwrapEnvelope<Address>(response.data);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw error;
    }
  },

  async getDefaultBillingAddress(): Promise<Address | null> {
    try {
      const response = await api.get('/addresses/default/billing');
      return unwrapEnvelope<Address>(response.data);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw error;
    }
  },

  async getDivisions(): Promise<BdLocationItem[]> {
    const payload = await internalGet<unknown>('locations/bd/divisions');
    return extractCollection<BdLocationItem>(payload);
  },

  async getDistricts(divisionId?: number): Promise<BdLocationItem[]> {
    const payload = await internalGet<unknown>('locations/bd/districts', {
      params: typeof divisionId === 'number' ? { division_id: divisionId } : undefined,
    });
    return extractCollection<BdLocationItem>(payload);
  },

  async getUpazilas(districtId?: number): Promise<BdLocationItem[]> {
    const payload = await internalGet<unknown>('locations/bd/upazilas', {
      params: typeof districtId === 'number' ? { district_id: districtId } : undefined,
    });
    return extractCollection<BdLocationItem>(payload);
  },

  async getUnions(upazilaId?: number): Promise<BdLocationItem[]> {
    const payload = await internalGet<unknown>('locations/bd/unions', {
      params: typeof upazilaId === 'number' ? { upazila_id: upazilaId } : undefined,
    });
    return extractCollection<BdLocationItem>(payload);
  },
};

export default addressService;
