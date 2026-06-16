'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores';
import { orderService } from '@/services';
import { Order } from '@/types';
import { formatPrice } from '@/utils';
import { Badge } from '@/components/ui';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalSpent: number;
}

export default function AccountDashboard() {
  const { user } = useAuthStore();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    totalSpent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const orders = await orderService.getOrders();
        
        // Calculate stats
        const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
        const pendingOrders = orders.filter(o => ['pending', 'processing'].includes(o.status)).length;
        const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
        
        setStats({
          totalOrders: orders.length,
          pendingOrders,
          deliveredOrders,
          totalSpent,
        });
        
        // Get recent orders (last 3)
        setRecentOrders(orders.slice(0, 3));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusVariant = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      pending: 'warning',
      processing: 'info',
      shipped: 'info',
      delivered: 'success',
      cancelled: 'danger',
    };
    return variants[status] || 'default';
  };

  const statCards = [
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'In Progress',
      value: stats.pendingOrders,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    {
      label: 'Delivered',
      value: stats.deliveredOrders,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      label: 'Total Spent',
      value: formatPrice(stats.totalSpent),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      isPrice: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-accent-600 to-accent-700 rounded-2xl p-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Welcome back, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-accent-100">
          Here&apos;s what&apos;s happening with your account today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex p-3 rounded-xl ${stat.bgColor} mb-4`}>
              <span className={stat.textColor}>{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {isLoading ? '...' : stat.value}
            </p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Link
          href="/account/orders"
          className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-accent-200 transition-all group"
        >
          <div className="p-3 rounded-xl bg-accent-50 text-accent-600 group-hover:bg-accent-100 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Track Orders</p>
            <p className="text-sm text-gray-500">View & track your orders</p>
          </div>
        </Link>

        <Link
          href="/account/profile"
          className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-accent-200 transition-all group"
        >
          <div className="p-3 rounded-xl bg-accent-50 text-accent-600 group-hover:bg-accent-100 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Edit Profile</p>
            <p className="text-sm text-gray-500">Update your details</p>
          </div>
        </Link>

        <Link
          href="/account/payment-methods"
          className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-accent-200 transition-all group"
        >
          <div className="p-3 rounded-xl bg-accent-50 text-accent-600 group-hover:bg-accent-100 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M6 4h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Saved Payment methods</p>
            <p className="text-sm text-gray-500">Manage your Stripe cards</p>
          </div>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-accent-200 transition-all group"
        >
          <div className="p-3 rounded-xl bg-accent-50 text-accent-600 group-hover:bg-accent-100 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Continue Shopping</p>
            <p className="text-sm text-gray-500">Browse our products</p>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          <Link
            href="/account/orders"
            className="text-sm font-medium text-accent-600 hover:text-accent-700"
          >
            View All →
          </Link>
        </div>

        {isLoading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-full bg-gray-100 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">No orders yet</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">Order #{order.order_number}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {' · '}
                    {(order.items?.length || 0)} {(order.items?.length || 0) === 1 ? 'item' : 'items'}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={getStatusVariant(order.status)} size="sm">
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {formatPrice(order.total)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Account Completion */}
      {(!user?.phone || !user?.address) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-amber-100">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Complete Your Profile</h3>
              <p className="text-sm text-amber-700 mt-1">
                Add your phone number and address for faster checkout.
              </p>
              <Link
                href="/account/profile"
                className="inline-flex items-center text-sm font-medium text-amber-800 hover:text-amber-900 mt-3"
              >
                Update Profile →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
