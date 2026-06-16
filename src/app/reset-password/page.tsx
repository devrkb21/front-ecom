'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { authService } from '@/services/auth.service';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

interface FormErrors {
  password?: string;
  password_confirmation?: string;
  general?: string;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!passwordConfirmation) {
      newErrors.password_confirmation = 'Please confirm your password';
    } else if (password !== passwordConfirmation) {
      newErrors.password_confirmation = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!token || !email) {
      setErrors({ general: 'Invalid or missing reset token. Please request a new password reset link.' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await authService.resetPassword({
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast.success('Password has been reset successfully');
      router.push('/login');
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        if (error.response?.data?.message) {
          setErrors({ general: error.response.data.message });
          toast.error(error.response.data.message);
        } else {
          setErrors({ general: 'An error occurred. Please try again.' });
          toast.error('An error occurred. Please try again.');
        }
      } else {
        setErrors({ general: 'An error occurred. Please try again.' });
        toast.error('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-16 px-4 bg-gray-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="font-bold text-3xl text-gray-900">Reset Password</h1>
          <p className="text-gray-500 mt-2">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-md p-8 md:p-10">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-700 text-sm">{errors.general}</p>
            </div>
          )}

          {(!token || !email) && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-700 text-sm">
                Invalid or missing reset token. Please{' '}
                <Link href="/forgot-password" className="underline hover:text-red-900">
                  request a new password reset link
                </Link>.
              </p>
            </div>
          )}

          <div className="space-y-5">
            <Input
              label="New Password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              placeholder="••••••••"
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              id="password_confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => {
                setPasswordConfirmation(e.target.value);
                if (errors.password_confirmation) setErrors(prev => ({ ...prev, password_confirmation: undefined }));
              }}
              error={errors.password_confirmation}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full mt-8"
            size="lg"
            isLoading={isLoading}
            disabled={!token || !email}
          >
            Reset Password
          </Button>

          <p className="text-center text-gray-500 mt-8 text-sm">
            Remember your password?{' '}
            <Link href="/login" className="text-accent-600 hover:text-accent-700 transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-16 px-4 bg-gray-50">
          <div className="max-w-md w-full text-center">
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
