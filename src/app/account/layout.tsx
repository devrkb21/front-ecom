'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores';
import { AccountSidebar } from '@/components/layout/AccountSidebar';
import { LoadingPage } from '@/components/ui';

interface AccountLayoutProps {
  children: React.ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || '/account')}`);
    }
  }, [isInitialized, isAuthenticated, pathname, router]);

  if (!isInitialized) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <nav className="mb-4">
            <ol className="flex items-center gap-2 text-xs">
              <li>
                <Link href="/" className="text-gray-400 hover:text-accent-600 transition-colors">Home</Link>
              </li>
              <li className="text-gray-300">/</li>
              <li className="text-gray-900">My Account</li>
            </ol>
          </nav>
          <h1 className="font-bold text-3xl md:text-4xl text-gray-900">My Account</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          <AccountSidebar />
          
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
