'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  useEffect(() => {
    router.replace(`/account/orders/${orderId}`);
  }, [router, orderId]);

  return null;
}
