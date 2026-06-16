'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { orderService } from '@/services';
import { Button, LoadingPage } from '@/components/ui';

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');

  const [isResolving, setIsResolving] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolveOrderId = async () => {
      if (!orderNumber) {
        setError('Order number is missing in callback URL.');
        setIsResolving(false);
        return;
      }

      try {
        const summary = await orderService.getOrderByNumber(orderNumber);
        router.replace(`/order-received?order_id=${summary.id}&order=${encodeURIComponent(summary.order_number)}`);
      } catch (err) {
        console.error('Failed to resolve order by number:', err);
        setError('Could not load order from callback response.');
        setIsResolving(false);
      }
    };

    resolveOrderId();
  }, [orderNumber, router]);

  if (isResolving) {
    return <LoadingPage />;
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Callback Received</h1>
        <p className="text-gray-600 mb-8">{error || 'Unable to redirect automatically.'}</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/account/orders">
            <Button variant="outline">View Orders</Button>
          </Link>
          <Link href="/">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
