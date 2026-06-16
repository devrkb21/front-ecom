'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, EmptyState } from '@/components/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16">
      <EmptyState
        icon={
          <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        }
        title="Something went wrong"
        description="An unexpected error occurred. Please try again."
        action={
          <div className="flex gap-4">
            <Button onClick={reset} variant="outline">
              Try Again
            </Button>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </div>
        }
      />
    </div>
  );
}
