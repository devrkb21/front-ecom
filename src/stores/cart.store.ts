import { create } from 'zustand';
import { Cart, CartItem, CartProduct, ProductVariant } from '@/types';
import { cartService, getAuthToken, settingsService } from '@/services';
import { trackAddToCart, type TrackingItemPayload } from '@/utils';
import toast from 'react-hot-toast';

const GUEST_CART_STORAGE_KEY = 'innercollection_guest_cart_v1';

interface AddToCartSnapshot {
  product?: {
    id: number;
    name: string;
    slug: string;
    price?: number;
    sale_price?: number | null;
    current_price?: number;
    image_url?: string;
    in_stock?: boolean;
  };
  variant?: ProductVariant | null;
}

const nowIso = () => new Date().toISOString();

const createEmptyGuestCart = (): Cart => ({
  id: 0,
  user_id: 0,
  items: [],
  item_count: 0,
  subtotal: 0,
  tax: 0,
  total: 0,
  coupon_code: null,
  discount_amount: 0,
  created_at: nowIso(),
  updated_at: nowIso(),
});

const recalculateGuestCart = (cart: Cart): Cart => {
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const discountAmount = cart.discount_amount ?? 0;
  const tax = cart.tax ?? 0;

  return {
    ...cart,
    items: cart.items
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        ...item,
        subtotal: item.price * item.quantity,
        updated_at: nowIso(),
      })),
    item_count: itemCount,
    subtotal,
    discount_amount: discountAmount,
    tax,
    total: Math.max(0, subtotal - discountAmount + tax),
    updated_at: nowIso(),
  };
};

const guestCouponItems = (cart: Cart) =>
  cart.items.map((item) => ({
    product_id: item.product_id,
    variant_id: item.variant_id ?? null,
    quantity: item.quantity,
  }));

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const refreshGuestCouponAfterCartChange = async (cart: Cart): Promise<Cart> => {
  const code = (cart.coupon_code || '').trim();

  if (!code) {
    return recalculateGuestCart(cart);
  }

  if (cart.items.length === 0) {
    return recalculateGuestCart({
      ...cart,
      coupon_code: null,
      discount_amount: 0,
    });
  }

  try {
    const result = await cartService.applyCouponForGuest(code, guestCouponItems(cart));
    return recalculateGuestCart({
      ...cart,
      coupon_code: result.coupon_code,
      discount_amount: result.discount_amount,
    });
  } catch (error) {
    const message = extractApiErrorMessage(error, '').toLowerCase();
    const shouldClearCoupon =
      message.includes('invalid') ||
      message.includes('minimum order amount') ||
      message.includes('not valid') ||
      message.includes('expired') ||
      message.includes('inactive') ||
      message.includes('exhausted') ||
      message.includes('login') ||
      message.includes('required');

    if (shouldClearCoupon) {
      return recalculateGuestCart({
        ...cart,
        coupon_code: null,
        discount_amount: 0,
      });
    }

    return recalculateGuestCart(cart);
  }
};

const readGuestCart = (): Cart => {
  if (typeof window === 'undefined') {
    return createEmptyGuestCart();
  }

  try {
    const raw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) {
      return createEmptyGuestCart();
    }

    const parsed = JSON.parse(raw) as Partial<Cart>;
    if (!parsed || !Array.isArray(parsed.items)) {
      return createEmptyGuestCart();
    }

    return recalculateGuestCart({
      ...createEmptyGuestCart(),
      ...parsed,
      items: parsed.items as CartItem[],
    });
  } catch {
    return createEmptyGuestCart();
  }
};

const writeGuestCart = (cart: Cart) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Ignore storage write failures.
  }
};

const clearGuestCartStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  } catch {
    // Ignore storage delete failures.
  }
};

const resolveGuestProduct = (productId: number, snapshot?: AddToCartSnapshot): CartProduct => {
  const source = snapshot?.product;
  const currentPrice =
    typeof source?.current_price === 'number'
      ? source.current_price
      : typeof source?.price === 'number'
        ? source.price
        : 0;

  return {
    id: productId,
    name: source?.name ?? `Product #${productId}`,
    slug: source?.slug ?? `product-${productId}`,
    price: typeof source?.price === 'number' ? source.price : currentPrice,
    sale_price: source?.sale_price ?? null,
    current_price: currentPrice,
    image_url: source?.image_url,
    in_stock: source?.in_stock ?? true,
  };
};

