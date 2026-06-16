'use client';

import React from 'react';
import { Category } from '@/types';

interface FilterSidebarProps {
  categories: Category[];
  selectedCategories: number[];
  onCategoryToggle: (categoryId: number) => void;
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onApplyPriceFilter: () => void;
  inStockOnly: boolean;
  onInStockToggle: (checked: boolean) => void;
  onSaleOnly: boolean;
  onSaleToggle: (checked: boolean) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  categories,
  selectedCategories,
  onCategoryToggle,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  onApplyPriceFilter,
  inStockOnly,
  onInStockToggle,
  onSaleOnly,
  onSaleToggle,
  onResetFilters,
  hasActiveFilters,
}) => {
  return (
    <div className="space-y-6">
      {/* Categories Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 border-b border-accent-200 pb-3 mb-3">Filter By Category</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
          {categories.map((category) => (
            <label key={category.id} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category.id)}
                onChange={() => onCategoryToggle(category.id)}
                className="w-4 h-4 rounded border-gray-300 text-accent-600 focus:ring-accent-500 transition-colors"
              />
              <span className="text-sm text-gray-700 group-hover:text-accent-600 transition-colors">
                {category.name}
              </span>
            </label>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-gray-500">Loading categories...</p>
          )}
        </div>
      </div>

      {/* Price Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 border-b border-accent-200 pb-3 mb-3">Price</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="min"
            value={minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
            min="0"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            placeholder="max"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
            min="0"
          />
          <button
            onClick={onApplyPriceFilter}
            className="px-3 py-1.5 bg-accent-600 text-white text-sm font-medium rounded hover:bg-accent-700 transition-colors"
          >
            Go
          </button>
        </div>
      </div>

      {/* Availability Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 border-b border-accent-200 pb-3 mb-3">Availability</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => onInStockToggle(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-accent-600 focus:ring-accent-500 transition-colors"
            />
            <span className="text-sm text-gray-700 group-hover:text-accent-600 transition-colors">In Stock Only</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={onSaleOnly}
              onChange={(e) => onSaleToggle(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-accent-600 focus:ring-accent-500 transition-colors"
            />
            <span className="text-sm text-gray-700 group-hover:text-accent-600 transition-colors">On Sale</span>
          </label>
        </div>
      </div>
      
      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={onResetFilters}
          className="w-full py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
};
