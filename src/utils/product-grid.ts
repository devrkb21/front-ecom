import type { Product } from '@/types';
import { formatPrice } from './helpers';

export interface ProductPriceDisplay {
  current: string;
  original: string | null;
  isRange: boolean;
}

/**
 * Compute the price to display for a product card: for variable products, the range
 * across active variants (lowest current price, with the matching regular/compare-at
 * price for the cheapest variant shown as "original" when it's a real discount); for
 * simple products with a configured price range, that range; otherwise the product's
 * own current/sale price.
 *
 * Shared by ProductCard and HomeProductCard, which previously duplicated this logic
 * verbatim.
 */
export const getProductPriceDisplay = (product: Product): ProductPriceDisplay => {
  if (product.has_variants && Array.isArray(product.variants) && product.variants.length > 0) {
    const activeVariants = product.variants
      .filter((variant) => variant.is_active)
      .map((variant) => ({
        current: variant.current_price ?? variant.discounted_price ?? variant.final_price,
        regular: variant.regular_price ?? (product.price + variant.price_adjustment),
      }))
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

/** True if a product (or, for variable products, every active variant) is out of stock. */
export const isProductOutOfStock = (product: Product): boolean => {
  if (product.has_variants && Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants.every((variant) => !variant.in_stock || !variant.is_active);
  }
  return !product.in_stock;
};

/** True if a product is currently marked on sale with a real sale price. */
export const isProductOnSale = (product: Product): boolean =>
  Boolean(product.is_on_sale && product.sale_price !== null);

export const ALLOWED_PRODUCT_GRID_COLUMNS_DESKTOP = [3, 4, 5, 6] as const;
export const ALLOWED_PRODUCT_GRID_COLUMNS_MOBILE = [1, 2] as const;

export type ProductGridColumnsDesktop = (typeof ALLOWED_PRODUCT_GRID_COLUMNS_DESKTOP)[number];
export type ProductGridColumnsMobile = (typeof ALLOWED_PRODUCT_GRID_COLUMNS_MOBILE)[number];

export const DEFAULT_PRODUCT_GRID_COLUMNS_DESKTOP: ProductGridColumnsDesktop = 5;
export const DEFAULT_PRODUCT_GRID_COLUMNS_MOBILE: ProductGridColumnsMobile = 2;

type GridSpacing = 'compact' | 'normal';

export const normalizeDesktopColumns = (value: unknown): ProductGridColumnsDesktop => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value || ''), 10);
  if (ALLOWED_PRODUCT_GRID_COLUMNS_DESKTOP.includes(parsed as ProductGridColumnsDesktop)) {
    return parsed as ProductGridColumnsDesktop;
  }
  return DEFAULT_PRODUCT_GRID_COLUMNS_DESKTOP;
};

export const normalizeMobileColumns = (value: unknown): ProductGridColumnsMobile => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value || ''), 10);
  if (ALLOWED_PRODUCT_GRID_COLUMNS_MOBILE.includes(parsed as ProductGridColumnsMobile)) {
    return parsed as ProductGridColumnsMobile;
  }
  return DEFAULT_PRODUCT_GRID_COLUMNS_MOBILE;
};

export const getProductGridClassName = (
  desktopValue: unknown,
  mobileValue: unknown,
  options?: { spacing?: GridSpacing }
): string => {
  const desktop = normalizeDesktopColumns(desktopValue);
  const mobile = normalizeMobileColumns(mobileValue);
  const spacing = options?.spacing === 'compact' ? 'compact' : 'normal';
  const gap = spacing === 'compact' ? 'gap-1 md:gap-2' : 'gap-2';

  const mobileCols = mobile === 1 ? 'grid-cols-1' : 'grid-cols-2';
  
  const desktopCols = desktop === 3 ? 'md:grid-cols-3' :
                      desktop === 4 ? 'md:grid-cols-3 lg:grid-cols-4' :
                      desktop === 5 ? 'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' :
                      'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';

  return `grid ${mobileCols} ${desktopCols} ${gap}`;
};
