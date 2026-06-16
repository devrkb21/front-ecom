'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { authService } from '@/services/auth.service';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

interface FormErrors {
  email?: string;
  general?: string;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await authService.forgotPassword(email);
      setIsSubmitted(true);
      toast.success('Password reset link sent to your email');
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
          <h1 className="font-bold text-3xl text-gray-900">Forgot Password</h1>
          <p className="text-gray-500 mt-2">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-8 md:p-10">
          {isSubmitted ? (
            <div className="text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto h-12 w-12 text-accent-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <h2 className="font-bold text-xl text-gray-900 mb-3">Check Your Email</h2>
              <p className="text-gray-500 text-sm mb-8">
                If an account exists for <span className="font-medium text-gray-900">{email}</span>,
                you will receive a password reset link shortly.
              </p>
              <Link
                href="/login"
                className="text-accent-600 hover:text-accent-700 transition-colors text-sm font-medium"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
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
              </div>

              <Button
                type="submit"
                className="w-full mt-8"
                size="lg"
                isLoading={isLoading}
              >
                Send Reset Link
              </Button>

              <p className="text-center text-gray-500 mt-8 text-sm">
                Remember your password?{' '}
                <Link href="/login" className="text-accent-600 hover:text-accent-700 transition-colors">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
