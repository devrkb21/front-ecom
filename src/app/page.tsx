import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Product, Category } from '@/types';
import { ProductCard } from '@/components/products/ProductCard';
import { getImageUrl } from '@/utils';
import { HeroSlider, type HeroSlide } from '@/components/home/HeroSlider';
import {
  getProductGridClassName,
  normalizeDesktopColumns,
  normalizeMobileColumns,
  type ProductGridColumnsDesktop,
  type ProductGridColumnsMobile,
} from '@/utils/product-grid';

interface CollectionSection {
  category: Category;
  products: Product[];
}

interface HeroSettings {
  title?: string;
  subtitle?: string;
  button_text?: string;
  button_link?: string;
  image?: string;
  enabled?: boolean;
  banners?: HeroSlide[] | string;
}

interface BannerSettings {
  promo_enabled?: boolean;
  promo_text?: string;
  promo_link?: string;
  promo_bg_color?: string;
  promo_text_color?: string;
}

interface GeneralSettings {
  product_grid_columns_desktop?: number | string;
  product_grid_columns_mobile?: number | string;
}

const REVALIDATE_SECONDS = 300;
const MAX_COLLECTIONS = 4;
const ITEMS_PER_COLLECTION = 12;
const FEATURED_LIMIT = 12;

const normalizeApiUrl = (rawValue: string): string => {
  const value = rawValue.trim().replace(/\/+$/, '');
  if (!value) {
    return '';
  }

  if (/\/api\/v\d+$/i.test(value)) {
    return value;
  }

  if (/\/api$/i.test(value)) {
    return `${value}/v1`;
  }

  return `${value}/api/v1`;
};

const API_BASE = normalizeApiUrl(process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '');
const INTERNAL_API_SECRET = (process.env.INTERNAL_API_SECRET || '').trim();

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const unwrapEnvelope = <T,>(payload: unknown): T => {
  if (isRecord(payload) && 'data' in payload) {
    return payload.data as T;
  }

  return payload as T;
};

const extractCollection = <T,>(payload: unknown): T[] => {
  const unwrapped = unwrapEnvelope<unknown>(payload);

  if (Array.isArray(unwrapped)) {
    return unwrapped as T[];
  }

  if (isRecord(unwrapped) && Array.isArray(unwrapped.data)) {
    return unwrapped.data as T[];
  }

  return [];
};

