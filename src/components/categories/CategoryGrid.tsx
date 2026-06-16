'use client';

import { Category } from '@/types';
import { CategoryCard } from './CategoryCard';
import { CategoryGridSkeleton } from '@/components/ui';

interface CategoryGridProps {
  categories: Category[];
  isLoading?: boolean;
}

export function CategoryGrid({ categories, isLoading }: CategoryGridProps) {
  if (isLoading) {
    return <CategoryGridSkeleton />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}

export default CategoryGrid;
