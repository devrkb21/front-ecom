import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
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
