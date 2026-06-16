'use client';

import { use, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';

import {
  landingPageService,
  addressService,
  shippingService,
  orderService,
  paymentService,
  type LandingPage,
} from '@/services';
import type { BdLocationItem } from '@/services/address.service';
import type { Product, ProductVariant, ShippingMethod, PaymentMethod } from '@/types';
import { Button, Input } from '@/components/ui';
import { getImageUrl, formatPrice } from '@/utils';

const themeStyles = {
  default: {
    bg: 'bg-gray-50 text-gray-900',
    card: 'bg-white border-gray-200 shadow-sm',
    primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100',
    accentBadge: 'bg-gray-100 text-gray-800 border border-gray-200',
    accentText: 'text-blue-600',
    heroBg: 'bg-gradient-to-r from-gray-900 to-gray-800 text-white',
    inputClass: 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500',
    footerBg: 'bg-gray-950 text-gray-400',
    priceText: 'text-blue-600 font-bold',
    labelClass: 'text-gray-700',
  },
  clothing: {
    bg: 'bg-[#FBFBFB] text-neutral-900',
    card: 'bg-white border-neutral-200 shadow-none border',
    primaryBtn: 'bg-black hover:bg-neutral-800 text-white uppercase tracking-widest font-semibold',
    accentBadge: 'bg-neutral-100 text-neutral-800 border border-neutral-200',
    accentText: 'text-black',
    heroBg: 'bg-white text-neutral-900 border-b border-neutral-200',
    inputClass: 'bg-white border-neutral-300 text-neutral-950 focus:ring-black focus:border-black',
    footerBg: 'bg-neutral-900 text-neutral-400',
    priceText: 'text-black font-semibold',
    labelClass: 'text-neutral-800',
  },
  am: {
    bg: 'bg-[#FCFDF9] text-[#233A1F]',
    card: 'bg-white border-[#E0E9D4] shadow-sm',
    primaryBtn: 'bg-[#437A2C] hover:bg-[#346022] text-white shadow-md shadow-green-100',
    accentBadge: 'bg-[#EBF3E6] text-[#437A2C] border border-[#C6DCB8]',
    accentText: 'text-[#437A2C]',
    heroBg: 'bg-gradient-to-r from-[#437A2C] to-[#2E541E] text-white',
    inputClass: 'bg-white border-[#CBDDC1] text-[#233A1F] focus:ring-[#437A2C] focus:border-[#437A2C]',
    footerBg: 'bg-[#1C2C19] text-[#A8BCA5]',
    priceText: 'text-[#437A2C] font-extrabold',
    labelClass: 'text-[#233A1F]',
  },
  khejur: {
    bg: 'bg-[#FAF7F2] text-[#3D2513]',
    card: 'bg-white border-[#EFDFCD] shadow-sm',
    primaryBtn: 'bg-[#8E4F18] hover:bg-[#723F12] text-white shadow-md shadow-amber-100',
    accentBadge: 'bg-[#F7EEE3] text-[#8E4F18] border border-[#ECD9C0]',
    accentText: 'text-[#8E4F18]',
    heroBg: 'bg-gradient-to-r from-[#703D12] to-[#4B280A] text-white',
    inputClass: 'bg-white border-[#E5D2BC] text-[#3D2513] focus:ring-[#8E4F18] focus:border-[#8E4F18]',
    footerBg: 'bg-[#2E1A0D] text-[#C2AA99]',
    priceText: 'text-[#8E4F18] font-bold',
    labelClass: 'text-[#3D2513]',
  },
  digital_item: {
    bg: 'bg-slate-950 text-slate-100',
    card: 'bg-slate-900 border-slate-800 shadow-xl shadow-black/40',
    primaryBtn: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold tracking-wide shadow-lg shadow-cyan-900/20',
    accentBadge: 'bg-cyan-950/50 text-cyan-400 border border-cyan-800/60',
    accentText: 'text-cyan-400',
    heroBg: 'bg-slate-900 text-slate-100 border-b border-slate-800',
    inputClass: 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-cyan-500 focus:border-cyan-500',
    footerBg: 'bg-slate-950 text-slate-500',
    priceText: 'text-cyan-400 font-bold',
    labelClass: 'text-slate-300',
  },
  inner_item: {
    bg: 'bg-[#FCFAF8] text-[#2F2420]',
    card: 'bg-white border-[#F3ECE5] shadow-sm',
    primaryBtn: 'bg-[#1C1614] hover:bg-[#2F2420] text-white font-medium tracking-wide',
    accentBadge: 'bg-[#FAF4EE] text-[#7A6157] border border-[#EDE2D7]',
    accentText: 'text-[#7A6157]',
    heroBg: 'bg-gradient-to-r from-[#2F2420] to-[#1C1614] text-white',
    inputClass: 'bg-white border-[#E6DCD1] text-[#2F2420] focus:ring-[#1C1614] focus:border-[#1C1614]',
    footerBg: 'bg-[#1F1917] text-[#A5958E]',
    priceText: 'text-[#7A6157] font-bold',
    labelClass: 'text-[#2F2420]',
  },
  sexual_item: {
    bg: 'bg-[#06040C] text-[#C4BED4]',
    card: 'bg-[#0E0B19] border-[#221C38] shadow-2xl shadow-black/50',
    primaryBtn: 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-lg shadow-purple-900/30',
    accentBadge: 'bg-[#181132] text-fuchsia-400 border border-fuchsia-800/40',
    accentText: 'text-fuchsia-400',
    heroBg: 'bg-[#0E0B19] text-white border-b border-[#221C38]',
    inputClass: 'bg-[#06040C] border-[#2E274D] text-[#EBE8F3] focus:ring-fuchsia-500 focus:border-fuchsia-500',
    footerBg: 'bg-[#030206] text-[#6E6782]',
    priceText: 'text-fuchsia-400 font-bold',
    labelClass: 'text-[#C4BED4]',
  },
};

export default function LandingPagePublicView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [landingPage, setLandingPage] = useState<LandingPage | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  
  // Location states
  const [divisions, setDivisions] = useState<BdLocationItem[]>([]);
  const [districts, setDistricts] = useState<BdLocationItem[]>([]);
  const [upazilas, setUpazilas] = useState<BdLocationItem[]>([]);

  const [selectedDivision, setSelectedDivision] = useState<number | ''>('');
  const [selectedDistrict, setSelectedDistrict] = useState<number | ''>('');
  const [selectedUpazila, setSelectedUpazila] = useState<number | ''>('');
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Shipping cost states
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShippingMethodCode, setSelectedShippingMethodCode] = useState<string>('');
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gallery and Active Image states
  const [activeImageSrc, setActiveImageSrc] = useState<string | null>(null);

  // Payment methods states
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodCode, setSelectedPaymentMethodCode] = useState<string>('cod');
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  // Find currently selected variant details
  const selectedVariant = useMemo(() => {
    if (!product || !selectedVariantId) return null;
    return product.variants?.find(v => v.id === selectedVariantId) || null;
  }, [product, selectedVariantId]);

  // Load configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const data = await landingPageService.getLandingPageBySlug(slug);
        setLandingPage(data);
        if (data.product) {
          setProduct(data.product);
          // Set default variant if available
          const activeVariants = data.product.variants?.filter(v => v.is_active) || [];
          if (activeVariants.length > 0) {
            // Check default variant id
            const defaultId = data.product.default_variant_id ?? null;
            const hasDefault = defaultId ? activeVariants.some(v => v.id === defaultId) : false;
            setSelectedVariantId((hasDefault && defaultId) ? defaultId : activeVariants[0].id);
          }
        }
      } catch (err: unknown) {
        console.error('Failed to load landing page:', err);
        setError('Landing page not found or is currently inactive.');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [slug]);

  // Load locations on mount
  useEffect(() => {
    addressService.getDivisions()
      .then(data => setDivisions(data))
      .catch(err => console.error('Error fetching divisions:', err));
  }, []);


  const bannerSrc = useMemo(() => {
    if (landingPage?.banner_image) {
      return getImageUrl(landingPage.banner_image);
    }
    const primaryImg = product?.images?.find(img => img.is_primary) || product?.images?.[0];
    if (primaryImg?.image) {
      return getImageUrl(primaryImg.image);
    }
    return null;
  }, [landingPage, product]);

  // Set default active image
  useEffect(() => {
    if (bannerSrc) {
      setActiveImageSrc(bannerSrc);
    }
  }, [bannerSrc]);

  // Update active image when selected variant changes
  useEffect(() => {
    if (selectedVariant?.image_url) {
      setActiveImageSrc(selectedVariant.image_url);
    }
  }, [selectedVariant]);

  // Get additional product images to show in gallery
  const galleryImages = useMemo(() => {
    if (!product?.images) return [];
    const list: string[] = [];
    if (landingPage?.banner_image) {
      list.push(getImageUrl(landingPage.banner_image));
    }
    product.images.forEach(img => {
      const url = getImageUrl(img.image);
      if (!list.includes(url)) {
        list.push(url);
      }
    });
    return list;
  }, [landingPage, product]);

  const themeKey = landingPage?.template_type || 'default';
  const styles = themeStyles[themeKey] || themeStyles.default;

  // Handle location selectors
  const handleDivisionChange = (divId: number) => {
    setSelectedDivision(divId);
    setSelectedDistrict('');
    setSelectedUpazila('');
    setDistricts([]);
    setUpazilas([]);
    if (divId) {
      setLoadingLocations(true);
      addressService.getDistricts(divId)
        .then(data => setDistricts(data))
        .finally(() => setLoadingLocations(false));
    }
  };

  const handleDistrictChange = (distId: number) => {
    setSelectedDistrict(distId);
    setSelectedUpazila('');
    setUpazilas([]);
    if (distId) {
      setLoadingLocations(true);
      addressService.getUpazilas(distId)
        .then(data => setUpazilas(data))
        .finally(() => setLoadingLocations(false));
    }
  };



  // Find product base price or variant price
  const basePrice = useMemo(() => {
    if (selectedVariant) {
      return selectedVariant.discounted_price ?? selectedVariant.regular_price ?? 0;
    }
    if (product) {
      return product.sale_price ?? product.price ?? 0;
    }
    return 0;
  }, [product, selectedVariant]);

  const regularPrice = useMemo(() => {
    if (selectedVariant) {
      return selectedVariant.regular_price ?? 0;
    }
    if (product) {
      return product.price ?? 0;
    }
    return 0;
  }, [product, selectedVariant]);

  const isOnSale = basePrice < regularPrice;

  // Recalculate Shipping Fee dynamically
  useEffect(() => {
    if (!selectedDivision || !product) {
      setShippingCost(0);
      setSelectedShippingMethodCode('');
      return;
    }

    const subtotal = Number(basePrice) * quantity;
    setLoadingShipping(true);

    shippingService.getShippingMethods({
      amount: subtotal,
      item_count: quantity,
      division_id: Number(selectedDivision),
      district_id: selectedDistrict ? Number(selectedDistrict) : undefined,
      upazila_id: selectedUpazila ? Number(selectedUpazila) : undefined,
    })
      .then(methods => {
        setShippingMethods(methods);
        if (methods && methods.length > 0) {
          const method = methods[0];
          setShippingCost(Number(method.cost));
          setSelectedShippingMethodCode(method.code);
        } else {
          // Fallback to Dhaka / Outside Dhaka defaults
          const isDhakaDivision = Number(selectedDivision) === 6; // Dhaka
          const isDhakaCity = Number(selectedDistrict) === 47; // Dhaka district
          const fallbackCost = (isDhakaCity || (isDhakaDivision && !selectedDistrict)) ? 70 : 130;
          setShippingCost(fallbackCost);
          setSelectedShippingMethodCode(isDhakaCity || (isDhakaDivision && !selectedDistrict) ? 'insidedhaka' : 'outsidedhaka');
        }
      })
      .catch(err => {
        console.error('Error loading shipping details:', err);
        // Apply default fallback
        const isDhakaDivision = Number(selectedDivision) === 6;
        const fallbackCost = isDhakaDivision ? 70 : 130;
        setShippingCost(fallbackCost);
        setSelectedShippingMethodCode(isDhakaDivision ? 'insidedhaka' : 'outsidedhaka');
      })
      .finally(() => {
        setLoadingShipping(false);
      });
  }, [selectedDivision, selectedDistrict, selectedUpazila, basePrice, quantity, product]);

  // Totals calculations
  const subtotal = basePrice * quantity;
  const baseOrderAmount = subtotal + shippingCost;

  // Fetch payment methods based on base order amount
  useEffect(() => {
    if (!product) return;

    setLoadingPaymentMethods(true);
    paymentService.getPaymentMethods(baseOrderAmount)
      .then(methods => {
        setPaymentMethods(methods);
        if (methods.length > 0) {
          setSelectedPaymentMethodCode(current => {
            if (current && methods.some(m => m.code === current)) {
              return current;
            }
            return methods[0].code;
          });
        } else {
          setSelectedPaymentMethodCode('cod');
        }
      })
      .catch(err => {
        console.error('Error fetching payment methods:', err);
        setPaymentMethods([]);
        setSelectedPaymentMethodCode('cod');
      })
      .finally(() => {
        setLoadingPaymentMethods(false);
      });
  }, [product, baseOrderAmount]);

  const selectedPaymentMethod = useMemo(() => {
    return paymentMethods.find(m => m.code === selectedPaymentMethodCode) || null;
  }, [paymentMethods, selectedPaymentMethodCode]);

  const paymentCharge = selectedPaymentMethod?.extra_charge?.calculated ?? 0;
  const grandTotal = baseOrderAmount + paymentCharge;

  // Variant selector attribute mapping e.g., "Size: M, Color: Red"
  const getVariantLabel = (variant: ProductVariant) => {
    if (variant.name) return variant.name;
    const attrs = variant.attributes || [];
    if (attrs.length > 0) {
      return attrs.map(attr => attr.value).join(' / ');
    }
    return `Variant #${variant.id}`;
  };

  // Submit Direct Order
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;

    if (!name.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    if (!phone.trim() || phone.length < 11 || !phone.startsWith('01')) {
      toast.error('Please enter a valid 11-digit mobile number starting with 01');
      return;
    }

    if (!address.trim() || address.length < 5) {
      toast.error('Please provide a detailed shipping address');
      return;
    }

    if (!selectedDivision) {
      toast.error('Please select your shipping Division');
      return;
    }

    if (!selectedShippingMethodCode) {
      toast.error('Shipping method is not available for selected area');
      return;
    }

    try {
      setIsSubmitting(true);
      const divisionName = divisions.find(item => item.id === Number(selectedDivision))?.name || '';
      const districtName = districts.find(item => item.id === Number(selectedDistrict))?.name || '';
      const upazilaName = upazilas.find(item => item.id === Number(selectedUpazila))?.name || '';

      const locationText = [upazilaName, districtName, divisionName]
        .filter(Boolean)
        .join(', ');

      const checkoutFieldsPayload = {
        shipping_name: name.trim(),
        shipping_phone: phone.trim(),
        shipping_address: address.trim(),
        shipping_division_id: Number(selectedDivision),
        ...(selectedDistrict ? { shipping_district_id: Number(selectedDistrict) } : {}),
        ...(selectedUpazila ? { shipping_upazila_id: Number(selectedUpazila) } : {}),
        shipping_location_text: locationText,
        shipping_city: districtName || divisionName || 'BD',
        shipping_state: divisionName || 'BD',
        shipping_country: 'Bangladesh',
        order_notes: notes.trim()
      };

      const orderData = {
        payment_method: selectedPaymentMethodCode,
        shipping_method: selectedShippingMethodCode,
        order_source: `Landing Page: ${landingPage?.title || slug}`,
        items: [
          {
            product_id: product.id,
            quantity: quantity,
            variant_id: selectedVariantId || undefined
          }
        ],
        checkout_fields: checkoutFieldsPayload,
        notes: notes.trim()
      };

      const orderResult = await orderService.createOrder(orderData);

      toast.success('Order placed successfully!', { duration: 4000 });

      // Redirect helper based on selected payment method
      const orderNumber = orderResult.order_number;
      const guestToken = orderResult.guest_access_token;
      const guestPaymentQuery = guestToken
        ? `?guest_token=${encodeURIComponent(guestToken)}&order_number=${encodeURIComponent(orderNumber)}`
        : '';

      if (selectedPaymentMethodCode === 'stripe') {
        router.push(`/payment/stripe/${orderResult.id}${guestPaymentQuery}`);
        return;
      } else if (selectedPaymentMethodCode === 'bkash') {
        router.push(`/payment/bkash/${orderResult.id}${guestPaymentQuery}`);
        return;
      } else if (orderResult.payment_url) {
        window.location.href = orderResult.payment_url;
        return;
      }
      
      router.push(`/order-received?order=${orderNumber}${guestToken ? `&guest_token=${guestToken}` : ''}`);
    } catch (err: unknown) {
      console.error('Order creation error:', err);
      const msg = err instanceof Error ? err.message : 'An error occurred while creating order. Please check inputs and try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScrollToForm = () => {
    const el = document.getElementById('checkout-form-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <i className="bi bi-arrow-repeat text-5xl animate-spin text-cyan-500 mb-3"></i>
        <p className="text-lg font-medium text-slate-400">Loading premium showcase...</p>
      </div>
    );
  }

  if (error || !landingPage || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center">
          <i className="bi bi-exclamation-triangle text-5xl text-rose-500 mb-4"></i>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Showcase Not Available</h1>
          <p className="text-slate-400 mb-6">{error || 'This landing page has been disabled or removed.'}</p>
          <Link href="/">
            <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold px-6 py-2">
              Browse Store
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} ${themeKey === 'clothing' ? 'font-sans' : 'font-sans'} antialiased pb-12`}>
      
      {/* Dynamic Niche Header Custom CSS Injector */}
      {landingPage.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: landingPage.custom_css }} />
      )}

      {/* Floating Purchase Sticky Bar (Mobile Only) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-3 flex items-center justify-between shadow-2xl">
        <div>
          <span className="text-xs text-gray-500 block">Buy Directly</span>
          <span className="text-lg font-bold text-rose-600">{formatPrice(basePrice)}</span>
        </div>
        <button
          onClick={handleScrollToForm}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide ${styles.primaryBtn} animate-pulse`}
          style={{ animationDuration: '2.5s' }}
        >
          <i className="bi bi-cart-fill me-1"></i> Order Now
        </button>
      </div>

      {/* Hero Banner Showcase Area */}
      <div className={`relative overflow-hidden ${styles.heroBg} py-8 md:py-16 px-4`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-12">
          
          <div className="flex-1 text-center md:text-left">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${styles.accentBadge} mb-4`}>
              <i className="bi bi-star-fill text-yellow-400"></i> Special Showcase Offer
            </span>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight mb-4">
              {landingPage.title}
            </h1>
            {product.short_description ? (
              <div 
                className="text-sm md:text-lg opacity-90 mb-6 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: product.short_description }}
              />
            ) : (
              <p className="text-sm md:text-lg opacity-90 mb-6 leading-relaxed">
                {product.name}
              </p>
            )}
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold">{formatPrice(basePrice)}</span>
                {isOnSale && (
                  <span className="text-sm md:text-base line-through opacity-60">{formatPrice(regularPrice)}</span>
                )}
              </div>
              {isOnSale && (
                <span className="bg-red-600 text-white font-bold text-xs px-2.5 py-1 rounded-md flex items-center">
                  SAVE {Math.round(((Number(regularPrice) - Number(basePrice)) / Number(regularPrice)) * 100)}%
                </span>
              )}
            </div>
            
            <button
              onClick={handleScrollToForm}
              className={`hidden md:inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-extrabold text-base tracking-wide shadow-xl ${styles.primaryBtn} transform transition hover:scale-105`}
            >
              <i className="bi bi-cart-fill"></i> Order Now (Cash on Delivery)
            </button>
          </div>

          {activeImageSrc && (
            <div className="flex-1 w-full max-w-md md:max-w-none space-y-4">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={activeImageSrc}
                  alt={landingPage.title}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              </div>
              {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageSrc(imgUrl)}
                      className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                        activeImageSrc === imgUrl ? 'border-opacity-100 scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      style={{ borderColor: activeImageSrc === imgUrl ? landingPage.theme_color : undefined }}
                    >
                      <img src={imgUrl} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 md:mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          
          {/* Left Column: Product Info, Video, Features, Reviews */}
          <div className="lg:col-span-7 space-y-8 md:space-y-12">
            
            {/* Dynamic Product Showcase Media */}
            {landingPage.video_embed_code && (
              <div className={`${styles.card} p-4 rounded-3xl overflow-hidden`}>
                <h3 className="text-lg font-bold mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-play-circle-fill text-red-500"></i> Video Showcase
                </h3>
                <div className="relative aspect-video rounded-2xl overflow-hidden shadow-inner bg-black">
                  <div 
                    className="absolute inset-0 w-full h-full [&_iframe]:w-full [&_iframe]:h-full"
                    dangerouslySetInnerHTML={{ __html: landingPage.video_embed_code }}
                  />
                </div>
              </div>
            )}

            {/* Premium Niche Trust Badges Box */}
            <div className="grid grid-cols-3 gap-4">
              {themeKey === 'sexual_item' && (
                <div className={`col-span-3 ${styles.card} p-4 rounded-2xl flex items-start gap-3 border border-purple-500/20`}>
                  <i className="bi bi-shield-lock-fill text-2xl text-purple-500"></i>
                  <div>
                    <h5 className="font-bold text-sm text-purple-400">🔒 100% Discrete Packaging & Privacy Guaranteed</h5>
                    <p className="text-xs text-slate-400 mt-1">No product names are shown on the invoice or package. Secure & confidential delivery.</p>
                  </div>
                </div>
              )}

              {themeKey === 'am' && (
                <div className={`col-span-3 ${styles.card} p-4 rounded-2xl flex items-start gap-3 border border-green-500/20`}>
                  <i className="bi bi-patch-check-fill text-2xl text-green-600"></i>
                  <div>
                    <h5 className="font-bold text-sm text-[#437A2C]">🍎 Direct From Rajshahi Orchard</h5>
                    <p className="text-xs text-stone-600 mt-1">Freshly handpicked, chemically untreated, naturally sweet mangoes packed with extreme care.</p>
                  </div>
                </div>
              )}

              {themeKey === 'khejur' && (
                <div className={`col-span-3 ${styles.card} p-4 rounded-2xl flex items-start gap-3 border border-amber-500/20`}>
                  <i className="bi bi-tree-fill text-2xl text-amber-700"></i>
                  <div>
                    <h5 className="font-bold text-sm text-[#8E4F18]">🌴 Premium Quality Madinah Dates</h5>
                    <p className="text-xs text-stone-600 mt-1">100% organic, premium selection, rich in nutrients and naturally sweet dates.</p>
                  </div>
                </div>
              )}

              {themeKey === 'clothing' && (
                <div className={`col-span-3 ${styles.card} p-4 rounded-2xl flex items-start gap-3 border border-neutral-300`}>
                  <i className="bi bi-award-fill text-2xl text-neutral-800"></i>
                  <div>
                    <h5 className="font-bold text-sm text-black uppercase tracking-wider">👗 Premium Quality Apparel</h5>
                    <p className="text-xs text-neutral-600 mt-1">Stitched using organic fabrics. Standard Bangladesh sizing with 7-day hassle-free replacement.</p>
                  </div>
                </div>
              )}

              {themeKey === 'inner_item' && (
                <div className={`col-span-3 ${styles.card} p-4 rounded-2xl flex items-start gap-3 border border-rose-200`}>
                  <i className="bi bi-suit-heart-fill text-2xl text-rose-500"></i>
                  <div>
                    <h5 className="font-bold text-sm text-stone-900">🎀 Premium Quality & Comfort First</h5>
                    <p className="text-xs text-stone-600 mt-1">Extremely soft, breathable, luxury styling engineered for maximum confidence & support.</p>
                  </div>
                </div>
              )}

              {themeKey === 'digital_item' && (
                <div className={`col-span-3 ${styles.card} p-4 rounded-2xl flex items-start gap-3 border border-cyan-800/40`}>
                  <i className="bi bi-lightning-charge-fill text-2xl text-cyan-400"></i>
                  <div>
                    <h5 className="font-bold text-sm text-cyan-400">⚡ Instant Delivery / Access</h5>
                    <p className="text-xs text-slate-400 mt-1">PDF download link or software access details are sent instantly via SMS and Email after payment.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Features List */}
            {landingPage.features && landingPage.features.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-extrabold tracking-tight mb-4">Why Choose This?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {landingPage.features.map((feat, index) => (
                    <div key={index} className={`${styles.card} p-5 rounded-2xl flex gap-3 align-start`}>
                      <span className="p-2 rounded-xl text-lg flex-shrink-0 bg-opacity-10" style={{ backgroundColor: landingPage.theme_color + '15', color: landingPage.theme_color }}>
                        <i className={`bi ${feat.icon || 'bi-patch-check-fill'}`}></i>
                      </span>
                      <div>
                        <h4 className="font-bold text-base mb-1">{feat.title}</h4>
                        <p className="text-xs opacity-80 leading-relaxed">{feat.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product description block */}
            <div className={`${styles.card} p-6 rounded-3xl space-y-4`}>
              <h3 className="text-lg font-bold border-b pb-2">Product Description</h3>
              {product.description ? (
                <div 
                  className="text-sm leading-relaxed space-y-3 opacity-90 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              ) : (
                <div className="text-sm leading-relaxed space-y-3 opacity-90">
                  No detailed description available.
                </div>
              )}
            </div>

            {/* Testimonials Review Feed */}
            {landingPage.testimonials && landingPage.testimonials.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-extrabold tracking-tight">Verified Buyer Reviews</h3>
                <div className="space-y-4">
                  {landingPage.testimonials.map((test, index) => (
                    <div key={index} className={`${styles.card} p-5 rounded-2xl`}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                            {test.name ? test.name.charAt(0) : 'U'}
                          </div>
                          <strong className="text-sm font-bold">{test.name}</strong>
                          <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                            <i className="bi bi-shield-check"></i> Verified Buyer
                          </span>
                        </div>
                        <div className="flex gap-0.5 text-yellow-400 text-xs">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <i key={i} className={`bi bi-star-fill ${i < (test.rating || 5) ? 'text-yellow-400' : 'text-slate-600'}`}></i>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs opacity-90 leading-relaxed pl-10 italic">
                        &ldquo;{test.comment}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Order Checkout form container */}
          <div className="lg:col-span-5">
            <div 
              id="checkout-form-container" 
              className={`${styles.card} p-6 rounded-3xl border-2 sticky top-6`}
              style={{ borderColor: landingPage.theme_color + '40' }}
            >
              <div className="text-center border-b pb-4 mb-6">
                <span className="text-xs uppercase tracking-wider font-extrabold text-red-500 animate-pulse">
                  ⚡ Order Directly via Cash on Delivery
                </span>
                <h3 className="text-xl font-black mt-1">Easy Checkout Form</h3>
                <p className="text-xs text-gray-500 mt-1">Please fill in your correct address details below</p>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="space-y-5">
                
                {/* Variant selection grid (if variable product) */}
                {product.variants && product.variants.filter(v => v.is_active).length > 0 && (
                  <div className="space-y-2">
                    <label className={`form-label small fw-bold text-xs uppercase ${styles.labelClass}`}>
                      Select Option / Size / Color
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {product.variants.filter(v => v.is_active).map(variant => {
                        const isOutOfStock = variant.stock_quantity !== undefined && variant.stock_quantity <= 0;
                        return (
                          <label
                            key={variant.id}
                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition ${
                              isOutOfStock ? 'opacity-50 cursor-not-allowed bg-gray-100/10' : 'cursor-pointer hover:opacity-100'
                            } ${
                              selectedVariantId === variant.id && !isOutOfStock
                                ? 'border-opacity-100 bg-opacity-5'
                                : 'border-gray-200'
                            }`}
                            style={{
                              borderColor: selectedVariantId === variant.id && !isOutOfStock ? landingPage.theme_color : undefined,
                              backgroundColor: selectedVariantId === variant.id && !isOutOfStock ? landingPage.theme_color + '10' : undefined
                            }}
                          >
                            <div className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name="variant_select"
                                disabled={isOutOfStock}
                                checked={selectedVariantId === variant.id}
                                onChange={() => !isOutOfStock && setSelectedVariantId(variant.id)}
                                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                style={{ accentColor: landingPage.theme_color }}
                              />
                              <span className="font-semibold">
                                {getVariantLabel(variant)}
                                {isOutOfStock && <span className="text-rose-500 text-xs ml-1 font-bold">(Out of Stock)</span>}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-rose-500">
                                {formatPrice(variant.discounted_price ?? variant.regular_price ?? 0)}
                              </span>
                              {Number(variant.discounted_price) < Number(variant.regular_price) && (
                                <span className="text-xs block line-through opacity-50">
                                  {formatPrice(variant.regular_price)}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity selector */}
                <div className="flex items-center justify-between border-b pb-4">
                  <span className={`text-sm font-semibold ${styles.labelClass}`}>Quantity</span>
                  <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 hover:bg-gray-100 text-gray-700 transition font-bold"
                    >
                      <i className="bi bi-dash"></i>
                    </button>
                    <span className="px-4 py-1.5 font-bold text-sm text-gray-900 min-w-[40px] text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.min(10, prev + 1))}
                      className="px-3 py-1.5 hover:bg-gray-100 text-gray-700 transition font-bold"
                    >
                      <i className="bi bi-plus"></i>
                    </button>
                  </div>
                </div>

                {/* Name field */}
                <div className="space-y-1">
                  <label className={`form-label small fw-bold text-xs uppercase ${styles.labelClass}`}>
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className={styles.inputClass}
                    required
                  />
                </div>

                {/* Phone field */}
                <div className="space-y-1">
                  <label className={`form-label small fw-bold text-xs uppercase ${styles.labelClass}`}>
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 01712345678"
                    className={styles.inputClass}
                    required
                  />
                  <div className="text-[10px] text-gray-400">Provide 11 digits mobile number for order verification SMS.</div>
                </div>

                {/* Address field */}
                <div className="space-y-1">
                  <label className={`form-label small fw-bold text-xs uppercase ${styles.labelClass}`}>
                    Delivery Address <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House number, road number, village, area..."
                    className={`form-control rounded-xl text-sm ${styles.inputClass}`}
                    rows={2}
                    required
                  />
                </div>

                {/* Bangladesh location cascades */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className={`form-label small fw-bold text-xs uppercase ${styles.labelClass}`}>
                      Division <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedDivision}
                      onChange={(e) => handleDivisionChange(Number(e.target.value))}
                      className={`form-select rounded-xl text-sm ${styles.inputClass}`}
                      required
                    >
                      <option value="">Select</option>
                      {divisions.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={`form-label small fw-bold text-xs uppercase ${styles.labelClass}`}>
                      District
                    </label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => handleDistrictChange(Number(e.target.value))}
                      className={`form-select rounded-xl text-sm ${styles.inputClass}`}
                      disabled={!selectedDivision || loadingLocations}
                    >
                      <option value="">Select</option>
                      {districts.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={`form-label small fw-bold text-xs uppercase ${styles.labelClass}`}>
                      Upazila
                    </label>
                    <select
                      value={selectedUpazila}
                      onChange={(e) => setSelectedUpazila(Number(e.target.value))}
                      className={`form-select rounded-xl text-sm ${styles.inputClass}`}
                      disabled={!selectedDistrict || loadingLocations}
                    >
                      <option value="">Select</option>
                      {upazilas.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Order Notes */}
                <div className="space-y-1">
                  <label className={`form-label small fw-bold text-xs uppercase ${styles.labelClass}`}>
                    Special Delivery Instructions (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. deliver after 3 PM, wrap tightly..."
                    className={`form-control rounded-xl text-sm ${styles.inputClass}`}
                    rows={1}
                  />
                </div>

                {/* Payment Method Selector */}
                {paymentMethods.length > 0 && (
                  <div className="space-y-2">
                    <label className={`form-label small fw-bold text-xs uppercase ${styles.labelClass}`}>
                      Select Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentMethods.map(method => (
                        <label
                          key={method.code}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ${
                            selectedPaymentMethodCode === method.code
                              ? 'border-opacity-100 bg-opacity-5'
                              : 'border-gray-200 opacity-80 hover:opacity-100'
                          }`}
                          style={{
                            borderColor: selectedPaymentMethodCode === method.code ? landingPage.theme_color : undefined,
                            backgroundColor: selectedPaymentMethodCode === method.code ? landingPage.theme_color + '10' : undefined
                          }}
                        >
                          <input
                            type="radio"
                            name="payment_method_select"
                            checked={selectedPaymentMethodCode === method.code}
                            onChange={() => setSelectedPaymentMethodCode(method.code)}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                            style={{ accentColor: landingPage.theme_color }}
                          />
                          <div className="flex flex-col text-xs">
                            <span className="font-semibold capitalize">{method.name || method.code}</span>
                            {method.extra_charge && method.extra_charge.calculated > 0 && (
                              <span className="text-[10px] text-gray-400">
                                +{formatPrice(method.extra_charge.calculated)} charge
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pricing Order Summary Cards */}
                <div className="bg-slate-500/5 rounded-2xl p-4 border border-gray-300/10 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subtotal ({quantity} {quantity > 1 ? 'items' : 'item'})</span>
                    <span className="font-bold">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 flex items-center gap-1">
                      Shipping Fee 
                      {loadingShipping && <i className="bi bi-arrow-repeat animate-spin text-[10px]"></i>}
                    </span>
                    <span className="font-bold text-slate-100">
                      {shippingCost === 0 ? 'Free Shipping' : formatPrice(shippingCost)}
                    </span>
                  </div>
                  {paymentCharge > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">
                        {selectedPaymentMethod?.extra_charge?.label || 'Gateway Surcharge'}
                      </span>
                      <span className="font-bold text-slate-100">
                        {formatPrice(paymentCharge)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-300/10 pt-2 flex justify-between items-center text-sm">
                    <span className="font-bold">Total Bill</span>
                    <span className={`text-base font-black text-rose-500`}>
                      {formatPrice(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Trust COD/Online Payment note */}
                {selectedPaymentMethod?.is_pay_on_delivery ? (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-emerald-500 rounded-2xl text-[10px] flex items-start gap-2">
                    <i className="bi bi-cash text-sm"></i>
                    <div>
                      <span className="font-bold block">Cash on Delivery Available</span>
                      You only pay the delivery man after receiving and verifying the package.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 rounded-2xl text-[10px] flex items-start gap-2">
                    <i className="bi bi-credit-card-2-front text-sm"></i>
                    <div>
                      <span className="font-bold block">Secure Online Payment</span>
                      Pay securely with {selectedPaymentMethod?.name || 'online payment'} to complete your order.
                    </div>
                  </div>
                )}

                {/* Submit Checkout Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-widest uppercase transition flex items-center justify-center gap-2 ${styles.primaryBtn} ${
                    isSubmitting ? 'opacity-80 cursor-not-allowed' : 'hover:scale-[1.01]'
                  }`}
                  style={{
                    backgroundColor: !isSubmitting ? landingPage.theme_color : undefined
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin text-sm"></i> Placing Order...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cart-check-fill text-base"></i> {selectedPaymentMethod?.is_pay_on_delivery ? 'Confirm Cash on Delivery Order' : `Pay & Confirm with ${selectedPaymentMethod?.name || 'Payment Method'}`}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <div className={`mt-16 border-t border-gray-300/10 pt-8 text-center text-xs opacity-60`}>
        <p>&copy; {new Date().getFullYear()} {product.name}. All Rights Reserved.</p>
        <p className="mt-1">Cash on Delivery across Bangladesh. For support contact merchant.</p>
      </div>

    </div>
  );
}
