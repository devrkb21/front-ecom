import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import { formatPrice, getImageUrl } from '@/utils';

interface HomeProductCardProps {
  product: Product;
}

const getPriceDisplay = (product: Product): { current: string; original: string | null; isRange: boolean } => {
  if (product.has_variants && Array.isArray(product.variants) && product.variants.length > 0) {
    const activeVariants = product.variants
      .filter((variant) => variant.is_active)
      .map((variant) => {
        return {
          current: variant.current_price ?? variant.discounted_price ?? variant.final_price,
          regular: variant.regular_price ?? (product.price + variant.price_adjustment),
        };
      })
      .filter((pricing) => Number.isFinite(pricing.current));

    if (activeVariants.length > 0) {
      const currentPrices = activeVariants.map((pricing) => pricing.current);
      const minCurrentPrice = Math.min(...currentPrices);
      const maxCurrentPrice = Math.max(...currentPrices);

      const matchingRegularPrices = activeVariants
        .filter((pricing) => pricing.current === minCurrentPrice)
        .map((pricing) => pricing.regular);

      const minRegularForCheapest = matchingRegularPrices.length > 0
        ? Math.min(...matchingRegularPrices)
        : null;

      const original = minRegularForCheapest !== null && minRegularForCheapest > minCurrentPrice
        ? formatPrice(minRegularForCheapest)
        : null;

      return {
        current: formatPrice(minCurrentPrice),
        original,
        isRange: minCurrentPrice !== maxCurrentPrice,
      };
    }
  }

  if (
    product.has_price_range
    && typeof product.price_range_min === 'number'
    && typeof product.price_range_max === 'number'
  ) {
    return {
      current: formatPrice(product.price_range_min),
      original: null,
      isRange: product.price_range_max > product.price_range_min,
    };
  }

  return {
    current: formatPrice(product.current_price),
    original: product.is_on_sale && product.sale_price !== null ? formatPrice(product.price) : null,
    isRange: false,
  };
};

export function HomeProductCard({ product }: HomeProductCardProps) {
  const imageUrl = product.image_url || product.images?.[0]?.url;
  const imageAlt = product.images?.[0]?.alt || product.name;
  const isOutOfStock = product.has_variants
    ? Array.isArray(product.variants) && product.variants.length > 0
      ? product.variants.every((variant) => !variant.in_stock || !variant.is_active)
      : !product.in_stock
    : !product.in_stock;
  const isOnSale = product.is_on_sale && product.sale_price !== null;
  const priceDisplay = getPriceDisplay(product);

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <article className="overflow-hidden rounded-[0.6rem] border border-gray-100 bg-white">
        <div className="relative aspect-[4/5] sm:aspect-square overflow-hidden bg-gray-100">
          <Image
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
