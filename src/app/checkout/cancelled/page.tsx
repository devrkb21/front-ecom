'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, LoadingPage } from '@/components/ui';

function CheckoutCancelledContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Cancelled</h1>
        
        {orderNumber && (
          <p className="text-lg text-gray-600 mb-2">
            Order: <span className="font-semibold text-gray-900">{orderNumber}</span>
          </p>
        )}
        
        <p className="text-gray-600 mb-8">
          Your order has been cancelled. If you cancelled by mistake or would like to place a new order, you can continue shopping.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/account/orders">
            <Button variant="outline">View My Orders</Button>
          </Link>
          <Link href="/cart">
            <Button>Return to Cart</Button>
          </Link>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left">
          <h3 className="font-medium text-gray-900 mb-2">What happens next?</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>No payment has been charged to your account</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Items in your cart are still available</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>You can place a new order anytime</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">
            Changed your mind? Continue shopping and find something you love.
          </p>
          <Link href="/">
            <Button variant="ghost" className="text-accent-600">
              ← Continue Shopping
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Need help? <Link href="/contact" className="text-accent-600 hover:text-accent-700 font-medium">Contact Support</Link>
        </p>
      </div>
    </div>
  );
}

export default function CheckoutCancelledPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <CheckoutCancelledContent />
    </Suspense>
  );
}
