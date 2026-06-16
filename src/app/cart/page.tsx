'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { abandonedCartService, settingsService } from '@/services';
import { useAuthStore, useCartStore } from '@/stores';
import { CartItem, CartSummary, FreeShippingProgress } from '@/components/cart';
import { Button, EmptyState, CartItemSkeleton } from '@/components/ui';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { cart, fetchCart, clearCart, isLoading } = useCartStore();
  const [guestCheckoutEnabled, setGuestCheckoutEnabled] = useState<boolean | null>(null);
  const [loadingGuestCheckoutSetting, setLoadingGuestCheckoutSetting] = useState(true);
  const canUseCart = isAuthenticated || guestCheckoutEnabled === true;

  useEffect(() => {
    let isMounted = true;

    const fetchGuestCheckoutSetting = async () => {
      try {
        const checkoutSettings = await settingsService.getCheckout();
        if (!isMounted) return;
        setGuestCheckoutEnabled(checkoutSettings.guest_checkout_enabled !== false);
      } catch (error) {
        console.error('Error fetching checkout settings:', error);
        if (!isMounted) return;
        setGuestCheckoutEnabled(true);
      } finally {
        if (isMounted) {
          setLoadingGuestCheckoutSetting(false);
        }
      }
    };

    void fetchGuestCheckoutSetting();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isInitialized && !loadingGuestCheckoutSetting && !canUseCart) {
      router.push('/login?redirect=/cart');
    }
  }, [isInitialized, loadingGuestCheckoutSetting, canUseCart, router]);

  useEffect(() => {
    if (isInitialized && !loadingGuestCheckoutSetting && canUseCart) {
      fetchCart();
    }
  }, [isInitialized, loadingGuestCheckoutSetting, canUseCart, fetchCart]);

  useEffect(() => {
    if (!canUseCart || !cart || cart.items.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      void abandonedCartService
        .track({
          checkout_step: 'cart',
          cart_items: cart.items.map((item) => ({
            ...(item.variant?.sku ? { product_sku: item.variant.sku } : {}),
            product_id: item.product_id,
            product_name: item.product.name,
            product_image: item.product.image_url || null,
            variant_id: item.variant_id ?? null,
            variant_name: item.variant?.name || null,
            variant_sku: item.variant?.sku || null,
            variant_attributes: (item.variant?.attributes || [])
              .map((attribute) => {
                const attributeName = (attribute.attribute_name || '').trim();
                const value = (attribute.value || '').trim();

                if (!value) {
                  return '';
                }

                return attributeName ? `${attributeName}: ${value}` : value;
              })
              .filter((value) => value.length > 0)
              .join(', ') || null,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
          subtotal: cart.subtotal ?? cart.total,
          total: cart.total,
          coupon_code: cart.coupon_code || undefined,
          discount_amount: cart.discount_amount ?? 0,
        })
        .catch((error) => {
          console.warn('Failed to track cart abandoned state:', error);
        });
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [canUseCart, cart]);

  if (!isInitialized || loadingGuestCheckoutSetting) {
    return (
      <div className="bg-white min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <h1 className="font-bold text-3xl md:text-4xl text-gray-900 mb-10">Shopping Bag</h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <CartItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!canUseCart) {
    return null;
  }

  const handleClearCart = async () => {
    if (confirm('Are you sure you want to clear your bag?')) {
      await clearCart();
    }
  };

  return (
    <div className="bg-white min-h-screen w-full overflow-x-hidden">
      <div className="container mx-auto px-2 sm:px-4 py-6 sm:py-12 max-w-full">
        <h1 className="font-bold text-xl sm:text-3xl md:text-4xl text-gray-900 mb-6 sm:mb-10 px-1">Shopping Bag</h1>

        {isLoading && !cart ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <CartItemSkeleton key={i} />
            ))}
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <div className="bg-white p-12 text-center">
            <EmptyState
              icon={
                <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              }
              title="Your bag is empty"
              description="Discover our collections and find something you love."
              action={
                <Link href="/products">
                  <Button>Continue Shopping</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <FreeShippingProgress
              cartValue={typeof cart.subtotal === 'number' ? cart.subtotal : cart.total}
              className="mb-6"
            />

            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 sm:gap-12 max-w-full">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0 w-full">
                  <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                    <p className="text-sm text-gray-600">
                      {cart.item_count} {cart.item_count === 1 ? 'item' : 'items'} in your bag
                    </p>
                    <button
                      onClick={handleClearCart}
                      className="text-xs text-gray-500 hover:text-accent-600 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  {cart.items.map((item) => (
                    <CartItem key={item.id} item={item} />
                  ))}
              </div>

                {/* Cart Summary */}
                <div className="lg:col-span-1">
                  <div className="sticky top-28">
                    <CartSummary cart={cart} />
                  </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
