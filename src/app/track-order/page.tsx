'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AxiosError } from 'axios';
import { orderService } from '@/services';
import { OrderTracking, OrderStatus } from '@/types';
import { Badge, Button, LoadingPage } from '@/components/ui';

const ORDER_NUMBER_PATTERN = /^[A-Z0-9][A-Z0-9._-]{2,63}$/;

const orderSteps = [
  { status: 'pending', label: 'Order Placed', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { status: 'processing', label: 'Processing', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  { status: 'shipped', label: 'Shipped', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
  { status: 'delivered', label: 'Delivered', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
];


const getStatusVariant = (status: OrderStatus) => {
  const variants: Record<OrderStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'warning',
    processing: 'info',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'danger',
  };

  return variants[status] || 'default';
};

const getStatusLabel = (status: OrderStatus) => {
  const labels: Record<OrderStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  return labels[status] || status;
};

const normalizeOrderNumber = (value: string): string => value.trim().toUpperCase();


function TrackOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryOrderNumber = useMemo(() => normalizeOrderNumber(searchParams.get('order') ?? ''), [searchParams]);

  const [orderNumber, setOrderNumber] = useState(queryOrderNumber);
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupOrder = useCallback(async (inputValue: string, syncUrl: boolean = true) => {
    const normalizedOrderNumber = normalizeOrderNumber(inputValue);

    if (!normalizedOrderNumber) {
      setOrder(null);
      setError('Please enter an order number.');
      return;
    }

    if (!ORDER_NUMBER_PATTERN.test(normalizedOrderNumber)) {
      setOrder(null);
      setError('Invalid order number format. Use only letters, numbers, dash (-), underscore (_), or dot (.).');
      return;
    }

    setIsLoading(true);
    setError(null);

    if (syncUrl) {
      router.replace(`/track-order?order=${encodeURIComponent(normalizedOrderNumber)}`);
    }

    try {
      const trackedOrder = await orderService.trackOrderByNumber(normalizedOrderNumber);
      setOrder(trackedOrder);
    } catch (lookupError: unknown) {
      setOrder(null);

      if (lookupError instanceof AxiosError) {
        if (lookupError.response?.status === 404) {
          setError('No order found with this order number. Please check and try again.');
        } else if (lookupError.response?.status === 429) {
          setError('Too many attempts. Please wait a minute and try again.');
        } else {
          setError('Unable to fetch order right now. Please try again.');
        }
      } else {
        setError('Unable to fetch order right now. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setOrderNumber(queryOrderNumber);

    if (queryOrderNumber && ORDER_NUMBER_PATTERN.test(queryOrderNumber)) {
      void lookupOrder(queryOrderNumber, false);
    }
  }, [lookupOrder, queryOrderNumber]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await lookupOrder(orderNumber, true);
  };

  const currentStep = order
    ? Math.max(0, orderSteps.findIndex((step) => step.status === order.status))
    : 0;

  const isCancelled = order?.status === 'cancelled';
  const placedDate = order?.timeline?.find((step) => step.status === 'order_placed')?.date ?? null;

  return (
    <div className="container mx-auto px-4 py-12 md:py-20 relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-accent-50/50 to-transparent -z-10 pointer-events-none" />
      <div className="absolute top-10 left-10 w-64 h-64 bg-accent-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob -z-10" />
      <div className="absolute top-10 right-10 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 -z-10" />

      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
            Track Your Order
          </h1>
          <p className="text-lg text-gray-500">
            Enter your order number to get real-time tracking updates and see exactly where your package is.
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 p-6 md:p-8 max-w-3xl mx-auto transform transition-all hover:shadow-2xl hover:shadow-gray-200/50">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 relative">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <input
                type="text"
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value.toUpperCase())}
                placeholder="e.g. INR-0010"
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 pl-12 pr-4 py-4 text-base md:text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-accent-500 focus:ring-4 focus:ring-accent-500/10 transition-all duration-300"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <Button 
              type="submit" 
              className="sm:w-[180px] h-auto py-4 text-base font-semibold rounded-xl shadow-lg shadow-accent-600/30 hover:shadow-accent-600/50 hover:-translate-y-0.5 transition-all duration-300" 
              isLoading={isLoading}
            >
              {isLoading ? 'Searching...' : 'Track Now'}
            </Button>
          </form>
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-50/80 border border-red-100 text-sm text-red-600 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              {error}
            </div>
          )}
        </div>

        {!order && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400 animate-in fade-in duration-700 delay-150">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-lg">Enter your order number to track your package</p>
          </div>
        )}

        {order && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section with modern card design */}
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-50 rounded-bl-full -z-10" />
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <p className="text-sm font-medium text-accent-600 uppercase tracking-wider mb-1">Order Details</p>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">#{order.order_number}</h2>
                    <button className="text-gray-400 hover:text-accent-600 transition-colors" title="Copy Order Number">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-gray-500 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {placedDate && (
                      <p>
                        Placed on {new Date(placedDate).toLocaleDateString('en-US', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <Badge variant={getStatusVariant(order.status)} size="lg" className="px-4 py-1.5 text-sm font-semibold shadow-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      {getStatusLabel(order.status)}
                    </span>
                  </Badge>
                </div>
              </div>
            </div>

            {!isCancelled && (
              <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-6 md:p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                  <svg className="w-6 h-6 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Tracking Progress
                </h3>

                <div className="relative px-4">
                  <div className="absolute top-6 left-10 right-10 h-1 bg-gray-100 rounded-full hidden sm:block">
                    <div
                      className="h-full bg-accent-500 transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(var(--color-accent-500),0.5)]"
                      style={{ width: `${(currentStep / (orderSteps.length - 1)) * 100}%` }}
                    />
                  </div>

                  <div className="relative flex flex-col sm:flex-row justify-between gap-6 sm:gap-0">
                    {orderSteps.map((step, index) => {
                      const isCompleted = index <= currentStep;
                      const isCurrent = index === currentStep;

                      return (
                        <div key={step.status} className="flex sm:flex-col items-center sm:items-center gap-4 sm:gap-3 group">
                          <div
                            className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${
                              isCompleted 
                                ? 'bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/40' 
                                : 'bg-gray-50 text-gray-400 border-2 border-gray-100'
                            } ${isCurrent ? 'ring-4 ring-accent-100 scale-110' : 'group-hover:scale-105'}`}
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                            </svg>
                          </div>
                          <div className="sm:text-center">
                            <p className={`font-semibold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                            {isCurrent && (
                              <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-accent-50 text-accent-700 border border-accent-100">
                                Current Status
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {(order.tracking_number || (order.history?.length ?? 0) > 0) && (
                  <div className="mt-12 pt-8 border-t border-gray-100">
                    <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      Shipping Updates
                    </h4>

                    {order.tracking_number && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Tracking Number:</span> {order.tracking_number}
                      </p>
                    )}

                    {order.carrier && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Carrier:</span> {order.carrier}
                      </p>
                    )}

                    {order.carrier_tracking_url && (
                      <a
                        href={order.carrier_tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-medium text-accent-600 hover:text-accent-700"
                      >
                        Track with carrier
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" />
                        </svg>
                      </a>
                    )}

                    {(order.history?.length ?? 0) > 0 && (
                      <div className="space-y-3">
                        {order.history?.map((event) => (
                          <div key={event.id} className="rounded-md border border-gray-100 p-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <p className="font-medium text-gray-900">{event.status_label || event.status}</p>
                              <p className="text-xs text-gray-500">{event.occurred_at_human || new Date(event.occurred_at).toLocaleString()}</p>
                            </div>
                            {event.description && <p className="text-sm text-gray-600 mt-1">{event.description}</p>}
                            {event.location && <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Location:</span> {event.location}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isCancelled && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="font-semibold text-red-800">Order Cancelled</h3>
                <p className="text-sm text-red-600 mt-1">This order has been cancelled and is no longer being processed.</p>
              </div>
            )}

          </div>
        )}

        <div className="text-center pt-2">
          <Link href="/">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <TrackOrderContent />
    </Suspense>
  );
}
