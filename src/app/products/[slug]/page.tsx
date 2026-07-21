'use client';

import { FormEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Product, ProductImage, ProductVariant, Review, ReviewSummary } from '@/types';
import { api, productService, settingsService, type GeneralSettings } from '@/services';
import { useAuthStore, useCartStore } from '@/stores';
import { Button, ProductDetailsSkeleton, EmptyState, VariantSelector, SmartImage } from '@/components/ui';
import { ProductCard } from '@/components/products';
import { getImageUrl, formatPrice, trackViewContent } from '@/utils';
import { getProductGridClassName } from '@/utils/product-grid';
import toast from 'react-hot-toast';

type ProductTab = 'description' | 'reviews';

interface ReviewPaginationMeta {
  current_page: number;
  last_page: number;
}

const DEFAULT_WHATSAPP_TEMPLATE = 'Assalamu Alaikum, I want to order: {product_name}. Product URL: {product_url}. Quantity: {quantity}.';

const sanitizeDialNumber = (value: string): string => value.replace(/[^+\d]/g, '');

const normalizeWhatsappNumber = (value: string): string => {
  const digits = value.replace(/[^\d]/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('88')) {
    return digits;
  }

  if (digits.startsWith('0')) {
    return `88${digits}`;
  }

  return digits;
};

const resolveSettingText = (value: string | number | boolean | undefined): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
};

const normalizeReviewMeta = (meta: unknown): ReviewPaginationMeta | null => {
  if (!meta || typeof meta !== 'object') {
    return null;
  }

  const source = meta as Record<string, unknown>;
  const currentPage = Number(source.current_page ?? 1);
  const lastPage = Number(source.last_page ?? 1);

  return {
    current_page: Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1,
    last_page: Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1,
  };
};

