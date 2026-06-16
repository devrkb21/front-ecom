'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useCartStore } from '@/stores';
import { Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
  general?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading } = useAuthStore();
  const { fetchCart } = useCartStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

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

    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      toast.success('Account created successfully!');

      // Fetch cart after registration
      await fetchCart();

      router.push('/');
    } catch (error: unknown) {
      console.error('Registration error:', error);

      if (error instanceof AxiosError && error.response?.data?.errors) {
        const apiErrors: FormErrors = {};
        const responseErrors = error.response.data.errors;

        if (responseErrors.name) apiErrors.name = responseErrors.name[0];
        if (responseErrors.email) apiErrors.email = responseErrors.email[0];
        if (responseErrors.password) apiErrors.password = responseErrors.password[0];

        setErrors(apiErrors);
      } else if (error instanceof AxiosError && error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
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
          <h1 className="font-bold text-3xl text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-2">Join us and discover timeless elegance</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-md p-8 md:p-10">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 p-4 mb-6">
              <p className="text-red-700 text-sm">{errors.general}</p>
            </div>
          )}

          <div className="space-y-5">
            <Input
              label="Full Name"
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
              }}
              error={errors.name}
              placeholder="Your full name"
              autoComplete="name"
            />

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
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              id="password_confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => {
                setPasswordConfirmation(e.target.value);
                if (errors.password_confirmation) {
                  setErrors(prev => ({ ...prev, password_confirmation: undefined }));
                }
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
          >
            Create Account
          </Button>

          <p className="text-center text-gray-500 mt-8 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-accent-600 hover:text-accent-600 transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
