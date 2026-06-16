'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { orderService } from '@/services';
import { Button, LoadingPage } from '@/components/ui';

function CheckoutFailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');
  const error = searchParams.get('error') || 'Payment failed';

  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    const resolveOrderId = async () => {
      if (!orderNumber) {
        router.replace(`/order-cancel?error=${encodeURIComponent(error)}`);
        return;
      }

      try {
        const summary = await orderService.getOrderByNumber(orderNumber);
        router.replace(`/order-cancel?order_id=${summary.id}&error=${encodeURIComponent(error)}&method=bkash`);
      } catch (err) {
        console.error('Failed to resolve failed order by number:', err);
        router.replace(`/order-cancel?error=${encodeURIComponent(error)}&method=bkash`);
      } finally {
        setIsResolving(false);
      }
    };

    resolveOrderId();
  }, [error, orderNumber, router]);

  if (isResolving) {
    return <LoadingPage />;
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Redirecting...</h1>
        <p className="text-gray-600 mb-8">You can continue from your orders page if redirect did not happen.</p>
        <Link href="/account/orders">
          <Button variant="outline">View Orders</Button>
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutFailedPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <CheckoutFailedContent />
    </Suspense>
  );
}
