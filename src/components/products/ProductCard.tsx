'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types';
import { getImageUrl } from '@/utils';
import { getProductPriceDisplay, isProductOutOfStock, isProductOnSale } from '@/utils/product-grid';
import { useMemo, useState } from 'react';
import { useAuthStore, useCartStore, useWishlistStore } from '@/stores';
import { SmartImage } from '@/components/ui';

interface ProductCardProps {
  product: Product;
}

// Star rating component
function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-3 h-3 ${star <= Math.round(rating) ? 'text-[#FFA400]' : 'text-gray-200'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-[11px] text-gray-500">
        {count > 0 ? `${rating.toFixed(1)} (${count})` : 'No reviews'}
      </span>
    </div>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { addToCart } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const wishlisted = isInWishlist(product.id);

  const primaryImageUrl = product.image_url || product.images?.[0]?.url;
  const imageAlt = product.images?.[0]?.alt || product.name;
  const secondaryImageUrl = product.images?.[1]?.url;

  // Price display, stock, and sale-badge logic are shared with HomeProductCard via
  // src/utils/product-grid.ts to avoid duplicating the variant price-range/sale-detection
  // rules in two places.
  const priceDisplay = useMemo(() => getProductPriceDisplay(product), [product]);
  const isOutOfStock = useMemo(() => isProductOutOfStock(product), [product]);
  const isOnSale = isProductOnSale(product);
  const isVariableProduct = Boolean(product.has_variants);

  const handleAddToCart = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isOutOfStock || isAdding) {
      return;
    }

    if (isVariableProduct) {
      router.push(`/products/${product.slug}`);
      return;
    }

    setIsAdding(true);

    try {
      await addToCart(product.id, 1, undefined, {
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          sale_price: product.sale_price,
          current_price: product.current_price,
          image_url: product.image_url,
          in_stock: product.in_stock,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';

      if (message.toLowerCase().includes('guest checkout is currently disabled')) {
        router.push(`/login?redirect=${encodeURIComponent(`/products/${product.slug}`)}`);
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative rounded-[0.6rem] overflow-hidden">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <SmartImage
            src={getImageUrl(primaryImageUrl)}
            alt={imageAlt}
            fill
            className={`object-cover transition-opacity duration-300 ${secondaryImageUrl ? 'group-hover:opacity-0' : ''}`}
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          />

          {secondaryImageUrl && (
            <SmartImage
              src={getImageUrl(secondaryImageUrl)}
              alt={imageAlt}
              fill
              className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            />
          )}

          {/* Sale Badge */}
          {isOnSale && (
            <div className="absolute top-2 left-2">
              <span className="bg-red-500 text-white text-[11px] font-medium px-2 py-0.5 rounded">
                Sale
              </span>
            </div>
          )}

          {/* Wishlist Button */}
          <button
            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full transition-colors hover:bg-white"
            onClick={(e) => {
              e.preventDefault();
              if (!isAuthenticated) {
                router.push('/login');
                return;
              }
              toggleItem(product.id);
            }}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg className={`w-4 h-4 ${wishlisted ? 'text-red-500' : 'text-gray-400'}`} fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          {/* Sold Out Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Product Info — Center aligned */}
        <div className="pt-3 pb-2 text-center px-2">
          <h3 className="text-[13px] sm:text-sm text-gray-900 leading-snug custom-line-clamp-2 mb-1 min-h-[2.5rem]">
            {product.name}
          </h3>

          {/* Star Rating */}
          <div className="flex justify-center mb-1.5">
            <StarRating 
              rating={product.average_rating || 0} 
              count={product.review_count || 0} 
            />
          </div>

          {/* Price */}
          <div className="flex items-center justify-center gap-2 mb-3">
            {priceDisplay.original && (
              <span className="text-xs sm:text-sm text-gray-400 line-through font-bold">
                {priceDisplay.original}
              </span>
            )}
            <span className="text-sm sm:text-base font-bold text-gray-900">
              {priceDisplay.current}
            </span>
          </div>

          {/* Add to Cart Button */}
          <div className="mt-auto">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock || isAdding}
              className={`w-full rounded-md px-3 py-2.5 text-xs font-bold transition-all duration-200 focus:outline-none uppercase tracking-tight ${
                isOutOfStock
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-accent-600 text-white hover:bg-accent-700 active:scale-[0.98]'
              }`}
                aria-label={isOutOfStock ? 'Out of stock' : isVariableProduct ? 'Select options' : 'Add to cart'}
            >
                {isOutOfStock ? 'Out of Stock' : isVariableProduct ? 'Select Options' : isAdding ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;
