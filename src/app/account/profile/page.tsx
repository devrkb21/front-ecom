'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores';
import { authService } from '@/services';
import { ProfileUpdateData } from '@/types';
import { Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

interface FormErrors {
  [key: string]: string;
}

export default function AccountProfilePage() {
  const { user, fetchUser } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [profile, setProfile] = useState<ProfileUpdateData>({
    name: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const userData = await authService.getProfile();
        setProfile({
          name: userData.name || '',
          phone: userData.phone || '',
          address: userData.address || '',
        });
      } catch (err) {
        console.error('Error loading profile:', err);
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleInputChange = (field: keyof ProfileUpdateData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!profile.name?.trim()) {
      newErrors.name = 'Name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      await authService.updateProfile(profile);
      await fetchUser();
      toast.success('Profile updated successfully');
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      
      if (error instanceof AxiosError && error.response?.data?.errors) {
        const apiErrors: FormErrors = {};
        Object.entries(error.response.data.errors).forEach(([key, messages]) => {
          apiErrors[key] = (messages as string[])[0];
        });
        setErrors(apiErrors);
      }
      
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate profile completion
  const profileFields: (keyof ProfileUpdateData)[] = ['name', 'phone', 'address'];
  const filledFields = profileFields.filter(field => profile[field as keyof ProfileUpdateData]?.trim());
  const completionPercent = Math.round((filledFields.length / profileFields.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account information</p>
      </div>

      {/* Profile Completion Card */}
      {completionPercent < 100 && (
        <div className="bg-gradient-to-r from-accent-50 to-accent-100 rounded-xl p-6 border border-accent-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-accent-900">Complete Your Profile</h3>
              <p className="text-sm text-accent-700">Add more details for faster checkout</p>
            </div>
            <div className="text-2xl font-bold text-accent-600">{completionPercent}%</div>
          </div>
          <div className="w-full bg-accent-200 rounded-full h-2">
            <div
              className="bg-accent-600 rounded-full h-2 transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Account Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Account Overview</h2>
        
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-3xl">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900">{user?.name}</h3>
            <p className="text-gray-500">{user?.email}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                Verified Account
              </span>
              <span className="text-sm text-gray-400">
                Member since {new Date(user?.created_at || '').toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent-50">
              <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
          </div>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <Input
                label="Full Name"
                id="name"
                value={profile.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={errors.name}
                placeholder="John Doe"
                required
              />
              
              <Input
                label="Phone Number"
                id="phone"
                type="tel"
                value={profile.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                error={errors.phone}
                placeholder="+1 (234) 567-8900"
              />
            </div>
          )}
        </div>

        {/* Basic Address */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-50">
                <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Basic Address</h2>
                <p className="text-sm text-gray-500">Detailed shipping addresses are managed in your address book.</p>
              </div>
            </div>
            <Link href="/account/addresses">
              <Button type="button" variant="outline" size="sm">
                Manage Addresses
              </Button>
            </Link>
          </div>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <Input
                label="Default Address"
                id="address"
                value={profile.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                error={errors.address}
                placeholder="House, road, area"
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
