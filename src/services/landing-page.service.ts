import { internalGet } from './api';
import { unwrapEnvelope } from './normalizers';
import { Product } from '@/types';

export interface FeatureItem {
  title: string;
  icon: string;
  description: string;
}

export interface TestimonialItem {
  name: string;
  rating: number;
  comment: string;
}

export interface LandingPage {
  id: number;
  product_id: number;
  title: string;
  slug: string;
  template_type: 'default' | 'clothing' | 'am' | 'khejur' | 'digital_item' | 'inner_item' | 'sexual_item';
  theme_color: string;
  banner_image: string | null;
  video_embed_code: string | null;
  features: FeatureItem[] | null;
  testimonials: TestimonialItem[] | null;
  custom_css: string | null;
  is_active: boolean;
  show_location?: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export const landingPageService = {
  async getLandingPageBySlug(slug: string): Promise<LandingPage> {
    const payload = await internalGet<unknown>(`landing-pages/slug/${slug}`);
    return unwrapEnvelope<LandingPage>(payload);
  },
};

export default landingPageService;
