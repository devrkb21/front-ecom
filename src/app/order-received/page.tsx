'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { orderService, paymentService, getAuthToken } from '@/services';
import { useCartStore } from '@/stores';
import { Order, OrderSummary } from '@/types';
import { Button, LoadingPage } from '@/components/ui';
import { formatPrice, trackPurchase } from '@/utils';


function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const orderNumber = searchParams.get('order');
  const guestToken = searchParams.get('guest_token')?.trim() || undefined;
  const canViewAccountOrder = Boolean(getAuthToken()) && !guestToken;
  const { clearCart } = useCartStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId && !orderNumber) {
        router.push('/');
        return;
      }

      try {
        if (orderId) {
          const orderData = await paymentService.getOrderPaymentSummary(parseInt(orderId, 10), guestToken);
          setOrder(orderData);
        } else if (orderNumber) {
          const summary = await orderService.getOrderByNumber(orderNumber, guestToken ? { guestToken } : undefined);
          setOrderSummary(summary);
        }

        await clearCart();
      } catch (error) {
        console.error('Error fetching payment success order data:', error);

        if (orderNumber) {
          try {
            const summary = await orderService.getOrderByNumber(orderNumber, guestToken ? { guestToken } : undefined);
            setOrderSummary(summary);
            await clearCart();
            return;
          } catch (summaryError) {
            console.error('Error fetching order summary fallback:', summaryError);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, orderNumber, guestToken, router, clearCart]);

  const hasTrackedPurchaseRef = useRef(false);

  useEffect(() => {
    if (!isLoading && (order || orderSummary) && !hasTrackedPurchaseRef.current) {
      hasTrackedPurchaseRef.current = true;
      
      const trackingItems = order?.items?.map((item) => ({
        item_id: String(item.product_id),
        item_name: item.product_name,
        price: item.price,
        quantity: item.quantity,
        item_variant: item.variant_summary || undefined,
      })) || [];

      const resolvedTotal = order?.total ?? orderSummary?.total ?? 0;
      const resolvedOrderNumber = order?.order_number ?? orderSummary?.order_number ?? 'N/A';

      trackPurchase({
        items: trackingItems,
        currency: 'BDT',
        value: resolvedTotal,
        transaction_id: resolvedOrderNumber,
      });
    }
  }, [isLoading, order, orderSummary]);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!order && !orderSummary) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <Link href="/">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  const resolvedOrderNumber = order?.order_number ?? orderSummary?.order_number ?? 'N/A';
  const resolvedTotal = order?.total ?? orderSummary?.total ?? 0;
  const paymentStatus = order?.payment_status ?? orderSummary?.payment_status ?? 'pending';
  const isPaid = (order?.payment?.status === 'completed' || paymentStatus === 'paid');
  const resolvedOrderId = order?.id ?? orderSummary?.id;
  const shippingAddress = (order?.shipping_address ?? '').trim();
  const shippingLocationText = (order?.shipping_location_text ?? '').trim();
  const shippingArea = (order?.shipping_area ?? '').trim();
  const shippingCountry = (order?.shipping_country ?? '').trim();
  const shouldShowLocationText = shippingLocationText !== '' && shippingLocationText !== shippingAddress;
  const locationHierarchy = [order?.shipping_union, order?.shipping_upazila, order?.shipping_district, order?.shipping_division]
    .map((part) => (part ?? '').trim())
    .filter((part) => part !== '')
    .join(', ');
  const cityStateZip = [order?.shipping_city, order?.shipping_state, order?.shipping_zip]
    .map((part) => (part ?? '').trim())
    .filter((part) => part !== '')
    .join(', ');
  const canShowCustomerDetails = Boolean(order && canViewAccountOrder);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className={`w-20 h-20 ${isPaid ? 'bg-green-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
          {isPaid ? (
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {isPaid ? 'Payment Successful!' : 'Order Placed!'}
        </h1>
        
        <p className="text-gray-600 mb-2">
          {isPaid 
            ? 'Thank you for your payment. Your order is being processed.' 
            : 'Thank you for your order. Payment is being processed.'
          }
        </p>
        
        <p className="text-gray-600 mb-2">Your order number is:</p>
        <p className="text-2xl font-bold text-accent-600 mb-6">
          #{resolvedOrderNumber}
        </p>

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-left mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
          
          {order ? (
            <div className="space-y-3 text-sm">
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
              {order.shipping_method && (
                <div className="flex justify-between text-gray-600">
                  <span>Shipping Method</span>
                  <span className="capitalize">{order.shipping_method_name || order.shipping_method.replace(/_/g, ' ')}</span>
                </div>
              )}
              {order.payment_charge > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Gateway Charge</span>
                  <span>{formatPrice(order.payment_charge)}</span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span>{formatPrice(resolvedTotal)}</span>
              </div>
            </div>
          )}

          {/* Payment Status */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Payment Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isPaid 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {isPaid ? 'Paid' : 'Pending'}
              </span>
            </div>
          </div>

          {canShowCustomerDetails && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Shipping Details</h3>
              <div className="space-y-1 text-sm text-gray-600">
                {order?.shipping_name && <p className="font-medium text-gray-900">{order.shipping_name}</p>}
                {order?.shipping_email && <p>{order.shipping_email}</p>}
                {order?.shipping_phone && <p>{order.shipping_phone}</p>}
                {shippingAddress && <p>{shippingAddress}</p>}
                {shouldShowLocationText && (
                  <p>
                    <span className="font-medium text-gray-700">Location:</span> {shippingLocationText}
                  </p>
                )}
                {shippingArea && (
                  <p>
                    <span className="font-medium text-gray-700">Area:</span> {shippingArea}
                  </p>
                )}
                {locationHierarchy && (
                  <p>
                    <span className="font-medium text-gray-700">Division chain:</span> {locationHierarchy}
                  </p>
                )}
                {cityStateZip && <p>{cityStateZip}</p>}
                {shippingCountry && <p>{shippingCountry}</p>}
              </div>
            </div>
          )}
        </div>

        {canShowCustomerDetails && order?.shipping_email ? (
          <p className="text-gray-600 mb-8">
            We&apos;ve sent a confirmation email to <strong>{order.shipping_email}</strong>
          </p>
        ) : (
          <p className="text-gray-600 mb-8">
            Keep your order number for tracking and support.
          </p>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {canViewAccountOrder && resolvedOrderId ? (
            <Link href={`/account/orders/${resolvedOrderId}`}>
              <Button variant="outline">View Order Details</Button>
            </Link>
          ) : null}
          <Link href={`/track-order?order=${resolvedOrderNumber}`}>
            <Button variant="outline">Track Order</Button>
          </Link>
          <Link href="/">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
