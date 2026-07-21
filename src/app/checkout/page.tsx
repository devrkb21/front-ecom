'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore, useCartStore } from '@/stores';
import { abandonedCartService, addressService, orderService, paymentService, settingsService, shippingService } from '@/services';
import type { CheckoutFieldConfig, CheckoutFieldSection, CheckoutSettingsConfig } from '@/services';
import type { Address, BdLocationItem } from '@/services/address.service';
import { CartItem, OrderSummary, PaymentMethod, ShippingMethod } from '@/types';
import type { CreateOrderData } from '@/types/order';
import { FreeShippingProgress } from '@/components/cart';
import { Button, Input, EmptyState, LoadingPage, SearchableSelect, SmartImage } from '@/components/ui';
import { getImageUrl, formatPrice, trackInitiateCheckout } from '@/utils';
import toast from 'react-hot-toast';
import axios, { AxiosError } from 'axios';

interface FormErrors {
  [key: string]: string;
}

const normalizePositiveNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
};

const roundCurrency = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const PAYMENT_ICON_IMAGE_PATTERN = /\.(svg|png|jpe?g|gif|webp)(\?.*)?$/i;

const resolveBootstrapIconClass = (icon: string): string => {
  const normalized = icon.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return '';
  }

  const tokens = normalized
    .split(' ')
    .map((token) => token.replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean);

  const prefixedToken = tokens.find((token) => token.startsWith('bi-'));
  if (!prefixedToken) {
    return '';
  }

  return `bi ${prefixedToken}`;
};

const isIconImagePath = (icon: string): boolean => {
  const normalized = icon.trim();

  if (!normalized) {
    return false;
  }

  return (
    normalized.startsWith('http://')
    || normalized.startsWith('https://')
    || normalized.startsWith('/storage/')
    || normalized.startsWith('storage/')
    || normalized.startsWith('data:image/')
    || PAYMENT_ICON_IMAGE_PATTERN.test(normalized)
  );
};

const resolvePaymentIconImageSrc = (icon: string): string => {
  if (icon.startsWith('data:image/')) {
    return icon;
  }

  return getImageUrl(icon);
};

const calculateCheckoutTaxAmount = (subtotal: number, enabled: boolean, percentage: number): number => {
  if (!enabled) {
    return 0;
  }

  const normalizedSubtotal = Math.max(0, subtotal);
  const normalizedPercentage = Math.max(0, Math.min(100, percentage));

  if (normalizedPercentage <= 0) {
    return 0;
  }

  return roundCurrency(normalizedSubtotal * (normalizedPercentage / 100));
};

interface SemanticFieldKeys {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  area?: string;
  locationText?: string;
  divisionId?: string;
  districtId?: string;
  upazilaId?: string;
  unionId?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  notes?: string;
}

const toTextValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const toPositiveInteger = (value: unknown): number => {
  const parsed = Number.parseInt(toTextValue(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const getCartItemVariantAttributesText = (item: CartItem): string => {
  return (item.variant?.attributes || [])
    .map((attribute) => {
      const attributeName = (attribute.attribute_name || '').trim();
      const value = (attribute.value || '').trim();

      if (!value) {
        return '';
      }

      return attributeName ? `${attributeName}: ${value}` : value;
    })
    .filter((entry) => entry.length > 0)
    .join(', ');
};

const getCartItemVariantSummary = (item: CartItem): string => {
  const attributeSummary = getCartItemVariantAttributesText(item);
  if (attributeSummary) {
    return attributeSummary;
  }

  const variantName = (item.variant?.name || '').trim();
  if (variantName) {
    return variantName;
  }

  const variantSku = (item.variant?.sku || '').trim();
  if (variantSku) {
    return `SKU: ${variantSku}`;
  }

  return item.variant_id ? `Variant #${item.variant_id}` : '';
};

const hasKeyword = (field: CheckoutFieldConfig, keywords: string[]): boolean => {
  const descriptor = `${field.key} ${field.label}`.toLowerCase();
  return keywords.some((keyword) => descriptor.includes(keyword.toLowerCase()));
};

const isFieldFilled = (field: CheckoutFieldConfig, value: unknown): boolean => {
  if (
    field.type === 'location_division' ||
    field.type === 'location_district' ||
    field.type === 'location_upazila' ||
    field.type === 'location_union'
  ) {
    return toPositiveInteger(value) > 0;
  }

  return toTextValue(value).length > 0;
};

const resolveSemanticFieldKeys = (fields: CheckoutFieldConfig[]): SemanticFieldKeys => {
  const keys: SemanticFieldKeys = {};

  fields.forEach((field) => {
    if (!field.enabled) {
      return;
    }

    if (field.type === 'email' && !keys.email) {
      keys.email = field.key;
      return;
    }

    if (field.type === 'tel' && !keys.phone) {
      keys.phone = field.key;
      return;
    }

    if (field.type === 'country' && !keys.country) {
      keys.country = field.key;
      return;
    }

    if (field.type === 'location_text' && !keys.locationText) {
      keys.locationText = field.key;
      return;
    }

    if (field.type === 'location_division' && !keys.divisionId) {
      keys.divisionId = field.key;
      return;
    }

    if (field.type === 'location_district' && !keys.districtId) {
      keys.districtId = field.key;
      return;
    }

    if (field.type === 'location_upazila' && !keys.upazilaId) {
      keys.upazilaId = field.key;
      return;
    }

    if (field.type === 'location_union' && !keys.unionId) {
      keys.unionId = field.key;
      return;
    }

    if (hasKeyword(field, ['first name', 'first_name', 'firstname']) && !keys.firstName) {
      keys.firstName = field.key;
      return;
    }

    if (hasKeyword(field, ['last name', 'last_name', 'lastname']) && !keys.lastName) {
      keys.lastName = field.key;
      return;
    }

    if (hasKeyword(field, ['name', 'receiver', 'customer']) && !keys.name) {
      keys.name = field.key;
      return;
    }

    if (hasKeyword(field, ['address 2', 'address_2', 'apartment', 'suite', 'area', 'neighborhood']) && !keys.area) {
      keys.area = field.key;
      return;
    }

    if (hasKeyword(field, ['address', 'street']) && !keys.address) {
      keys.address = field.key;
      return;
    }

    if (hasKeyword(field, ['city', 'town']) && !keys.city) {
      keys.city = field.key;
      return;
    }

    if (hasKeyword(field, ['state', 'county', 'province']) && !keys.state) {
      keys.state = field.key;
      return;
    }

    if (hasKeyword(field, ['zip', 'postcode', 'postal']) && !keys.zip) {
      keys.zip = field.key;
      return;
    }

    if ((field.type === 'textarea' || hasKeyword(field, ['note', 'instruction'])) && !keys.notes) {
      keys.notes = field.key;
    }
  });

  return keys;
};

const splitNameParts = (fullName: string): { firstName: string; lastName: string } => {
  const normalized = toTextValue(fullName);
  if (!normalized) {
    return { firstName: '', lastName: '' };
  }

  const parts = normalized.split(/\s+/).filter((part) => part.length > 0);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

const buildCheckoutFieldPayload = (
  fields: CheckoutFieldConfig[],
  values: Record<string, string | number>
): Record<string, string | number> => {
  const payload: Record<string, string | number> = {};

  fields.forEach((field) => {
    const rawValue = values[field.key];

    if (!isFieldFilled(field, rawValue)) {
      return;
    }

    if (
      field.type === 'location_division' ||
      field.type === 'location_district' ||
      field.type === 'location_upazila' ||
      field.type === 'location_union'
    ) {
      const numeric = toPositiveInteger(rawValue);
      if (numeric > 0) {
        payload[field.key] = numeric;
      }

      return;
    }

    const text = toTextValue(rawValue);
    if (text !== '') {
      payload[field.key] = text;
    }
  });

  return payload;
};

const buildAddressFieldPatch = (address: Address, semanticKeys: SemanticFieldKeys): Record<string, string | number> => {
  const patch: Record<string, string | number> = {};

  const setText = (key: string | undefined, value: unknown) => {
    if (!key) return;

    const normalized = toTextValue(value);
    if (normalized) {
      patch[key] = normalized;
    }
  };

  const setNumber = (key: string | undefined, value: unknown) => {
    if (!key) return;

    const normalized = normalizePositiveNumber(value);
    if (typeof normalized === 'number') {
      patch[key] = Math.round(normalized);
    }
  };

  const { firstName, lastName } = splitNameParts(address.name || '');
  const locationText = [address.area, address.union?.name, address.upazila?.name, address.district?.name]
    .map((item) => toTextValue(item))
    .filter((item) => item.length > 0)
    .join(', ');

  setText(semanticKeys.name, address.name);
  setText(semanticKeys.firstName, firstName);
  setText(semanticKeys.lastName, lastName);
  setText(semanticKeys.email, address.email ?? '');
  setText(semanticKeys.phone, address.phone);
  setText(semanticKeys.address, address.address_line_1);
  setText(semanticKeys.area, address.area ?? address.address_line_2 ?? '');
  setText(semanticKeys.locationText, locationText);
  setNumber(semanticKeys.divisionId, address.division_id);
  setNumber(semanticKeys.districtId, address.district_id);
  setNumber(semanticKeys.upazilaId, address.upazila_id);
  setNumber(semanticKeys.unionId, address.union_id);
  setText(semanticKeys.city, address.city ?? address.district?.name ?? '');
  setText(semanticKeys.state, address.state ?? address.division?.name ?? '');
  setText(semanticKeys.zip, address.postal_code ?? '');
  setText(semanticKeys.country, address.country || 'Bangladesh');
  setText(semanticKeys.notes, address.instructions ?? '');

  return patch;
};

const mergeFieldPatchWithoutOverwrite = (
  currentValues: Record<string, string | number>,
  patch: Record<string, string | number>
): { nextValues: Record<string, string | number>; changed: boolean } => {
  const nextValues: Record<string, string | number> = { ...currentValues };
  let changed = false;

  Object.entries(patch).forEach(([key, value]) => {
    if (!key) {
      return;
    }

    if (typeof value === 'number') {
      const existingNumericValue = toPositiveInteger(nextValues[key]);
      if (existingNumericValue > 0) {
        return;
      }

      if (value > 0) {
        nextValues[key] = value;
        changed = true;
      }

      return;
    }

    const nextTextValue = toTextValue(value);
    if (!nextTextValue) {
      return;
    }

    const existingTextValue = toTextValue(nextValues[key]);
    if (existingTextValue) {
      return;
    }

    nextValues[key] = nextTextValue;
    changed = true;
  });

  return { nextValues, changed };
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const { cart, fetchCart, clearCart, updateQuantity, applyCoupon, removeCoupon } = useCartStore();
  const [guestCheckoutEnabled, setGuestCheckoutEnabled] = useState<boolean | null>(null);
  const canUseCheckout = isAuthenticated || guestCheckoutEnabled === true;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [orderComplete, setOrderComplete] = useState<OrderSummary | null>(null);
  const [fraudBlockMessage, setFraudBlockMessage] = useState<string | null>(null);
  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettingsConfig | null>(null);
  const [loadingCheckoutSettings, setLoadingCheckoutSettings] = useState(true);
  const [checkoutSettingsError, setCheckoutSettingsError] = useState<string | null>(null);

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);

  // Shipping methods state
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>('');
  const [loadingShippingMethods, setLoadingShippingMethods] = useState(true);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [pendingQuantityItemId, setPendingQuantityItemId] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [isCouponDropdownOpen, setIsCouponDropdownOpen] = useState(true);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // BD location dropdown state
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [divisions, setDivisions] = useState<BdLocationItem[]>([]);
  const [districts, setDistricts] = useState<BdLocationItem[]>([]);
  const [upazilas, setUpazilas] = useState<BdLocationItem[]>([]);
  const [unions, setUnions] = useState<BdLocationItem[]>([]);
  const [checkoutFieldValues, setCheckoutFieldValues] = useState<Record<string, string | number>>({});
  const [useBillingDetails, setUseBillingDetails] = useState(false);
  const [hasCompletedCheckout, setHasCompletedCheckout] = useState(false);
  const hasTrackedInitiateCheckoutRef = useRef(false);
  const lastAbandonedTrackSignatureRef = useRef('');
  const hasAppliedSavedShippingAddressRef = useRef(false);
  const hasAppliedSavedBillingAddressRef = useRef(false);

  const [loyaltyDiscountPercentage, setLoyaltyDiscountPercentage] = useState<number>(0);
  const [loyaltyGroupName, setLoyaltyGroupName] = useState<string>('');
  const [loyaltyAnnouncedPhone, setLoyaltyAnnouncedPhone] = useState<string>('');
  const [showLoyaltyPopup, setShowLoyaltyPopup] = useState<boolean>(false);
  const [loyaltyPopupMessage, setLoyaltyPopupMessage] = useState<string>('');

  const checkoutDisabledByConfig = checkoutSettings?.checkout_form_enabled === false;

  const checkoutFieldSections = useMemo<CheckoutFieldSection[]>(() => {
    if (!checkoutSettings) {
      return [];
    }

    return checkoutSettings.field_sections
      .map((section) => ({
        ...section,
        fields: section.fields.filter((field) => field.enabled),
      }))
      .filter((section) => section.fields.length > 0);
  }, [checkoutSettings]);

  const checkoutFields = useMemo<CheckoutFieldConfig[]>(() => {
    return checkoutFieldSections.flatMap((section) => section.fields);
  }, [checkoutFieldSections]);

  const shippingSection = useMemo<CheckoutFieldSection | null>(() => {
    return checkoutFieldSections.find((section) => String(section.section).toLowerCase() === 'shipping') ?? null;
  }, [checkoutFieldSections]);

  const billingSection = useMemo<CheckoutFieldSection | null>(() => {
    return checkoutFieldSections.find((section) => String(section.section).toLowerCase() === 'billing') ?? null;
  }, [checkoutFieldSections]);

  const secondarySections = useMemo<CheckoutFieldSection[]>(() => {
    return checkoutFieldSections.filter((section) => {
      const normalizedSection = String(section.section).toLowerCase();

      return normalizedSection !== 'shipping' && normalizedSection !== 'billing';
    });
  }, [checkoutFieldSections]);

  const shippingAndSecondaryFields = useMemo<CheckoutFieldConfig[]>(() => {
    return [
      ...(shippingSection?.fields ?? []),
      ...secondarySections.flatMap((section) => section.fields),
    ];
  }, [shippingSection, secondarySections]);

  const activeCheckoutFields = useMemo<CheckoutFieldConfig[]>(() => {
    return [
      ...shippingAndSecondaryFields,
      ...(useBillingDetails ? (billingSection?.fields ?? []) : []),
    ];
  }, [shippingAndSecondaryFields, useBillingDetails, billingSection]);

  const semanticFieldKeys = useMemo(
    () => resolveSemanticFieldKeys(shippingAndSecondaryFields.length > 0 ? shippingAndSecondaryFields : checkoutFields),
    [shippingAndSecondaryFields, checkoutFields]
  );

  const billingSemanticFieldKeys = useMemo(
    () => resolveSemanticFieldKeys(billingSection?.fields ?? []),
    [billingSection]
  );

  const readFieldValue = (key?: string): string => {
    if (!key) {
      return '';
    }

    return toTextValue(checkoutFieldValues[key]);
  };

  const readFieldNumberValue = (key?: string): number => {
    if (!key) {
      return 0;
    }

    return toPositiveInteger(checkoutFieldValues[key]);
  };

  useEffect(() => {
    const phone = readFieldValue(semanticFieldKeys.phone);
    if (!phone || phone.length < 10) {
      setLoyaltyDiscountPercentage(0);
      setLoyaltyGroupName('');
      return;
    }

    if (phone === loyaltyAnnouncedPhone) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.get('/api/public/public/loyalty/check', { params: { phone } });
        if (data.success && data.has_group) {
          setLoyaltyGroupName(data.data.group_name);
          setLoyaltyDiscountPercentage(Number(data.data.discount_percentage));
          if (phone !== loyaltyAnnouncedPhone) {
            setLoyaltyPopupMessage(data.message);
            setShowLoyaltyPopup(true);
            setLoyaltyAnnouncedPhone(phone);
          }
        } else {
          setLoyaltyDiscountPercentage(0);
          setLoyaltyGroupName('');
        }
      } catch (err) {
        // ignore error
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [checkoutFieldValues, semanticFieldKeys.phone, loyaltyAnnouncedPhone]);

  const locationDropdownEnabled = Boolean(
    semanticFieldKeys.divisionId || semanticFieldKeys.districtId || semanticFieldKeys.upazilaId || semanticFieldKeys.unionId
  );

  const selectedDivisionId = readFieldNumberValue(semanticFieldKeys.divisionId);
  const selectedDistrictId = readFieldNumberValue(semanticFieldKeys.districtId);
  const selectedUpazilaId = readFieldNumberValue(semanticFieldKeys.upazilaId);
  const selectedUnionId = readFieldNumberValue(semanticFieldKeys.unionId);

  const checkoutFreeShippingThreshold = useMemo(() => {
    const selectedMethodThresholdRaw = shippingMethods.find((method) => method.code === selectedShippingMethod)?.free_shipping_threshold;
    const selectedMethodThreshold = normalizePositiveNumber(selectedMethodThresholdRaw);
    if (selectedMethodThreshold !== null) {
      return selectedMethodThreshold;
    }

    const thresholds = shippingMethods
      .map((method) => method.free_shipping_threshold)
      .map((value) => normalizePositiveNumber(value))
      .filter((value): value is number => value !== null);

    if (thresholds.length === 0) {
      return null;
    }

    return Math.min(...thresholds);
  }, [selectedShippingMethod, shippingMethods]);

  const resolvedShippingMethodCode = selectedShippingMethod || shippingMethods[0]?.code || '';

  const dropdownLocationText = useMemo(() => {
    if (!locationDropdownEnabled) return '';

    const parts = [
      unions.find((item) => item.id === selectedUnionId)?.name,
      upazilas.find((item) => item.id === selectedUpazilaId)?.name,
      districts.find((item) => item.id === selectedDistrictId)?.name,
    ]
      .map((part) => (part || '').trim())
      .filter((part) => part.length > 0);

    return parts.join(', ');
  }, [
    locationDropdownEnabled,
    districts,
    selectedDistrictId,
    selectedUnionId,
    selectedUpazilaId,
    unions,
    upazilas,
  ]);

  const resolvedLocationText = useMemo(() => {
    const textLocation = readFieldValue(semanticFieldKeys.locationText);
    const areaLocation = readFieldValue(semanticFieldKeys.area);
    const addressLocation = readFieldValue(semanticFieldKeys.address);

    return [textLocation, areaLocation, dropdownLocationText, addressLocation].find((value) => value.length > 0) || '';
  }, [checkoutFieldValues, semanticFieldKeys, dropdownLocationText]);

  const selectedDivisionName = useMemo(() => {
    if (!selectedDivisionId) return '';
    return divisions.find((item) => item.id === selectedDivisionId)?.name?.trim() || '';
  }, [divisions, selectedDivisionId]);

  const selectedDistrictName = useMemo(() => {
    if (!selectedDistrictId) return '';
    return districts.find((item) => item.id === selectedDistrictId)?.name?.trim() || '';
  }, [districts, selectedDistrictId]);

  const selectedUpazilaName = useMemo(() => {
    if (!selectedUpazilaId) return '';
    return upazilas.find((item) => item.id === selectedUpazilaId)?.name?.trim() || '';
  }, [selectedUpazilaId, upazilas]);

  const selectedUnionName = useMemo(() => {
    if (!selectedUnionId) return '';
    return unions.find((item) => item.id === selectedUnionId)?.name?.trim() || '';
  }, [selectedUnionId, unions]);

  const abandonedCartTrackingPayload = useMemo(() => {
    if (!cart || cart.items.length === 0 || orderComplete || hasCompletedCheckout) {
      return null;
    }

    const trackedShippingFields = (shippingSection?.fields?.length ?? 0) > 0
      ? (shippingSection?.fields ?? [])
      : shippingAndSecondaryFields;

    const hasShippingInput = trackedShippingFields.some((field) => isFieldFilled(field, checkoutFieldValues[field.key]));

    const checkoutStep: 'cart' | 'shipping' | 'payment' =
      selectedPaymentMethod && resolvedShippingMethodCode
        ? 'payment'
        : hasShippingInput
          ? 'shipping'
          : 'cart';

    const selectedPayment = paymentMethods.find((method) => method.code === selectedPaymentMethod);
    const paymentCharge = selectedPayment?.extra_charge?.calculated ?? 0;
    const subtotal = typeof cart.subtotal === 'number' ? cart.subtotal : (cart.total ?? 0);
    const discountAmount = cart.discount_amount ?? 0;
    const checkoutTaxEnabled = checkoutSettings?.tax_enabled === true;
    const checkoutTaxPercentage = Math.max(0, Number(checkoutSettings?.tax_percentage ?? 0));
    const taxAmount = calculateCheckoutTaxAmount(subtotal, checkoutTaxEnabled, checkoutTaxPercentage);
    const loyaltyDiscountAmount = loyaltyDiscountPercentage > 0 ? (subtotal * loyaltyDiscountPercentage) / 100 : 0;
    const estimatedTotal = Math.max(0, subtotal - discountAmount - loyaltyDiscountAmount + taxAmount + shippingCost + paymentCharge);
    const normalizedCity = readFieldValue(semanticFieldKeys.city) || selectedDistrictName;
    const normalizedState = readFieldValue(semanticFieldKeys.state) || selectedDivisionName;
    const checkoutFieldPayload = buildCheckoutFieldPayload(activeCheckoutFields, checkoutFieldValues);
    const hasCheckoutFieldPayload = Object.keys(checkoutFieldPayload).length > 0;

    return {
      checkout_step: checkoutStep,
      email: readFieldValue(semanticFieldKeys.email) || undefined,
      phone: readFieldValue(semanticFieldKeys.phone) || undefined,
      name: readFieldValue(semanticFieldKeys.name) || undefined,
      checkout_fields: hasCheckoutFieldPayload ? { ...checkoutFieldPayload, loyalty_discount_amount: loyaltyDiscountAmount } : { loyalty_discount_amount: loyaltyDiscountAmount },
      shipping_address: readFieldValue(semanticFieldKeys.address) || undefined,
      shipping_location_text: resolvedLocationText || undefined,
      shipping_area: readFieldValue(semanticFieldKeys.area) || undefined,
      shipping_division: selectedDivisionName || undefined,
      shipping_district: selectedDistrictName || undefined,
      shipping_upazila: selectedUpazilaName || undefined,
      shipping_union: selectedUnionName || undefined,
      shipping_city: normalizedCity || undefined,
      shipping_state: normalizedState || undefined,
      shipping_zip: readFieldValue(semanticFieldKeys.zip) || undefined,
      shipping_country: readFieldValue(semanticFieldKeys.country) || 'Bangladesh',
      payment_method: selectedPaymentMethod || undefined,
      shipping_method: resolvedShippingMethodCode || undefined,
      cart_items: cart.items.map((item) => ({
        ...(item.variant?.sku ? { product_sku: item.variant.sku } : {}),
        product_id: item.product_id,
        product_name: item.product.name,
        product_image: item.product.image_url || null,
        variant_id: item.variant_id ?? null,
        variant_name: item.variant?.name || null,
        variant_sku: item.variant?.sku || null,
        variant_attributes: getCartItemVariantAttributesText(item) || null,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      })),
      subtotal: cart.subtotal ?? cart.total,
      total: estimatedTotal,
      coupon_code: cart.coupon_code || undefined,
      discount_amount: cart.discount_amount ?? 0,
    };
  }, [
    activeCheckoutFields,
    cart,
    checkoutFieldValues,
    hasCompletedCheckout,
    orderComplete,
    paymentMethods,
    resolvedShippingMethodCode,
    selectedPaymentMethod,
    semanticFieldKeys,
    shippingAndSecondaryFields,
    shippingSection,
    shippingCost,
    selectedDistrictName,
    selectedDivisionName,
    selectedUnionName,
    selectedUpazilaName,
    checkoutSettings,
  ]);

  const abandonedCartTrackSignature = useMemo(() => {
    if (!abandonedCartTrackingPayload) {
      return '';
    }

    return JSON.stringify(abandonedCartTrackingPayload);
  }, [abandonedCartTrackingPayload]);

  useEffect(() => {
    if (isInitialized && canUseCheckout) {
      fetchCart();
    }
  }, [isInitialized, canUseCheckout, fetchCart]);

  useEffect(() => {
    if (hasTrackedInitiateCheckoutRef.current) {
      return;
    }

    if (loadingCheckoutSettings || !canUseCheckout || !cart || cart.items.length === 0 || orderComplete) {
      return;
    }

    trackInitiateCheckout({
      currency: 'BDT',
      value: cart.total,
      items: cart.items.map((item) => ({
        item_id: item.variant_id ? `${item.product_id}:${item.variant_id}` : String(item.product_id),
        item_name: item.product.name,
        item_variant: item.variant?.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });

    hasTrackedInitiateCheckoutRef.current = true;
  }, [loadingCheckoutSettings, canUseCheckout, cart, orderComplete]);

  useEffect(() => {
    if (!canUseCheckout || !abandonedCartTrackingPayload || !abandonedCartTrackSignature || isSubmitting) {
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
          console.warn('Failed to track abandoned cart state:', error);
        });
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [abandonedCartTrackSignature, abandonedCartTrackingPayload, canUseCheckout, isSubmitting]);

  useEffect(() => {
    let isMounted = true;

    const fetchCheckoutSettings = async () => {
      try {
        setLoadingCheckoutSettings(true);
        const config = await settingsService.getCheckout();
        if (!isMounted) return;
        setCheckoutSettings(config);
        setGuestCheckoutEnabled(config.guest_checkout_enabled !== false);
        setCheckoutSettingsError(null);
      } catch (error) {
        console.error('Error fetching checkout settings:', error);
        if (!isMounted) return;
        setCheckoutSettings(null);
        setGuestCheckoutEnabled(false);
        setCheckoutSettingsError('Unable to load checkout settings from admin panel. Please retry.');
      } finally {
        if (isMounted) {
          setLoadingCheckoutSettings(false);
        }
      }
    };

    void fetchCheckoutSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        setLoadingPaymentMethods(true);

        const subtotal = typeof cart?.subtotal === 'number' ? cart.subtotal : (cart?.total ?? 0);
        const discount = cart?.discount_amount ?? 0;
        const checkoutTaxEnabled = checkoutSettings?.tax_enabled === true;
        const checkoutTaxPercentage = Math.max(0, Number(checkoutSettings?.tax_percentage ?? 0));
        const tax = calculateCheckoutTaxAmount(subtotal, checkoutTaxEnabled, checkoutTaxPercentage);
        const chargeBaseAmount = Math.max(0, subtotal - discount + tax + shippingCost);

        const methods = await paymentService.getPaymentMethods(chargeBaseAmount);
        setPaymentMethods(methods);

        // Keep selected method when still available; otherwise auto-select first.
        if (methods.length > 0) {
          setSelectedPaymentMethod((current) => {
            if (current && methods.some((method) => method.code === current)) {
              return current;
            }

            return methods[0].code;
          });
        } else {
          setSelectedPaymentMethod('');
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
        toast.error('Failed to load payment methods');
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    if (canUseCheckout && cart) {
      fetchPaymentMethods();
    }
  }, [canUseCheckout, cart, shippingCost, checkoutSettings]);

  useEffect(() => {
    if (!canUseCheckout || !locationDropdownEnabled || !semanticFieldKeys.divisionId) {
      setDivisions([]);
      setDistricts([]);
      setUpazilas([]);
      setUnions([]);
      return;
    }

    let isMounted = true;

    const fetchDivisions = async () => {
      try {
        setIsLoadingLocations(true);
        const data = await addressService.getDivisions();
        if (!isMounted) return;
        setDivisions(data);
      } catch (error) {
        console.error('Error fetching divisions:', error);
      } finally {
        if (isMounted) {
          setIsLoadingLocations(false);
        }
      }
    };

    void fetchDivisions();

    return () => {
      isMounted = false;
    };
  }, [canUseCheckout, locationDropdownEnabled, semanticFieldKeys.divisionId]);

  useEffect(() => {
    if (!locationDropdownEnabled || !semanticFieldKeys.districtId) {
      setDistricts([]);
      setUpazilas([]);
      setUnions([]);
      return;
    }

    if (semanticFieldKeys.divisionId && !selectedDivisionId) {
      setDistricts([]);
      setUpazilas([]);
      setUnions([]);
      return;
    }

    let isMounted = true;

    const fetchDistricts = async () => {
      try {
        setIsLoadingLocations(true);
        const data = await addressService.getDistricts(semanticFieldKeys.divisionId ? selectedDivisionId : undefined);
        if (!isMounted) return;
        setDistricts(data);
      } catch (error) {
        console.error('Error fetching districts:', error);
      } finally {
        if (isMounted) {
          setIsLoadingLocations(false);
        }
      }
    };

    void fetchDistricts();

    return () => {
      isMounted = false;
    };
  }, [locationDropdownEnabled, selectedDivisionId, semanticFieldKeys.districtId, semanticFieldKeys.divisionId]);

  useEffect(() => {
    if (!locationDropdownEnabled || !semanticFieldKeys.upazilaId) {
      setUpazilas([]);
      setUnions([]);
      return;
    }

    if (semanticFieldKeys.districtId && !selectedDistrictId) {
      setUpazilas([]);
      setUnions([]);
      return;
    }

    let isMounted = true;

    const fetchUpazilas = async () => {
      try {
        setIsLoadingLocations(true);
        const data = await addressService.getUpazilas(semanticFieldKeys.districtId ? selectedDistrictId : undefined);
        if (!isMounted) return;
        setUpazilas(data);
      } catch (error) {
        console.error('Error fetching upazilas:', error);
      } finally {
        if (isMounted) {
          setIsLoadingLocations(false);
        }
      }
    };

    void fetchUpazilas();

    return () => {
      isMounted = false;
    };
  }, [locationDropdownEnabled, selectedDistrictId, semanticFieldKeys.upazilaId, semanticFieldKeys.districtId]);

  useEffect(() => {
    if (!locationDropdownEnabled || !semanticFieldKeys.unionId) {
      setUnions([]);
      return;
    }

    if (semanticFieldKeys.upazilaId && !selectedUpazilaId) {
      setUnions([]);
      return;
    }

    let isMounted = true;

    const fetchUnions = async () => {
      try {
        setIsLoadingLocations(true);
        const data = await addressService.getUnions(semanticFieldKeys.upazilaId ? selectedUpazilaId : undefined);
        if (!isMounted) return;
        setUnions(data);
      } catch (error) {
        console.error('Error fetching unions:', error);
      } finally {
        if (isMounted) {
          setIsLoadingLocations(false);
        }
      }
    };

    void fetchUnions();

    return () => {
      isMounted = false;
    };
  }, [locationDropdownEnabled, selectedUpazilaId, semanticFieldKeys.unionId, semanticFieldKeys.upazilaId]);

  // Fetch shipping methods
  useEffect(() => {
    const fetchShippingMethods = async () => {
      if (!cart || cart.items.length === 0) return;

      try {
        setLoadingShippingMethods(true);
        const methods = await shippingService.getShippingMethods({
          amount: cart.total,
          item_count: cart.items.reduce((acc, item) => acc + item.quantity, 0),
          location_text: resolvedLocationText || undefined,
          division_id: locationDropdownEnabled && selectedDivisionId ? selectedDivisionId : undefined,
          district_id: locationDropdownEnabled && selectedDistrictId ? selectedDistrictId : undefined,
          upazila_id: locationDropdownEnabled && selectedUpazilaId ? selectedUpazilaId : undefined,
        });
        setShippingMethods(methods);
        // Auto-select first method if available
        if (methods.length > 0) {
          setSelectedShippingMethod(methods[0].code);
          setShippingCost(methods[0].cost);
        } else {
          setSelectedShippingMethod('');
          setShippingCost(0);
        }
      } catch (error) {
        console.error('Error fetching shipping methods:', error);
        toast.error('Failed to load shipping methods');
      } finally {
        setLoadingShippingMethods(false);
      }
    };

    if (canUseCheckout && cart) {
      fetchShippingMethods();
    }
  }, [
    canUseCheckout,
    cart,
    locationDropdownEnabled,
    resolvedLocationText,
    selectedDivisionId,
    selectedDistrictId,
    selectedUpazilaId,
  ]);

  // Update shipping cost when method changes
  useEffect(() => {
    if (selectedShippingMethod) {
      const method = shippingMethods.find(m => m.code === selectedShippingMethod);
      if (method) {
        setShippingCost(method.cost);
      }
    }
  }, [selectedShippingMethod, shippingMethods]);

  useEffect(() => {
    if (!checkoutFields.length) {
      return;
    }

    setCheckoutFieldValues((previous) => {
      const next = { ...previous };
      let changed = false;

      checkoutFields.forEach((field) => {
        const existing = toTextValue(next[field.key]);
        if (existing !== '') {
          return;
        }

        let prefilledValue: string | number | null = null;

        if (field.type === 'country') {
          prefilledValue = 'Bangladesh';
        } else if ((field.type === 'email' || field.key === semanticFieldKeys.email) && user?.email) {
          prefilledValue = user.email;
        } else if ((field.type === 'tel' || field.key === semanticFieldKeys.phone) && user?.phone) {
          prefilledValue = user.phone;
        } else if (field.key === semanticFieldKeys.name && user?.name) {
          prefilledValue = user.name;
        } else if (field.key === semanticFieldKeys.address && user?.address) {
          prefilledValue = user.address;
        }

        if (prefilledValue !== null && toTextValue(prefilledValue) !== '') {
          next[field.key] = prefilledValue;
          changed = true;
        }
      });

      return changed ? next : previous;
    });
  }, [checkoutFields, semanticFieldKeys, user]);

  useEffect(() => {
    if (!isAuthenticated || !checkoutFields.length || hasAppliedSavedShippingAddressRef.current) {
      return;
    }

    hasAppliedSavedShippingAddressRef.current = true;
    let isMounted = true;

    const prefillSavedShippingAddress = async () => {
      try {
        const savedShippingAddress = await addressService.getDefaultShippingAddress();
        if (!isMounted || !savedShippingAddress) {
          return;
        }

        const patch = buildAddressFieldPatch(savedShippingAddress, semanticFieldKeys);
        if (Object.keys(patch).length === 0) {
          return;
        }

        setCheckoutFieldValues((previous) => {
          const { nextValues, changed } = mergeFieldPatchWithoutOverwrite(previous, patch);
          return changed ? nextValues : previous;
        });
      } catch (error) {
        console.error('Error loading saved shipping address:', error);
      }
    };

    void prefillSavedShippingAddress();

    return () => {
      isMounted = false;
    };
  }, [checkoutFields.length, isAuthenticated, semanticFieldKeys]);

  useEffect(() => {
    if (!useBillingDetails) {
      hasAppliedSavedBillingAddressRef.current = false;
      return;
    }

    if (!isAuthenticated || !billingSection?.fields.length || hasAppliedSavedBillingAddressRef.current) {
      return;
    }

    hasAppliedSavedBillingAddressRef.current = true;
    let isMounted = true;

    const prefillSavedBillingAddress = async () => {
      try {
        const savedBillingAddress = await addressService.getDefaultBillingAddress();
        if (!isMounted || !savedBillingAddress) {
          return;
        }

        const patch = buildAddressFieldPatch(savedBillingAddress, billingSemanticFieldKeys);
        if (Object.keys(patch).length === 0) {
          return;
        }

        setCheckoutFieldValues((previous) => {
          const { nextValues, changed } = mergeFieldPatchWithoutOverwrite(previous, patch);
          return changed ? nextValues : previous;
        });
      } catch (error) {
        console.error('Error loading saved billing address:', error);
      }
    };

    void prefillSavedBillingAddress();

    return () => {
      isMounted = false;
    };
  }, [billingSection, billingSemanticFieldKeys, isAuthenticated, useBillingDetails]);

  useEffect(() => {
    if (!billingSection) {
      setUseBillingDetails(false);
      return;
    }

    if (useBillingDetails) {
      return;
    }

    setErrors((previous) => {
      const next = { ...previous };
      let changed = false;

      billingSection.fields.forEach((field) => {
        if (next[field.key]) {
          delete next[field.key];
          changed = true;
        }
      });

      return changed ? next : previous;
    });
  }, [billingSection, useBillingDetails]);

  if (!isInitialized) {
    return <LoadingPage />;
  }

  if (loadingCheckoutSettings) {
    return <LoadingPage />;
  }

  if (!checkoutSettings) {
    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M6.938 4h10.124c1.54 0 2.502 1.667 1.732 3L13.732 18a2 2 0 01-3.464 0L5.206 7c-.77-1.333.192-3 1.732-3z" />
            </svg>
          }
          title="Checkout configuration unavailable"
          description={checkoutSettingsError ?? 'Checkout settings could not be loaded. Please try again.'}
          action={
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  if (!canUseCheckout) {
    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 .53-.21 1.04-.59 1.41-.37.38-.88.59-1.41.59a2 2 0 110-4 2 2 0 012 2zm0 0v1m0 0h4m-4 0H8m8 0a2 2 0 110 4 2 2 0 010-4zm0 0V8a4 4 0 10-8 0v4" />
            </svg>
          }
          title="Login required"
          description="Please sign in to continue to checkout. Guest checkout is currently disabled by the store admin."
          action={
            <Link href="/login">
              <Button>Go to Login</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (checkoutDisabledByConfig) {
    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M6.938 4h10.124c1.54 0 2.502 1.667 1.732 3L13.732 18a2 2 0 01-3.464 0L5.206 7c-.77-1.333.192-3 1.732-3z" />
            </svg>
          }
          title="Checkout is currently unavailable"
          description="Checkout has been disabled by the store admin. Please try again later."
          action={
            <Link href="/">
              <Button>Continue Shopping</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    if (orderComplete) {
      return <LoadingPage />;
    }

    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          title="Your cart is empty"
          description="Add some items to your cart before checking out."
          action={
            <Link href="/">
              <Button>Start Shopping</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const handleFieldChange = (field: CheckoutFieldConfig, nextValue: string) => {
    const normalizedValue = (
      field.type === 'location_division' ||
      field.type === 'location_district' ||
      field.type === 'location_upazila' ||
      field.type === 'location_union'
    )
      ? (Number(nextValue) || 0)
      : nextValue;

    setCheckoutFieldValues((previous) => {
      const next = {
        ...previous,
        [field.key]: normalizedValue,
      };

      if (field.type === 'location_division') {
        if (semanticFieldKeys.districtId) next[semanticFieldKeys.districtId] = 0;
        if (semanticFieldKeys.upazilaId) next[semanticFieldKeys.upazilaId] = 0;
        if (semanticFieldKeys.unionId) next[semanticFieldKeys.unionId] = 0;
      }

      if (field.type === 'location_district') {
        if (semanticFieldKeys.upazilaId) next[semanticFieldKeys.upazilaId] = 0;
        if (semanticFieldKeys.unionId) next[semanticFieldKeys.unionId] = 0;
      }

      if (field.type === 'location_upazila') {
        if (semanticFieldKeys.unionId) next[semanticFieldKeys.unionId] = 0;
      }

      return next;
    });

    setErrors((previous) => {
      const next = { ...previous };
      delete next[field.key];

      if (field.type === 'location_division') {
        if (semanticFieldKeys.districtId) delete next[semanticFieldKeys.districtId];
        if (semanticFieldKeys.upazilaId) delete next[semanticFieldKeys.upazilaId];
        if (semanticFieldKeys.unionId) delete next[semanticFieldKeys.unionId];
      }

      if (field.type === 'location_district') {
        if (semanticFieldKeys.upazilaId) delete next[semanticFieldKeys.upazilaId];
        if (semanticFieldKeys.unionId) delete next[semanticFieldKeys.unionId];
      }

      if (field.type === 'location_upazila' && semanticFieldKeys.unionId) {
        delete next[semanticFieldKeys.unionId];
      }

      return next;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    activeCheckoutFields.forEach((field) => {
      const rawValue = checkoutFieldValues[field.key];
      const textValue = toTextValue(rawValue);
      const hasValue = isFieldFilled(field, rawValue);

      if (field.required && !hasValue) {
        newErrors[field.key] = `${field.label} is required`;
        return;
      }

      if (!hasValue) {
        return;
      }

      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textValue)) {
        newErrors[field.key] = 'Please enter a valid email address';
        return;
      }

      if (field.type === 'tel' && !/^[0-9+\-\s()]{7,30}$/.test(textValue)) {
        newErrors[field.key] = 'Please enter a valid phone number';
        return;
      }

      if (field.type === 'number' && !Number.isFinite(Number(textValue))) {
        newErrors[field.key] = `${field.label} must be a valid number`;
        return;
      }

      if (field.type === 'select' && field.options.length > 0) {
        const allowedValues = field.options.map((option) => option.value);
        if (!allowedValues.includes(textValue)) {
          newErrors[field.key] = `Please select a valid ${field.label.toLowerCase()}`;
          return;
        }
      }

      if (
        (field.type === 'location_division' ||
          field.type === 'location_district' ||
          field.type === 'location_upazila' ||
          field.type === 'location_union') &&
        toPositiveInteger(rawValue) <= 0
      ) {
        newErrors[field.key] = `Please select ${field.label.toLowerCase()}`;
        return;
      }

      if (field.validations.includes('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textValue)) {
        newErrors[field.key] = 'Please enter a valid email address';
        return;
      }

      if (field.validations.includes('phone') && !/^[0-9+\-\s()]{7,30}$/.test(textValue)) {
        newErrors[field.key] = 'Please enter a valid phone number';
      }
    });

    if (!resolvedShippingMethodCode) {
      newErrors.shipping_method = 'Delivery is not available for the selected address.';
    }

    if (!selectedPaymentMethod) {
      newErrors.payment_method = 'Please select a payment method';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const checkoutFieldPayload = buildCheckoutFieldPayload(activeCheckoutFields, checkoutFieldValues);

      const fallbackName = [readFieldValue(semanticFieldKeys.firstName), readFieldValue(semanticFieldKeys.lastName)]
        .filter((part) => part.length > 0)
        .join(' ')
        .trim();

      const shippingName = readFieldValue(semanticFieldKeys.name) || fallbackName || undefined;
      const shippingAddressValue = readFieldValue(semanticFieldKeys.address) || undefined;
      const shippingCountryValue = readFieldValue(semanticFieldKeys.country) || 'Bangladesh';

      const orderData: CreateOrderData = {
        checkout_fields: checkoutFieldPayload,
        use_billing_address: useBillingDetails,
        payment_method: selectedPaymentMethod,
        shipping_method: resolvedShippingMethodCode,
        shipping_name: shippingName,
        shipping_address: shippingAddressValue,
        shipping_location_text: resolvedLocationText || shippingAddressValue,
        shipping_city: readFieldValue(semanticFieldKeys.city) || undefined,
        shipping_state: readFieldValue(semanticFieldKeys.state) || undefined,
        shipping_country: shippingCountryValue,
      };

      if (cart.coupon_code) {
        orderData.coupon_code = cart.coupon_code;
      }

      const shippingEmail = readFieldValue(semanticFieldKeys.email);
      const shippingPhone = readFieldValue(semanticFieldKeys.phone);
      const shippingZip = readFieldValue(semanticFieldKeys.zip);
      const shippingArea = readFieldValue(semanticFieldKeys.area);
      const notesValue = readFieldValue(semanticFieldKeys.notes);

      if (shippingEmail) {
        orderData.shipping_email = shippingEmail.toLowerCase();
      }

      if (shippingPhone) {
        orderData.shipping_phone = shippingPhone;
      }

      if (shippingZip) {
        orderData.shipping_zip = shippingZip;
      }

      if (shippingArea) {
        orderData.shipping_area = shippingArea;
      }

      if (notesValue) {
        orderData.notes = notesValue;
      }

      if (selectedDivisionId) {
        orderData.shipping_division_id = selectedDivisionId;
      }

      if (selectedDistrictId) {
        orderData.shipping_district_id = selectedDistrictId;
      }

      if (selectedUpazilaId) {
        orderData.shipping_upazila_id = selectedUpazilaId;
      }

      if (selectedUnionId) {
        orderData.shipping_union_id = selectedUnionId;
      }

      if (!isAuthenticated) {
        const guestItems = cart.items.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id ?? null,
          quantity: item.quantity,
        }));
        orderData.items = guestItems;
      }

      const order = await orderService.createOrder(orderData);
      setHasCompletedCheckout(true);

      const guestPaymentQuery = !isAuthenticated && order.guest_access_token
        ? `?guest_token=${encodeURIComponent(order.guest_access_token)}&order_number=${encodeURIComponent(order.order_number)}`
        : '';

      // Handle different payment methods
      if (selectedPaymentMethod === 'stripe') {
        // Redirect to Stripe payment page (cart cleared after payment success)
        router.push(`/payment/stripe/${order.id}${guestPaymentQuery}`);
        return;
      } else if (selectedPaymentMethod === 'bkash') {
        // Redirect to bKash payment page (cart cleared after payment success)
        router.push(`/payment/bkash/${order.id}${guestPaymentQuery}`);
        return;
      } else if (order.payment_url) {
        // If there's a payment URL from the backend, redirect to it
        window.location.href = order.payment_url;
        return;
      }

      // For COD and other methods, clear cart and redirect to order confirmation
      await clearCart();
      const extraGuestQuery = !isAuthenticated && order.guest_access_token
        ? `&guest_token=${encodeURIComponent(order.guest_access_token)}`
        : '';
      router.push(`/order-received?order_id=${order.id}&order=${encodeURIComponent(order.order_number)}${extraGuestQuery}`);
      toast.success('Order placed successfully!');
    } catch (error: unknown) {
      console.error('Error creating order:', error);

      if (error instanceof AxiosError) {
        // Log full error response for debugging
        console.error('API Error Response:', error.response?.data);

        // Handle fraud block response
        if (error.response?.data?.fraud_blocked) {
          const fraudMessage = error.response.data.fraud_message || error.response.data.message || 'Your order could not be processed. Please contact support.';
          setFraudBlockMessage(fraudMessage);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        if (error.response?.data?.errors) {
          const apiErrors: FormErrors = {};

          const legacyFieldMapping: Record<string, string | undefined> = {
            shipping_name: semanticFieldKeys.name,
            shipping_email: semanticFieldKeys.email,
            shipping_phone: semanticFieldKeys.phone,
            shipping_address: semanticFieldKeys.address,
            shipping_area: semanticFieldKeys.area,
            shipping_division_id: semanticFieldKeys.divisionId,
            shipping_district_id: semanticFieldKeys.districtId,
            shipping_upazila_id: semanticFieldKeys.upazilaId,
            shipping_union_id: semanticFieldKeys.unionId,
            shipping_city: semanticFieldKeys.city,
            shipping_state: semanticFieldKeys.state,
            shipping_zip: semanticFieldKeys.zip,
            shipping_country: semanticFieldKeys.country,
            shipping_location_text: semanticFieldKeys.locationText,
            notes: semanticFieldKeys.notes,
          };

          Object.entries(error.response.data.errors).forEach(([key, messages]) => {
            const cleanKey = key.startsWith('checkout_fields.')
              ? key.replace('checkout_fields.', '')
              : (legacyFieldMapping[key] || key);

            apiErrors[cleanKey] = (messages as string[])[0];
          });
          setErrors(apiErrors);

          // Show first error in toast
          const firstError = Object.values(error.response.data.errors)[0];
          if (Array.isArray(firstError) && firstError[0]) {
            toast.error(firstError[0]);
            return;
          }
        }

        if (error.response?.data?.message) {
          toast.error(error.response.data.message);
          return;
        }
      }

      toast.error('Failed to create order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuantityAdjust = async (item: CartItem, delta: -1 | 1) => {
    const nextQuantity = item.quantity + delta;

    if (nextQuantity < 1 || pendingQuantityItemId !== null || isSubmitting) {
      return;
    }

    setPendingQuantityItemId(item.id);

    try {
      await updateQuantity(item.product_id, nextQuantity, item.variant_id ?? undefined);
    } catch {
      // Store already reports user-facing errors.
    } finally {
      setPendingQuantityItemId(null);
    }
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();

    if (!code || isApplyingCoupon) {
      return;
    }

    setIsApplyingCoupon(true);
    try {
      await applyCoupon(code);
      setCouponCode('');
      setIsCouponDropdownOpen(true);
    } catch {
      // Store already handles user-facing errors.
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    if (isApplyingCoupon) {
      return;
    }

    setIsApplyingCoupon(true);
    try {
      await removeCoupon();
    } catch {
      // Store already handles user-facing errors.
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleCouponKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleApplyCoupon();
    }
  };

  const selectedPaymentConfig = paymentMethods.find((method) => method.code === selectedPaymentMethod);
  const selectedShippingConfig = shippingMethods.find((method) => method.code === resolvedShippingMethodCode);
  const hasCoupon = !!cart.coupon_code;
  const checkoutSubtotal = typeof cart.subtotal === 'number' ? cart.subtotal : (cart.total ?? 0);
  const discountAmount = cart.discount_amount ?? 0;
  const checkoutTaxEnabled = checkoutSettings.tax_enabled === true;
  const checkoutTaxPercentage = Math.max(0, Number(checkoutSettings.tax_percentage ?? 0));
  const checkoutTaxAmount = calculateCheckoutTaxAmount(checkoutSubtotal, checkoutTaxEnabled, checkoutTaxPercentage);
  const taxPercentageLabel = Number.isInteger(checkoutTaxPercentage)
    ? String(checkoutTaxPercentage)
    : checkoutTaxPercentage.toFixed(2);
  const paymentChargeAmount = selectedPaymentConfig?.extra_charge?.calculated ?? 0;
  const paymentChargeLabel = selectedPaymentConfig?.extra_charge?.label?.trim() || 'Gateway Charge';
  const loyaltyDiscountAmount = loyaltyDiscountPercentage > 0 ? (checkoutSubtotal * loyaltyDiscountPercentage) / 100 : 0;
  const finalPayableTotal = Math.max(0, checkoutSubtotal - discountAmount - loyaltyDiscountAmount + checkoutTaxAmount + shippingCost + paymentChargeAmount);
  const canSubmitOrder =
    !!selectedPaymentMethod &&
    !!resolvedShippingMethodCode &&
    !loadingShippingMethods &&
    !loadingPaymentMethods &&
    !isApplyingCoupon;

  const renderPaymentMethodIcon = (method: PaymentMethod, isSelected: boolean) => {
    const icon = String(method.icon || '').trim();
    const iconTone = isSelected ? 'text-accent-600' : 'text-gray-500';

    if (icon) {
      if (isIconImagePath(icon)) {
        return (
          <img
            src={resolvePaymentIconImageSrc(icon)}
            alt={`${method.name} icon`}
            className="h-8 w-auto max-w-[80px] object-contain rounded"
            loading="lazy"
          />
        );
      }

      const bootstrapIconClass = resolveBootstrapIconClass(icon);
      if (bootstrapIconClass) {
        return <i className={`${bootstrapIconClass} text-2xl ${iconTone}`} aria-hidden="true" />;
      }

      if (icon.length <= 3) {
        return <span className={`text-base font-bold ${iconTone}`}>{icon}</span>;
      }
    }

    return (
      <svg className={`w-8 h-8 ${iconTone}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    );
  };

  const renderCheckoutField = (field: CheckoutFieldConfig) => {
    const label = `${field.label}${field.required ? ' *' : ''}`;
    const value = checkoutFieldValues[field.key];
    const textValue = value === null || value === undefined ? '' : String(value);
    const error = errors[field.key];

    if (field.type === 'textarea') {
      return (
        <div key={field.key} className="md:col-span-2">
          <label htmlFor={field.key} className="mb-2 block text-sm font-medium text-gray-700">
            {label}
          </label>
          <textarea
            id={field.key}
            value={textValue}
            onChange={(event) => handleFieldChange(field, event.target.value)}
            rows={4}
            placeholder={field.placeholder || field.label}
            className={`w-full rounded-md border px-4 py-3 text-sm transition-all duration-300 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.key}>
          <label htmlFor={field.key} className="mb-2 block text-sm font-medium text-gray-700">
            {label}
          </label>
          <select
            id={field.key}
            value={textValue}
            onChange={(event) => handleFieldChange(field, event.target.value)}
            className={`w-full rounded-md border px-4 py-3 text-sm transition-all duration-300 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <option value="">Select {field.label}</option>
            {field.options.map((option) => (
              <option key={`${field.key}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      );
    }

    if (
      field.type === 'location_division' ||
      field.type === 'location_district' ||
      field.type === 'location_upazila' ||
      field.type === 'location_union'
    ) {
      const locationValue = toPositiveInteger(value);

      const options =
        field.type === 'location_division'
          ? divisions
          : field.type === 'location_district'
            ? districts
            : field.type === 'location_upazila'
              ? upazilas
              : unions;

      const disabled =
        field.type === 'location_division'
          ? isLoadingLocations
          : field.type === 'location_district'
            ? (semanticFieldKeys.divisionId ? !selectedDivisionId : false) || isLoadingLocations
            : field.type === 'location_upazila'
              ? (semanticFieldKeys.districtId ? !selectedDistrictId : false) || isLoadingLocations
              : (semanticFieldKeys.upazilaId ? !selectedUpazilaId : false) || isLoadingLocations;

      const mappedOptions = options.map((item) => ({
        value: String(item.id),
        label: item.name,
      }));

      return (
        <div key={field.key}>
          <label htmlFor={field.key} className="mb-2 block text-sm font-medium text-gray-700">
            {label}
          </label>
          <SearchableSelect
            id={field.key}
            options={mappedOptions}
            value={String(locationValue || '')}
            onChange={(val) => handleFieldChange(field, val)}
            placeholder={`Select ${field.label}`}
            disabled={disabled}
            error={!!error}
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      );
    }

    if (field.type === 'number') {
      return (
        <Input
          key={field.key}
          label={label}
          id={field.key}
          type="number"
          value={textValue}
          onChange={(event) => handleFieldChange(field, event.target.value)}
          error={error}
          placeholder={field.placeholder || field.label}
        />
      );
    }

    const inputType = field.type === 'email' || field.type === 'tel' ? field.type : 'text';

    return (
      <Input
        key={field.key}
        label={label}
        id={field.key}
        type={inputType}
        value={textValue}
        onChange={(event) => handleFieldChange(field, event.target.value)}
        error={error}
        placeholder={field.placeholder || field.label}
      />
    );
  };

  return (
    <div className="bg-slate-100/70 w-full overflow-x-hidden">
      {/* Loyalty Welcome Offer Modal Popup (Centered on Mobile & PC) */}
      {showLoyaltyPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-300 scale-100 flex flex-col items-center p-6 text-center border border-gray-100 animate-fade-in relative">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowLoyaltyPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100 focus:outline-none"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Icon */}
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-600 text-3xl">
              🎉
            </div>
            
            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Welcome Offer!
            </h3>
            
            {/* Message */}
            <p className="text-gray-600 text-sm leading-relaxed mb-6 whitespace-pre-line font-semibold">
              {loyaltyPopupMessage}
            </p>
            
            {/* Action Button */}
            <button
              type="button"
              onClick={() => setShowLoyaltyPopup(false)}
              className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-lg shadow-green-600/20 hover:shadow-green-700/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              ধন্যবাদ
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-2 sm:px-4 py-6 sm:py-10 max-w-full">
        <div className="mb-6 relative">
          <div className="mb-4 flex sm:absolute sm:left-0 sm:top-1/2 sm:-translate-y-1/2 sm:mb-0">
            <Link href="/cart" className="inline-flex items-center text-xs sm:text-sm font-medium text-slate-600 hover:text-accent-600 transition-colors bg-white px-2.5 py-1.5 rounded-full border border-slate-200 shadow-sm">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Cart
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900">Checkout</h1>
            <p className="mt-1 text-[10px] sm:text-sm text-slate-500">
              Home <span className="mx-1">/</span> <span className="text-amber-600">Checkout</span>
            </p>
          </div>
        </div>

        {/* Fraud Block Alert */}
        {fraudBlockMessage && (
          <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 mb-1">Order Cannot Be Processed</h3>
                <p className="text-sm text-red-700">{fraudBlockMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setFraudBlockMessage(null)}
                className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>Have any account? please login or register</p>
            <div className="flex gap-2">
              <Link href="/login">
                <Button type="button" size="sm" variant="outline">Login</Button>
              </Link>
              <Link href="/register">
                <Button type="button" size="sm">Register</Button>
              </Link>
            </div>
          </div>
        )}

        <FreeShippingProgress
          cartValue={typeof cart.subtotal === 'number' ? cart.subtotal : cart.total}
          threshold={checkoutFreeShippingThreshold ?? undefined}
          className="mb-4"
        />

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-6 xl:gap-8 pb-24 md:pb-0">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 lg:p-6">
                <h2 className="mb-4 border-l-2 border-amber-500 pl-3 text-lg font-semibold text-slate-900">Order review</h2>
                <div className="space-y-3">
                  {cart.items.map((item) => {
                    const productImage =
                      item.product.image_url
                      || item.product.image
                      || item.product.images?.find((image) => image.is_primary)?.url
                      || item.product.images?.[0]?.url
                      || undefined;
                    const variantSummary = getCartItemVariantSummary(item);
                    const productHref = item.product.slug ? `/products/${item.product.slug}` : '';

                    return (
                      <div key={`preview-${item.id}`} className="flex items-center gap-2 sm:gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 sm:p-3 max-w-full overflow-hidden">
                        <div className="relative h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-lg bg-white shrink-0">
                          <SmartImage
                            src={getImageUrl(productImage)}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 48px, 56px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          {productHref ? (
                            <Link href={productHref} className="block custom-line-clamp-2 text-xs sm:text-sm font-semibold text-slate-900 hover:text-accent-600 leading-tight">
                              {item.product.name}
                            </Link>
                          ) : (
                            <p className="custom-line-clamp-2 text-xs sm:text-sm font-semibold text-slate-900 leading-tight">{item.product.name}</p>
                          )}
                          {variantSummary && (
                            <p className="mt-0.5 truncate text-xs text-slate-500">{variantSummary}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-y-2 gap-x-2">
                            <div className="inline-flex items-center rounded-md border border-slate-200 bg-white overflow-hidden shrink-0">
                              <button
                                type="button"
                                className="h-6 w-6 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={() => handleQuantityAdjust(item, -1)}
                                disabled={item.quantity <= 1 || pendingQuantityItemId !== null || isSubmitting}
                                aria-label={`Decrease quantity for ${item.product.name}`}
                              >
                                -
                              </button>
                              <span className="min-w-[1.5rem] text-center text-[10px] font-bold text-slate-700">
                                {pendingQuantityItemId === item.id ? '...' : item.quantity}
                              </span>
                              <button
                                type="button"
                                className="h-6 w-6 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={() => handleQuantityAdjust(item, 1)}
                                disabled={pendingQuantityItemId !== null || isSubmitting}
                                aria-label={`Increase quantity for ${item.product.name}`}
                              >
                                +
                              </button>
                            </div>

                            <div className="flex flex-1 items-center justify-between min-w-0 gap-1">
                              <span className="text-[10px] text-slate-500 truncate">x {formatPrice(item.price)}</span>
                              <span className="text-xs font-bold text-slate-900 shrink-0">{formatPrice(item.subtotal)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 lg:p-6">
                <h2 className="mb-5 border-l-2 border-amber-500 pl-3 text-lg font-semibold text-slate-900">
                  {shippingSection?.label || 'Shipping Address'}
                </h2>

                {shippingAndSecondaryFields.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                    No shipping fields are configured by admin. Add and enable shipping fields from checkout field manager.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {shippingSection && shippingSection.fields.length > 0 && (
                      <div className="grid gap-4 md:grid-cols-2">
                        {shippingSection.fields.map((field) => renderCheckoutField(field))}
                      </div>
                    )}

                    {secondarySections.map((section) => (
                      <div key={section.section}>
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{section.label}</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          {section.fields.map((field) => renderCheckoutField(field))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {locationDropdownEnabled && isLoadingLocations && (
                  <p className="mt-4 text-xs text-gray-500">Updating location options...</p>
                )}
              </div>

              {billingSection && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 lg:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="border-l-2 border-amber-500 pl-3 text-lg font-semibold text-slate-900">{billingSection.label}</h2>
                    <label className="inline-flex items-center gap-3 cursor-pointer">
                      <span className="text-sm font-medium text-slate-600">Use billing details</span>
                      <input
                        type="checkbox"
                        checked={useBillingDetails}
                        onChange={(event) => setUseBillingDetails(event.target.checked)}
                        className="h-5 w-5 rounded-full accent-amber-500"
                      />
                    </label>
                  </div>

                  {useBillingDetails ? (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {billingSection.fields.map((field) => renderCheckoutField(field))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      Billing details are optional. Check this box only if you want to provide billing information.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 lg:p-6">
                <h2 className="mb-4 text-base font-bold text-slate-900">Do you want to pay now?</h2>

                {loadingPaymentMethods ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-accent-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-sm text-gray-600">Loading payment methods...</span>
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <div className="text-center py-4 text-sm text-gray-500">
                    No payment methods available
                  </div>
                ) : (
                  <div className="space-y-1">
                    {paymentMethods.map((method) => {
                      const isSelected = selectedPaymentMethod === method.code;
                      const extraCharge = method.extra_charge;

                      return (
                        <label
                          key={method.code}
                          className="flex items-center justify-between py-3 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-shrink-0 h-10 w-16 flex items-center justify-start transition-all">
                              {renderPaymentMethodIcon(method, isSelected)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-gray-900 text-sm truncate">{method.name}</span>
                              {method.description && (
                                <span className="text-[11px] text-gray-500 line-clamp-1">{method.description}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pl-3 shrink-0">
                            {extraCharge && extraCharge.calculated > 0 && (
                              <div className="text-right flex flex-col mr-1">
                                <span className="text-xs font-medium text-accent-700">
                                  +{extraCharge.type === 'percentage'
                                    ? `${extraCharge.value}%`
                                    : formatPrice(extraCharge.calculated)}
                                </span>
                                {extraCharge.label && (
                                  <span className="text-[10px] text-gray-400">{extraCharge.label}</span>
                                )}
                              </div>
                            )}
                            <div className="relative flex items-center justify-center w-5 h-5">
                              <input
                                type="radio"
                                name="payment_method"
                                value={method.code}
                                checked={isSelected}
                                onChange={() => setSelectedPaymentMethod(method.code)}
                                className="peer appearance-none w-5 h-5 rounded-full border-2 border-gray-300 checked:border-accent-600 cursor-pointer transition-colors"
                              />
                              <div className="absolute w-2.5 h-2.5 rounded-full bg-accent-600 scale-0 peer-checked:scale-100 transition-transform pointer-events-none"></div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {errors.payment_method && (
                  <p className="mt-2 text-sm text-red-600">{errors.payment_method}</p>
                )}

                {selectedPaymentConfig?.instructions && (
                  <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                    {selectedPaymentConfig.instructions}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <button
                  type="button"
                  onClick={() => setIsCouponDropdownOpen((prev) => !prev)}
                  className="w-full text-left text-sm font-medium text-slate-700 flex items-center justify-between gap-2"
                >
                  <span>Have any coupon or gift voucher?</span>
                  <div className="flex items-center gap-2">
                    {hasCoupon && (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        {cart.coupon_code}
                      </span>
                    )}
                    <svg
                      className={`h-4 w-4 text-slate-500 transition-transform ${isCouponDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isCouponDropdownOpen && (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    {hasCoupon ? (
                      <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-green-800">Coupon: {cart.coupon_code}</p>
                          <p className="text-xs text-green-700">-{formatPrice(discountAmount)} discount</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleRemoveCoupon()}
                          disabled={isApplyingCoupon}
                          className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {isApplyingCoupon ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-start">
                        <Input
                          placeholder="Coupon code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          onKeyDown={handleCouponKeyDown}
                          className="text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleApplyCoupon()}
                          isLoading={isApplyingCoupon}
                          disabled={!couponCode.trim() || isApplyingCoupon}
                        >
                          Apply
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 lg:p-6">
                <h2 className="mb-4 border-l-2 border-amber-500 pl-3 text-lg font-semibold text-slate-900">Order Summary</h2>

                <div className="border-b border-slate-200 pb-4 mb-4">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-slate-600 font-medium">Items ({cart.items.reduce((acc, item) => acc + item.quantity, 0)})</span>
                    <span className="text-slate-900 font-bold">{formatPrice(checkoutSubtotal)}</span>
                  </div>
                  {/* Space reserved for future summary logic as requested */}
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between items-center gap-2 text-slate-600 min-w-0">
                    <span className="truncate">Sub total</span>
                    <span className="shrink-0">{formatPrice(checkoutSubtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center gap-2 text-green-600 min-w-0">
                      <span className="truncate">Discount</span>
                      <span className="shrink-0">-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  {loyaltyDiscountAmount > 0 && (
                    <div className="flex justify-between items-center gap-2 text-amber-600 min-w-0 font-medium">
                      <span className="truncate">{loyaltyGroupName} Discount</span>
                      <span className="shrink-0">-{formatPrice(loyaltyDiscountAmount)}</span>
                    </div>
                  )}
                  {checkoutTaxAmount > 0 && (
                    <div className="flex justify-between items-center gap-2 text-slate-600 min-w-0">
                      <span className="truncate">Tax ({taxPercentageLabel}%)</span>
                      <span className="shrink-0">{formatPrice(checkoutTaxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-2 text-slate-600 min-w-0">
                    <span className="truncate">Delivery cost</span>
                    {loadingShippingMethods ? (
                      <span className="text-gray-400 shrink-0">Calculating...</span>
                    ) : shippingCost === 0 ? (
                      <span className="text-green-600 font-bold shrink-0">FREE</span>
                    ) : (
                      <span className="shrink-0">{formatPrice(shippingCost)}</span>
                    )}
                  </div>
                  
                  {paymentChargeAmount > 0 && (
                    <div className="flex justify-between items-center gap-2 text-slate-600 min-w-0">
                      <span className="truncate">{paymentChargeLabel}</span>
                      <span className="shrink-0">{formatPrice(paymentChargeAmount)}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-3.5 mt-3">
                    <div className="flex justify-between items-center gap-2 text-base sm:text-lg font-bold text-slate-900 min-w-0">
                      <span className="truncate">Total</span>
                      <span className="text-accent-600 shrink-0">{formatPrice(finalPayableTotal)}</span>
                    </div>
                  </div>
                </div>

                {errors.shipping_method && (
                  <p className="mt-3 text-sm text-red-600">{errors.shipping_method}</p>
                )}
              </div>

              <p className="text-xs text-slate-600">
                I have read and agree to the Terms and Conditions, Privacy Policy and Return Policy.
              </p>

              <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none max-w-full overflow-hidden">
                <Button
                  type="submit"
                  className="w-full shadow-md md:shadow-none text-sm sm:text-base h-11 md:h-11"
                  size="md"
                  isLoading={isSubmitting}
                  disabled={!canSubmitOrder}
                >
                  Place Order : {formatPrice(finalPayableTotal)}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
