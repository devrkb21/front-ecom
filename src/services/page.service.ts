import api from './api';

export interface Page {
  id: number;
  title: string;
  slug: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
}

export interface PageSummary {
  id: number;
  title: string;
  slug: string;
}

export const pageService = {
  getPages: async (): Promise<PageSummary[]> => {
    const response = await api.get<{ success: boolean; data: PageSummary[] }>('/pages');
    return response.data.data;
  },

  getPageBySlug: async (slug: string): Promise<Page> => {
    const response = await api.get<{ success: boolean; data: Page }>(`/pages/${slug}`);
    return response.data.data;
  },
};
