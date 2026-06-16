'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Cart } from '@/types';
import { Button, Input } from '@/components/ui';
import { formatPrice } from '@/utils';
import { useCartStore } from '@/stores/cart.store';

interface CartSummaryProps {
  cart: Cart;
  showCheckoutButton?: boolean;
}

export function CartSummary({ cart, showCheckoutButton = true }: CartSummaryProps) {
  const [couponCode, setCouponCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const { applyCoupon, removeCoupon } = useCartStore();

  const hasCoupon = !!cart.coupon_code;
  const discountAmount = cart.discount_amount ?? 0;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplying(true);
    try {
      await applyCoupon(couponCode.trim());
      setCouponCode('');
    } catch {
      // Error already handled by store toast
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveCoupon = async () => {
    await removeCoupon();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyCoupon();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

      {/* Coupon Section */}
      <div className="mb-5 pb-5 border-b border-gray-100">
        {hasCoupon ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2">
            <div className="min-w-0">
              <span className="text-sm font-bold text-green-800 truncate block">
                Coupon: {cart.coupon_code}
              </span>
              <span className="block text-xs text-green-600">
                -{formatPrice(discountAmount)} discount
              </span>
            </div>
            <button
              onClick={handleRemoveCoupon}
              className="text-xs text-red-600 hover:text-red-800 font-bold transition-colors ml-2"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <Input
              placeholder="Coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-sm flex-1 min-w-[120px]"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyCoupon}
              isLoading={isApplying}
              disabled={!couponCode.trim() || isApplying}
              className="w-full sm:w-auto font-bold"
            >
              Apply
            </Button>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="space-y-3.5">
        <div className="flex justify-between items-center gap-2 text-gray-600 text-sm sm:text-base min-w-0">
          <span className="truncate flex-1">Subtotal ({cart.item_count} items)</span>
          <span className="font-medium shrink-0">{formatPrice(cart.subtotal ?? cart.total)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between items-center gap-2 text-green-600 text-sm sm:text-base min-w-0">
            <span className="truncate flex-1">Discount</span>
            <span className="font-medium shrink-0">-{formatPrice(discountAmount)}</span>
          </div>
        )}

        {(cart.tax ?? 0) > 0 && (
          <div className="flex justify-between items-center gap-2 text-gray-600 text-sm sm:text-base min-w-0">
            <span className="truncate flex-1">Tax</span>
            <span className="font-medium shrink-0">{formatPrice(cart.tax ?? 0)}</span>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4">
          <div className="flex justify-between items-center gap-2 text-base sm:text-lg font-bold text-gray-900 min-w-0">
            <span className="flex-1 truncate">Total</span>
            <span className="text-accent-600 shrink-0">{formatPrice(cart.total)}</span>
          </div>
        </div>
      </div>

      {showCheckoutButton && (
        <Link href="/checkout" className="block mt-6">
          <Button className="w-full font-bold" size="md">
            Proceed to Checkout
          </Button>
        </Link>
      )}
    </div>
  );
}

export default CartSummary;
