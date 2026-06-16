'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores';
import { authService } from '@/services';
import { Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

interface FormErrors {
  [key: string]: string;
}

export default function AccountSecurityPage() {
  const { user } = useAuthStore();
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [passwords, setPasswords] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
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
    
    if (!passwords.current_password) {
      newErrors.current_password = 'Current password is required';
    }
    if (!passwords.password) {
      newErrors.password = 'New password is required';
    } else if (passwords.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (passwords.password !== passwords.password_confirmation) {
      newErrors.password_confirmation = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await authService.updatePassword(passwords);
      setIsChangingPassword(false);
      setPasswords({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
      toast.success('Password updated successfully');
    } catch (error: unknown) {
      console.error('Error updating password:', error);
      
      if (error instanceof AxiosError && error.response?.data?.errors) {
        const apiErrors: FormErrors = {};
        Object.entries(error.response.data.errors).forEach(([key, messages]) => {
          apiErrors[key] = (messages as string[])[0];
        });
        setErrors(apiErrors);
      } else if (error instanceof AxiosError && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to update password');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security</h1>
        <p className="text-gray-500 mt-1">Manage your account security settings</p>
      </div>

      {/* Account Security Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Overview</h2>
        
        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-white shadow-sm">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Email Address</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          </div>

          {/* Password */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-white shadow-sm">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Password</p>
                <p className="text-sm text-gray-500">••••••••••••</p>
              </div>
            </div>
            <button
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className="text-sm font-medium text-accent-600 hover:text-accent-700"
            >
              {isChangingPassword ? 'Cancel' : 'Change'}
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Form */}
      {isChangingPassword && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent-50">
              <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
          </div>
          
          <div className="space-y-4 max-w-md">
            <Input
              label="Current Password"
              id="current_password"
              type="password"
              value={passwords.current_password}
              onChange={(e) => handleInputChange('current_password', e.target.value)}
              error={errors.current_password}
              placeholder="Enter your current password"
            />
            
            <Input
              label="New Password"
              id="password"
              type="password"
              value={passwords.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              error={errors.password}
              placeholder="Enter new password"
            />
            
            <Input
              label="Confirm New Password"
              id="password_confirmation"
              type="password"
              value={passwords.password_confirmation}
              onChange={(e) => handleInputChange('password_confirmation', e.target.value)}
              error={errors.password_confirmation}
              placeholder="Confirm new password"
            />
          </div>

          <div className="flex gap-4 mt-6 pt-6 border-t border-gray-100">
            <Button type="submit" isLoading={isSaving}>
              Update Password
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsChangingPassword(false);
                setPasswords({
                  current_password: '',
                  password: '',
                  password_confirmation: '',
                });
                setErrors({});
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Security Tips */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Tips</h2>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-1 rounded bg-green-100 mt-0.5">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Use a strong password</p>
              <p className="text-sm text-gray-500">Mix uppercase, lowercase, numbers, and symbols</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-1 rounded bg-green-100 mt-0.5">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Don&apos;t reuse passwords</p>
              <p className="text-sm text-gray-500">Use unique passwords for each account</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-1 rounded bg-green-100 mt-0.5">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Update regularly</p>
              <p className="text-sm text-gray-500">Change your password every few months</p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <Button variant="danger" disabled>
          Delete Account
        </Button>
      </div>
    </div>
  );
}
