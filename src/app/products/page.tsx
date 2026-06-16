'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Product, Category, PaginatedResponse } from '@/types';
import { productService, categoryService, ProductFilters } from '@/services';
import { ProductGrid, FilterSidebar } from '@/components/products';
import { Spinner, EmptyState } from '@/components/ui';

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest First' },
  { value: 'sales_count:desc', label: 'Best Selling' },
  { value: 'name:asc', label: 'Alphabetically, A-Z' },
  { value: 'name:desc', label: 'Alphabetically, Z-A' },
  { value: 'price:asc', label: 'Price, low to high' },
  { value: 'price:desc', label: 'Price, high to low' },
];

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Spinner size="lg" /></div>}>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Filter states from URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    searchParams.get('category') ? searchParams.get('category')!.split(',').map(id => parseInt(id, 10)) : []
  );
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'created_at:desc');
  const [currentPage, setCurrentPage] = useState(
    searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
  );
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('in_stock') === 'true');
  const [onSaleOnly, setOnSaleOnly] = useState(searchParams.get('on_sale') === 'true');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getAll();
        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const buildFilters = useCallback((): ProductFilters => {
    const [sort_by, sort_order] = sortBy.split(':') as [ProductFilters['sort_by'], ProductFilters['sort_order']];
    const filters: ProductFilters = { page: currentPage, sort_by, sort_order };
    if (searchQuery.trim()) filters.search = searchQuery.trim();
    if (selectedCategories.length > 0) filters.category_id = selectedCategories.join(',');
    if (inStockOnly) filters.in_stock = true;
    if (onSaleOnly) filters.is_on_sale = true;
    if (minPrice) {
      const parsedMinPrice = parseFloat(minPrice);
      if (Number.isFinite(parsedMinPrice)) {
        filters.min_price = parsedMinPrice;
      }
    }
    if (maxPrice) {
      const parsedMaxPrice = parseFloat(maxPrice);
      if (Number.isFinite(parsedMaxPrice)) {
        filters.max_price = parsedMaxPrice;
      }
    }
    return filters;
  }, [sortBy, currentPage, searchQuery, selectedCategories, inStockOnly, onSaleOnly, minPrice, maxPrice]);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const filters = buildFilters();
        const data = await productService.getAll(filters);
        setProducts(data?.data || []);
        setPagination(data || null);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [buildFilters]);

  const updateUrl = useCallback((pageOverride?: number) => {
    const page = pageOverride ?? currentPage;
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (selectedCategories.length > 0) params.set('category', selectedCategories.join(','));
    if (sortBy !== 'created_at:desc') params.set('sort', sortBy);
    if (page > 1) params.set('page', page.toString());
    if (inStockOnly) params.set('in_stock', 'true');
    if (onSaleOnly) params.set('on_sale', 'true');
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);
    const nextQueryString = params.toString();
    const currentQueryString = searchParams.toString();

    if (nextQueryString === currentQueryString) {
      return;
    }

    router.replace(`/products${nextQueryString ? `?${nextQueryString}` : ''}`, { scroll: false });
  }, [router, searchParams, searchQuery, selectedCategories, sortBy, currentPage, inStockOnly, onSaleOnly, minPrice, maxPrice]);

  useEffect(() => {
    updateUrl();
  }, [selectedCategories, sortBy, currentPage, inStockOnly, onSaleOnly, updateUrl]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    updateUrl(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateUrl(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSortBy('created_at:desc');
    setCurrentPage(1);
    setInStockOnly(false);
    setOnSaleOnly(false);
    setMinPrice('');
    setMaxPrice('');
    router.push('/products');
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
    setCurrentPage(1);
  };

  const applyPriceFilter = () => {
    setCurrentPage(1);
    updateUrl(1);
  };

  const hasActiveFilters = Boolean(searchQuery || selectedCategories.length > 0 || inStockOnly || onSaleOnly || minPrice || maxPrice);
  const activeFilterCount = (searchQuery ? 1 : 0) + selectedCategories.length + (inStockOnly ? 1 : 0) + (onSaleOnly ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

  const renderFilterSidebar = () => (
    <FilterSidebar
      categories={categories}
      selectedCategories={selectedCategories}
      onCategoryToggle={toggleCategory}
      minPrice={minPrice}
      maxPrice={maxPrice}
      onMinPriceChange={setMinPrice}
      onMaxPriceChange={setMaxPrice}
      onApplyPriceFilter={applyPriceFilter}
      inStockOnly={inStockOnly}
      onInStockToggle={(checked: boolean) => { setInStockOnly(checked); setCurrentPage(1); }}
      onSaleOnly={onSaleOnly}
      onSaleToggle={(checked: boolean) => { setOnSaleOnly(checked); setCurrentPage(1); }}
      onResetFilters={handleResetFilters}
      hasActiveFilters={hasActiveFilters}
    />
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Products</h1>
              {pagination && (
                <p className="text-sm text-gray-500 mt-1">Showing {products.length} of {pagination.total} results</p>
              )}
            </div>

            {/* Top Toolbar (Search, Sort, Mobile Filter Toggle) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </form>

              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500 bg-white text-gray-900 rounded-md"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-accent-600 text-white text-[10px] font-medium rounded-full w-5 h-5 flex items-center justify-center ml-1">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            {renderFilterSidebar()}
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 bg-white rounded-lg border border-gray-100">
                <Spinner size="lg" />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
                <p className="text-red-700 font-medium">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors text-sm font-medium">Try Again</button>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-100 p-12">
                <EmptyState
                  icon={
                    <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                  title="No products found"
                  description={hasActiveFilters ? "Try adjusting your filters to find what you're looking for." : "We don't have any products available right now."}
                  action={
                    hasActiveFilters ? (
                      <button onClick={handleResetFilters} className="px-6 py-2.5 bg-accent-600 text-white text-sm font-medium rounded-md hover:bg-accent-700 transition-colors">
                        Clear All Filters
                      </button>
                    ) : (
                      <Link href="/">
                        <button className="px-6 py-2.5 bg-accent-600 text-white text-sm font-medium rounded-md hover:bg-accent-700 transition-colors">
                          Back to Home
                        </button>
                      </Link>
                    )
                  }
                />
              </div>
            ) : (
              <>
                <ProductGrid products={products} spacing="normal" />

                {/* Pagination */}
                {pagination && pagination.last_page > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-1.5">
                    {/* Previous */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="w-10 h-10 flex items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Previous page"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    {/* Page numbers */}
                    <div className="hidden sm:flex items-center gap-1.5">
                      {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
                        .filter(page => {
                          return page === 1 ||
                                page === pagination.last_page ||
                                Math.abs(page - currentPage) <= 2;
                        })
                        .map((page, idx, arr) => {
                          const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                          return (
                            <div key={page} className="flex items-center">
                              {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                              <button
                                onClick={() => handlePageChange(page)}
                                className={`w-10 h-10 flex items-center justify-center text-sm font-medium rounded-md border transition-colors ${
                                  page === currentPage
                                    ? 'bg-accent-600 text-white border-accent-600'
                                    : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                              >
                                {page}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                    
                    {/* Mobile minimal pagination indicator */}
                    <div className="sm:hidden px-4 text-sm font-medium text-gray-700">
                      Page {currentPage} of {pagination.last_page}
                    </div>

                    {/* Next */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= pagination.last_page}
                      className="w-10 h-10 flex items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Next page"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Offcanvas */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity backdrop-blur-sm"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-gray-50 h-full animate-slide-in-right ml-auto shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-bold text-gray-900">Filters</h2>
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {renderFilterSidebar()}
            </div>

            <div className="border-t border-gray-200 p-4 bg-white">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full py-3 bg-accent-600 text-white font-medium rounded-lg hover:bg-accent-700 transition-colors shadow-sm"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
