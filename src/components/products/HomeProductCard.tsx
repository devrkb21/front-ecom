import Link from 'next/link';
import type { Product } from '@/types';
import { getImageUrl } from '@/utils';
import { getProductPriceDisplay, isProductOutOfStock, isProductOnSale } from '@/utils/product-grid';
import { SmartImage } from '@/components/ui';

interface HomeProductCardProps {
  product: Product;
}

// Price display, stock, and sale-badge logic are shared with ProductCard via
// src/utils/product-grid.ts to avoid duplicating the variant price-range/sale-detection
// rules in two places.
export function HomeProductCard({ product }: HomeProductCardProps) {
  const imageUrl = product.image_url || product.images?.[0]?.url;
  const imageAlt = product.images?.[0]?.alt || product.name;
  const isOutOfStock = isProductOutOfStock(product);
  const isOnSale = isProductOnSale(product);
  const priceDisplay = getProductPriceDisplay(product);

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <article className="overflow-hidden rounded-[0.6rem] border border-gray-100 bg-white">
        <div className="relative aspect-[4/5] sm:aspect-square overflow-hidden bg-gray-100">
          <SmartImage
            src={getImageUrl(imageUrl)}
            alt={imageAlt}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />

          {isOnSale && (
            <span className="absolute left-2 top-2 rounded bg-red-500 px-2 py-0.5 text-[11px] font-medium text-white">
              Sale
            </span>
          )}

          {isOutOfStock && (
            <span className="absolute bottom-2 left-2 rounded bg-gray-900 px-2.5 py-1 text-[11px] font-medium text-white">
              Sold Out
            </span>
          )}
        </div>

        <div className="px-2.5 pb-3 pt-2.5 text-center">
          <h3 className="custom-line-clamp-2 text-[13px] sm:text-sm leading-snug text-gray-900 min-h-[2.5rem]">{product.name}</h3>

          <div className="mt-1.5 flex items-center justify-center gap-2 mb-3">
            {priceDisplay.original && (
              <span className="text-xs sm:text-sm font-bold text-gray-400 line-through">
                {priceDisplay.original}
              </span>
            )}
            <span className="text-sm sm:text-base font-bold text-gray-900">
              {priceDisplay.current}
            </span>
          </div>

          <div className="mt-auto">
            <button
              className={`w-full rounded-md py-2 text-xs font-bold transition-all duration-200 uppercase tracking-tight ${
                isOutOfStock
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-accent-600 text-white hover:bg-accent-700 active:scale-[0.98]'
              }`}
            >
              {isOutOfStock ? 'Sold Out' : product.has_variants ? 'Select Options' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default HomeProductCard;