// Pure helpers for guest-cart mutations. Each takes a cart snapshot and returns a new,
// recalculated cart — they are re-run against the freshest `get().cart` immediately before
// the final `set()` call in each action below, so a concurrent mutation that completed while
// we were awaiting (settings lookups, coupon revalidation, etc.) is not silently overwritten.
const applyGuestItemAdd = (
  cart: Cart,
  productId: number,
  variantId: number | undefined,
  quantity: number,
  guestProduct: CartProduct,
  unitPrice: number,
  snapshotVariant?: ProductVariant | null
): Cart => {
  const existingItem = cart.items.find(
    (item) => item.product_id === productId && (item.variant_id ?? null) === (variantId ?? null)
  );

  let items: CartItem[];

  if (existingItem) {
    items = cart.items.map((item) =>
      item.product_id === productId && (item.variant_id ?? null) === (variantId ?? null)
        ? {
            ...item,
            quantity: item.quantity + quantity,
            price: unitPrice,
            product: guestProduct,
            variant: snapshotVariant ?? item.variant ?? null,
            updated_at: nowIso(),
          }
        : item
    );
  } else {
    items = [
      ...cart.items,
      {
        id: Date.now(),
        product_id: productId,
        variant_id: variantId ?? null,
        quantity,
        price: unitPrice,
        subtotal: unitPrice * quantity,
        product: guestProduct,
        variant: snapshotVariant ?? null,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ];
  }

  return recalculateGuestCart({ ...cart, items });
};

const applyGuestQuantityUpdate = (
  cart: Cart,
  productId: number,
  variantId: number | undefined,
  quantity: number
): Cart =>
  recalculateGuestCart({
    ...cart,
    items: cart.items.map((item) =>
      item.product_id === productId && (item.variant_id ?? null) === (variantId ?? null)
        ? { ...item, quantity, updated_at: nowIso() }
        : item
    ),
  });

const applyGuestItemRemoval = (
  cart: Cart,
  productId: number,
  variantId: number | undefined
): Cart =>
  recalculateGuestCart({
    ...cart,
    items: cart.items.filter(
      (item) => !(item.product_id === productId && (item.variant_id ?? null) === (variantId ?? null))
    ),
  });

const resolveTrackingItem = ({
  productId,
  quantity,
  variantId,
  snapshot,
  cart,
  fallbackPrice,
}: {
  productId: number;
  quantity: number;
  variantId?: number;
  snapshot?: AddToCartSnapshot;
  cart?: Cart | null;
  fallbackPrice?: number;
}): TrackingItemPayload => {
  const matchedItem = cart?.items.find(
    (item) => item.product_id === productId && (item.variant_id ?? null) === (variantId ?? null)
  );

  const trackingPriceCandidates = [
    snapshot?.variant?.current_price,
    snapshot?.variant?.discounted_price,
    snapshot?.variant?.final_price,
    snapshot?.product?.current_price,
    matchedItem?.price,
    fallbackPrice,
  ];

  const resolvedPrice = trackingPriceCandidates.find(
    (candidate): candidate is number => typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0
  ) ?? 0;

  return {
    item_id: variantId ? `${productId}:${variantId}` : String(productId),
    item_name: snapshot?.product?.name || matchedItem?.product?.name || `Product #${productId}`,
    item_variant: snapshot?.variant?.name || matchedItem?.variant?.name || undefined,
    price: resolvedPrice,
    quantity: quantity > 0 ? quantity : 1,
  };
};

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
};

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  isSideCartOpen: boolean;
  shouldOpenSideCartOnAdd: boolean;
  cartUiSettingLoaded: boolean;

  // Actions
  fetchCart: () => Promise<void>;
  fetchCartUiSettings: (force?: boolean) => Promise<void>;
  openSideCart: () => void;
  closeSideCart: () => void;
  addToCart: (productId: number, quantity: number, variantId?: number, snapshot?: AddToCartSnapshot, options?: { skipSideCart?: boolean }) => Promise<void>;
  updateQuantity: (productId: number, quantity: number, variantId?: number) => Promise<void>;
  removeItem: (productId: number, variantId?: number) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;

  // Computed
  itemsCount: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  cart: null,
  isLoading: false,
  error: null,
  isSideCartOpen: false,
  shouldOpenSideCartOnAdd: true,
  cartUiSettingLoaded: false,

  fetchCart: async () => {
    set({ isLoading: true, error: null });

    const token = getAuthToken();
    if (!token) {
      const guestCart = readGuestCart();
      set({ cart: guestCart, isLoading: false });
      return;
    }

    try {
      const cart = await cartService.getCart();
      set({ cart, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch cart';
      set({ error: message, isLoading: false });
    }
  },

  fetchCartUiSettings: async (force = false) => {
    if (!force && get().cartUiSettingLoaded) {
      return;
    }

    try {
      const general = await settingsService.getGeneral();
      set({
        shouldOpenSideCartOnAdd: toBoolean(general.open_side_cart_on_add, true),
        cartUiSettingLoaded: true,
      });
    } catch {
      // Keep default behavior and retry later if settings request fails.
    }
  },

  openSideCart: () => set({ isSideCartOpen: true }),

  closeSideCart: () => set({ isSideCartOpen: false }),

  addToCart: async (productId: number, quantity: number, variantId?: number, snapshot?: AddToCartSnapshot, options?: { skipSideCart?: boolean }) => {
    set({ isLoading: true, error: null });
    // Always refresh the toggle so admin setting changes apply immediately.
    await get().fetchCartUiSettings(true);

    // Optimistic update - add placeholder
    const currentCart = get().cart;

    const token = getAuthToken();
    if (!token) {
      let guestCheckoutAllowed = true;

      try {
        const checkoutSettings = await settingsService.getCheckout();
        guestCheckoutAllowed = checkoutSettings.guest_checkout_enabled !== false;
      } catch {
        // Keep guest checkout enabled when settings request fails.
      }

      if (!guestCheckoutAllowed) {
        const message = 'Guest checkout is currently disabled. Please login to continue.';
        set({ isLoading: false, error: message });
        toast.error('Please login to add items to cart');
        throw new Error(message);
      }

      const baseCart = currentCart ?? readGuestCart();
      const existingItem = baseCart.items.find(
        (item) => item.product_id === productId && (item.variant_id ?? null) === (variantId ?? null)
      );
      const guestProduct = resolveGuestProduct(productId, snapshot);
      const unitPrice =
        snapshot?.variant?.current_price
        ?? snapshot?.variant?.discounted_price
        ?? snapshot?.variant?.final_price
        ?? guestProduct.current_price;

      let items: CartItem[];

      if (existingItem) {
        items = baseCart.items.map((item) =>
          item.product_id === productId
          && (item.variant_id ?? null) === (variantId ?? null)
            ? {
                ...item,
                quantity: item.quantity + quantity,
                price: unitPrice,
                product: guestProduct,
                variant: snapshot?.variant ?? item.variant ?? null,
                updated_at: nowIso(),
              }
            : item
        );
      } else {
        items = [
          ...baseCart.items,
          {
            id: Date.now(),
            product_id: productId,
            variant_id: variantId ?? null,
            quantity,
            price: unitPrice,
            subtotal: unitPrice * quantity,
            product: guestProduct,
            variant: snapshot?.variant ?? null,
            created_at: nowIso(),
            updated_at: nowIso(),
          },
        ];
      }

      const nextCart = recalculateGuestCart({
        ...baseCart,
        items,
      });

      const nextCartWithCoupon = await refreshGuestCouponAfterCartChange(nextCart);

      writeGuestCart(nextCartWithCoupon);
      set({ cart: nextCartWithCoupon, isLoading: false });

      trackAddToCart({
        currency: 'BDT',
        item: resolveTrackingItem({
          productId,
          quantity,
          variantId,
          snapshot,
          cart: nextCartWithCoupon,
          fallbackPrice: unitPrice,
        }),
      });

      if (get().shouldOpenSideCartOnAdd && !options?.skipSideCart) {
        get().openSideCart();
      }

      toast.success('Added to cart');
      return;
    }

    try {
      const cart = await cartService.addItem({ product_id: productId, variant_id: variantId, quantity });
      set({ cart, isLoading: false });

      trackAddToCart({
        currency: 'BDT',
        item: resolveTrackingItem({
          productId,
          quantity,
          variantId,
          snapshot,
          cart,
        }),
      });

      if (get().shouldOpenSideCartOnAdd && !options?.skipSideCart) {
        get().openSideCart();
      }

      toast.success('Added to cart');
    } catch (error: unknown) {
      // Revert on error
      set({ cart: currentCart, isLoading: false });
      const message = error instanceof Error ? error.message : 'Failed to add item';
      set({ error: message });
      toast.error('Failed to add to cart');
      throw error;
    }
  },

  updateQuantity: async (productId: number, quantity: number, variantId?: number) => {
    const currentCart = get().cart;

    const token = getAuthToken();
    if (!token) {
      const baseCart = currentCart ?? readGuestCart();
      const nextCart = recalculateGuestCart({
        ...baseCart,
        items: baseCart.items.map((item) =>
          item.product_id === productId && (item.variant_id ?? null) === (variantId ?? null)
            ? {
                ...item,
                quantity,
                updated_at: nowIso(),
              }
            : item
        ),
      });

      const nextCartWithCoupon = await refreshGuestCouponAfterCartChange(nextCart);

      writeGuestCart(nextCartWithCoupon);
      set({ cart: nextCartWithCoupon, isLoading: false, error: null });
      return;
    }

    // Optimistic update
    if (currentCart) {
      const updatedItems = currentCart.items.map((item: CartItem) =>
        item.product_id === productId && (item.variant_id ?? null) === (variantId ?? null)
          ? { ...item, quantity }
          : item
      );
      set({
        cart: { ...currentCart, items: updatedItems },
        isLoading: true
      });
    }

    try {
      const cart = await cartService.updateItem(productId, {
        quantity,
        variant_id: variantId ?? null,
      });
      set({ cart, isLoading: false });
    } catch (error: unknown) {
      // Revert on error
      set({ cart: currentCart, isLoading: false });
      const message = error instanceof Error ? error.message : 'Failed to update quantity';
      set({ error: message });
      toast.error('Failed to update quantity');
      throw error;
    }
  },

  removeItem: async (productId: number, variantId?: number) => {
    const currentCart = get().cart;

    const token = getAuthToken();
    if (!token) {
      const baseCart = currentCart ?? readGuestCart();
      const nextCart = recalculateGuestCart({
        ...baseCart,
        items: baseCart.items.filter(
          (item: CartItem) => !(item.product_id === productId && (item.variant_id ?? null) === (variantId ?? null))
        ),
      });

      const nextCartWithCoupon = await refreshGuestCouponAfterCartChange(nextCart);

      writeGuestCart(nextCartWithCoupon);
      set({ cart: nextCartWithCoupon, isLoading: false, error: null });
      toast.success('Item removed from cart');
      return;
    }

    // Optimistic update
    if (currentCart) {
      const updatedItems = currentCart.items.filter(
        (item: CartItem) => !(item.product_id === productId && (item.variant_id ?? null) === (variantId ?? null))
      );
      const updatedItemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

      set({
        cart: {
          ...currentCart,
          items: updatedItems,
          item_count: updatedItemCount
        },
        isLoading: true
      });
    }

    try {
      const cart = await cartService.removeItem(productId, variantId ?? null);
      set({ cart, isLoading: false });
      toast.success('Item removed from cart');
    } catch (error: unknown) {
      // Revert on error
      set({ cart: currentCart, isLoading: false });
      const message = error instanceof Error ? error.message : 'Failed to remove item';
      set({ error: message });
      toast.error('Failed to remove item');
      throw error;
    }
  },

  clearCart: async () => {
    const currentCart = get().cart;

    const token = getAuthToken();
    if (!token) {
      clearGuestCartStorage();
      set({ cart: createEmptyGuestCart(), isLoading: false, error: null });
      toast.success('Cart cleared');
      return;
    }

    // Optimistic update
    set({ cart: null, isLoading: true });

    try {
      await cartService.clearCart();
      set({ isLoading: false });
      toast.success('Cart cleared');
    } catch (error: unknown) {
      // Revert on error
      set({ cart: currentCart, isLoading: false });
      const message = error instanceof Error ? error.message : 'Failed to clear cart';
      set({ error: message });
      toast.error('Failed to clear cart');
      throw error;
    }
  },

  applyCoupon: async (code: string) => {
    set({ isLoading: true, error: null });

    const token = getAuthToken();
    if (!token) {
      try {
        const baseCart = get().cart ?? readGuestCart();

        if (baseCart.items.length === 0) {
          throw new Error('Your cart is empty.');
        }

        const result = await cartService.applyCouponForGuest(code, guestCouponItems(baseCart));
        const nextCart = recalculateGuestCart({
          ...baseCart,
          coupon_code: result.coupon_code,
          discount_amount: result.discount_amount,
        });

        writeGuestCart(nextCart);
        set({ cart: nextCart, isLoading: false });
        toast.success(result.message || 'Coupon applied successfully!');
        return;
      } catch (error: unknown) {
        set({ isLoading: false });
        const message = extractApiErrorMessage(error, 'Invalid coupon code');
        toast.error(message);
        throw error;
      }
    }

    try {
      const cart = await cartService.applyCoupon(code);
      set({ cart, isLoading: false });
      toast.success('Coupon applied successfully!');
    } catch (error: unknown) {
      set({ isLoading: false });
      const message = extractApiErrorMessage(error, 'Invalid coupon code');
      toast.error(message);
      throw error;
    }
  },

  removeCoupon: async () => {
    set({ isLoading: true });

    const token = getAuthToken();
    if (!token) {
      const baseCart = get().cart ?? readGuestCart();
      const nextCart = recalculateGuestCart({
        ...baseCart,
        coupon_code: null,
        discount_amount: 0,
      });

      writeGuestCart(nextCart);
      set({ cart: nextCart, isLoading: false, error: null });
      toast.success('Coupon removed');
      return;
    }

    try {
      const cart = await cartService.removeCoupon();
      set({ cart, isLoading: false });
      toast.success('Coupon removed');
    } catch {
      set({ isLoading: false });
      toast.error('Failed to remove coupon');
    }
  },

  itemsCount: () => {
    const cart = get().cart;
    return cart?.item_count || 0;
  },
}));

export default useCartStore;
