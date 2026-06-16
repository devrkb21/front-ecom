export interface TrackingItemPayload {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_variant?: string;
  item_category?: string;
}

interface TrackingEventPayload {
  item: TrackingItemPayload;
  currency?: string;
  value?: number | string;
}

interface TrackingCheckoutPayload {
  items: TrackingItemPayload[];
  currency?: string;
  value?: number | string;
}

interface TrackingPageViewPayload {
  pagePath: string;
  pageTitle?: string;
  pageLocation?: string;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      page?: () => void;
      track?: (eventName: string, payload?: Record<string, unknown>) => void;
      [key: string]: unknown;
    };
  }
}

const DEFAULT_CURRENCY = 'BDT';

const normalizeText = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
};

const normalizeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number(value.toFixed(2));
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return Number(parsed.toFixed(2));
    }
  }

  return fallback;
};

const normalizeQuantity = (value: unknown, fallback = 1): number => {
  const normalized = normalizeNumber(value, fallback);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return fallback;
  }

  return Math.max(1, Math.round(normalized));
};

const resolveCurrency = (currency?: string): string => {
  const normalized = normalizeText(currency, DEFAULT_CURRENCY).toUpperCase();
  return normalized || DEFAULT_CURRENCY;
};

const sanitizeItem = (item: TrackingItemPayload): TrackingItemPayload => {
  return {
    item_id: normalizeText(item.item_id, 'unknown-item'),
    item_name: normalizeText(item.item_name, 'Unknown Item'),
    item_variant: normalizeText(item.item_variant),
    item_category: normalizeText(item.item_category),
    price: normalizeNumber(item.price, 0),
    quantity: normalizeQuantity(item.quantity, 1),
  };
};

const toGaItem = (item: TrackingItemPayload): Record<string, unknown> => {
  const sanitized = sanitizeItem(item);

  return {
    item_id: sanitized.item_id,
    item_name: sanitized.item_name,
    item_variant: sanitized.item_variant,
    item_category: sanitized.item_category,
    price: sanitized.price,
    quantity: sanitized.quantity,
  };
};

const pushDataLayer = (payload: Record<string, unknown>): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
};

const buildEcommerceValue = (items: TrackingItemPayload[], explicitValue?: number | string): number => {
  if (explicitValue !== undefined && explicitValue !== null && explicitValue !== '') {
    const parsedValue = normalizeNumber(explicitValue, -1);
    if (parsedValue >= 0) {
      return parsedValue;
    }
  }

  const total = items.reduce((sum, item) => {
    const sanitized = sanitizeItem(item);
    return sum + sanitized.price * sanitized.quantity;
  }, 0);

  return normalizeNumber(total, 0);
};

export const trackPageView = ({
  pagePath,
  pageTitle,
  pageLocation,
}: TrackingPageViewPayload): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const resolvedPath = normalizeText(pagePath, '/');
  const resolvedTitle = normalizeText(pageTitle, typeof document !== 'undefined' ? document.title : '');
  const resolvedLocation = normalizeText(pageLocation, typeof window !== 'undefined' ? window.location.href : '');

  pushDataLayer({
    event: 'page_view',
    page_path: resolvedPath,
    page_title: resolvedTitle,
    page_location: resolvedLocation,
  });

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: resolvedPath,
      page_title: resolvedTitle,
      page_location: resolvedLocation,
    });
  }

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'PageView');
  }

  if (typeof window.ttq?.page === 'function') {
    window.ttq.page();
  }
};

export const trackViewContent = ({ item, currency, value }: TrackingEventPayload): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const sanitizedItem = sanitizeItem(item);
  const resolvedCurrency = resolveCurrency(currency);
  const resolvedValue = buildEcommerceValue([sanitizedItem], value);
  const gaItems = [toGaItem(sanitizedItem)];

  pushDataLayer({
    event: 'view_content',
    ecommerce: {
      currency: resolvedCurrency,
      value: resolvedValue,
      items: gaItems,
    },
  });

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'view_item', {
      currency: resolvedCurrency,
      value: resolvedValue,
      items: gaItems,
    });
  }

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'ViewContent', {
      content_ids: [sanitizedItem.item_id],
      content_name: sanitizedItem.item_name,
      content_type: 'product',
      value: resolvedValue,
      currency: resolvedCurrency,
      num_items: sanitizedItem.quantity,
    });
  }

  if (typeof window.ttq?.track === 'function') {
    window.ttq.track('ViewContent', {
      content_id: sanitizedItem.item_id,
      content_name: sanitizedItem.item_name,
      content_type: 'product',
      quantity: sanitizedItem.quantity,
      value: resolvedValue,
      currency: resolvedCurrency,
    });
  }
};

