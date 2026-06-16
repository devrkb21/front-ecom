'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { paymentService, getAuthToken } from '@/services';
import { Order } from '@/types';
import { Button, LoadingPage } from '@/components/ui';
import { formatPrice } from '@/utils';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

let stripePromise: Promise<Stripe | null> | null = null;

function CheckoutForm({
  orderId,
  order,
  guestToken,
  canSavePaymentMethod,
  savePaymentMethod,
  onSavePaymentMethodChange,
  onSuccess,
}: {
  orderId: number; 
  order: Order;
  guestToken?: string;
  canSavePaymentMethod: boolean;
  savePaymentMethod: boolean;
  onSavePaymentMethodChange: (value: boolean) => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const successParams = new URLSearchParams({
        order_id: String(orderId),
        order: order.order_number,
      });

      if (guestToken) {
        successParams.set('guest_token', guestToken);
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-received?${successParams.toString()}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        try {
          await paymentService.confirmStripePayment(orderId, paymentIntent.id, {
            guestToken,
            savePaymentMethod: canSavePaymentMethod ? savePaymentMethod : undefined,
          });
          toast.success('Payment successful!');
          onSuccess();
        } catch (confirmError) {
          console.error('Error confirming payment:', confirmError);
          // Payment succeeded on Stripe, redirect to success anyway
          onSuccess();
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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

      {canSavePaymentMethod && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-3">
            <input
              id="save-payment-method"
              type="checkbox"
              checked={savePaymentMethod}
              onChange={(event) => onSavePaymentMethodChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-accent-600 focus:ring-accent-500"
            />
            <label htmlFor="save-payment-method" className="text-sm text-gray-700">
              <span className="block font-semibold text-gray-900">Saved Payment methods</span>
              Save this Stripe card to your account for faster future checkout.
            </label>
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || isProcessing}
        isLoading={isProcessing}
      >
        {isProcessing ? 'Processing...' : `Pay ${formatPrice(order.total)}`}
      </Button>

      <p className="text-xs text-center text-gray-500">
        Your payment is secured by Stripe. We never store your card details.
      </p>
    </form>
  );
}

export default function StripePaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = parseInt(params.orderId as string);
  const guestToken = searchParams.get('guest_token')?.trim() || undefined;
  const isLoggedIn = Boolean(getAuthToken()) && !guestToken;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);

  const initializePayment = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get Stripe config and initialize
      const config = await paymentService.getStripeConfig();
      stripePromise = loadStripe(config.public_key);
      
      // Get order details
      const orderData = await paymentService.getOrderPaymentSummary(orderId, guestToken);
      setOrder(orderData);
      
      // Check if already paid
      if (orderData.payment?.status === 'completed' || orderData.payment_status === 'paid') {
        const alreadyPaidParams = new URLSearchParams({
          order_id: String(orderId),
          order: orderData.order_number,
        });
        if (guestToken) {
          alreadyPaidParams.set('guest_token', guestToken);
        }

        router.push(`/order-received?${alreadyPaidParams.toString()}`);
        return;
      }
      
      // Create payment intent
      const paymentIntent = await paymentService.createStripePaymentIntent(orderId, {
        guestToken,
        savePaymentMethod: isLoggedIn ? savePaymentMethod : undefined,
      });
      setClientSecret(paymentIntent.client_secret);
      
    } catch (err) {
      console.error('Error initializing payment:', err);

      if (err instanceof AxiosError) {
        const status = err.response?.status;

        if (status === 401) {
          setError(guestToken
            ? 'This payment session is no longer valid. Please place the order again.'
            : 'Please sign in to continue Stripe payment for this order.');
          return;
        }

        if (status === 403) {
          setError(guestToken
            ? 'This payment session is invalid for this order.'
            : 'You do not have permission to pay for this order.');
          return;
        }

        if (status === 404) {
          setError('Order not found.');
          return;
        }
      }

      setError('Failed to initialize payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, router, guestToken, isLoggedIn, savePaymentMethod]);

  useEffect(() => {
    if (orderId) {
      const timer = window.setTimeout(() => {
        void initializePayment();
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [orderId, initializePayment]);

  const handleSuccess = () => {
    const successParams = new URLSearchParams({
      order_id: String(orderId),
    });

    const orderNumber = order?.order_number ?? searchParams.get('order_number');
    if (orderNumber) {
      successParams.set('order', orderNumber);
    }

    if (guestToken) {
      successParams.set('guest_token', guestToken);
    }

    router.push(`/order-received?${successParams.toString()}`);
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
          <Button onClick={() => router.push(guestToken ? '/' : '/account/orders')}>
            {guestToken ? 'Continue Shopping' : 'View Orders'}
          </Button>
        </div>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return <LoadingPage />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Payment</h1>
          <p className="text-gray-600 mt-2">
            Order #{order.order_number}
          </p>
        </div>

        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#108474',
                borderRadius: '8px',
              },
            },
          }}
        >
          <CheckoutForm
            orderId={orderId}
            order={order}
            guestToken={guestToken}
            canSavePaymentMethod={isLoggedIn}
            savePaymentMethod={savePaymentMethod}
            onSavePaymentMethodChange={setSavePaymentMethod}
            onSuccess={handleSuccess}
          />
        </Elements>
      </div>
    </div>
  );
}
