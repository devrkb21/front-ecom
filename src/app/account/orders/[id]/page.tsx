'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Order, OrderItem, OrderStatus } from '@/types';
import { orderService } from '@/services';
import { Button, Badge, EmptyState, LoadingPage } from '@/components/ui';
import { formatPrice } from '@/utils';
import toast from 'react-hot-toast';

type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';


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

const getPaymentStatusVariant = (status: PaymentStatus) => {
  const variants: Record<PaymentStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'warning',
    completed: 'success',
    failed: 'danger',
    refunded: 'info',
  };
  return variants[status] || 'default';
};

const getPaymentStatusLabel = (status: PaymentStatus) => {
  const labels: Record<PaymentStatus, string> = {
    pending: 'Payment Pending',
    completed: 'Paid',
    failed: 'Payment Failed',
    refunded: 'Refunded',
  };
  return labels[status] || status;
};

const getOrderItemProductHref = (item: OrderItem): string => {
  const productSlug = (item.product?.slug || '').trim();
  return productSlug ? `/products/${productSlug}` : '';
};

const getOrderItemVariantSummary = (item: OrderItem): string => {
  const summaryFromApi = (item.variant_summary || '').trim();
  if (summaryFromApi) {
    return summaryFromApi;
  }

  const snapshotAttributes = (item.variant_attributes || [])
    .map((attribute) => {
      const attributeName = (attribute.attribute_name || '').trim();
      const value = (attribute.value || '').trim();

      if (!value) {
        return '';
      }

      return attributeName ? `${attributeName}: ${value}` : value;
    })
    .filter((value) => value.length > 0)
    .join(', ');

  const relationAttributes = (item.variant?.attributes || [])
    .map((attribute) => {
      const attributeName = (attribute.attribute_name || '').trim();
      const value = (attribute.value || '').trim();

      if (!value) {
        return '';
      }

      return attributeName ? `${attributeName}: ${value}` : value;
    })
    .filter((value) => value.length > 0)
    .join(', ');

  const variantName = (item.variant_name || item.variant?.name || '').trim();
  const variantSku = (item.variant_sku || item.variant?.sku || '').trim();
  const productSku = (item.product_sku || '').trim();

  const parts: string[] = [];
  if (snapshotAttributes) {
    parts.push(snapshotAttributes);
  } else if (relationAttributes) {
    parts.push(relationAttributes);
  } else if (variantName) {
    parts.push(variantName);
  } else if (item.variant_id) {
    parts.push(`Variant #${item.variant_id}`);
  }

  if (variantSku && variantSku !== productSku) {
    parts.push(`Variant SKU: ${variantSku}`);
  }

  return parts.join(' | ');
};

