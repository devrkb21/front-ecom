import { Category } from './category';

export interface ProductImage {
  id: number;
  image: string;
  url: string;
  alt?: string;
  is_primary: boolean;
  sort_order: number;
}

// Attribute types
export interface AttributeValue {
  id: number;
  value: string;
  color_code?: string | null;
  image?: string | null;
  image_url?: string | null;
}

export interface Attribute {
  id: number;
  name: string;
  slug: string;
  display_style?: string;
  values: AttributeValue[];
}

// Variant types
export interface VariantAttribute {
  attribute_id: number;
  attribute_name: string;
  attribute_slug: string;
  display_style?: string;
  value_id: number;
  value: string;
  color_code?: string | null;
  image?: string | null;
  image_url?: string | null;
}

export interface ProductVariant {
  id: number;
  sku: string;
  price_adjustment: number;
  purchase_price?: number;
  regular_price?: number;
  discounted_price?: number;
  current_price?: number;
  final_price: number;
  is_on_sale?: boolean;
  stock_quantity: number;
  in_stock: boolean;
  is_active: boolean;
  name: string;
  attributes: VariantAttribute[];
  image?: string | null;
  image_url?: string | null;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  price: number;
  sale_price?: number | null;
  current_price: number;
  is_on_sale: boolean;
  default_variant_id?: number | null;
  has_price_range?: boolean;
  price_range_min?: number;
  price_range_max?: number;
  sku: string;
  stock_quantity: number;
  total_stock: number;
  in_stock: boolean;
  image?: string;
  image_url?: string;
  images: ProductImage[];
  category?: Category;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  sales_count: number;
  has_variants: boolean;
  variants: ProductVariant[];
  average_rating?: number | null;
  review_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: number;
  user_id: number;
  product_id: number;
  rating: number;
  title?: string;
  comment?: string;
  is_verified_purchase: boolean;
  user: {
    id: number;
    name: string;
  };
  created_at: string;
}

export interface ReviewSummary {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    [key: string]: number | { count: number; percentage: number };
  };
}
