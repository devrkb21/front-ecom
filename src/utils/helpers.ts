import { clsx, type ClassValue } from 'clsx';
import type { CartItem } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Resolve the quantity cap for a cart item: prefer the selected variant's stock, then
 * the underlying product's stock. If neither is known (e.g. a locally-built guest cart
 * snapshot that predates these fields) and the product isn't explicitly flagged
 * out-of-stock, don't fabricate an arbitrary cap — the backend still validates real
 * stock at checkout regardless of what limit is enforced client-side here.
 *
 * Shared by CartItem and SideCartDrawer so both quantity steppers apply the same cap.
 */
export function getCartItemStockLimit(item: CartItem): number {
  return (
    item.variant?.stock_quantity
    ?? item.product?.stock_quantity
    ?? item.product?.total_stock
    ?? (item.product?.in_stock === false ? item.quantity : Infinity)
  );
}

export function formatPrice(price: string | number | undefined | null): string {
  if (price === undefined || price === null) {
    price = 0;
  }
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) {
    return '0৳';
  }
  // Format with English numerals and taka sign
  // Show decimals only when the price has a fractional part
  const hasDecimals = numPrice % 1 !== 0;
  return `${numPrice.toLocaleString('en-US', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: hasDecimals ? 2 : 0 })}৳`;
}

export function getImageUrl(url?: string): string {
  if (!url) return '/placeholder-product.svg';

  // The backend already stores and serves WebP URLs from the media library.
  // Do NOT blindly rewrite extensions — if a .webp twin does not exist on the
  // server, doing so would cause a 404 / broken image.
  // Just resolve relative paths against the API origin.
  if (url.startsWith('http')) return url;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const origin = apiUrl
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/v\d+$/i, '')
    .replace(/\/api$/i, '');

  if (!origin) {
    return url.startsWith('/') ? url : `/${url}`;
  }

  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
