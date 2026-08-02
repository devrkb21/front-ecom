import { create } from 'zustand';
import { wishlistService, WishlistItem } from '@/services/wishlist.service';
import toast from 'react-hot-toast';

interface WishlistState {
  items: WishlistItem[];
  count: number;
  isLoading: boolean;
  wishlistedIds: Set<number>;

  fetchWishlist: () => Promise<void>;
  toggleItem: (productId: number) => Promise<void>;
  removeItem: (wishlistId: number) => Promise<void>;
  moveToCart: (wishlistId: number) => Promise<void>;
  isInWishlist: (productId: number) => boolean;
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  items: [],
  count: 0,
  isLoading: false,
  wishlistedIds: new Set(),

  fetchWishlist: async () => {
    set({ isLoading: true });
    try {
      const items = await wishlistService.getWishlist();
      const ids = new Set(items.map(item => item.product_id));
      set({ items, count: items.length, wishlistedIds: ids, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleItem: async (productId: number) => {
    try {
      const result = await wishlistService.toggleItem(productId);
      const { wishlistedIds } = get();
      const newIds = new Set(wishlistedIds);
      if (result.added) {
        newIds.add(productId);
        toast.success('Added to wishlist');
      } else {
        newIds.delete(productId);
        toast.success('Removed from wishlist');
      }
      set({ wishlistedIds: newIds, count: newIds.size });
      // Refresh full list. Awaited so a slow refetch can't land after a later
      // toggle/remove's refetch and overwrite it with stale data (out-of-order responses).
      await get().fetchWishlist();
    } catch {
      toast.error('Failed to update wishlist');
    }
  },

  removeItem: async (wishlistId: number) => {
    try {
      await wishlistService.removeItem(wishlistId);
      toast.success('Removed from wishlist');
      await get().fetchWishlist();
    } catch {
      toast.error('Failed to remove item');
    }
  },

  moveToCart: async (wishlistId: number) => {
    try {
      await wishlistService.moveToCart(wishlistId);
      toast.success('Moved to cart');
      await get().fetchWishlist();
    } catch {
      toast.error('Failed to move to cart');
    }
  },

  isInWishlist: (productId: number) => {
    return get().wishlistedIds.has(productId);
  },
}));

export default useWishlistStore;