export default function AccountOrderDetailsPage() {
  const params = useParams();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      
      try {
        setIsLoading(true);
        const data = await orderService.getOrder(parseInt(orderId));
        setOrder(data);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Order not found');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!order || !confirm('Are you sure you want to cancel this order?')) return;
    
    setIsCancelling(true);
    try {
      const updatedOrder = await orderService.cancelOrder(order.id);
      setOrder(updatedOrder);
      toast.success('Order cancelled successfully');
    } catch (err) {
      console.error('Error cancelling order:', err);
      toast.error('Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  const getCurrentStep = (status: OrderStatus) => {
    const statusIndex = orderSteps.findIndex(step => step.status === status);
    return statusIndex >= 0 ? statusIndex : 0;
  };

  if (error) {
    return (
      <EmptyState
        icon={
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title="Order not found"
        description="The order you're looking for doesn't exist."
        action={
          <Link href="/account/orders">
            <Button>View All Orders</Button>
          </Link>
        }
      />
    );
  }

  if (isLoading || !order) {
    return <LoadingPage />;
  }

  const currentStep = getCurrentStep(order.status);
  const isCancelled = order.status === 'cancelled';
  const locationHierarchy = [order.shipping_union, order.shipping_upazila, order.shipping_district, order.shipping_division]
    .map((part) => (part ?? '').trim())
    .filter((part) => part !== '')
    .join(', ');

  const cityStateZip = [order.shipping_city, order.shipping_state, order.shipping_zip]
    .map((part) => (part ?? '').trim())
    .filter((part) => part !== '')
    .join(', ');

  const shippingAddress = (order.shipping_address ?? '').trim();
  const shippingLocationText = (order.shipping_location_text ?? '').trim();
  const shippingArea = (order.shipping_area ?? '').trim();
  const shippingCountry = (order.shipping_country ?? '').trim();
  const shouldShowLocationText = shippingLocationText !== '' && shippingLocationText !== shippingAddress;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/account/orders"
            className="inline-flex items-center text-sm text-gray-500 hover:text-accent-600 mb-2"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Order #{order.order_number}
          </h1>
          <p className="text-gray-500 mt-1">
            Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(order.status)} size="lg">
            {getStatusLabel(order.status)}
          </Badge>
          {order.payment && (
            <Badge variant={getPaymentStatusVariant(order.payment.status)} size="lg">
              {getPaymentStatusLabel(order.payment.status)}
            </Badge>
          )}
        </div>
      </div>

      {/* Order Tracking */}
      {!isCancelled && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Tracking</h2>

          <div className="relative">
            <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200 hidden sm:block">
              <div
                className="h-full bg-accent-600 transition-all duration-500"
                style={{ width: `${(currentStep / (orderSteps.length - 1)) * 100}%` }}
              />
            </div>

            {/* Steps */}
            <div className="relative flex flex-col sm:flex-row justify-between gap-4 sm:gap-0">
              {orderSteps.map((step, index) => {
                const isCompleted = index <= currentStep;
                const isCurrent = index === currentStep;
                
                return (
                  <div key={step.status} className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2">
                    <div
                      className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-accent-600 text-white'
                          : 'bg-gray-100 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-accent-100' : ''}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                      </svg>
                    </div>
                    <div className="sm:text-center">
                      <p className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-accent-600 font-medium">Current</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cancelled Notice */}
      {isCancelled && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-100">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Order Cancelled</h3>
              <p className="text-sm text-red-600">This order has been cancelled and will not be processed.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Order Items ({order.items?.length || 0})
              </h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {(order.items || []).map((item) => {
                const variantSummary = getOrderItemVariantSummary(item);
                const productHref = getOrderItemProductHref(item);

                return (
                  <div key={item.id} className="flex items-center gap-4 p-4">
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      {productHref ? (
                        <Link href={productHref} className="font-medium text-gray-900 hover:text-accent-600 hover:underline">
                          {item.product_name}
                        </Link>
                      ) : (
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                      )}
                      {variantSummary && <p className="text-xs text-gray-500 mt-0.5">{variantSummary}</p>}
                      <p className="text-sm text-gray-500">SKU: {item.product_sku}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-600">
                          {formatPrice(item.price)} × {item.quantity}
                        </span>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900 text-right">
                      {formatPrice(item.total)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gray-100">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Shipping Address</h2>
            </div>
            <div className="text-gray-600 pl-11">
              {order.shipping_name && (
                <p className="font-medium text-gray-900">{order.shipping_name}</p>
              )}
              {order.shipping_email && <p>{order.shipping_email}</p>}
              {order.shipping_phone && <p>{order.shipping_phone}</p>}
              {shippingAddress && <p className="mt-2">{shippingAddress}</p>}
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

          {order.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gray-100">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Order Notes</h2>
              </div>
              <p className="text-gray-600 pl-11">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="space-y-3">
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
              <div className="flex justify-between text-gray-600">
                <span>Payment Method</span>
                <span className="capitalize">{order.payment_method.replace(/_/g, ' ')}</span>
              </div>
              {order.coupon_code && (
                <div className="flex justify-between text-gray-600">
                  <span>Coupon</span>
                  <span className="font-medium text-green-700">{order.coupon_code}</span>
                </div>
              )}
                {order.payment_charge > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Gateway Charge</span>
                    <span>{formatPrice(order.payment_charge)}</span>
                  </div>
                )}
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            {order.payment && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="font-medium text-gray-900 mb-3">Payment Method</h3>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 capitalize">
                      {order.payment.payment_method.replace('_', ' ')}
                    </p>
                    {order.payment.paid_at && (
                      <p className="text-sm text-gray-500">
                        Paid on {new Date(order.payment.paid_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              {order.payment?.status === 'pending' && (
                <>
                  {order.payment.payment_method === 'stripe' ? (
                    <Link href={`/payment/stripe/${order.id}`}>
                      <Button className="w-full">
                        Complete Payment
                      </Button>
                    </Link>
                  ) : order.payment.payment_method === 'bkash' ? (
                    <Link href={`/payment/bkash/${order.id}`}>
                      <Button className="w-full bg-pink-500 hover:bg-pink-600">
                        Pay with bKash
                      </Button>
                    </Link>
                  ) : order.payment_url ? (
                    <a href={order.payment_url} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full">
                        Complete Payment
                      </Button>
                    </a>
                  ) : null}
                </>
              )}
              
              {order.can_be_cancelled && (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={handleCancelOrder}
                  isLoading={isCancelling}
                >
                  Cancel Order
                </Button>
              )}

              <Link href="/account/orders">
                <Button variant="outline" className="w-full">
                  Back to Orders
                </Button>
              </Link>
            </div>

            {/* Need Help */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 text-center">
                Need help with this order?
              </p>
              <button className="w-full mt-2 text-sm font-medium text-accent-600 hover:text-accent-700">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
