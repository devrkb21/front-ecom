'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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

export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Spinner size="lg" /></div>}>
      <CategoryContent />
    </Suspense>
  );
}

function CategoryContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Product> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Filter states from URL
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'created_at:desc');
  const [currentPage, setCurrentPage] = useState(
    searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
  );
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('in_stock') === 'true');
  const [onSaleOnly, setOnSaleOnly] = useState(searchParams.get('on_sale') === 'true');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catData, allCats] = await Promise.all([
          categoryService.getBySlug(slug),
          categoryService.getAll()
        ]);
        setCategory(catData);
        setCategories(allCats);
      } catch (err) {
        console.error('Error fetching category data:', err);
        setError('Category not found');
      }
    };
    fetchData();
  }, [slug]);

  const buildFilters = useCallback((): ProductFilters => {
    if (!category) return { page: currentPage };
    
    const [sort_by, sort_order] = sortBy.split(':') as [ProductFilters['sort_by'], ProductFilters['sort_order']];
    const filters: ProductFilters = { 
      page: currentPage, 
      sort_by, 
      sort_order,
      category_id: category.id 
    };
    
    if (inStockOnly) filters.in_stock = true;
    if (onSaleOnly) filters.is_on_sale = true;
    if (minPrice) {
      const parsedMinPrice = parseFloat(minPrice);
      if (Number.isFinite(parsedMinPrice)) filters.min_price = parsedMinPrice;
    }
    if (maxPrice) {
      const parsedMaxPrice = parseFloat(maxPrice);
      if (Number.isFinite(parsedMaxPrice)) filters.max_price = parsedMaxPrice;
    }
    return filters;
  }, [category, sortBy, currentPage, inStockOnly, onSaleOnly, minPrice, maxPrice]);

  useEffect(() => {
    if (!category) return;

    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const filters = buildFilters();
        const data = await productService.getAll(filters);
        setProducts(data?.data || []);
        setPagination(data || null);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [category, buildFilters]);

  const updateUrl = useCallback((pageOverride?: number) => {
    const page = pageOverride ?? currentPage;
    const nextParams = new URLSearchParams();
    if (sortBy !== 'created_at:desc') nextParams.set('sort', sortBy);
    if (page > 1) nextParams.set('page', page.toString());
    if (inStockOnly) nextParams.set('in_stock', 'true');
    if (onSaleOnly) nextParams.set('on_sale', 'true');
    if (minPrice) nextParams.set('min_price', minPrice);
    if (maxPrice) nextParams.set('max_price', maxPrice);
    
    const nextQueryString = nextParams.toString();
    router.replace(`/categories/${slug}${nextQueryString ? `?${nextQueryString}` : ''}`, { scroll: false });
  }, [router, slug, sortBy, currentPage, inStockOnly, onSaleOnly, minPrice, maxPrice]);

  useEffect(() => {
    updateUrl();
  }, [sortBy, currentPage, inStockOnly, onSaleOnly, updateUrl]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateUrl(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSortBy('created_at:desc');
    setCurrentPage(1);
    setInStockOnly(false);
    setOnSaleOnly(false);
    setMinPrice('');
    setMaxPrice('');
    router.push(`/categories/${slug}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = (e.currentTarget.querySelector('input') as HTMLInputElement).value;
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const hasActiveFilters = Boolean(inStockOnly || onSaleOnly || minPrice || maxPrice);
  const activeFilterCount = (inStockOnly ? 1 : 0) + (onSaleOnly ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

  const renderFilterSidebar = () => (
    <FilterSidebar
      categories={categories}
      selectedCategories={[category?.id || 0]}
      onCategoryToggle={(id) => {
        const selectedCat = categories.find(c => c.id === id);
        if (selectedCat) {
          router.push(`/categories/${selectedCat.slug}`);
        }
      }}
      minPrice={minPrice}
      maxPrice={maxPrice}
      onMinPriceChange={setMinPrice}
      onMaxPriceChange={setMaxPrice}
      onApplyPriceFilter={() => { setCurrentPage(1); updateUrl(1); }}
      inStockOnly={inStockOnly}
      onInStockToggle={(checked: boolean) => { setInStockOnly(checked); setCurrentPage(1); }}
      onSaleOnly={onSaleOnly}
      onSaleToggle={(checked: boolean) => { setOnSaleOnly(checked); setCurrentPage(1); }}
      onResetFilters={handleResetFilters}
      hasActiveFilters={hasActiveFilters}
    />
  );

  if (error && !category) {
    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState
          icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          title="Category not found"
          description="The category you're looking for doesn't exist."
          action={<Link href="/products"><button className="px-6 py-2 bg-accent-600 text-white rounded-md">Browse All Products</button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {category ? `Collection: ${category.name}` : 'Loading...'}
              </h1>
              {pagination && (
                <p className="text-sm text-gray-500 mt-1">Showing {products.length} of {pagination.total} products</p>
              )}
            </div>

            {/* Top Toolbar (Search, Sort, Mobile Filter Toggle) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
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
                  onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500 bg-white text-gray-900 rounded-md"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>

                <button
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-accent-600 text-white text-[10px] font-medium rounded-full w-5 h-5 flex items-center justify-center ml-1">{activeFilterCount}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="hidden lg:block w-64 flex-shrink-0">
            {renderFilterSidebar()}
          </aside>

          <main className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 bg-white rounded-lg border border-gray-100">
                <Spinner size="lg" />
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-100 p-12">
                <EmptyState
                  icon={<svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                  title="No products found"
                  description={hasActiveFilters ? "Try adjusting your filters to find what you're looking for." : "We don't have any products in this category yet."}
                  action={hasActiveFilters ? <button onClick={handleResetFilters} className="px-6 py-2.5 bg-accent-600 text-white text-sm font-medium rounded-md">Clear All Filters</button> : null}
                />
              </div>
            ) : (
              <>
                <ProductGrid products={products} spacing="normal" />
                {pagination && pagination.last_page > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-1.5">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} className="w-10 h-10 flex items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    {/* Simplified page numbers for brevity */}
                    <div className="hidden sm:flex items-center gap-1.5">
                      {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map(page => (
                        <button key={page} onClick={() => handlePageChange(page)} className={`w-10 h-10 flex items-center justify-center text-sm font-medium rounded-md border ${page === currentPage ? 'bg-accent-600 text-white border-accent-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>{page}</button>
                      ))}
                    </div>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= pagination.last_page} className="w-10 h-10 flex items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden flex">
          <div className="fixed inset-0 bg-black/50 transition-opacity backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-gray-50 h-full animate-slide-in-right ml-auto shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-bold text-gray-900">Filters</h2>
              <button onClick={() => setIsMobileFilterOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{renderFilterSidebar()}</div>
            <div className="border-t border-gray-200 p-4 bg-white">
              <button onClick={() => setIsMobileFilterOpen(false)} className="w-full py-3 bg-accent-600 text-white font-medium rounded-lg">Show Results</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