const logFetchError = (label: string, error: unknown): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[HomePage] Failed to fetch ${label}:`, error);
  }
};

const fetchApi = async (path: string, params?: Record<string, string | number>): Promise<unknown> => {
  if (!API_BASE) {
    return null;
  }

  const url = new URL(`${API_BASE}/${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (INTERNAL_API_SECRET) {
      headers['X-Internal-Secret'] = INTERNAL_API_SECRET;
    }

    const response = await fetch(url.toString(), {
      headers,
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as unknown;
  } catch (error) {
    logFetchError(path, error);
    return null;
  }
};

const fetchCollections = async (categories: Category[]): Promise<CollectionSection[]> => {
  const visibleCategories = categories.slice(0, MAX_COLLECTIONS);

  const collections = await Promise.all(
    visibleCategories.map(async (category) => {
      const payload = await fetchApi(`products/category/${category.id}`, {
        page: 1,
        per_page: ITEMS_PER_COLLECTION,
      });

      return {
        category,
        products: extractCollection<Product>(payload).slice(0, ITEMS_PER_COLLECTION),
      };
    })
  );

  return collections.filter((collection) => collection.products.length > 0);
};

const fetchHomeData = async (): Promise<{
  heroSettings: HeroSettings | null;
  bannerSettings: BannerSettings | null;
  featuredProducts: Product[];
  collections: CollectionSection[];
  productGridColumnsDesktop: ProductGridColumnsDesktop;
  productGridColumnsMobile: ProductGridColumnsMobile;
}> => {
  const [heroPayload, bannerPayload, categoriesPayload, featuredPayload, generalPayload] = await Promise.all([
    fetchApi('settings/hero'),
    fetchApi('settings/banner'),
    fetchApi('categories'),
    fetchApi('products/featured'),
    fetchApi('settings/general'),
  ]);

  const categories = extractCollection<Category>(categoriesPayload);
  const collections = categories.length > 0 ? await fetchCollections(categories) : [];
  const generalSettings = generalPayload ? unwrapEnvelope<GeneralSettings>(generalPayload) : null;
  const productGridColumnsDesktop = normalizeDesktopColumns(generalSettings?.product_grid_columns_desktop);
  const productGridColumnsMobile = normalizeMobileColumns(generalSettings?.product_grid_columns_mobile);

  return {
    heroSettings: heroPayload ? unwrapEnvelope<HeroSettings>(heroPayload) : null,
    bannerSettings: bannerPayload ? unwrapEnvelope<BannerSettings>(bannerPayload) : null,
    featuredProducts: extractCollection<Product>(featuredPayload).slice(0, FEATURED_LIMIT),
    collections,
    productGridColumnsDesktop,
    productGridColumnsMobile,
  };
};

export const revalidate = 300;

const SeeMoreCard = ({ href, totalCount, className = "" }: { href: string; totalCount?: number; className?: string }) => (
  <Link 
    href={href}
    className={`flex flex-col items-center justify-center h-full min-h-[200px] border-2 border-dashed border-gray-200 rounded-xl hover:border-accent-500 hover:bg-accent-50 transition-all group p-4 ${className}`}
  >
    <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
      <ArrowRight className="w-5 h-5 text-accent-600" />
    </div>
    <span className="font-bold text-gray-900 text-sm text-center">See All</span>
    {totalCount && <span className="text-[10px] text-gray-500 mt-0.5">{totalCount} Products</span>}
  </Link>
);

export default async function HomePage() {
  const {
    heroSettings,
    bannerSettings,
    featuredProducts,
    collections,
    productGridColumnsDesktop,
    productGridColumnsMobile,
  } = await fetchHomeData();
  const productGridClassName = getProductGridClassName(productGridColumnsDesktop, productGridColumnsMobile, { spacing: 'normal' });

  // Hero content — backend settings with defaults
  const heroEnabled = heroSettings?.enabled !== false;
  
  // Parse hero banners list
  let bannerSlides: HeroSlide[] = [];
  if (heroSettings?.banners) {
    if (typeof heroSettings.banners === 'string') {
      try {
        bannerSlides = JSON.parse(heroSettings.banners);
      } catch (e) {
        bannerSlides = [];
      }
    } else if (Array.isArray(heroSettings.banners)) {
      bannerSlides = heroSettings.banners;
    }
  }

  // Fallback to legacy single banner fields if banners is empty
  if (bannerSlides.length === 0) {
    bannerSlides = [{
      title: heroSettings?.title || 'New Collection',
      subtitle: heroSettings?.subtitle || 'Discover our latest arrivals',
      image: heroSettings?.image || '',
      button_text: heroSettings?.button_text || 'Shop Now',
      button_link: heroSettings?.button_link || '/products',
      enabled: heroEnabled
    }];
  }

  // Filter active slides
  const activeSlides = bannerSlides.filter(slide => slide.enabled !== false);

  // Promo banner
  const promoEnabled = bannerSettings?.promo_enabled === true;
  const promoText = bannerSettings?.promo_text || '';
  const promoLink = bannerSettings?.promo_link || '';
  const promoBgColor = bannerSettings?.promo_bg_color || '#1a1a2e';
  const promoTextColor = bannerSettings?.promo_text_color || '#ffffff';

  return (
    <div>
      {/* Promo Banner */}
      {promoEnabled && promoText && (
        <div
          className="w-full py-2 text-center text-sm"
          style={{ backgroundColor: promoBgColor, color: promoTextColor }}
        >
          {promoLink ? (
            <Link href={promoLink} className="hover:underline">
              {promoText}
            </Link>
          ) : (
            <span>{promoText}</span>
          )}
        </div>
      )}

      {/* Hero Banner — Sliding Carousel */}
      {heroEnabled && activeSlides.length > 0 && (
        <HeroSlider slides={activeSlides} />
      )}

      {/* Collection Sections — One per category */}
      <>
        {/* Featured Products (if we have them) */}
        {featuredProducts.length > 0 && (
          <section className="py-6 md:py-8">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                <Link href="/products?sort=sales_count:desc" className="group flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 group-hover:text-accent-600 transition-colors">
                    Featured Products
                  </h2>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-accent-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/products?sort=sales_count:desc"
                  className="text-xs md:text-sm font-bold text-accent-600 hover:text-accent-700 bg-accent-50 px-3 py-1 rounded-full transition-all hover:bg-accent-100"
                >
                  See All
                </Link>
              </div>

              <div className={productGridClassName}>
                {(() => {
                  const dLimit = (Number(productGridColumnsDesktop) || 5) * 2;
                  const mLimit = (Number(productGridColumnsMobile) || 2) * 2;
                  const maxLimit = Math.max(dLimit, mLimit);
                  
                  const displayProducts = featuredProducts.slice(0, maxLimit);

                  return (
                    <>
                      {displayProducts.map((product, index) => {
                        const isMobileLastSlot = index === mLimit - 1;
                        const isDesktopLastSlot = index === dLimit - 1;
                        const hasMoreThanMobile = featuredProducts.length >= mLimit;
                        const hasMoreThanDesktop = featuredProducts.length >= dLimit;

                        return (
                          <div key={product.id} className={index >= mLimit ? "hidden md:block" : ""}>
                            {isMobileLastSlot && hasMoreThanMobile ? (
                              <>
                                <SeeMoreCard href="/products?sort=sales_count:desc" totalCount={featuredProducts.length} className="md:hidden" />
                                <div className="hidden md:block">
                                  <ProductCard product={product} />
                                </div>
                              </>
                            ) : isDesktopLastSlot && hasMoreThanDesktop ? (
                              <SeeMoreCard href="/products?sort=sales_count:desc" totalCount={featuredProducts.length} />
                            ) : (
                              <ProductCard product={product} />
                            )}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          </section>
        )}

        {/* Category Collection Sections */}
        {collections.map(({ category, products }) => (
          <section key={category.id} className="py-6 md:py-8">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                <Link href={`/categories/${category.slug}`} className="group flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 group-hover:text-accent-600 transition-colors">
                    {category.name}
                  </h2>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-accent-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href={`/categories/${category.slug}`}
                  className="text-xs md:text-sm font-bold text-accent-600 hover:text-accent-700 bg-accent-50 px-3 py-1 rounded-full transition-all hover:bg-accent-100"
                >
                  See All
                </Link>
              </div>

              <div className={productGridClassName}>
                {(() => {
                  const dLimit = (Number(productGridColumnsDesktop) || 5) * 2;
                  const mLimit = (Number(productGridColumnsMobile) || 2) * 2;
                  const maxLimit = Math.max(dLimit, mLimit);
                  
                  // We take up to maxLimit products
                  const displayProducts = products.slice(0, maxLimit);
                  const hasMore = products.length > maxLimit;

                  return (
                    <>
                      {displayProducts.map((product, index) => {
                        // On mobile, if we are at the last slot (mLimit - 1) and there are more products
                        // we show the SeeMoreCard for mobile.
                        const isMobileLastSlot = index === mLimit - 1;
                        const isDesktopLastSlot = index === dLimit - 1;
                        const hasMoreThanMobile = products.length >= mLimit;
                        const hasMoreThanDesktop = products.length >= dLimit;

                        return (
                          <div key={product.id} className={index >= mLimit ? "hidden md:block" : ""}>
                            {isMobileLastSlot && hasMoreThanMobile ? (
                              <>
                                <SeeMoreCard href={`/categories/${category.slug}`} totalCount={products.length} className="md:hidden" />
                                <div className="hidden md:block">
                                  <ProductCard product={product} />
                                </div>
                              </>
                            ) : isDesktopLastSlot && hasMoreThanDesktop ? (
                              <SeeMoreCard href={`/categories/${category.slug}`} totalCount={products.length} />
                            ) : (
                              <ProductCard product={product} />
                            )}
                          </div>
                        );
                      })}
                      {/* If we have fewer than dLimit products but more than mLimit, 
                          we might need a SeeMore card for desktop if products.length > dLimit is false 
                          but we still want to show it if there's a huge gap? 
                          Actually the requirement is: if total > limit, show see more at the end.
                      */}
                    </>
                  );
                })()}
              </div>
            </div>
          </section>
        ))}
      </>
    </div>
  );
}
