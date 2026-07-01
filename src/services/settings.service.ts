import { internalGet } from './api';
import { unwrapEnvelope } from './normalizers';
import {
  normalizeDesktopColumns,
  normalizeMobileColumns,
  type ProductGridColumnsDesktop,
  type ProductGridColumnsMobile,
} from '@/utils/product-grid';

export interface HeroSettings {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  button_text: string;
  button_link: string;
  enabled: boolean;
}

export interface BannerSettings {
  promo_enabled: boolean;
  promo_text: string;
  promo_link: string;
  promo_bg_color: string;
  promo_text_color: string;
}

export interface NavigationMenuItem {
  label: string;
  url: string;
  type?: string;
  highlight?: boolean;
  highlight_bg?: string;
  highlight_text?: string;
  children?: NavigationMenuItem[];
}

export interface NavigationSettings {
  header_menu?: NavigationMenuItem[];
}

export interface GeneralSettings {
  site_name?: string;
  site_logo?: string;
  logo_height?: number | string;
  logo_height_desktop?: number | string;
  logo_height_mobile?: number | string;
  site_favicon?: string;
  contact_email?: string;
  contact_phone?: string;
  call_for_order_phone?: string;
  whatsapp_order_phone?: string;
  whatsapp_order_message?: string;
  open_side_cart_on_add?: boolean | string | number;
  address?: string;
  currency?: string;
  currency_symbol?: string;
  product_grid_columns_desktop?: ProductGridColumnsDesktop;
  product_grid_columns_mobile?: ProductGridColumnsMobile;
  [key: string]: string | boolean | number | undefined;
}

export type CheckoutFieldSectionKey = 'billing' | 'shipping' | 'additional' | string;

export type CheckoutFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'number'
  | 'select'
  | 'country'
  | 'location_text'
  | 'location_division'
  | 'location_district'
  | 'location_upazila'
  | 'location_union';

export interface CheckoutFieldOption {
  label: string;
  value: string;
}

export interface CheckoutFieldConfig {
  id: string;
  section: CheckoutFieldSectionKey;
  key: string;
  type: CheckoutFieldType;
  label: string;
  placeholder: string;
  required: boolean;
  enabled: boolean;
  validations: string[];
  options: CheckoutFieldOption[];
  sort_order: number;
}

export interface CheckoutFieldSection {
  section: CheckoutFieldSectionKey;
  label: string;
  fields: CheckoutFieldConfig[];
}

export interface CheckoutSettingsConfig {
  checkout_form_enabled: boolean;
  guest_checkout_enabled: boolean;
  tax_enabled: boolean;
  tax_percentage: number;
  field_sections: CheckoutFieldSection[];
  fields: CheckoutFieldConfig[];
}

export interface TrackingIntegrationsSettings {
  gtm_enabled: boolean;
  gtm_container_id: string;
  facebook_pixel_enabled: boolean;
  facebook_pixel_id: string;
  tiktok_pixel_enabled: boolean;
  tiktok_pixel_id: string;
  google_analytics_enabled: boolean;
  google_analytics_measurement_id: string;
  site_verification_entries: SiteVerificationEntry[];
}

export type SiteVerificationProvider = 'google' | 'bing' | 'yandex' | 'pinterest' | 'facebook' | 'custom';

export interface SiteVerificationEntry {
  provider: SiteVerificationProvider;
  code: string;
  meta_name?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
};

const toText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const normalizeCheckoutFieldOption = (value: unknown): CheckoutFieldOption | null => {
  if (!isRecord(value)) {
    return null;
  }

  const label = toText(value.label);
  const optionValue = toText(value.value);

  if (!label || !optionValue) {
    return null;
  }

  return {
    label,
    value: optionValue,
  };
};

const normalizeCheckoutField = (value: unknown, fallbackSection: CheckoutFieldSectionKey, index: number): CheckoutFieldConfig | null => {
  if (!isRecord(value)) {
    return null;
  }

  const key = toText(value.key).toLowerCase();
  if (!key) {
    return null;
  }

  const rawType = toText(value.type).toLowerCase();
  const type: CheckoutFieldType = (
    rawType === 'text' ||
    rawType === 'textarea' ||
    rawType === 'email' ||
    rawType === 'tel' ||
    rawType === 'number' ||
    rawType === 'select' ||
    rawType === 'country' ||
    rawType === 'location_text' ||
    rawType === 'location_division' ||
    rawType === 'location_district' ||
    rawType === 'location_upazila' ||
    rawType === 'location_union'
  )
    ? rawType
    : 'text';

  const sectionText = toText(value.section).toLowerCase();
  const section = sectionText || fallbackSection;

  const validations = Array.isArray(value.validations)
    ? value.validations.map((item) => toText(item).toLowerCase()).filter(Boolean)
    : [];

  const options = Array.isArray(value.options)
    ? value.options.map(normalizeCheckoutFieldOption).filter((item): item is CheckoutFieldOption => item !== null)
    : [];

  return {
    id: toText(value.id) || key,
    section,
    key,
    type,
    label: toText(value.label) || key,
    placeholder: toText(value.placeholder),
    required: toBoolean(value.required, false),
    enabled: toBoolean(value.enabled, true),
    validations,
    options,
    sort_order: typeof value.sort_order === 'number' && Number.isFinite(value.sort_order)
      ? value.sort_order
      : index + 1,
  };
};

