'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { LoadingPage } from '@/components/ui';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
    }
  }, [isInitialized, isAuthenticated, pathname, router]);

  if (!isInitialized) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <LoadingPage />;
  }

  return <>{children}</>;
}

export default AuthGuard;
