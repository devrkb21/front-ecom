'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useCartStore } from '@/stores';
import { Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading } = useAuthStore();
  const { fetchCart } = useCartStore();
  const redirectParam = searchParams.get('redirect');
  const redirectTo = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
    ? redirectParam
    : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, redirectTo, router]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await login({ email, password });
      toast.success('Welcome back!');

      // Fetch cart after login
      await fetchCart();

      router.replace(redirectTo);
    } catch (error: unknown) {
      console.error('Login error:', error);

      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          setErrors({ general: 'Invalid email or password' });
        } else if (error.response?.data?.message) {
          setErrors({ general: error.response.data.message });
        } else {
          setErrors({ general: 'An error occurred. Please try again.' });
        }
      } else {
        setErrors({ general: 'An error occurred. Please try again.' });
      }
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-16 px-4 bg-gray-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="font-bold text-3xl text-gray-900">Welcome Back</h1>
          <p className="text-gray-500 mt-2">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-md p-8 md:p-10">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 p-4 mb-6">
              <p className="text-red-700 text-sm">{errors.general}</p>
            </div>
          )}

          <div className="space-y-5">
            <Input
              label="Email"
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
              }}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
            />

            <Input
              label="Password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="flex justify-end mt-3">
            <Link
              href="/forgot-password"
              className="text-sm text-gray-500 hover:text-accent-600 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full mt-8"
            size="lg"
            isLoading={isLoading}
          >
            Sign In
          </Button>

          <p className="text-center text-gray-500 mt-8 text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-accent-600 hover:text-accent-600 transition-colors">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
