'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Order, OrderStatus } from '@/types';
import { orderService } from '@/services';
import { Button, Badge, EmptyState } from '@/components/ui';
import { formatPrice } from '@/utils';

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

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const data = await orderService.getOrders();
        setOrders(data);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    switch (activeTab) {
      case 'active':
        return ['pending', 'processing', 'shipped'].includes(order.status);
      case 'completed':
        return order.status === 'delivered';
      case 'cancelled':
        return order.status === 'cancelled';
      default:
        return true;
    }
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All Orders', count: orders.length },
    { key: 'active', label: 'Active', count: orders.filter(o => ['pending', 'processing', 'shipped'].includes(o.status)).length },
    { key: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'delivered').length },
    { key: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-1">Track and manage your orders</p>
        </div>
        <Link href="/">
          <Button variant="outline">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Continue Shopping
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-accent-600 text-accent-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-accent-100 text-accent-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              }
              title={activeTab === 'all' ? 'No orders yet' : `No ${activeTab} orders`}
              description={
                activeTab === 'all'
                  ? "You haven't placed any orders yet. Start shopping to see your orders here."
                  : `You don't have any ${activeTab} orders at the moment.`
              }
              action={
                activeTab === 'all' ? (
                  <Link href="/">
                    <Button>Start Shopping</Button>
                  </Link>
                ) : (
                  <button
                    onClick={() => setActiveTab('all')}
                    className="text-accent-600 hover:text-accent-700 font-medium"
                  >
                    View all orders
                  </button>
                )
              }
            />
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {filteredOrders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block border border-gray-100 rounded-xl hover:border-accent-200 hover:shadow-md transition-all overflow-hidden"
              >
                {/* Order Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Order</span>
                      <p className="font-semibold text-gray-900">#{order.order_number}</p>
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Date</span>
                      <p className="font-medium text-gray-900">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusVariant(order.status)}>
                      {getStatusLabel(order.status)}
                    </Badge>
                    {order.payment?.status === 'pending' && (
                      <Badge variant="warning">Payment Pending</Badge>
                    )}
                  </div>
                </div>

                {/* Order Body */}
                <div className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Product previews */}
                      <div className="flex -space-x-3">
                        {(order.items || []).slice(0, 3).map((item, index) => (
                          <div
                            key={item.id}
                            className="w-12 h-12 rounded-lg bg-gray-100 border-2 border-white flex items-center justify-center text-gray-400 text-xs font-medium"
                            style={{ zIndex: 3 - index }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        ))}
                        {(order.items?.length || 0) > 3 && (
                          <div className="w-12 h-12 rounded-lg bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-medium">
                            +{(order.items?.length || 0) - 3}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          {order.items?.length || 0} {(order.items?.length || 0) === 1 ? 'item' : 'items'}
                        </p>
                        <p className="text-sm text-gray-500 truncate max-w-[200px]">
                          {(order.items || []).map(i => i.product_name).join(', ') || 'No items'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatPrice(order.total)}
                      </p>
                      <span className="text-sm text-accent-600 font-medium">
                        View Details →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
