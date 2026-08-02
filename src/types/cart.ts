import { ProductImage, ProductVariant } from './product';

// Simplified product info returned in cart
export interface CartProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  current_price: number;
  image?: string;
  image_url?: string;
  images?: ProductImage[];
  in_stock: boolean;
  // The backend's cart resource embeds the full product resource, which includes these
  // stock fields — declared optional here since locally-built guest-cart snapshots may
  // not always populate them.
  stock_quantity?: number;
  total_stock?: number;
}

export interface CartItem {
  id: number;
  product_id: number;
  variant_id?: number | null;
  quantity: number;
  price: number;
  subtotal: number;
  product: CartProduct;
  variant?: ProductVariant | null;
  created_at: string;
  updated_at: string;
}

export interface Cart {
  id: number;
  user_id: number;
  items: CartItem[];
  item_count: number;
  subtotal?: number;
  tax?: number;
  total: number;
  coupon_code?: string | null;
  discount_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface AddToCartData {
  product_id: number;
  variant_id?: number;
  quantity: number;
}

export interface UpdateCartItemData {
  quantity: number;
  variant_id?: number | null;
}
