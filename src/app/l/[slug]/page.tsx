'use client';

import { use, useEffect, useState, useMemo, useRef } from 'react';
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
  settingsService,
  abandonedCartService,
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
  // Multiple products support
  const [products, setProducts] = useState<Product[]>([]);
  // Primary product (first in list, kept for backward compat)
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [debouncedAddress, setDebouncedAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Debounce address updates to minimize api traffic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAddress(address);
    }, 500);
    return () => {
      clearTimeout(handler);
    };
  }, [address]);
  
  // Header and Social settings states
  const [generalSettings, setGeneralSettings] = useState<any>(null);
  const [socialSettings, setSocialSettings] = useState<any>(null);

  // Cart and product selection states
  interface CartItem {
    productId: number;
    variantId: number | null;
    name: string;
    price: number;
    image: string | null;
    color: string | null;
    size: string | null;
    quantity: number;
  }
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activeSizeSelectorColor, setActiveSizeSelectorColor] = useState<string | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

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
  const [hasCompleted, setHasCompleted] = useState(false);

  // Gallery and Active Image states
  const [activeImageSrc, setActiveImageSrc] = useState<string | null>(null);

  // Payment methods states
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodCode, setSelectedPaymentMethodCode] = useState<string>('cod');
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  // Load configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const data = await landingPageService.getLandingPageBySlug(slug);
        setLandingPage(data);
        // Support multiple products: prefer linked_products, fallback to product
        const allProducts: Product[] = data.linked_products && data.linked_products.length > 0
          ? data.linked_products
          : data.product
            ? [data.product]
            : [];
        setProducts(allProducts);
        if (allProducts.length > 0) {
          setProduct(allProducts[0]);
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

  // Load general and social settings on mount
  useEffect(() => {
    settingsService.getGeneral()
      .then(data => setGeneralSettings(data))
      .catch(err => console.error('Error fetching general settings:', err));

    settingsService.getGroup('social')
      .then(data => setSocialSettings(data))
      .catch(err => console.error('Error fetching social settings:', err));
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

  // Get additional product images to show in gallery (from all products)
  const galleryImages = useMemo(() => {
    const list: string[] = [];
    if (landingPage?.banner_image) {
      list.push(getImageUrl(landingPage.banner_image));
    }
    products.forEach(p => {
      (p.images || []).forEach(img => {
        const url = getImageUrl(img.image);
        if (!list.includes(url)) {
          list.push(url);
        }
      });
    });
    return list;
  }, [landingPage, products]);

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



  // Find product base price (from primary product)
  const basePrice = useMemo(() => {
    if (product) {
      return product.sale_price ?? product.price ?? 0;
    }
    return 0;
  }, [product]);

  const regularPrice = useMemo(() => {
    if (product) {
      return product.price ?? 0;
    }
    return 0;
  }, [product]);

  const isOnSale = basePrice < regularPrice;

  // Cart operations (supports multiple products via productId)
  const handleAddToCart = (newItem: Omit<CartItem, 'quantity'>) => {
    setCartItems(prev => {
      const existingIdx = prev.findIndex(item =>
        item.productId === newItem.productId && item.variantId === newItem.variantId
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        toast.success(`${newItem.name} এর পরিমাণ বাড়ানো হয়েছে!`);
        return updated;
      }
      toast.success(`${newItem.name} কার্টে যোগ করা হয়েছে!`);
      return [...prev, { ...newItem, quantity: 1 }];
    });
    setActiveSizeSelectorColor(null);
  };

  const handleUpdateQuantity = (idx: number, amount: number) => {
    setCartItems(prev => {
      const updated = [...prev];
      const newQty = updated[idx].quantity + amount;
      if (newQty >= 1) {
        updated[idx].quantity = newQty;
      }
      return updated;
    });
  };

  const handleRemoveFromCart = (idx: number) => {
    setCartItems(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      toast.success('পণ্যটি কার্ট থেকে সরানো হয়েছে');
      return updated;
    });
  };

  // Build per-product color groups (multi-product aware)
  const productColorGroups = useMemo(() => {
    return products.map(prod => {
      const activeVariants = prod.variants?.filter(v => v.is_active) || [];

      const buildGroups = () => {
        if (activeVariants.length === 0) {
          return [{
            colorName: 'Default',
            image: prod.image_url || (prod.images?.[0] ? getImageUrl(prod.images[0].image) : null),
            price: prod.sale_price ?? prod.price ?? 0,
            regularPrice: prod.price ?? 0,
            variants: [] as typeof activeVariants,
            sizes: [] as { value: string; variantId: number; stock: number; inStock: boolean }[]
          }];
        }

        const groups: { [key: string]: typeof activeVariants } = {};
        activeVariants.forEach(v => {
          // FIX: Backend uses 'attribute_values', and each has an 'attribute' relation
          const sourceProps = v.attributes || (v as any).attribute_values || [];
          const colorAttr = sourceProps.find((a: any) => {
            const slug = a.attribute_slug || a.attribute?.slug || '';
            const name = a.attribute_name || a.attribute?.name || '';
            return slug === 'color' || name.toLowerCase().includes('color') || name.includes('কালার');
          });
          const colorVal = colorAttr ? colorAttr.value : 'Default';
          if (!groups[colorVal]) groups[colorVal] = [];
          groups[colorVal].push(v);
        });

        return Object.keys(groups).map(colorName => {
          const variantsInGroup = groups[colorName];
          const firstVarWithImg = variantsInGroup.find(v => v.image_url);
          const img = firstVarWithImg?.image_url || prod.image_url || (prod.images?.[0] ? getImageUrl(prod.images[0].image) : null);

          const sizes = variantsInGroup.map(v => {
            const sourceProps = v.attributes || (v as any).attribute_values || [];
            // Find any attribute that represents a variant option but is NOT the color.
            // E.g., 'size', 'bra-size', 'waist', 'dimension', etc.
            const sizeAttr = sourceProps.find((a: any) => {
              const slug = a.attribute_slug || a.attribute?.slug || '';
              const name = a.attribute_name || a.attribute?.name || '';
              const isColor = slug === 'color' || name.toLowerCase().includes('color') || name.includes('কালার');
              return !isColor;
            });
            return sizeAttr ? {
              value: sizeAttr.value,
              variantId: v.id,
              stock: v.stock_quantity,
              inStock: v.stock_quantity > 0
            } : null;
          }).filter(Boolean) as { value: string; variantId: number; stock: number; inStock: boolean }[];

          const uniqueSizes = sizes.filter((s, idx, self) =>
            self.findIndex(t => t.value === s.value) === idx
          );

          const firstVar = variantsInGroup[0];
          const price = firstVar.discounted_price ?? firstVar.regular_price ?? 0;
          const rPrice = firstVar.regular_price ?? 0;

          return { colorName, image: img, price, regularPrice: rPrice, variants: variantsInGroup, sizes: uniqueSizes };
        });
      };

      return { product: prod, colorGroups: buildGroups() };
    });
  }, [products]);

  // Legacy colorGroups for the primary product (kept for compat)
  const colorGroups = productColorGroups[0]?.colorGroups ?? [];

  // Cart calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  const totalQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const baseOrderAmount = useMemo(() => {
    return subtotal + shippingCost;
  }, [subtotal, shippingCost]);

  // Recalculate Shipping Fee dynamically
  useEffect(() => {
    const isLocationRequired = landingPage?.show_location !== false;
    
    const hasLocationInput = isLocationRequired
      ? (selectedDivision || debouncedAddress.trim().length > 0)
      : true;

    if (products.length === 0 || totalQuantity === 0 || !hasLocationInput) {
      setShippingCost(0);
      setSelectedShippingMethodCode('');
      return;
    }

    setLoadingShipping(true);

    const queryParams: any = {
      amount: subtotal,
      item_count: totalQuantity,
    };

    if (isLocationRequired) {
      if (selectedDivision) queryParams.division_id = Number(selectedDivision);
      if (selectedDistrict) queryParams.district_id = Number(selectedDistrict);
      if (selectedUpazila) queryParams.upazila_id = Number(selectedUpazila);
    }

    const locationText = debouncedAddress.trim();
    if (locationText) {
      queryParams.location_text = locationText;
    }

    shippingService.getShippingMethods(queryParams)
      .then(methods => {
        setShippingMethods(methods);
        if (methods && methods.length > 0) {
          const firstMethod = methods[0];
          setSelectedShippingMethodCode(firstMethod.code);
          setShippingCost(Number(firstMethod.cost));
        } else {
          // Fallback to Dhaka / Outside Dhaka defaults
          const addressLower = locationText.toLowerCase();
          const isDhakaKeyword = addressLower.includes('dhaka') || addressLower.includes('ঢাকা');
          const isDhakaDivision = isLocationRequired ? (Number(selectedDivision) === 6) : isDhakaKeyword;
          const isDhakaCity = isLocationRequired ? (Number(selectedDistrict) === 47) : isDhakaKeyword;
          const fallbackCost = (isDhakaCity || (isDhakaDivision && !selectedDistrict)) ? 70 : 130;
          setShippingCost(fallbackCost);
          setSelectedShippingMethodCode(isDhakaCity || (isDhakaDivision && !selectedDistrict) ? 'insidedhaka' : 'outsidedhaka');
        }
      })
      .catch(err => {
        console.error('Error loading shipping details:', err);
        const addressLower = locationText.toLowerCase();
        const isDhakaKeyword = addressLower.includes('dhaka') || addressLower.includes('ঢাকা');
        const isDhakaDivision = isLocationRequired ? (Number(selectedDivision) === 6) : isDhakaKeyword;
        const fallbackCost = isDhakaDivision ? 70 : 130;
        setShippingCost(fallbackCost);
        setSelectedShippingMethodCode(isDhakaDivision ? 'insidedhaka' : 'outsidedhaka');
      })
      .finally(() => {
        setLoadingShipping(false);
      });
  }, [selectedDivision, selectedDistrict, selectedUpazila, debouncedAddress, subtotal, totalQuantity, product, landingPage?.show_location]);

  // Fetch payment methods based on base order amount
  useEffect(() => {
    if (products.length === 0 || baseOrderAmount === 0) return;

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

  // Track Abandoned Cart
  const lastAbandonedTrackSignatureRef = useRef('');

  const abandonedCartTrackingPayload = useMemo(() => {
    if (products.length === 0 || cartItems.length === 0 || isSubmitting || hasCompleted) {
      return null;
    }

    const isLocationRequired = landingPage?.show_location !== false;
    const hasShippingInput = name.trim().length > 0 || phone.trim().length > 0 || address.trim().length > 0;
    const checkoutStep: 'cart' | 'shipping' | 'payment' =
      selectedPaymentMethodCode && selectedShippingMethodCode
        ? 'payment'
        : hasShippingInput
          ? 'shipping'
          : 'cart';

    const divisionName = isLocationRequired ? (divisions.find(item => item.id === Number(selectedDivision))?.name || '') : '';
    const districtName = isLocationRequired ? (districts.find(item => item.id === Number(selectedDistrict))?.name || '') : '';
    const upazilaName = isLocationRequired ? (upazilas.find(item => item.id === Number(selectedUpazila))?.name || '') : '';

    const locationText = isLocationRequired 
      ? [upazilaName, districtName, divisionName].filter(Boolean).join(', ')
      : address.trim();

    const checkoutFieldsPayload: Record<string, string | number> = {
      shipping_name: name.trim(),
      shipping_phone: phone.trim(),
      shipping_address: address.trim(),
      shipping_country: 'Bangladesh',
      order_notes: notes.trim(),
    };

    if (isLocationRequired) {
      if (selectedDivision) checkoutFieldsPayload.shipping_division_id = Number(selectedDivision);
      if (selectedDistrict) checkoutFieldsPayload.shipping_district_id = Number(selectedDistrict);
      if (selectedUpazila) checkoutFieldsPayload.shipping_upazila_id = Number(selectedUpazila);
      checkoutFieldsPayload.shipping_city = districtName || divisionName || 'BD';
      checkoutFieldsPayload.shipping_state = divisionName || 'BD';
    } else {
      checkoutFieldsPayload.shipping_city = 'BD';
      checkoutFieldsPayload.shipping_state = 'BD';
    }

    return {
      checkout_step: checkoutStep,
      landing_page_slug: slug,
      phone: phone.trim() || undefined,
      name: name.trim() || undefined,
      checkout_fields: checkoutFieldsPayload,
      shipping_address: address.trim() || undefined,
      shipping_location_text: locationText,
      shipping_division: divisionName || undefined,
      shipping_district: districtName || undefined,
      shipping_upazila: upazilaName || undefined,
      shipping_city: districtName || divisionName || 'BD',
      shipping_state: divisionName || 'BD',
      shipping_country: 'Bangladesh',
      payment_method: selectedPaymentMethodCode || undefined,
      shipping_method: selectedShippingMethodCode || undefined,
      cart_items: cartItems.map((item) => ({
        product_id: item.productId,
        product_name: item.name,
        product_image: item.image,
        variant_id: item.variantId || null,
        variant_name: [item.color, item.size].filter(Boolean).join(' / ') || null,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      })),
      subtotal: subtotal,
      total: grandTotal,
    };
  }, [
    product,
    cartItems,
    isSubmitting,
    hasCompleted,
    name,
    phone,
    address,
    notes,
    selectedDivision,
    selectedDistrict,
    selectedUpazila,
    selectedPaymentMethodCode,
    selectedShippingMethodCode,
    subtotal,
    grandTotal,
    landingPage,
    divisions,
    districts,
    upazilas,
    slug,
  ]);

  const abandonedCartTrackSignature = useMemo(() => {
    if (!abandonedCartTrackingPayload) {
      return '';
    }
    return JSON.stringify(abandonedCartTrackingPayload);
  }, [abandonedCartTrackingPayload]);

  useEffect(() => {
    if (cartItems.length === 0 || !abandonedCartTrackingPayload || !abandonedCartTrackSignature || isSubmitting || hasCompleted) {
      return;
    }

    if (lastAbandonedTrackSignatureRef.current === abandonedCartTrackSignature) {
      return;
    }

    const timer = window.setTimeout(() => {
      void abandonedCartService
        .track(abandonedCartTrackingPayload)
        .then(() => {
          lastAbandonedTrackSignatureRef.current = abandonedCartTrackSignature;
        })
        .catch((error) => {
          console.warn('Failed to track landing page abandoned cart state:', error);
        });
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [abandonedCartTrackSignature, abandonedCartTrackingPayload, isSubmitting, hasCompleted, cartItems.length]);

  // Submit Direct Order
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (products.length === 0) return;

    if (cartItems.length === 0) {
      toast.error('অনুগ্রহ করে অন্তত একটি প্রোডাক্ট কার্টে যোগ করুন');
      return;
    }

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

    const isLocationRequired = landingPage?.show_location !== false;

    if (isLocationRequired && !selectedDivision) {
      toast.error('Please select your shipping Division');
      return;
    }

    if (!selectedShippingMethodCode) {
      toast.error('Shipping method is not available for selected area');
      return;
    }

    try {
      setIsSubmitting(true);
      const divisionName = isLocationRequired ? (divisions.find(item => item.id === Number(selectedDivision))?.name || '') : '';
      const districtName = isLocationRequired ? (districts.find(item => item.id === Number(selectedDistrict))?.name || '') : '';
      const upazilaName = isLocationRequired ? (upazilas.find(item => item.id === Number(selectedUpazila))?.name || '') : '';

      const locationText = isLocationRequired 
        ? [upazilaName, districtName, divisionName].filter(Boolean).join(', ')
        : address.trim();

      const checkoutFieldsPayload = {
        shipping_name: name.trim(),
        shipping_phone: phone.trim(),
        shipping_address: address.trim(),
        ...(isLocationRequired ? {
          shipping_division_id: Number(selectedDivision),
          ...(selectedDistrict ? { shipping_district_id: Number(selectedDistrict) } : {}),
          ...(selectedUpazila ? { shipping_upazila_id: Number(selectedUpazila) } : {}),
          shipping_location_text: locationText,
          shipping_city: districtName || divisionName || 'BD',
          shipping_state: divisionName || 'BD',
        } : {
          shipping_city: 'BD',
          shipping_state: 'BD',
          shipping_location_text: locationText,
        }),
        shipping_country: 'Bangladesh',
        order_notes: notes.trim()
      };

      const orderData = {
        payment_method: selectedPaymentMethodCode,
        shipping_method: selectedShippingMethodCode,
        order_source: `Landing Page: ${landingPage?.title || slug}`,
        landing_page_slug: slug,
        items: cartItems.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
          variant_id: item.variantId || undefined
        })),
        checkout_fields: checkoutFieldsPayload,
        notes: notes.trim()
      };

      const orderResult = await orderService.createOrder(orderData);

      setHasCompleted(true);
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

  if (error || !landingPage || products.length === 0) {
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
          <span className="text-xs text-gray-500 block">
            {cartItems.length > 0 ? `${totalQuantity} items` : 'Buy Directly'}
          </span>
          <span className="text-lg font-bold text-rose-600">
            {formatPrice(cartItems.length > 0 ? grandTotal : basePrice)}
          </span>
        </div>
        <button
          onClick={handleScrollToForm}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide ${styles.primaryBtn} animate-pulse`}
          style={{ animationDuration: '2.5s' }}
        >
          <i className="bi bi-cart-fill me-1"></i> Checkout Now
        </button>
      </div>

      {/* Top Header Layout Bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between px-4 py-3 gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center hover:opacity-90 transition">
            {generalSettings?.site_logo ? (
              <img
                src={getImageUrl(generalSettings.site_logo)}
                alt={generalSettings?.site_name || 'Store Logo'}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <span className="text-xl font-extrabold tracking-tight text-gray-900">
                {generalSettings?.site_name || 'Store'}
              </span>
            )}
          </Link>
          {/* Middle Text */}
          <div className="text-center font-bold text-sm text-rose-600 animate-pulse">
            আজকের স্পেশাল অফার! দেশজুড়ে ক্যাশ অন ডেলিভারি
          </div>
          {/* Right Contact & Social links */}
          <div className="flex items-center gap-4 text-sm font-bold text-gray-800">
            {generalSettings?.contact_phone && (
              <a
                href={`tel:${generalSettings.contact_phone}`}
                className="flex items-center gap-1.5 hover:text-rose-600 transition"
              >
                <i className="bi bi-telephone-fill text-rose-500"></i>
                {generalSettings.contact_phone}
              </a>
            )}
            {socialSettings?.facebook && (
              <a
                href={socialSettings.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 text-lg transition"
              >
                <i className="bi bi-facebook"></i>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Banner Showcase Area */}
      {bannerSrc && (
        <div className="max-w-6xl mx-auto mt-4 px-4">
          <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-gray-50">
            <img
              src={bannerSrc}
              alt={landingPage.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Headline & Subtitle Area */}
      <div className="max-w-4xl mx-auto text-center mt-8 px-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${styles.accentBadge} mb-3`}>
          <i className="bi bi-star-fill text-yellow-400"></i> Special Showcase Offer
        </span>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3 leading-tight">
          {landingPage.title}
        </h1>
        {products.map(p => (
          <div key={p.id} className="mb-4">
            {p.short_description ? (
              <div 
                className="text-sm md:text-lg opacity-80 leading-relaxed max-w-2xl mx-auto [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: p.short_description }}
              />
            ) : (
              <p className="text-sm md:text-lg opacity-80 max-w-2xl mx-auto">
                {p.name}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Interactive Product Image Slider / Carousel */}
      {galleryImages.length > 0 && (
        <div className="max-w-4xl mx-auto mt-8 px-4">
          <div className="relative aspect-[4/3] max-w-2xl mx-auto rounded-3xl overflow-hidden shadow-xl border border-gray-200 bg-white group">
            <img
              src={galleryImages[activeSlideIndex]}
              alt={`Product slide ${activeSlideIndex}`}
              className="w-full h-full object-cover transition-all duration-300"
            />
            {/* Navigation Arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSlideIndex(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1));
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                >
                  <i className="bi bi-chevron-left text-lg font-bold"></i>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSlideIndex(prev => (prev === galleryImages.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                >
                  <i className="bi bi-chevron-right text-lg font-bold"></i>
                </button>
                {/* Dot Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {galleryImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSlideIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        activeSlideIndex === idx ? 'bg-rose-600 w-4' : 'bg-gray-400/60 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Product Selection Section - Multi-Product Aware */}
      <div id="product-selection-section" className="max-w-6xl mx-auto px-4 mt-16">
        <h2 className="text-2xl md:text-3xl font-black text-center mb-2">
          আমাদের প্রোডাক্ট কালেকশন
        </h2>
        <p className="text-center opacity-70 text-sm mb-8">
          পছন্দের প্রোডাক্টের নিচে &quot;অর্ডার করুন&quot; বাটনে ক্লিক করে পরিমাণ সিলেক্ট করুন
        </p>

        {/* Render each product as a labeled section with its color/variant grid */}
        {productColorGroups.map(({ product: prod, colorGroups: groups }) => (
          <div key={prod.id} className="mb-12">
            {/* Product title header — only shown when multiple products */}
            {productColorGroups.length > 1 && (
              <div className="flex items-center gap-3 mb-5">
                {(prod.image_url || prod.images?.[0]) && (
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-current/10">
                    <img
                      src={prod.image_url || getImageUrl(prod.images![0].image)}
                      alt={prod.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <h3 className="font-black text-lg leading-tight">
                    <Link href={`/products/${prod.slug}`} className="hover:text-rose-600 hover:underline transition-colors block">
                      {prod.name}
                    </Link>
                  </h3>
                  {prod.short_description && (
                    <p className="text-xs opacity-60 line-clamp-1"
                       dangerouslySetInnerHTML={{ __html: prod.short_description.replace(/<[^>]+>/g,'').substring(0,80) }}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => {
                const hasSizes = group.sizes.length > 0;
                const selectorKey = `${prod.id}-${group.colorName}`;
                const isSizeSelectorOpen = activeSizeSelectorColor === selectorKey;

                return (
                  <div
                    key={selectorKey}
                    className={`${styles.card} p-4 rounded-3xl relative overflow-hidden flex flex-col justify-between border-2 border-current/10 hover:border-rose-200 transition-all`}
                  >
                    <div>
                      {/* Card Image */}
                      {group.image && (
                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3 bg-gray-50">
                          <img
                            src={group.image}
                            alt={group.colorName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Title */}
                      <h4 className="font-bold text-lg mb-1">
                        <Link href={`/products/${prod.slug}`} className="hover:text-rose-600 hover:underline transition-colors block">
                          {prod.name}
                        </Link>
                        {group.colorName !== 'Default' && (
                          <span className="text-sm opacity-80 mt-0.5 block">
                            ({group.colorName})
                          </span>
                        )}
                      </h4>

                      {/* Price */}
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-xl font-extrabold text-rose-600">{formatPrice(group.price)}</span>
                        {group.regularPrice > group.price && (
                          <span className="text-sm line-through opacity-50">{formatPrice(group.regularPrice)}</span>
                        )}
                      </div>
                    </div>

                    {/* Size Selection Overlay / Controls */}
                    <div className="mt-auto relative">
                      {isSizeSelectorOpen && hasSizes ? (
                        <div className="space-y-2 py-2 bg-white/95 backdrop-blur-sm rounded-xl text-gray-900">
                          <span className="text-xs font-bold text-gray-500 uppercase block mb-1">সাইজ সিলেক্ট করুন:</span>
                          <div className="flex flex-wrap gap-2">
                            {group.sizes.map((sz) => (
                              <button
                                key={sz.variantId}
                                type="button"
                                disabled={!sz.inStock}
                                onClick={() => handleAddToCart({
                                  productId: prod.id,
                                  variantId: sz.variantId,
                                  name: `${prod.name} - ${group.colorName} / ${sz.value}`,
                                  price: group.price,
                                  image: group.image,
                                  color: group.colorName !== 'Default' ? group.colorName : null,
                                  size: sz.value
                                })}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                                  sz.inStock
                                    ? 'border-gray-300 hover:border-rose-600 hover:bg-rose-50/50 text-gray-800'
                                    : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed line-through'
                                }`}
                              >
                                {sz.value} {!sz.inStock && '(স্টক নেই)'}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveSizeSelectorColor(null)}
                            className="text-xs text-rose-500 font-bold underline mt-2 block"
                          >
                            বাতিল করুন
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (hasSizes) {
                              setActiveSizeSelectorColor(selectorKey);
                            } else {
                              const v = group.variants[0];
                              handleAddToCart({
                                productId: prod.id,
                                variantId: v ? v.id : null,
                                name: `${prod.name} ${group.colorName !== 'Default' ? `- ${group.colorName}` : ''}`,
                                price: group.price,
                                image: group.image,
                                color: group.colorName !== 'Default' ? group.colorName : null,
                                size: null
                              });
                            }
                          }}
                          className={`w-full py-2.5 rounded-xl text-sm font-bold tracking-wide transition flex items-center justify-center gap-1.5 ${styles.primaryBtn}`}
                        >
                          <i className="bi bi-cart-plus-fill text-base"></i> অর্ডার করুন
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Grid details and Cart/Checkout */}
      <div className="max-w-6xl mx-auto px-4 mt-16">
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
            <div className={`${styles.card} p-6 rounded-3xl space-y-6`}>
              <h3 className="text-lg font-bold border-b pb-2">Product Description</h3>
              {products.map((p) => (
                <div key={p.id} className="space-y-2">
                  {products.length > 1 && (
                    <h4 className="font-bold text-base">
                      <Link href={`/products/${p.slug}`} className="hover:text-rose-600 hover:underline transition-colors">
                        {p.name}
                      </Link>
                    </h4>
                  )}
                  {p.description ? (
                    <div 
                      className="text-sm leading-relaxed space-y-3 opacity-90 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                      dangerouslySetInnerHTML={{ __html: p.description }}
                    />
                  ) : (
                    <div className="text-sm leading-relaxed space-y-3 opacity-90">
                      No detailed description available.
                    </div>
                  )}
                </div>
              ))}
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
              
              {/* Interactive Landing Page Cart Section */}
              <div id="landing-cart-section" className="border-b pb-4 mb-6">
                <h3 className="text-lg font-black flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <i className="bi bi-cart3 text-rose-500"></i> আপনার কার্ট
                  </span>
                  <span className="bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full text-xs font-bold">
                    {totalQuantity} টি প্রোডাক্ট
                  </span>
                </h3>

                {cartItems.length === 0 ? (
                  <div className="text-center py-8 opacity-65 mt-4 border-2 border-dashed border-current/10 rounded-2xl">
                    <i className="bi bi-cart-x text-4xl block mb-2 opacity-50"></i>
                    <p className="text-xs font-semibold">কোনো প্রোডাক্ট সিলেক্ট করা হয়নি</p>
                    <p className="text-[10px] mt-1 opacity-50">উপরের প্রোডাক্ট সেকশন থেকে প্রোডাক্টের নিচে &quot;অর্ডার করুন&quot; বাটনে ক্লিক করুন</p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-4 max-h-[250px] overflow-y-auto pr-1">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 pb-3 border-b border-current/10 last:border-b-0 last:pb-0 last:mb-0">
                        {item.image && (
                          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50 border border-current/10">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-grow min-w-0">
                          <h5 className="text-xs font-bold truncate">{item.name}</h5>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-rose-600 font-extrabold">{formatPrice(item.price)}</span>
                            {(item.color || item.size) && (
                              <span className="text-[9px] bg-current/10 text-current opacity-90 px-1.5 py-0.5 rounded">
                                {[item.color, item.size].filter(Boolean).join(' / ')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Quantity Counter */}
                        <div className="flex items-center border border-current/20 rounded-lg overflow-hidden bg-current/5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(idx, -1)}
                            className="px-1.5 py-0.5 hover:bg-current/10 text-current transition font-bold text-[10px]"
                          >
                            <i className="bi bi-dash"></i>
                          </button>
                          <span className="px-1.5 py-0.5 font-bold text-xs min-w-[18px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(idx, 1)}
                            className="px-1.5 py-0.5 hover:bg-current/10 text-current transition font-bold text-[10px]"
                          >
                            <i className="bi bi-plus"></i>
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(idx)}
                          className="text-current opacity-60 hover:text-rose-500 p-1 transition flex-shrink-0"
                        >
                          <i className="bi bi-trash text-sm"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-center mb-6">
                <span className="text-xs uppercase tracking-wider font-extrabold text-red-500 animate-pulse">
                  ⚡ Order Directly via Cash on Delivery
                </span>
                <h3 className="text-xl font-black mt-1">Easy Checkout Form</h3>
                <p className="text-xs opacity-70 mt-1">Please fill in your correct address details below</p>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="space-y-5">
                
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
                   <div className="text-[10px] opacity-60">Provide 11 digits mobile number for order verification SMS.</div>
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
                {landingPage?.show_location !== false && (
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
                )}

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
                              : 'border-current/10 opacity-80 hover:opacity-100'
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
                              <span className="text-[10px] opacity-60">
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
                <div className="bg-current/[0.03] rounded-2xl p-4 border border-current/10 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="opacity-70">Subtotal ({totalQuantity} {totalQuantity > 1 ? 'items' : 'item'})</span>
                    <span className="font-bold">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-70 flex items-center gap-1">
                      Shipping Fee 
                      {loadingShipping && <i className="bi bi-arrow-repeat animate-spin text-[10px]"></i>}
                    </span>
                    <span className="font-bold">
                      {shippingCost === 0 ? 'Free Shipping' : formatPrice(shippingCost)}
                    </span>
                  </div>
                  {paymentCharge > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="opacity-70">
                        {selectedPaymentMethod?.extra_charge?.label || 'Gateway Surcharge'}
                      </span>
                      <span className="font-bold">
                        {formatPrice(paymentCharge)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-current/10 pt-2 flex justify-between items-center text-sm">
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
        <p>&copy; {new Date().getFullYear()} {landingPage.title}. All Rights Reserved.</p>
        <p className="mt-1">Cash on Delivery across Bangladesh. For support contact merchant.</p>
      </div>

    </div>
  );
}