export const trackAddToCart = ({ item, currency, value }: TrackingEventPayload): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const sanitizedItem = sanitizeItem(item);
  const resolvedCurrency = resolveCurrency(currency);
  const resolvedValue = buildEcommerceValue([sanitizedItem], value);
  const gaItems = [toGaItem(sanitizedItem)];

  pushDataLayer({
    event: 'add_to_cart',
    ecommerce: {
      currency: resolvedCurrency,
      value: resolvedValue,
      items: gaItems,
    },
  });

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'add_to_cart', {
      currency: resolvedCurrency,
      value: resolvedValue,
      items: gaItems,
    });
  }

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'AddToCart', {
      content_ids: [sanitizedItem.item_id],
      content_name: sanitizedItem.item_name,
      content_type: 'product',
      value: resolvedValue,
      currency: resolvedCurrency,
      num_items: sanitizedItem.quantity,
    });
  }

  if (typeof window.ttq?.track === 'function') {
    window.ttq.track('AddToCart', {
      content_id: sanitizedItem.item_id,
      content_name: sanitizedItem.item_name,
      content_type: 'product',
      quantity: sanitizedItem.quantity,
      value: resolvedValue,
      currency: resolvedCurrency,
    });
  }
};

export const trackInitiateCheckout = ({ items, currency, value }: TrackingCheckoutPayload): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const sanitizedItems = items.map(sanitizeItem).filter((item) => item.quantity > 0);

  if (sanitizedItems.length === 0) {
    return;
  }

  const resolvedCurrency = resolveCurrency(currency);
  const resolvedValue = buildEcommerceValue(sanitizedItems, value);
  const gaItems = sanitizedItems.map(toGaItem);
  const totalQuantity = sanitizedItems.reduce((sum, item) => sum + item.quantity, 0);

  pushDataLayer({
    event: 'initiate_checkout',
    ecommerce: {
      currency: resolvedCurrency,
      value: resolvedValue,
      items: gaItems,
    },
  });

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'begin_checkout', {
      currency: resolvedCurrency,
      value: resolvedValue,
      items: gaItems,
    });
  }

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'InitiateCheckout', {
      content_ids: sanitizedItems.map((item) => item.item_id),
      content_type: 'product',
      num_items: totalQuantity,
      value: resolvedValue,
      currency: resolvedCurrency,
    });
  }

  if (typeof window.ttq?.track === 'function') {
    window.ttq.track('InitiateCheckout', {
      contents: sanitizedItems.map((item) => ({
        content_id: item.item_id,
        content_name: item.item_name,
        content_type: 'product',
        quantity: item.quantity,
        price: item.price,
      })),
      quantity: totalQuantity,
      value: resolvedValue,
      currency: resolvedCurrency,
    });
  }
};

export const trackPurchase = ({ items, currency, value, transaction_id }: TrackingCheckoutPayload & { transaction_id?: string }): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const sanitizedItems = items ? items.map(sanitizeItem).filter((item) => item.quantity > 0) : [];

  const resolvedCurrency = resolveCurrency(currency);
  const resolvedValue = buildEcommerceValue(sanitizedItems, value);
  const gaItems = sanitizedItems.map(toGaItem);
  const totalQuantity = sanitizedItems.reduce((sum, item) => sum + item.quantity, 0);

  pushDataLayer({
    event: 'purchase',
    ecommerce: {
      transaction_id: transaction_id || 'N/A',
      currency: resolvedCurrency,
      value: resolvedValue,
      items: gaItems,
    },
  });

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'purchase', {
      transaction_id: transaction_id || 'N/A',
      currency: resolvedCurrency,
      value: resolvedValue,
      items: gaItems,
    });
  }

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Purchase', {
      content_ids: sanitizedItems.map((item) => item.item_id),
      content_type: 'product',
      num_items: totalQuantity,
      value: resolvedValue,
      currency: resolvedCurrency,
    });
  }

  if (typeof window.ttq?.track === 'function') {
    window.ttq.track('PlaceAnOrder', {
      contents: sanitizedItems.map((item) => ({
        content_id: item.item_id,
        content_name: item.item_name,
        content_type: 'product',
        quantity: item.quantity,
        price: item.price,
      })),
      quantity: totalQuantity,
      value: resolvedValue,
      currency: resolvedCurrency,
    });
  }
};
