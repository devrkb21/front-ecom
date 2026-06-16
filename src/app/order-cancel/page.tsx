'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, LoadingPage } from '@/components/ui';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const error = searchParams.get('error');
  const paymentMethod = searchParams.get('method') || 'stripe';

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Failed</h1>

        <p className="text-gray-600 mb-6">
          {error || "We couldn't process your payment. Please try again or use a different payment method."}
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {orderId ? (
            <>
              <Link href={`/account/orders/${orderId}`}>
                <Button variant="outline">View Order</Button>
              </Link>
              <Link href={`/payment/${paymentMethod}/${orderId}`}>
                <Button>Try Again</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/account/orders">
                <Button variant="outline">View Orders</Button>
              </Link>
              <Link href="/">
                <Button>Continue Shopping</Button>
              </Link>
            </>
          )}
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left">
          <h3 className="font-medium text-gray-900 mb-2">Common reasons for payment failure:</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Insufficient funds in your account</li>
            <li>Incorrect card details</li>
            <li>Card expired or blocked</li>
            <li>Transaction declined by your bank</li>
          </ul>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Need help? <Link href="/contact" className="text-accent-600 hover:text-accent-700 font-medium">Contact Support</Link>
        </p>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <PaymentFailedContent />
    </Suspense>
  );
}
