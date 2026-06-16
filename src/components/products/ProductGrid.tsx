'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { ProductGridSkeleton } from '@/components/ui';
import { EmptyState } from '@/components/ui';
import { settingsService } from '@/services';
import {
  getProductGridClassName,
  normalizeDesktopColumns,
  normalizeMobileColumns,
  DEFAULT_PRODUCT_GRID_COLUMNS_DESKTOP,
  DEFAULT_PRODUCT_GRID_COLUMNS_MOBILE,
  type ProductGridColumnsDesktop,
  type ProductGridColumnsMobile,
} from '@/utils/product-grid';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  columns?: number; // legacy/desktop override
  mobileColumns?: number; // mobile override
  spacing?: 'compact' | 'normal';
}

export function ProductGrid({
  products,
  isLoading,
  columns,
  mobileColumns,
  spacing = 'compact',
}: ProductGridProps) {
  const [resolvedDesktop, setResolvedDesktop] = useState<ProductGridColumnsDesktop>(
    normalizeDesktopColumns(columns ?? DEFAULT_PRODUCT_GRID_COLUMNS_DESKTOP)
  );
  const [resolvedMobile, setResolvedMobile] = useState<ProductGridColumnsMobile>(
    normalizeMobileColumns(mobileColumns ?? DEFAULT_PRODUCT_GRID_COLUMNS_MOBILE)
  );

  useEffect(() => {
    // If overrides are provided, use them
    if (typeof columns !== 'undefined' || typeof mobileColumns !== 'undefined') {
      if (typeof columns !== 'undefined') {
        setResolvedDesktop(normalizeDesktopColumns(columns));
      }
      if (typeof mobileColumns !== 'undefined') {
        setResolvedMobile(normalizeMobileColumns(mobileColumns));
      }
      return;
    }

    let isMounted = true;

    const fetchGridColumns = async () => {
      try {
        const generalSettings = await settingsService.getGeneral();

        if (!isMounted) {
          return;
        }

        // Handle both old and new setting keys for robustness
        const desktopVal = generalSettings.product_grid_columns_desktop || generalSettings.product_grid_columns;
        const mobileVal = generalSettings.product_grid_columns_mobile;

        setResolvedDesktop(normalizeDesktopColumns(desktopVal));
        setResolvedMobile(normalizeMobileColumns(mobileVal));
      } catch {
        if (!isMounted) {
          return;
        }

        setResolvedDesktop(DEFAULT_PRODUCT_GRID_COLUMNS_DESKTOP);
        setResolvedMobile(DEFAULT_PRODUCT_GRID_COLUMNS_MOBILE);
      }
    };

    void fetchGridColumns();

    return () => {
      isMounted = false;
    };
  }, [columns, mobileColumns]);

  if (isLoading) {
    return <ProductGridSkeleton />;
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
        title="No products found"
        description="We couldn't find any products matching your criteria."
      />
    );
  }

  const gridClassName = getProductGridClassName(resolvedDesktop, resolvedMobile, { spacing });

  return (
    <div className={gridClassName}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default ProductGrid;
