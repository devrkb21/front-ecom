'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores';
import type { CartItem as CartItemType } from '@/types';
import { FreeShippingProgress } from './FreeShippingProgress';
import { getImageUrl, formatPrice, getCartItemStockLimit } from '@/utils';
import { settingsService, type GeneralSettings } from '@/services';
import toast from 'react-hot-toast';

// NOTE: This component duplicates a fair amount of cart item rendering / quantity /
// coupon logic that also lives in CartItem.tsx and CartSummary.tsx (the full /cart page
// uses those instead of this drawer). Composing those shared components here would be a
// larger structural change with more regression risk than is worth taking on as part of
// this audit fix pass, so this file is left as-is beyond the stock-cap fix below — a
// follow-up refactor to de-duplicate is recommended but out of scope here.
export function SideCartDrawer() {
  const {
    cart,
    isLoading,
    isSideCartOpen,
    closeSideCart,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
  } = useCartStore();

  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
 
  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const [generalData, appearanceData] = await Promise.all([
          settingsService.getGeneral(),
          settingsService.getGroup('appearance')
        ]);
        if (isMounted) {
          setSettings({ ...generalData, ...appearanceData });
        }
      } catch (error) {
        console.error('Failed to fetch settings in SideCart:', error);
      }
    };
    fetchSettings();
    return () => { isMounted = false; };
  }, []);
 
  const primaryColor = typeof settings?.primary_color === 'string' ? settings.primary_color : null;
  const primaryHoverColor = typeof settings?.primary_hover_color === 'string' ? settings.primary_hover_color : null;

  const items = cart?.items ?? [];
  const subtotal = typeof cart?.subtotal === 'number'
    ? cart.subtotal
    : items.reduce((sum, item) => sum + item.subtotal, 0);

  const total = typeof cart?.total === 'number' ? cart.total : subtotal;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const discountAmount = cart?.discount_amount ?? 0;

  useEffect(() => {
    if (!isSideCartOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSideCart();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isSideCartOpen, closeSideCart]);

  const handleDecrease = async (productId: number, quantity: number, variantId?: number | null) => {
    if (isLoading) return;
    if (quantity <= 1) {
      await removeItem(productId, variantId ?? undefined);
      return;
    }
    await updateQuantity(productId, quantity - 1, variantId ?? undefined);
  };

  const handleIncrease = async (item: CartItemType) => {
    if (isLoading) return;

    const stockLimit = getCartItemStockLimit(item);
    if (item.quantity >= stockLimit) {
      toast.error('No more stock available for this item');
      return;
    }

    await updateQuantity(item.product_id, item.quantity + 1, item.variant_id ?? undefined);
  };

  const handleRemove = async (productId: number, variantId?: number | null) => {
    if (isLoading) return;
    await removeItem(productId, variantId ?? undefined);
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim() || isApplyingCoupon) return;
    
    setIsApplyingCoupon(true);
    try {
      await applyCoupon(couponCode);
      setCouponCode('');
    } catch {
      // Error handled by store/toast
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeSideCart}
        className={`fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isSideCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-[80] flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-500 ease-out sm:max-w-md ${
          isSideCartOpen 
            ? 'translate-x-0' 
            : 'translate-x-full'
        } ${
          // On mobile, add a small top margin and rounded corners like a sheet
          'max-sm:top-4 max-sm:h-[calc(100%-1rem)] max-sm:w-[calc(100%-1rem)] max-sm:right-2 max-sm:rounded-2xl'
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isSideCartOpen}
        aria-label="Shopping cart"
      >
        <div className="flex h-full flex-col overflow-hidden">
          {/* Header */}
          <div className="relative flex items-center justify-center border-b border-gray-100 px-5 py-4">
            <h2 className="text-xl font-bold tracking-widest text-gray-900">CART</h2>
            <button
              type="button"
              onClick={closeSideCart}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-gray-200 p-1.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close cart drawer"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          {items.length > 0 && (
            <div className="bg-gray-50 px-5 py-3">
              <FreeShippingProgress cartValue={subtotal} />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-gray-50 p-6">
                  <svg className="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-800">Your cart is empty</p>
                <p className="mt-2 text-sm text-gray-500">Looks like you haven&apos;t added anything to your cart yet.</p>
                <button
                  type="button"
                  onClick={closeSideCart}
                  className="mt-8 w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all active:scale-95 shadow-lg shadow-gray-200/50"
                  style={{ 
                    backgroundColor: primaryColor || '#111827',
                  }}
                  onMouseEnter={(e) => {
                    if (primaryHoverColor) e.currentTarget.style.backgroundColor = primaryHoverColor;
                  }}
                  onMouseLeave={(e) => {
                    if (primaryColor) e.currentTarget.style.backgroundColor = primaryColor;
                    else e.currentTarget.style.backgroundColor = '#111827';
                  }}
                >
                  START SHOPPING
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {items.map((item) => {
                  const productImage =
                    item.product.image_url
                    || item.product.image
                    || item.product.images?.find((img) => img.is_primary)?.url
                    || item.product.images?.[0]?.url
                    || null;

                  const variantSummary = item.variant?.attributes?.length
                    ? item.variant.attributes
                        .map((attr) => attr.value)
                        .filter(Boolean)
                        .join(' / ')
                    : item.variant?.name;

                  const stockLimit = getCartItemStockLimit(item);
                  const isAtStockLimit = item.quantity >= stockLimit;

                  return (
                    <div
                      key={`${item.product_id}-${item.variant_id ?? 'base'}`}
                      className="group relative flex gap-4"
                    >
                      {/* Product Image */}
                      <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100">
                        <img
                          src={getImageUrl(productImage || undefined)}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex flex-1 flex-col">
                        <div className="flex justify-between gap-2">
                          <Link 
                            href={`/products/${item.product.slug}`}
                            onClick={closeSideCart}
                            className="text-sm font-bold leading-tight text-gray-900 custom-line-clamp-2 hover:text-accent-600"
                          >
                            {item.product.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleRemove(item.product_id, item.variant_id)}
                            className="text-gray-300 transition-colors hover:text-red-500"
                            aria-label="Remove item"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        {variantSummary && (
                          <p className="mt-1 text-xs text-gray-500 uppercase tracking-wider">{variantSummary}</p>
                        )}

                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
                            <span>{item.quantity}</span>
                            <span className="text-gray-300">×</span>
                            <span>{formatPrice(item.price)}</span>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => void handleDecrease(item.product_id, item.quantity, item.variant_id)}
                              className="px-2 py-1 text-gray-600 hover:bg-gray-200"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                              </svg>
                            </button>
                            <span className="min-w-[24px] text-center text-xs font-bold text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleIncrease(item)}
                              disabled={isAtStockLimit}
                              className="px-2 py-1 text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-100 bg-white px-5 py-6 space-y-4">
              {/* Coupon Section */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-accent-500 focus:outline-none"
                />
                <button
                  type="submit"
                   disabled={isApplyingCoupon || !couponCode.trim()}
                   className="rounded-xl px-6 py-2.5 text-xs font-bold text-white disabled:bg-gray-300 transition-colors shadow-sm"
                   style={{ 
                     backgroundColor: (isApplyingCoupon || !couponCode.trim()) ? undefined : (primaryColor || '#111827')
                   }}
                >
                  {isApplyingCoupon ? '...' : 'APPLY'}
                </button>
              </form>

              {/* Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-bold text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-sm text-emerald-600">
                    <div className="flex items-center gap-2">
                      <span>Discount:</span>
                      <button onClick={() => void removeCoupon()} className="text-[10px] underline">Remove</button>
                    </div>
                    <span className="font-bold">-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-top border-gray-50">
                  <span className="text-lg font-bold text-gray-900">Total:</span>
                  <span className="text-xl font-black text-gray-900">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-2">
                <Link
                  href="/cart"
                   onClick={closeSideCart}
                   className="w-full rounded-xl border-2 py-3.5 text-center text-sm font-bold transition-all hover:bg-gray-50 active:scale-95"
                   style={{ 
                     borderColor: primaryColor || '#111827',
                     color: primaryColor || '#111827'
                   }}
                >
                  VIEW CART
                </Link>
                <Link
                  href="/checkout"
                   onClick={closeSideCart}
                   className="w-full rounded-xl py-4 text-center text-sm font-bold text-white shadow-lg transition-all active:scale-95 shadow-gray-200"
                   style={{ 
                     backgroundColor: primaryColor || '#111827',
                   }}
                   onMouseEnter={(e) => {
                     if (primaryHoverColor) e.currentTarget.style.backgroundColor = primaryHoverColor;
                   }}
                   onMouseLeave={(e) => {
                     if (primaryColor) e.currentTarget.style.backgroundColor = primaryColor;
                     else e.currentTarget.style.backgroundColor = '#111827';
                   }}
                >
                  CHECKOUT
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default SideCartDrawer;