const normalizeImageIdentity = (value: string | null | undefined): string => {
  if (!value) {
    return '';
  }

  const withoutHost = value.trim().replace(/^https?:\/\/[^/]+/i, '');
  const withoutQuery = withoutHost.split(/[?#]/)[0] ?? withoutHost;

  return withoutQuery.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
};

const resolveVariantImageUrl = (variant: ProductVariant | null): string | null => {
  if (!variant) {
    return null;
  }

  if (variant.image_url) {
    return variant.image_url;
  }

  const colorAttributeWithImage = variant.attributes.find(
    (attribute) => attribute.attribute_slug === 'color' && !!attribute.image_url
  );

  if (colorAttributeWithImage?.image_url) {
    return colorAttributeWithImage.image_url;
  }

  return variant.attributes.find((attribute) => !!attribute.image_url)?.image_url ?? null;
};

const buildProductImageList = (targetProduct: Product | null, variant: ProductVariant | null): ProductImage[] => {
  const baseImages = targetProduct?.images?.length
    ? [...targetProduct.images].sort((a, b) => a.sort_order - b.sort_order)
    : targetProduct?.image_url
      ? [{ id: 0, image: targetProduct.image || '', url: targetProduct.image_url, is_primary: true, sort_order: 0 }]
      : [{ id: 0, image: '', url: '', is_primary: true, sort_order: 0 }];

  const variantImageUrl = resolveVariantImageUrl(variant);
  if (!variantImageUrl) {
    return baseImages;
  }

  const variantImageKey = normalizeImageIdentity(variantImageUrl);
  const hasVariantImageInGallery = baseImages.some(
    (image) => normalizeImageIdentity(image.url) === variantImageKey
  );

  if (hasVariantImageInGallery) {
    return baseImages;
  }

  const variantImageId = -((variant?.id ?? 0) + 1000000);

  return [
    {
      id: variantImageId,
      image: '',
      url: variantImageUrl,
      is_primary: true,
      sort_order: -1,
    },
    ...baseImages,
  ];
};

const findImageIndexByUrl = (images: ProductImage[], url: string | null): number => {
  if (!url) {
    return -1;
  }

  const targetKey = normalizeImageIdentity(url);
  return images.findIndex((image) => normalizeImageIdentity(image.url) === targetKey);
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { isAuthenticated } = useAuthStore();
  const { addToCart, isLoading: isCartLoading } = useCartStore();
  const [guestCheckoutEnabled, setGuestCheckoutEnabled] = useState<boolean | null>(null);
  const [loadingGuestCheckoutSetting, setLoadingGuestCheckoutSetting] = useState(true);
  const canCheckoutAsGuest = isAuthenticated || guestCheckoutEnabled === true;

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomActive, setIsZoomActive] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<ProductTab>('description');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState('5');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewMeta, setReviewMeta] = useState<ReviewPaginationMeta | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [canReview, setCanReview] = useState<boolean>(false);
  const [canReviewReason, setCanReviewReason] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const trackedViewContentKeyRef = useRef('');

  useEffect(() => {
    let isMounted = true;

    const fetchPageSettings = async () => {
      const [generalResult, checkoutResult] = await Promise.allSettled([
        settingsService.getGeneral(),
        settingsService.getCheckout(),
      ]);

      if (!isMounted) {
        return;
      }

      if (generalResult.status === 'fulfilled') {
        setGeneralSettings(generalResult.value);
      } else {
        setGeneralSettings(null);
      }

      if (checkoutResult.status === 'fulfilled') {
        setGuestCheckoutEnabled(checkoutResult.value.guest_checkout_enabled !== false);
      } else {
        setGuestCheckoutEnabled(true);
      }

      setLoadingGuestCheckoutSetting(false);
    };

    void fetchPageSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setSelectedImage(0);
        setIsZoomActive(false);
        setZoomPosition({ x: 50, y: 50 });
        setQuantity(1);
        setSelectedVariant(null);
        setReviewPage(1);
        const data = await productService.getBySlug(slug);
        setProduct(data);

        if (data.has_variants && data.variants && data.variants.length > 0) {
          const availableVariant = data.variants.find((variant) => variant.is_active && variant.in_stock);
          const initialVariant = availableVariant || data.variants[0];
          const initialImages = buildProductImageList(data, initialVariant);
          const preferredImageIndex = findImageIndexByUrl(initialImages, resolveVariantImageUrl(initialVariant));

          // DO NOT select a variant by default so the user has to choose.
          // setSelectedVariant(initialVariant);
          setSelectedImage(preferredImageIndex >= 0 ? preferredImageIndex : 0);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Product not found');
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  useEffect(() => {
    if (!product) return;

    const fetchReviewsAndRelated = async () => {
      try {
        const [summaryData, reviewsData, relatedData] = await Promise.allSettled([
          productService.getReviewSummary(product.id),
          productService.getProductReviews(product.id, 1),
          productService.getRelatedProducts(product.id),
        ]);

        if (summaryData.status === 'fulfilled') {
          setReviewSummary(summaryData.value);
        }

        if (reviewsData.status === 'fulfilled' && reviewsData.value) {
          setReviews(reviewsData.value.data || []);
          setReviewMeta(normalizeReviewMeta(reviewsData.value.meta));
          setReviewPage(1);
        }

        if (relatedData.status === 'fulfilled') {
          setRelatedProducts(relatedData.value || []);
        }

        // Check if user can review
        if (isAuthenticated) {
          try {
            const reviewStatus = await productService.canReview(product.id);
            setCanReview(reviewStatus.can_review);
            setCanReviewReason(reviewStatus.reason || null);
          } catch (err) {
            console.error('Error checking review status:', err);
            setCanReview(false);
          }
        }
      } catch (err) {
        console.error('Error fetching reviews/related:', err);
      }
    };

    fetchReviewsAndRelated();
  }, [product]);

  useEffect(() => {
    if (!product) {
      return;
    }

    if (product.has_variants && product.variants.length > 0 && !selectedVariant) {
      return;
    }

    const variantKey = selectedVariant ? String(selectedVariant.id) : 'base';
    const trackingKey = `${product.id}:${variantKey}`;

    if (trackedViewContentKeyRef.current === trackingKey) {
      return;
    }

    trackedViewContentKeyRef.current = trackingKey;

    trackViewContent({
      currency: 'BDT',
      item: {
        item_id: trackingKey,
        item_name: product.name,
        item_variant: selectedVariant?.name,
        item_category: product.category?.name,
        price: selectedVariant?.current_price ?? selectedVariant?.discounted_price ?? selectedVariant?.final_price ?? product.current_price,
        quantity: 1,
      },
    });
  }, [product, selectedVariant]);

  const loadMoreReviews = async () => {
    if (!product || isLoadingReviews) return;

    setIsLoadingReviews(true);
    try {
      const nextPage = reviewPage + 1;
      const data = await productService.getProductReviews(product.id, nextPage);
      setReviews((prev) => [...prev, ...data.data]);
      setReviewMeta(normalizeReviewMeta(data.meta));
      setReviewPage(nextPage);
    } catch (err) {
      console.error('Error loading more reviews:', err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const resetZoomState = useCallback(() => {
    setIsZoomActive(false);
    setZoomPosition({ x: 50, y: 50 });
  }, []);

  const selectedVariantImageUrl = resolveVariantImageUrl(selectedVariant);
  const images = buildProductImageList(product, selectedVariant);

  const currentPriceValue = useMemo(() => {
    if (selectedVariant) {
      return selectedVariant.current_price ?? selectedVariant.discounted_price ?? selectedVariant.final_price;
    }

    return product?.current_price || 0;
  }, [selectedVariant, product]);

  const compareAtValue = useMemo(() => {
    if (selectedVariant) {
      const variantCurrentPrice = selectedVariant.current_price ?? selectedVariant.discounted_price ?? selectedVariant.final_price;
      const variantRegularPrice = selectedVariant.regular_price ?? ((product?.price || 0) + selectedVariant.price_adjustment);

      return variantRegularPrice > variantCurrentPrice ? variantRegularPrice : null;
    }

    if (product?.is_on_sale && product.sale_price !== null) {
      return product.price;
    }

    return null;
  }, [selectedVariant, product]);

  const displayPrice = useMemo(() => formatPrice(currentPriceValue), [currentPriceValue]);

  const compareAtPrice = useMemo(() => {
    if (compareAtValue === null) {
      return null;
    }

    return formatPrice(compareAtValue);
  }, [compareAtValue]);

  const discountPercent = useMemo(() => {
    if (!compareAtValue || compareAtValue <= currentPriceValue) {
      return null;
    }

    return Math.round(((compareAtValue - currentPriceValue) / compareAtValue) * 100);
  }, [compareAtValue, currentPriceValue]);

  const currentStock = useMemo(() => {
    if (selectedVariant) {
      return selectedVariant.stock_quantity;
    }

    return product?.total_stock ?? product?.stock_quantity ?? 0;
  }, [selectedVariant, product]);

  const currentSku = useMemo(() => {
    if (selectedVariant) {
      return selectedVariant.sku;
    }

    return product?.sku || '';
  }, [selectedVariant, product]);

  const callForOrderPhone = useMemo(() => {
    const dedicatedPhone = resolveSettingText(generalSettings?.call_for_order_phone);
    const fallbackPhone = resolveSettingText(generalSettings?.contact_phone);

    return dedicatedPhone || fallbackPhone;
  }, [generalSettings]);

  const whatsappOrderPhone = useMemo(() => {
    const dedicatedPhone = resolveSettingText(generalSettings?.whatsapp_order_phone);
    const fallbackPhone = resolveSettingText(generalSettings?.contact_phone);

    return dedicatedPhone || fallbackPhone;
  }, [generalSettings]);

  const whatsappOrderMessageTemplate = useMemo(() => {
    const configuredTemplate = resolveSettingText(generalSettings?.whatsapp_order_message);
    return configuredTemplate || DEFAULT_WHATSAPP_TEMPLATE;
  }, [generalSettings]);

  const relatedProductsGridClassName = useMemo(
    () => getProductGridClassName(
      generalSettings?.product_grid_columns_desktop,
      generalSettings?.product_grid_columns_mobile,
      { spacing: 'normal' }
    ),
    [generalSettings?.product_grid_columns_desktop, generalSettings?.product_grid_columns_mobile]
  );

  const handleVariantChange = useCallback((variant: ProductVariant | null) => {
    const nextImages = buildProductImageList(product, variant);
    const preferredImageIndex = findImageIndexByUrl(nextImages, resolveVariantImageUrl(variant));

    setSelectedVariant(variant);
    setSelectedImage(preferredImageIndex >= 0 ? preferredImageIndex : 0);
    resetZoomState();
  }, [product, resetZoomState]);

  const handleAddToCart = async () => {
    if (!product) return;

    if (!isAuthenticated && loadingGuestCheckoutSetting) {
      toast.error('Please wait while checkout settings load');
      return;
    }

    if (!canCheckoutAsGuest) {
      toast.error('Please login to add items to cart');
      router.push(`/login?redirect=${encodeURIComponent(`/products/${slug}`)}`);
      return;
    }

    if (product.has_variants && !selectedVariant) {
      toast.error('Please select a variant');
      return;
    }

    setIsAddingToCart(true);
    try {
      await addToCart(product.id, quantity, selectedVariant?.id, {
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          sale_price: product.sale_price,
          current_price: selectedVariant?.current_price ?? selectedVariant?.discounted_price ?? selectedVariant?.final_price ?? product.current_price,
          image_url: product.image_url,
          in_stock: product.in_stock,
        },
        variant: selectedVariant ?? null,
      });
      setQuantity(1);
    } catch (err) {
      console.error('Error adding to cart:', err);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;

    if (!isAuthenticated && loadingGuestCheckoutSetting) {
      toast.error('Please wait while checkout settings load');
      return;
    }

    if (!canCheckoutAsGuest) {
      toast.error('Please login to continue');
      router.push(`/login?redirect=${encodeURIComponent(`/products/${slug}`)}`);
      return;
    }

    if (product.has_variants && !selectedVariant) {
      toast.error('Please select a variant');
      return;
    }

    setIsBuyingNow(true);
    try {
      await addToCart(product.id, quantity, selectedVariant?.id, {
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          sale_price: product.sale_price,
          current_price: selectedVariant?.current_price ?? selectedVariant?.discounted_price ?? selectedVariant?.final_price ?? product.current_price,
          image_url: product.image_url,
          in_stock: product.in_stock,
        },
        variant: selectedVariant ?? null,
      }, { skipSideCart: true });
      router.push('/checkout');
    } catch (err) {
      console.error('Error buying now:', err);
    } finally {
      setIsBuyingNow(false);
    }
  };

  const handleWhatsappOrder = () => {
    if (!product) {
      return;
    }

    // Allow WhatsApp order even if variant is not selected, will use base product info
    /*
    if (product.has_variants && !selectedVariant) {
      toast.error('Please select a variant first');
      return;
    }
    */

    if (!whatsappOrderPhone) {
      toast.error('WhatsApp number is not configured in site settings');
      return;
    }

    const normalizedNumber = normalizeWhatsappNumber(whatsappOrderPhone);
    if (!normalizedNumber) {
      toast.error('Configured WhatsApp number is invalid');
      return;
    }

    const productUrl = typeof window !== 'undefined'
      ? window.location.href
      : `/products/${product.slug}`;

    const replacements: Record<string, string> = {
      product_name: product.name,
      product_url: productUrl,
      quantity: String(quantity),
      price: displayPrice,
      sku: currentSku,
    };

    const message = whatsappOrderMessageTemplate.replace(
      /\{(product_name|product_url|quantity|price|sku)\}/g,
      (token, key: string) => replacements[key] || token
    );

    const whatsappUrl = `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!product) {
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please login to submit a review');
      router.push(`/login?redirect=${encodeURIComponent(`/products/${slug}`)}`);
      return;
    }

    if (!reviewComment.trim()) {
      toast.error('Please write your review before submitting');
      return;
    }

    setIsSubmittingReview(true);

    try {
      await api.post('reviews', {
        product_id: product.id,
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
      });

      const [summary, latestReviews] = await Promise.all([
        productService.getReviewSummary(product.id),
        productService.getProductReviews(product.id, 1),
      ]);

      setReviewSummary(summary);
      setReviews(latestReviews.data || []);
      setReviewMeta(normalizeReviewMeta(latestReviews.meta));
      setReviewPage(1);
      setReviewComment('');
      setReviewRating('5');
      setActiveTab('reviews');
      toast.success('Review submitted successfully');
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('Could not submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const renderStars = (rating: number, size = 'w-4 h-4') => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${size} ${star <= Math.round(rating) ? 'text-[#f7a000]' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );

  const formatReviewDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRatingCount = (star: number): number => {
    if (!reviewSummary) {
      return 0;
    }

    const raw = reviewSummary.rating_distribution[String(star)];
    if (typeof raw === 'object' && raw !== null) {
      return raw.count;
    }

    return (raw as number) || 0;
  };

  const getRatingPercentage = (star: number): number => {
    if (!reviewSummary || reviewSummary.total_reviews === 0) {
      return 0;
    }

    const raw = reviewSummary.rating_distribution[String(star)];
    if (typeof raw === 'object' && raw !== null) {
      return raw.percentage;
    }

    const count = (raw as number) || 0;
    return (count / reviewSummary.total_reviews) * 100;
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="Product not found"
          description="The product you're looking for doesn't exist."
          action={
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ProductDetailsSkeleton />
      </div>
    );
  }

  if (!product) return null;

  const currentImageUrl = images[selectedImage]?.url || selectedVariantImageUrl || product.image_url || '';
  const hasGalleryThumbs = images.length > 1;
  const hasGalleryNavigation = images.length > 1;
  const topSectionGridClass = hasGalleryThumbs
    ? 'grid gap-4 md:grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)] md:gap-5'
    : 'grid gap-4 md:grid-cols-2 md:gap-5';
  const hasVariants = product.has_variants && product.variants && product.variants.length > 0;
  const isOutOfStock = currentStock === 0;
  const isLowStock = currentStock > 0 && currentStock < 10;
  const reviewCount = reviewSummary?.total_reviews || 0;
  const averageRating = reviewSummary?.average_rating || 0;

  const dialLink = callForOrderPhone ? `tel:${sanitizeDialNumber(callForOrderPhone)}` : '';

  const handleMainImageMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setZoomPosition({
      x: Math.min(Math.max(x, 0), 100),
      y: Math.min(Math.max(y, 0), 100),
    });
  };

  const handlePrevImage = () => {
    if (!hasGalleryNavigation) {
      return;
    }

    resetZoomState();
    setSelectedImage((current) => (current === 0 ? images.length - 1 : current - 1));
  };

  const handleNextImage = () => {
    if (!hasGalleryNavigation) {
      return;
    }

    resetZoomState();
    setSelectedImage((current) => (current === images.length - 1 ? 0 : current + 1));
  };

  return (
    <div className="bg-[#f3f4f6] pb-12">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <nav className="mb-4 md:mb-5">
          <ol className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <li>
              <Link href="/" className="hover:text-accent-600 transition-colors">Home</Link>
            </li>
            <li className="text-gray-300">&gt;</li>
            <li>
              <Link href="/products" className="hover:text-accent-600 transition-colors">Products</Link>
            </li>
            {product.category && (
              <>
                <li className="text-gray-300">&gt;</li>
                <li>
                  <Link href={`/categories/${product.category.slug}`} className="hover:text-accent-600 transition-colors">
                    {product.category.name}
                  </Link>
                </li>
              </>
            )}
          </ol>
        </nav>

        <section className="rounded-xl border border-gray-200 bg-white p-3 md:p-5">
          <div className={topSectionGridClass}>
            {hasGalleryThumbs && (
              <div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-y-auto md:pb-0">
                {images.map((image, index) => (
                  <button
                    key={image.id || index}
                    onClick={() => {
                      resetZoomState();
                      setSelectedImage(index);
                    }}
                    className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded border transition-colors md:h-[76px] md:w-[76px] ${
                      selectedImage === index
                        ? 'border-[#ef8b1a] ring-1 ring-[#ef8b1a]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <SmartImage
                      src={getImageUrl(image.url)}
                      alt={`${product.name} image ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="76px"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-gray-100 bg-white overflow-hidden">
              <div className="relative mx-auto aspect-square max-w-[520px] overflow-hidden rounded-md">
                <div
                  className="relative h-full w-full cursor-zoom-in"
                  onMouseEnter={() => setIsZoomActive(true)}
                  onMouseMove={handleMainImageMouseMove}
                  onMouseLeave={resetZoomState}
                >
                  <SmartImage
                    src={getImageUrl(currentImageUrl)}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-200 ease-out"
                    style={{
                      transform: isZoomActive ? 'scale(1.9)' : 'scale(1)',
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    }}
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    priority
                  />
                </div>

                {hasGalleryNavigation && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      aria-label="Show previous image"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white/95 p-2 text-gray-700 shadow-sm transition-colors hover:bg-white"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextImage}
                      aria-label="Show next image"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white/95 p-2 text-gray-700 shadow-sm transition-colors hover:bg-white"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {isOutOfStock && (
                <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-red-600">
                  Out of stock
                </div>
              )}
            </div>

            <div className="order-3 lg:pl-2">
              <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">
                {product.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-3xl font-bold text-[#ef8b1a]">{displayPrice}</span>
                {compareAtPrice && (
                  <span className="text-lg text-gray-400 line-through">{compareAtPrice}</span>
                )}
                {discountPercent && (
                  <span className="rounded bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                    Save {discountPercent}%
                  </span>
                )}
              </div>

              {product.short_description && (
                <div 
                  className="mt-4 text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none prose-p:my-1" 
                  dangerouslySetInnerHTML={{ __html: product.short_description }} 
                />
              )}

              {hasVariants && (
                <div className="mt-5">
                  <VariantSelector
                    variants={product.variants}
                    selectedVariant={selectedVariant}
                    onVariantChange={handleVariantChange}
                  />
                </div>
              )}

              <div className="mt-5 flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                <div className="inline-flex items-center rounded border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                    disabled={isOutOfStock || quantity <= 1}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="min-w-10 px-3 text-center text-sm font-semibold text-gray-800">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((value) => Math.min(currentStock, value + 1))}
                    disabled={isOutOfStock || quantity >= currentStock}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                {isLowStock && (
                  <span className="text-xs font-medium text-red-500">Only {currentStock} left</span>
                )}
              </div>

              <div className="mt-5 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="md"
                    className="!rounded !bg-[#ef8b1a] !px-4 !py-3 !text-xs !font-semibold !uppercase tracking-wide hover:!bg-[#d87a12]"
                    onClick={handleAddToCart}
                    disabled={
                      isOutOfStock
                      || isAddingToCart
                      || isBuyingNow
                      || isCartLoading
                      || (!isAuthenticated && loadingGuestCheckoutSetting)
                      || (hasVariants && !selectedVariant)
                    }
                    isLoading={isAddingToCart}
                  >
                    {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                  </Button>

                  <Button
                    size="md"
                    className="!rounded !bg-[#004641] !px-4 !py-3 !text-xs !font-semibold !uppercase tracking-wide hover:!bg-[#003630]"
                    onClick={handleBuyNow}
                    disabled={
                      isOutOfStock
                      || isAddingToCart
                      || isBuyingNow
                      || isCartLoading
                      || (!isAuthenticated && loadingGuestCheckoutSetting)
                      || (hasVariants && !selectedVariant)
                    }
                    isLoading={isBuyingNow}
                  >
                    Buy Now
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleWhatsappOrder}
                    disabled={isOutOfStock}
                    className="inline-flex items-center justify-center rounded bg-[#25d366] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#1eb95a] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Order On WhatsApp
                  </button>

                  {dialLink ? (
                    <a
                      href={dialLink}
                      className="inline-flex items-center justify-center rounded bg-[#2f4ca6] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#223b8a]"
                    >
                      Call For Order
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center justify-center rounded bg-[#2f4ca6] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white opacity-40"
                    >
                      Call For Order
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-600">
                {currentSku && (
                  <p><span className="font-semibold text-gray-700">SKU:</span> {currentSku}</p>
                )}
                {product.category && (
                  <p><span className="font-semibold text-gray-700">Category:</span> {product.category.name}</p>
                )}
                {callForOrderPhone && (
                  <p><span className="font-semibold text-gray-700">Order Hotline:</span> {callForOrderPhone}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('description')}
              className={`px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'description'
                  ? 'border-b-2 border-[#ef8b1a] text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Description
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'reviews'
                  ? 'border-b-2 border-[#ef8b1a] text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Customer Reviews ({reviewCount})
            </button>
          </div>

          <div className="p-4 md:p-6">
            {activeTab === 'description' ? (
              <>
                <h2 className="mb-4 text-xl font-bold text-gray-900">Product Details</h2>
                <div className="space-y-4 text-sm leading-7 text-gray-700">
                  {product.description
                    ? <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: product.description }} />
                    : <p>Product details will be updated soon.</p>}
                </div>
              </>
            ) : (
              <>
                <h2 className="mb-4 text-xl font-bold text-gray-900">Customer Reviews Overview</h2>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-5xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
                    <div className="mt-1">{renderStars(averageRating, 'w-5 h-5')}</div>
                    <p className="mt-2 text-xs text-gray-500">Based on {reviewCount} reviews</p>
                  </div>

                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="w-8 text-right text-gray-600">{star}★</span>
                        <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                          <div
                            className="h-full bg-[#f7a000]"
                            style={{ width: `${getRatingPercentage(star)}%` }}
                          />
                        </div>
                        <span className="w-8 text-gray-500">{getRatingCount(star)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section id="product-reviews" className="mt-5 rounded-xl border border-gray-200 bg-white p-4 md:p-6">
          <div className="grid gap-8 lg:grid-cols-[300px,1fr]">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Average Rating</h3>
              <div className="mt-2 flex items-end gap-3">
                <span className="text-5xl font-bold text-gray-900">{averageRating.toFixed(1)}</span>
                <div className="pb-2">{renderStars(averageRating, 'w-5 h-5')}</div>
              </div>
              <p className="mt-2 text-xs text-gray-500">{reviewCount} total reviews</p>

              <div className="mt-4 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-6 text-gray-600">{star}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                      <div className="h-full bg-[#f7a000]" style={{ width: `${getRatingPercentage(star)}%` }} />
                    </div>
                    <span className="w-6 text-right text-gray-500">{getRatingCount(star)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-5 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Write a Review</h3>
              
              {!isAuthenticated ? (
                <div className="mt-6 text-center py-8 bg-white rounded-lg border border-gray-100">
                  <p className="text-gray-600 mb-4">Please login to write a review</p>
                  <Link href={`/login?redirect=${encodeURIComponent(`/products/${slug}`)}`}>
                    <Button variant="outline" size="sm">Login Now</Button>
                  </Link>
                </div>
              ) : !canReview ? (
                <div className="mt-6 p-6 bg-white rounded-lg border border-gray-100 flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-gray-800 font-semibold mb-1">
                    {canReviewReason === 'already_reviewed' ? 'You have already reviewed this product' : 'Verified Purchase Required'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {canReviewReason === 'already_reviewed' 
                      ? 'Thank you for sharing your feedback!' 
                      : 'Only customers who have purchased and received this product can write a review.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="mt-6 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3">Overall Rating</label>
                    <div 
                      className="flex items-center gap-1"
                      onMouseLeave={() => setHoveredRating(0)}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(String(star))}
                          onMouseEnter={() => setHoveredRating(star)}
                          className="transition-transform hover:scale-110 focus:outline-none"
                        >
                          <svg 
                            className={`w-9 h-9 transition-colors duration-200 ${
                              star <= (hoveredRating || Number(reviewRating))
                                ? 'text-[#f7a000] drop-shadow-sm'
                                : 'text-gray-200'
                            }`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      ))}
                      <span className="ml-4 text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
                        {(hoveredRating || Number(reviewRating)) === 5 ? 'Excellent 🤩' :
                         (hoveredRating || Number(reviewRating)) === 4 ? 'Good ☺️' :
                         (hoveredRating || Number(reviewRating)) === 3 ? 'Average 😐' :
                         (hoveredRating || Number(reviewRating)) === 2 ? 'Poor 😕' :
                         'Terrible 😞'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="review-comment" className="block text-sm font-semibold text-gray-800 mb-3">Your Review</label>
                    <textarea
                      id="review-comment"
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      rows={4}
                      placeholder="What did you like or dislike? What should other shoppers know before buying?"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-700 outline-none transition-all focus:border-accent-500 focus:ring-4 focus:ring-accent-500/10 resize-none shadow-sm placeholder:text-gray-400"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      size="lg"
                      isLoading={isSubmittingReview}
                      disabled={isSubmittingReview || !reviewComment.trim()}
                      className="w-full sm:w-auto !rounded-lg !bg-gray-900 !px-8 !py-3 !text-sm !font-semibold tracking-wide hover:!bg-gray-800 shadow-md shadow-gray-900/10 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    >
                      Post Review
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-6">
            {reviews.length > 0 ? (
              <div className="space-y-5">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded border border-gray-100 bg-gray-50 p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        {review.is_verified_purchase && (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Verified
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{formatReviewDate(review.created_at)}</span>
                    </div>

                    {review.title && (
                      <h4 className="text-sm font-semibold text-gray-800">{review.title}</h4>
                    )}

                    {review.comment && (
                      <p className="mt-1 text-sm leading-6 text-gray-700">{review.comment}</p>
                    )}

                    <p className="mt-2 text-xs text-gray-500">by {review.user.name}</p>
                  </article>
                ))}

                {reviewMeta && reviewMeta.current_page < reviewMeta.last_page && (
                  <div className="pt-1 text-center">
                    <Button
                      variant="outline"
                      onClick={loadMoreReviews}
                      isLoading={isLoadingReviews}
                      className="!rounded"
                    >
                      Load More Reviews
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No reviews yet. Be the first to share your thoughts.</p>
            )}
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Related Products</h2>
                <Link href="/products" className="text-sm font-medium text-[#ef8b1a] hover:text-[#d87a12]">
                  More Products -&gt;
              </Link>
            </div>
            <div className={relatedProductsGridClassName}>
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
