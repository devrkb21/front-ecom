'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useCartStore, useWishlistStore } from '@/stores';
import { categoryService, settingsService } from '@/services';
import { Category } from '@/types';
import { cn } from '@/utils';
import { getImageUrl } from '@/utils/helpers';

const logHeaderError = (label: string, error: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Header] ${label}:`, error);
  }
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, initialize } = useAuthStore();
  const { fetchCart, fetchCartUiSettings, openSideCart, itemsCount } = useCartStore();
  const { fetchWishlist } = useWishlistStore();
  const [guestCheckoutEnabled, setGuestCheckoutEnabled] = useState<boolean | null>(null);
  const canUseCart = isAuthenticated || guestCheckoutEnabled === true;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuItems, setMenuItems] = useState<{
    label: string;
    url: string;
    highlight?: boolean;
    highlight_bg?: string;
    highlight_text?: string;
    children?: { label: string; url: string }[];
  }[]>([]);
  const [siteName, setSiteName] = useState('Our Store');
  const [siteLogo, setSiteLogo] = useState('');
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [logoHeightDesktop, setLogoHeightDesktop] = useState(40);
  const [logoHeightMobile, setLogoHeightMobile] = useState(32);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const userMenuRef = useRef<HTMLDivElement>(null);

  const renderDesktopDropdown = (items: any[], isNested = false) => {
    return items.map((child, cIdx) => {
      const hasSubChildren = child.children && child.children.length > 0;

      return (
        <div key={cIdx} className="group/nested relative">
          <Link
            href={child.url}
            className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-accent-600 transition-colors"
          >
            <span>{child.label}</span>
            {hasSubChildren && (
              <svg className="w-3.5 h-3.5 text-gray-400 group-hover/nested:text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </Link>
          
          {hasSubChildren && (
            <div className="absolute left-full top-0 hidden group-hover/nested:block w-52 bg-white border border-gray-100 shadow-xl rounded-md py-2 z-[60]">
              {renderDesktopDropdown(child.children, true)}
            </div>
          )}
        </div>
      );
    });
  };

  const renderMobileMenuItems = (items: any[], path: string = '') => {
    return items.map((item, index) => {
      const currentPath = path ? `${path}-${index}` : `${index}`;
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedItems[currentPath];
      const level = path ? path.split('-').length : 0;

      return (
        <div key={currentPath} className={cn(
          "w-full",
          index !== items.length - 1 && level === 0 ? "border-b border-gray-100" : ""
        )}>
          <div className="flex items-center">
            <Link
              href={item.url}
              className={cn(
                "flex-1 transition-all duration-200",
                item.highlight
                  ? "font-semibold rounded-lg m-2 py-2 px-4 border text-center"
                  : level > 0
                    ? "py-3.5 pl-8 text-[13px] text-gray-600 hover:text-accent-600 hover:bg-gray-50"
                    : "py-3.5 px-4 text-sm font-medium text-gray-800 hover:text-accent-600 hover:bg-gray-50"
              )}
              style={item.highlight ? {
                backgroundColor: item.highlight_bg || '#1f1f1f',
                color: item.highlight_text || '#d4af37',
                borderColor: item.highlight_text || '#d4af37',
              } : undefined}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
            {hasChildren && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedItems(prev => ({ ...prev, [currentPath]: !prev[currentPath] }));
                }}
                className="p-3.5 text-gray-400 hover:text-accent-600"
              >
                <svg className={cn("w-4 h-4 transition-transform duration-200", isExpanded && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
            {!hasChildren && level === 0 && (
              <div className="p-3.5 opacity-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>

          {hasChildren && isExpanded && (
            <div className="bg-gray-50 border-t border-gray-100">
              {renderMobileMenuItems(item.children, currentPath)}
            </div>
          )}
        </div>
      );
    });
  };

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    let isMounted = true;

    const fetchGuestCheckoutSetting = async () => {
      try {
        const checkoutSettings = await settingsService.getCheckout();
        if (!isMounted) return;
        setGuestCheckoutEnabled(checkoutSettings.guest_checkout_enabled !== false);
      } catch (error) {
        logHeaderError('Failed to fetch checkout settings', error);
        if (!isMounted) return;
        setGuestCheckoutEnabled(true);
      }
    };

    void fetchGuestCheckoutSetting();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchGeneralSettings = async () => {
      try {
        const generalSettings = await settingsService.getGeneral();

        if (!isMounted) {
          return;
        }

        const configuredSiteName = typeof generalSettings.site_title === 'string'
          ? generalSettings.site_title.trim()
          : '';
        const configuredLogo = typeof generalSettings.site_logo === 'string'
          ? generalSettings.site_logo.trim()
          : '';

        setSiteName(configuredSiteName || 'Our Store');
        setSiteLogo(configuredLogo);
        setLogoLoadFailed(false);
 
        // Parse logo heights
        const rawDesktopHeight = typeof generalSettings.logo_height_desktop === 'number'
          ? generalSettings.logo_height_desktop
          : parseInt(String(generalSettings.logo_height_desktop || generalSettings.logo_height || '40'), 10);
        
        const rawMobileHeight = typeof generalSettings.logo_height_mobile === 'number'
          ? generalSettings.logo_height_mobile
          : parseInt(String(generalSettings.logo_height_mobile || '32'), 10);

        setLogoHeightDesktop(Math.max(10, Math.min(300, isNaN(rawDesktopHeight) ? 40 : rawDesktopHeight)));
        setLogoHeightMobile(Math.max(10, Math.min(200, isNaN(rawMobileHeight) ? 32 : rawMobileHeight)));
      } catch (error) {
        logHeaderError('Failed to fetch general settings', error);

        if (!isMounted) {
          return;
        }

        setSiteName('Our Store');
        setSiteLogo('');
        setLogoLoadFailed(false);
      }
    };

    void fetchGeneralSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (canUseCart) {
      fetchCart();
    }

    fetchCartUiSettings();

    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [canUseCart, isAuthenticated, fetchCart, fetchCartUiSettings, fetchWishlist]);

  useEffect(() => {
    let isMounted = true;
    const fetchNavigationSettings = async () => {
      try {
        const navSettings = await settingsService.getNavigation();
        if (!isMounted) return;
        
        if (navSettings && navSettings.header_menu && Array.isArray(navSettings.header_menu)) {
          setMenuItems(navSettings.header_menu);
        } else {
          // Fallback if not configured
          const cats = await categoryService.getMenu();
          setMenuItems([
            { label: 'All Products', url: '/products' },
            ...(cats || []).map(c => ({ 
              label: c.name, 
              url: `/categories/${c.slug}`,
              children: c.children && c.children.length > 0 
                ? c.children.map(child => ({ label: child.name, url: `/categories/${child.slug}` }))
                : undefined
            })),
            { label: 'Deals', url: '/products?on_sale=true' }
          ]);
        }
      } catch (err) {
        logHeaderError('Failed to fetch navigation settings', err);
      }
    };
    fetchNavigationSettings();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  const handleOpenCart = () => {
    if (!isAuthenticated && guestCheckoutEnabled === null) {
      return;
    }

    if (!canUseCart) {
      const redirectPath = pathname || '/';
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    if (canUseCart) {
      void fetchCart();
    }

    openSideCart();
  };

  return (
    <header className={cn(
      'sticky top-0 z-50 bg-white transition-shadow duration-300',
      isScrolled && 'shadow-sm'
    )}>
      {/* Row 1: Logo + Search + Icons */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20 gap-4 relative">
            {/* Mobile Menu Button - Left Side */}
            <div className="lg:hidden flex-1 flex items-center">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 -ml-2 text-gray-700 hover:text-gray-900 transition-colors"
                aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            <Link 
              href="/" 
              className={cn(
                "flex-shrink-0 flex items-center justify-center lg:justify-start",
                "z-10"
              )} 
              aria-label={siteName}
            >
              {siteLogo && !logoLoadFailed ? (
                <div className="relative flex items-center">
                  {/* Desktop Logo */}
                  <div 
                    className="hidden lg:block relative"
                    style={{ 
                      height: `${logoHeightDesktop}px`,
                      width: `${Math.round(logoHeightDesktop * 4.5)}px` // maintain approx aspect ratio or let contain handle it
                    }}
                  >
                    <Image
                      src={getImageUrl(siteLogo)}
                      alt={siteName}
                      fill
                      className="object-contain object-left"
                      sizes={`${logoHeightDesktop * 5}px`}
                      priority
                      onError={() => setLogoLoadFailed(true)}
                    />
                  </div>
                  {/* Mobile Logo */}
                  <div 
                    className="block lg:hidden relative"
                    style={{ 
                      height: `${logoHeightMobile}px`,
                      width: `${Math.round(logoHeightMobile * 4.5)}px`
                    }}
                  >
                    <Image
                      src={getImageUrl(siteLogo)}
                      alt={siteName}
                      fill
                      className="object-contain"
                      sizes={`${logoHeightMobile * 5}px`}
                      priority
                      onError={() => setLogoLoadFailed(true)}
                    />
                  </div>
                </div>
              ) : (
                <h1 className="font-bold text-lg md:text-2xl text-gray-900 truncate">
                  {siteName}
                </h1>
              )}
            </Link>

            {/* Search Bar — Center (Desktop only) */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-600"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <span className="sr-only">Search products</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Right Icons - Right Side */}
            <div className="flex-1 lg:flex-none flex items-center justify-end gap-1.5 sm:gap-2 md:gap-4">
              <Link
                href="/track-order"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-accent-300 hover:text-accent-600 transition-colors"
                aria-label="Track order"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V7.618a1 1 0 01.553-.894L9 4m0 16l6-3m-6 3V4m6 13l5.447-2.724A1 1 0 0021 13.382V4.618a1 1 0 00-.553-.894L15 1m0 16V1m-6 3l6-3" />
                </svg>
                <span>Track Order</span>
              </Link>

              <Link
                href="/track-order"
                className="sm:hidden p-2 text-gray-700 hover:text-accent-600 transition-colors"
                aria-label="Track order"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V7.618a1 1 0 01.553-.894L9 4m0 16l6-3m-6 3V4m6 13l5.447-2.724A1 1 0 0021 13.382V4.618a1 1 0 00-.553-.894L15 1m0 16V1m-6 3l6-3" />
                </svg>
              </Link>

              {/* User Menu */}
              {isAuthenticated ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="p-2 text-gray-700 hover:text-accent-600 transition-colors"
                    aria-label={isUserMenuOpen ? 'Close account menu' : 'Open account menu'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white shadow-xl rounded-md py-2 border border-gray-200 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-medium text-sm text-gray-900 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <Link href="/account" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsUserMenuOpen(false)}>
                          Dashboard
                        </Link>
                        <Link href="/account/orders" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsUserMenuOpen(false)}>
                          My Orders
                        </Link>
                        <Link href="/account/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsUserMenuOpen(false)}>
                          Profile
                        </Link>
                      </div>
                      <div className="border-t border-gray-100 py-1">
                        <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50">
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="p-2 text-gray-700 hover:text-accent-600 transition-colors" aria-label="Sign in">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </Link>
              )}

              {/* Cart */}
              <button
                type="button"
                onClick={handleOpenCart}
                className="relative p-2 text-gray-700 hover:text-accent-600 transition-colors"
                aria-label="Open cart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {itemsCount() > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-accent-600 text-white text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
                    {itemsCount()}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Category Navigation (Desktop) */}
      <nav className="hidden lg:block border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-1 py-0">
            {menuItems.map((item, index) => (
              <div key={index} className="group relative flex items-center">
                <Link
                  href={item.url}
                  className={cn(
                    'inline-block whitespace-nowrap transition-all duration-200',
                    item.highlight
                      ? 'px-4 py-1.5 text-sm font-semibold rounded-full border shadow-sm mx-1'
                      : pathname === item.url
                        ? 'px-4 py-3 text-sm font-medium text-accent-600 border-b-2 border-accent-600'
                        : 'px-4 py-3 text-sm font-medium text-gray-700 hover:text-accent-600'
                  )}
                  style={item.highlight ? {
                    backgroundColor: item.highlight_bg || '#1f1f1f',
                    color: item.highlight_text || '#d4af37',
                    borderColor: item.highlight_text || '#d4af37',
                  } : undefined}
                >
                  <div className="flex items-center gap-1">
                    {item.label}
                    {item.children && item.children.length > 0 && (
                      <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-accent-600 transition-transform duration-200 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </Link>

                {item.children && item.children.length > 0 && (
                  <div className="absolute left-0 top-full hidden group-hover:block w-52 bg-white border border-gray-100 shadow-xl rounded-b-md py-2 z-50">
                    {renderDesktopDropdown(item.children)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white absolute top-full left-0 right-0 h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] overflow-y-auto shadow-xl z-40 flex flex-col border-t border-gray-100">
          <div className="container mx-auto px-4 py-6 flex flex-col flex-1">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-600 shadow-sm"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent-600">
                  <span className="sr-only">Search products</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Mobile Category Links (Top Section) */}
            <nav className="flex flex-col flex-1">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Navigation</h3>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                {renderMobileMenuItems(menuItems)}
              </div>
            </nav>

            {/* Bottom Section: Account Related */}
            <div className="mt-8 pt-6 border-t border-gray-200 bg-gray-50 -mx-4 px-4 pb-8 mb-[-24px]">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">My Account</h3>
              <div className="flex flex-col gap-3">
                <Link
                  href="/track-order"
                  className="w-full py-3.5 px-4 flex items-center justify-center gap-2 text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-accent-500 hover:text-accent-600 transition-colors font-medium shadow-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V7.618a1 1 0 01.553-.894L9 4m0 16l6-3m-6 3V4m6 13l5.447-2.724A1 1 0 0021 13.382V4.618a1 1 0 00-.553-.894L15 1m0 16V1m-6 3l6-3" />
                  </svg>
                  Track Order
                </Link>

                {!isAuthenticated ? (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <Link 
                      href="/login" 
                      className="flex items-center justify-center py-3.5 px-4 bg-white text-gray-800 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link 
                      href="/register" 
                      className="flex items-center justify-center py-3.5 px-4 bg-accent-600 text-white rounded-xl font-bold hover:bg-accent-700 transition-colors shadow-md shadow-accent-500/20"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Create Account
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <Link 
                      href="/account" 
                      className="flex items-center justify-center py-3.5 px-4 bg-white text-gray-800 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button 
                      onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                      className="flex items-center justify-center py-3.5 px-4 bg-red-50 text-red-600 border border-red-100 rounded-xl font-medium hover:bg-red-100 transition-colors shadow-sm"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
