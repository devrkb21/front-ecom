'use client';

import { useEffect, useState } from 'react';
import { Category } from '@/types';
import { categoryService } from '@/services';
import { CategoryCard } from '@/components/categories';
import { CategoryGridSkeleton } from '@/components/ui';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const data = await categoryService.getAll();
        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="container mx-auto px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
      </div>

      <div className="container mx-auto px-4 pb-8">
        {error && (
          <div className="bg-accent-50 border border-accent-200 p-6 mb-8 text-center">
            <p className="text-accent-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <CategoryGridSkeleton count={12} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
