'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { paymentService } from '@/services';
import { Order } from '@/types';
import { Button, LoadingPage } from '@/components/ui';
import { formatPrice } from '@/utils';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

export default function BkashPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params.orderId ? parseInt(params.orderId as string) : NaN;
  const guestToken = searchParams.get('guest_token')?.trim() || undefined;
  const isGuestCheckout = Boolean(guestToken);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializePayment = useCallback(async () => {
    if (isNaN(orderId)) {
      setError('Invalid order ID');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get order details
      const orderData = await paymentService.getOrderPaymentSummary(orderId, guestToken);
      setOrder(orderData);
      
      // Check if already paid
      if (orderData.payment?.status === 'completed' || orderData.payment_status === 'paid') {
        router.push(`/order-received?order_id=${orderId}`);
        return;
      }
      
    } catch (err) {
      console.error('Error initializing payment:', err);

      if (err instanceof AxiosError) {
        const status = err.response?.status;

        if (status === 401) {
          setError(isGuestCheckout
            ? 'This payment session is no longer valid. Please place the order again.'
            : 'Please sign in to continue bKash payment for this order.');
          return;
        }

        if (status === 403) {
          setError('You do not have permission to access this order.');
          return;
        }

        if (status === 404) {
          setError('Order not found.');
          return;
        }
      }

      setError('Failed to load order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, router, guestToken, isGuestCheckout]);

  useEffect(() => {
    if (!isNaN(orderId)) {
      const timer = window.setTimeout(() => {
        void initializePayment();
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [orderId, initializePayment]);

  const handlePayWithBkash = async () => {
    if (!order || isNaN(orderId)) return;
    
    setIsRedirecting(true);
    try {
      const bkashPayment = await paymentService.createBkashPayment(orderId, guestToken);
      
      // Redirect to bKash
      window.location.href = bkashPayment.bkash_url;
    } catch (err) {
      console.error('Error creating bKash payment:', err);

      if (err instanceof AxiosError) {
        const status = err.response?.status;
        if (status === 401) {
          toast.error(isGuestCheckout
            ? 'This payment session is no longer valid. Please place the order again.'
            : 'Please sign in to continue bKash payment.');
          if (!isGuestCheckout) {
            router.push(`/login?redirect=/payment/bkash/${orderId}`);
          }
          setIsRedirecting(false);
          return;
        }

          if (status === 403) {
            toast.error(isGuestCheckout
              ? 'This payment session is invalid for this order.'
              : 'You do not have permission to pay for this order.');
          setIsRedirecting(false);
          return;
        }
      }

      toast.error('Failed to initiate bKash payment. Please try again.');
      setIsRedirecting(false);
    }
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Order not found'}</p>
          <Button onClick={() => router.push(isGuestCheckout ? '/' : '/account/orders')}>
            {isGuestCheckout ? 'Continue Shopping' : 'View Orders'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Pay with bKash</h1>
          <p className="text-gray-600 mt-2">
            Order #{order.order_number}
          </p>
        </div>

        {/* bKash Info Card */}
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-6 text-white mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">bKash Payment</h2>
              <p className="text-pink-100 text-sm">Mobile Financial Service</p>
            </div>
          </div>
          <p className="text-pink-100 text-sm">
            You will be redirected to bKash to complete your payment securely.
          </p>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-medium text-gray-900 mb-4">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Order Number</span>
              <span className="font-medium">#{order.order_number}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</span>
            </div>
            {order.payment_charge > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Gateway Charge</span>
                <span>{formatPrice(order.payment_charge)}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How it works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the button below to go to bKash</li>
                <li>Log in to your bKash account</li>
                <li>Confirm the payment</li>
                <li>You&apos;ll be redirected back automatically</li>
              </ol>
            </div>
          </div>
        </div>

        <Button
          onClick={handlePayWithBkash}
          className="w-full bg-pink-500 hover:bg-pink-600"
          size="lg"
          isLoading={isRedirecting}
        >
          {isRedirecting ? 'Redirecting to bKash...' : `Pay ${formatPrice(order.total)} with bKash`}
        </Button>

        <button
          onClick={() => router.push(isGuestCheckout ? '/' : `/account/orders/${orderId}`)}
          className="w-full mt-4 text-gray-600 hover:text-gray-800 text-sm"
        >
          {isGuestCheckout ? 'Cancel and return to home' : 'Cancel and return to order'}
        </button>
      </div>
    </div>
  );
}