const normalizeCheckoutSettings = (payload: unknown): CheckoutSettingsConfig => {
  const root = unwrapEnvelope<unknown>(payload);
  const source = isRecord(root) ? root : {};

  const rawSections = Array.isArray(source.field_sections) ? source.field_sections : [];
  const normalizedSections: CheckoutFieldSection[] = rawSections
    .map((entry): CheckoutFieldSection | null => {
      if (!isRecord(entry)) {
        return null;
      }

      const section = toText(entry.section).toLowerCase() || 'shipping';
      const fields = Array.isArray(entry.fields)
        ? entry.fields
            .map((field, index) => normalizeCheckoutField(field, section, index))
            .filter((field): field is CheckoutFieldConfig => field !== null && field.enabled)
            .sort((a, b) => a.sort_order - b.sort_order)
        : [];

      return {
        section,
        label: toText(entry.label) || section,
        fields,
      };
    })
    .filter((section): section is CheckoutFieldSection => section !== null);

  let flatFields: CheckoutFieldConfig[] = normalizedSections.flatMap((section) => section.fields);

  if (flatFields.length === 0 && Array.isArray(source.fields)) {
    flatFields = source.fields
      .map((field, index) => normalizeCheckoutField(field, 'shipping', index))
      .filter((field): field is CheckoutFieldConfig => field !== null && field.enabled)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  const hasSections = normalizedSections.length > 0;
  const fieldSections = hasSections
    ? normalizedSections
    : [
        {
          section: 'shipping',
          label: 'Shipping Fields',
          fields: flatFields,
        },
      ];

  return {
    checkout_form_enabled: toBoolean(source.checkout_form_enabled, false),
    guest_checkout_enabled: toBoolean(source.guest_checkout_enabled ?? source.enable_guest_checkout, false),
    tax_enabled: toBoolean(source.tax_enabled, false),
    tax_percentage: Math.max(0, Math.min(100, toNumber(source.tax_percentage, 0))),
    field_sections: fieldSections,
    fields: flatFields,
  };
};

const normalizeTrackingIntegrations = (payload: unknown): TrackingIntegrationsSettings => {
  const root = unwrapEnvelope<unknown>(payload);
  const source = isRecord(root) ? root : {};

  const verificationEntries = Array.isArray(source.site_verification_entries)
    ? source.site_verification_entries
        .filter((entry): entry is Record<string, unknown> => isRecord(entry))
        .map((entry) => {
          const providerRaw = toText(entry.provider).toLowerCase();
          const provider: SiteVerificationProvider =
            providerRaw === 'google' ||
            providerRaw === 'bing' ||
            providerRaw === 'yandex' ||
            providerRaw === 'pinterest' ||
            providerRaw === 'facebook' ||
            providerRaw === 'custom'
              ? providerRaw
              : 'google';

          return {
            provider,
            code: toText(entry.code),
            meta_name: toText(entry.meta_name) || undefined,
          };
        })
        .filter((entry) => entry.code.length > 0)
    : [];

  return {
    gtm_enabled: toBoolean(source.gtm_enabled, false),
    gtm_container_id: toText(source.gtm_container_id),
    facebook_pixel_enabled: toBoolean(source.facebook_pixel_enabled, false),
    facebook_pixel_id: toText(source.facebook_pixel_id),
    tiktok_pixel_enabled: toBoolean(source.tiktok_pixel_enabled, false),
    tiktok_pixel_id: toText(source.tiktok_pixel_id),
    google_analytics_enabled: toBoolean(source.google_analytics_enabled, false),
    google_analytics_measurement_id: toText(source.google_analytics_measurement_id),
    site_verification_entries: verificationEntries,
  };
};

export const settingsService = {
  async getHero(): Promise<HeroSettings> {
    const payload = await internalGet<unknown>('settings/hero');
    return unwrapEnvelope<HeroSettings>(payload);
  },

  async getGeneral(): Promise<GeneralSettings> {
    const payload = await internalGet<unknown>('settings/general');
    const settings = unwrapEnvelope<GeneralSettings>(payload);

    return {
      ...settings,
      product_grid_columns_desktop: normalizeDesktopColumns(settings?.product_grid_columns_desktop),
      product_grid_columns_mobile: normalizeMobileColumns(settings?.product_grid_columns_mobile),
      logo_height: settings?.logo_height,
    };
  },

  async getBanner(): Promise<BannerSettings> {
    const payload = await internalGet<unknown>('settings/banner');
    return unwrapEnvelope<BannerSettings>(payload);
  },

  async getCheckout(): Promise<CheckoutSettingsConfig> {
    const payload = await internalGet<unknown>('settings/checkout');
    return normalizeCheckoutSettings(payload);
  },

  async getIntegrations(): Promise<TrackingIntegrationsSettings> {
    const payload = await internalGet<unknown>('settings/integration');
    return normalizeTrackingIntegrations(payload);
  },

  async getNavigation(): Promise<NavigationSettings> {
    const payload = await internalGet<unknown>('settings/navigation');
    return unwrapEnvelope<NavigationSettings>(payload);
  },

  async getGroup(group: string): Promise<Record<string, string | boolean | number>> {
    const payload = await internalGet<unknown>(`settings/${group}`);
    return unwrapEnvelope<Record<string, string | boolean | number>>(payload);
  },
};
