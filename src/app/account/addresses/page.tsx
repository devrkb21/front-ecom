'use client';

import { useState, useEffect, useCallback } from 'react';
import { addressService, Address, AddressFormData, BdLocationItem } from '@/services/address.service';
import { Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

interface FormErrors {
  [key: string]: string;
}

const emptyForm: AddressFormData = {
  label: '',
  type: 'both',
  is_default: false,
  name: '',
  phone: '',
  email: '',
  address_line_1: '',
  address_line_2: '',
  division_id: 0,
  district_id: 0,
  upazila_id: 0,
  area: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'Bangladesh',
  instructions: '',
};

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [divisions, setDivisions] = useState<BdLocationItem[]>([]);
  const [districts, setDistricts] = useState<BdLocationItem[]>([]);
  const [upazilas, setUpazilas] = useState<BdLocationItem[]>([]);
  const [unions, setUnions] = useState<BdLocationItem[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AddressFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchAddresses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setError('Failed to load addresses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDivisions = useCallback(async () => {
    try {
      setIsLoadingLocations(true);
      const data = await addressService.getDivisions();
      setDivisions(data);
    } catch (err) {
      console.error('Error fetching divisions:', err);
      toast.error('Failed to load location data');
    } finally {
      setIsLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
    fetchDivisions();
  }, [fetchAddresses, fetchDivisions]);

  useEffect(() => {
    const loadDistricts = async () => {
      if (!showForm || !formData.division_id) {
        setDistricts([]);
        return;
      }

      try {
        const data = await addressService.getDistricts(formData.division_id);
        setDistricts(data);
      } catch (err) {
        console.error('Error fetching districts:', err);
      }
    };

    loadDistricts();
  }, [showForm, formData.division_id]);

  useEffect(() => {
    const loadUpazilas = async () => {
      if (!showForm || !formData.district_id) {
        setUpazilas([]);
        return;
      }

      try {
        const data = await addressService.getUpazilas(formData.district_id);
        setUpazilas(data);
      } catch (err) {
        console.error('Error fetching upazilas:', err);
      }
    };

    loadUpazilas();
  }, [showForm, formData.district_id]);

  useEffect(() => {
    const loadUnions = async () => {
      if (!showForm || !formData.upazila_id) {
        setUnions([]);
        return;
      }

      try {
        const data = await addressService.getUnions(formData.upazila_id);
        setUnions(data);
      } catch (err) {
        console.error('Error fetching unions:', err);
      }
    };

    loadUnions();
  }, [showForm, formData.upazila_id]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormErrors({});
    setDistricts([]);
    setUpazilas([]);
    setUnions([]);
    setShowForm(true);
  };

  const openEditForm = (address: Address) => {
    setEditingId(address.id);
    setFormData({
      label: address.label || '',
      type: address.type,
      is_default: address.is_default,
      name: address.name,
      phone: address.phone,
      email: address.email || '',
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || '',
      division_id: address.division_id,
      district_id: address.district_id,
      upazila_id: address.upazila_id,
      union_id: address.union_id || undefined,
      area: address.area || '',
      city: address.city || '',
      state: address.state || '',
      postal_code: address.postal_code || '',
      country: 'Bangladesh',
      instructions: address.instructions || '',
      latitude: address.latitude || undefined,
      longitude: address.longitude || undefined,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setFormErrors({});
  };

  const handleInputChange = (field: keyof AddressFormData, value: string | boolean | number | undefined) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      // Reset dependent location fields when parent changes
      if (field === 'division_id') {
        next.district_id = 0;
        next.upazila_id = 0;
        next.union_id = undefined;
      }
      if (field === 'district_id') {
        next.upazila_id = 0;
        next.union_id = undefined;
      }
      if (field === 'upazila_id') {
        next.union_id = undefined;
      }

      return next;
    });

    if (formErrors[field as string]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.phone.trim()) errors.phone = 'Phone is required';
    if (!formData.address_line_1.trim()) errors.address_line_1 = 'Address line 1 is required';
    if (!formData.division_id) errors.division_id = 'Division is required';
    if (!formData.district_id) errors.district_id = 'District is required';
    if (!formData.upazila_id) errors.upazila_id = 'Upazila is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);

    try {
      if (editingId) {
        await addressService.updateAddress(editingId, formData);
        toast.success('Address updated successfully');
      } else {
        await addressService.createAddress(formData);
        toast.success('Address added successfully');
      }

      closeForm();
      await fetchAddresses();
    } catch (err: unknown) {
      console.error('Error saving address:', err);

      if (err instanceof AxiosError && err.response?.data?.errors) {
        const apiErrors: FormErrors = {};
        Object.entries(err.response.data.errors).forEach(([key, messages]) => {
          apiErrors[key] = (messages as string[])[0];
        });
        setFormErrors(apiErrors);
      }

      toast.error(editingId ? 'Failed to update address' : 'Failed to add address');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await addressService.deleteAddress(id);
      toast.success('Address deleted successfully');
      setDeletingId(null);
      await fetchAddresses();
    } catch (err) {
      console.error('Error deleting address:', err);
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await addressService.setDefault(id);
      toast.success('Default address updated');
      await fetchAddresses();
    } catch (err) {
      console.error('Error setting default address:', err);
      toast.error('Failed to set default address');
    }
  };

  const getAddressTypeLabel = (type: Address['type']) => {
    if (type === 'both') return 'Shipping + Billing';
    return type === 'shipping' ? 'Shipping' : 'Billing';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Addresses</h1>
          <p className="text-gray-500 mt-1">Manage your shipping and billing addresses</p>
        </div>
        {!showForm && (
          <Button onClick={openCreateForm}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Address
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <p className="text-red-600">{error}</p>
            <button onClick={fetchAddresses} className="ml-auto text-sm font-medium text-red-700 hover:text-red-800 underline">
              Retry
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Address' : 'Add New Address'}</h2>
            <button type="button" onClick={closeForm} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Type *</label>
                <select
                  value={formData.type || 'both'}
                  onChange={(e) => handleInputChange('type', e.target.value as AddressFormData['type'])}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
                >
                  <option value="both">Shipping + Billing</option>
                  <option value="shipping">Shipping Only</option>
                  <option value="billing">Billing Only</option>
                </select>
              </div>

              <Input
                label="Label"
                id="label"
                value={formData.label || ''}
                onChange={(e) => handleInputChange('label', e.target.value)}
                placeholder="Home, Office, etc."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Input
                label="Full Name *"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={formErrors.name}
                placeholder="John Doe"
              />

              <Input
                label="Phone Number *"
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                error={formErrors.phone}
                placeholder="01XXXXXXXXX"
              />
            </div>

            <Input
              label="Email"
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={formErrors.email}
              placeholder="john@example.com"
            />

            <Input
              label="Address Line 1 *"
              id="address_line_1"
              value={formData.address_line_1}
              onChange={(e) => handleInputChange('address_line_1', e.target.value)}
              error={formErrors.address_line_1}
              placeholder="House, Road, Area"
            />

            <Input
              label="Address Line 2"
              id="address_line_2"
              value={formData.address_line_2 || ''}
              onChange={(e) => handleInputChange('address_line_2', e.target.value)}
              error={formErrors.address_line_2}
              placeholder="Apartment, Landmark (optional)"
            />

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Division *</label>
                <select
                  value={formData.division_id || ''}
                  onChange={(e) => handleInputChange('division_id', Number(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
                  disabled={isLoadingLocations}
                >
                  <option value="">Select Division</option>
                  {divisions.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                {formErrors.division_id && <p className="mt-2 text-xs text-red-600">{formErrors.division_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">District *</label>
                <select
                  value={formData.district_id || ''}
                  onChange={(e) => handleInputChange('district_id', Number(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
                  disabled={!formData.division_id}
                >
                  <option value="">Select District</option>
                  {districts.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                {formErrors.district_id && <p className="mt-2 text-xs text-red-600">{formErrors.district_id}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upazila *</label>
                <select
                  value={formData.upazila_id || ''}
                  onChange={(e) => handleInputChange('upazila_id', Number(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
                  disabled={!formData.district_id}
                >
                  <option value="">Select Upazila</option>
                  {upazilas.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                {formErrors.upazila_id && <p className="mt-2 text-xs text-red-600">{formErrors.upazila_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Union (Optional)</label>
                <select
                  value={formData.union_id || ''}
                  onChange={(e) => handleInputChange('union_id', Number(e.target.value) || undefined)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
                  disabled={!formData.upazila_id}
                >
                  <option value="">Select Union</option>
                  {unions.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Input
                label="Area"
                id="area"
                value={formData.area || ''}
                onChange={(e) => handleInputChange('area', e.target.value)}
                placeholder="Local area name"
              />

              <Input
                label="Postal Code"
                id="postal_code"
                value={formData.postal_code || ''}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                error={formErrors.postal_code}
                placeholder="1207"
              />
            </div>

            <Input
              label="Country"
              id="country"
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              readOnly
            />

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.is_default || false}
                onChange={(e) => handleInputChange('is_default', e.target.checked)}
                className="w-4 h-4 rounded border-accent-300 text-accent-600 focus:ring-accent-500"
              />
              <span className="text-sm text-gray-700">Set as default address</span>
            </label>
          </div>

          <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingId ? 'Update Address' : 'Save Address'}
            </Button>
          </div>
        </form>
      )}

      {isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && addresses.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`bg-white rounded-xl shadow-sm p-6 relative ${
                address.is_default ? 'border-2 border-accent-200' : 'border border-gray-100'
              }`}
            >
              <div className="absolute top-4 right-4 flex flex-wrap gap-1.5 justify-end">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {getAddressTypeLabel(address.type)}
                </span>
                {address.is_default && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-800">
                    Default
                  </span>
                )}
              </div>

              <div className="pr-24">
                <h3 className="font-semibold text-gray-900">{address.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{address.phone}</p>
                {address.email && <p className="text-sm text-gray-500">{address.email}</p>}

                <div className="mt-3 text-sm text-gray-600 whitespace-pre-line">
                  {address.formatted_address || address.full_address || address.address_line_1}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100">
                <button onClick={() => openEditForm(address)} className="text-sm font-medium text-accent-600 hover:text-accent-700">
                  Edit
                </button>
                <span className="text-gray-300">|</span>

                {deletingId === address.id ? (
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-red-600">Confirm delete?</span>
                    <button onClick={() => handleDelete(address.id)} className="text-sm font-medium text-red-600 hover:text-red-700">
                      Yes
                    </button>
                    <button onClick={() => setDeletingId(null)} className="text-sm font-medium text-gray-500 hover:text-gray-700">
                      No
                    </button>
                  </span>
                ) : (
                  <button onClick={() => setDeletingId(address.id)} className="text-sm font-medium text-gray-500 hover:text-red-600">
                    Delete
                  </button>
                )}

                {!address.is_default && (
                  <>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="text-sm font-medium text-gray-500 hover:text-accent-600"
                    >
                      Set Default
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {!showForm && (
            <button
              onClick={openCreateForm}
              className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center gap-3 hover:border-accent-300 hover:bg-accent-50/50 transition-colors min-h-[200px]"
            >
              <div className="p-3 rounded-xl bg-gray-100">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="font-medium text-gray-600">Add New Address</span>
            </button>
          )}
        </div>
      )}

      {!isLoading && addresses.length === 0 && !showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500 mb-4">No addresses found</p>
          <Button onClick={openCreateForm}>Add Your First Address</Button>
        </div>
      )}
    </div>
  );
}
