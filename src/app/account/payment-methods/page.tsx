'use client';

import { useCallback, useEffect, useState } from 'react';
import { paymentService } from '@/services';
import { SavedPaymentMethod } from '@/types';
import { Button, LoadingPage } from '@/components/ui';
import toast from 'react-hot-toast';

const formatCardBrand = (brand: string | null): string => {
  if (!brand) {
    return 'Card';
  }

  return brand
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatExpiry = (month: number | null, year: number | null): string => {
  if (!month || !year) {
    return 'N/A';
  }

  return `${String(month).padStart(2, '0')}/${year}`;
};

export default function AccountSavedPaymentMethodsPage() {
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMethodId, setActiveMethodId] = useState<number | null>(null);

  const fetchMethods = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await paymentService.getSavedPaymentMethods();
      setMethods(data);
    } catch (err) {
      console.error('Failed to load saved payment methods:', err);
      setError('Failed to load Saved Payment methods. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchMethods();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchMethods]);

  const handleSetDefault = async (methodId: number) => {
    try {
      setActiveMethodId(methodId);
      await paymentService.setDefaultSavedPaymentMethod(methodId);
      toast.success('Default saved payment method updated.');
      await fetchMethods();
    } catch (err) {
      console.error('Failed to set default saved payment method:', err);
      toast.error('Failed to update default method.');
    } finally {
      setActiveMethodId(null);
    }
  };

  const handleRemove = async (methodId: number) => {
    if (!confirm('Remove this saved payment method?')) {
      return;
    }

    try {
      setActiveMethodId(methodId);
      await paymentService.removeSavedPaymentMethod(methodId);
      toast.success('Saved payment method removed.');
      await fetchMethods();
    } catch (err) {
      console.error('Failed to remove saved payment method:', err);
      toast.error('Failed to remove saved payment method.');
    } finally {
      setActiveMethodId(null);
    }
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Saved Payment methods</h1>
        <p className="text-gray-500 mt-1">
          Manage your saved Stripe cards for faster checkout.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchMethods}
              className="ml-auto text-sm font-medium text-red-700 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {methods.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="inline-flex p-4 rounded-full bg-gray-100 mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M6 4h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">No saved payment methods yet</h2>
          <p className="text-gray-500 mt-2">
            During Stripe checkout, enable the Saved Payment methods option to keep your card for future use.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {methods.map((method) => (
            <div key={method.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {formatCardBrand(method.card_brand)} ending in {method.card_last_four ?? '----'}
                    </h2>
                    {method.is_default && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Expires {formatExpiry(method.card_exp_month, method.card_exp_year)}
                    {method.cardholder_name ? ` · ${method.cardholder_name}` : ''}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {method.last_used_at
                      ? `Last used ${new Date(method.last_used_at).toLocaleDateString()}`
                      : 'Not used yet'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {!method.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                      isLoading={activeMethodId === method.id}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemove(method.id)}
                    isLoading={activeMethodId === method.id}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
