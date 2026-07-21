'use client';

import Link from 'next/link';
import { Category } from '@/types';
import { getImageUrl } from '@/utils';
import { SmartImage } from '@/components/ui';

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/categories/${category.slug}`} className="group block">
      <div className="relative overflow-hidden">
        <div className="aspect-square relative overflow-hidden bg-gray-100">
          {category.image ? (
            <SmartImage
              src={getImageUrl(category.image)}
              alt={category.name}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 16vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          )}
        </div>

        {/* Category Info */}
        <div className="pt-4 text-center">
          <h3 className="font-semibold text-lg text-gray-900 group-hover:text-accent-600 transition-colors">
            {category.name}
          </h3>
          {category.products_count !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              {category.products_count} {category.products_count === 1 ? 'product' : 'products'}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default CategoryCard;
