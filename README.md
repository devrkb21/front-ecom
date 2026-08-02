# eCommerce Storefront — Next.js Frontend

> A modern, production-ready eCommerce storefront built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, and Zustand. Consumes the Laravel REST API backend via a secure internal proxy architecture.

---

## Table of Contents

- [Overview](#overview)
- [Key Highlights](#key-highlights)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [API Proxy Architecture](#api-proxy-architecture)
  - [Data Flow](#data-flow)
  - [Auth Flow](#auth-flow)
- [Project Structure](#project-structure)
- [Pages & Routes](#pages--routes)
- [Components](#components)
  - [Layout Components](#layout-components)
  - [UI Primitives](#ui-primitives)
  - [Product Components](#product-components)
  - [Cart Components](#cart-components)
  - [Category Components](#category-components)
  - [Home Components](#home-components)
  - [Auth Components](#auth-components)
  - [Integration Components](#integration-components)
- [Services Layer](#services-layer)
- [State Management (Zustand)](#state-management-zustand)
- [TypeScript Type System](#typescript-type-system)
- [Utilities](#utilities)
- [Analytics & Tracking](#analytics--tracking)
- [SEO Infrastructure](#seo-infrastructure)
- [Design System](#design-system)
- [Configuration Files](#configuration-files)
- [Environment Variables](#environment-variables)
- [Requirements](#requirements)
- [Installation](#installation)
- [Development](#development)
- [Build & Production](#build--production)
- [Production Deployment](#production-deployment)
- [API Integration](#api-integration)
- [License](#license)

---

## Overview

This frontend application is a headless eCommerce storefront that powers the customer-facing shopping experience. It communicates with a Laravel 12 backend API through a secure proxy layer, ensuring internal API secrets never reach the browser.

### At a Glance

| Metric | Count |
|---|---|
| Total Source Files (TS/TSX) | 118 |
| Pages (App Router) | 36 |
| Components | 29 |
| Services | 17 |
| Zustand Stores | 3 |
| TypeScript Type Modules | 9 |
| Utility Modules | 5 |
| Next.js API Routes | 3 proxy routes |
| Public Assets | 2 |

---

## Key Highlights

- 🏗️ **Next.js 16 App Router** — Full server/client component architecture with React 19
- 🔒 **Secure Proxy Architecture** — Three-layer API proxy (internal, public, direct) ensures secrets stay server-side, with path-traversal guards on every catch-all route
- 🛡️ **Server-Side HTML/CSS Sanitization** — All `dangerouslySetInnerHTML` usage (CMS pages, product/landing page rich content) is passed through `sanitizeHtml()`/`sanitizeCss()` before rendering to prevent stored XSS from admin-authored content
- 🛒 **Guest + Authenticated Checkout** — Full checkout flow supporting both guest and registered users
- 📱 **Responsive Design** — Mobile-first with configurable product grid columns (1–6 columns)
- 🖼️ **Automatic WebP Conversion** — `getImageUrl()` utility auto-rewrites image extensions to `.webp`
- 🔤 **Dynamic Brand Syncing** — Header, Footer, and metadata dynamically read `site_name`/`site_title` from backend settings
- 🎁 **Loyalty Welcome Popup** — Interactive welcome modal on checkout page
- 📊 **Multi-Platform Analytics** — GTM, GA4, Facebook Pixel, and TikTok Pixel with standardized eCommerce events
- 🗺️ **Bangladesh Location Picker** — Division → District → Upazila → Union cascading selects in checkout
- 💬 **Live Chat Widget** — WhatsApp + Messenger floating chat with configurable position/color
- 🔍 **SEO Optimized** — Dynamic `robots.ts`, `sitemap.ts`, site verification meta tags, and per-page metadata
- 🎨 **Teal Accent Design System** — Clean slate/gray palette with teal accent colors, CSS custom properties, and Tailwind v4
- ⚡ **Smart Caching** — Internal GET requests use in-memory + localStorage cache with retry logic and deduplication
- 🚀 **Turbopack Support** — `npm run dev:turbo` for faster development builds
- 💳 **Stripe + bKash Payments** — Full payment flows with dedicated payment pages
- 📦 **Side Cart Drawer** — Slide-out cart with free shipping progress indicator
- 🏷️ **Landing Pages** — Dynamic marketing landing pages at `/l/{slug}`
- 📋 **Dynamic Checkout Form** — Admin-configurable checkout fields rendered from backend settings schema

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.4 |
| Language | TypeScript | ^6.0.3 |
| React | React + React DOM | ^19.2.5 |
| Styling | Tailwind CSS | ^4.2.2 |
| State Management | Zustand | ^5.0.12 |
| HTTP Client | Axios | ^1.15.0 |
| Icons | Lucide React | ^1.14.0 |
| Toast Notifications | React Hot Toast | ^2.6.0 |
| Payment (Stripe) | @stripe/react-stripe-js + @stripe/stripe-js | ^6.2.0 / ^9.2.0 |
| CSS Utilities | clsx | ^2.1.1 |
| Typography Plugin | @tailwindcss/typography | ^0.5.19 |
| Validation (Dev) | Zod | ^4.3.6 |
| Linting | ESLint + eslint-config-next | ^9.39.4 / 16.2.4 |
| Build Tool | esbuild | ^0.28.0 |
| PostCSS | postcss + @tailwindcss/postcss + autoprefixer | ^8.5.10 / ^4.2.2 / ^10.5.0 |
| Auth | Bearer Token (Sanctum) | — |
| Deployment | Node.js (PM2 / aaPanel) | 20.9+ |

---

## Architecture

### API Proxy Architecture

The frontend uses a **three-layer proxy system** to communicate with the backend API, ensuring security and flexibility:

```
Browser (Client)
  │
  ├─ /api/internal/[...path]  ──→  Backend /api/v1/{path} + X-Internal-Secret header
  │   (Storefront data: products, categories, settings, flash sales)
  │   Server-side only — secret never exposed to browser
  │
  ├─ /api/proxy/[...path]     ──→  Backend /api/v1/{path} + Bearer token from request
  │   (Authenticated actions: cart, orders, payments, wishlist)
  │   Token forwarded from client → proxy → backend
  │
  └─ /api/public/[...path]    ──→  Backend /api/v1/{path}
      (Public auth: login, register, checkout, tracking)
      Direct passthrough with optional Bearer token

  Special: /api/public/orders  ──→  Backend /api/v1/orders
      (Order creation with X-Internal-Secret — for guest checkout)
```

#### Why Three Layers?

| Proxy Route | Purpose | Security Model |
|---|---|---|
| `/api/internal/[...path]` | Read-only storefront data (products, categories, settings) | Server injects `X-Internal-Secret` — client never sees it |
| `/api/proxy/[...path]` | Authenticated user actions (cart, profile, orders) | Client's Bearer token forwarded through proxy |
| `/api/public/[...path]` | Public endpoints (auth, checkout, tracking) | No secret needed; optional Bearer token passthrough |
| `/api/public/orders` | Order placement (special handler) | Server injects `X-Internal-Secret` for guest order support |

#### Hardening Notes (Applied)

- **Path-traversal guards**: every catch-all proxy route (`internal`, `proxy`, `public`) rejects any path segment that decodes to `.` or `..` before it's joined into the upstream URL, closing off attempts to escape the allowed endpoint prefixes.
- **Allowlisted paths only**: `/api/internal/*` only forwards to an explicit prefix allowlist (`categories`, `products`, `settings`, `flash-sales`, etc.) — an unlisted path returns `404` rather than being forwarded blind.
- **Secrets never reach the client bundle**: `INTERNAL_API_SECRET` is read from `process.env` inside a Route Handler (server-only code), never from a `NEXT_PUBLIC_*` variable, so it cannot leak into client JS.
- **Stored-XSS defense-in-depth**: all `dangerouslySetInnerHTML` call sites run content through [`sanitizeHtml()`/`sanitizeCss()`](#sanitizets--htmlcss-sanitization) first.

### Data Flow

```
User Action → Component → Zustand Store → Service → Axios Instance → Next.js API Route → Laravel Backend
                                                          │
                                                  ┌───────┴───────┐
                                                  │  internalApi  │  (for /api/internal/* — storefront reads)
                                                  │  api (default)│  (for /api/proxy/* — auth user actions)
                                                  └───────────────┘
```

### Auth Flow

1. User submits credentials to `/api/public/auth/login`
2. Backend returns Bearer token
3. Token stored in `localStorage` via `setAuthToken()`
4. Zustand `auth.store` persists user state
5. All subsequent `api` (proxy) requests auto-attach `Authorization: Bearer <token>` via interceptor
6. On 401 response: token cleared, user redirected to `/login`
7. Optional CSRF flow supported (disabled by default for token-based auth)

---

## Project Structure

```
frontend/
├── .env.example                          # Environment variable template
├── .node-version                         # Node.js version (20.x)
├── .npmrc                                # npm configuration
├── eslint.config.mjs                     # ESLint configuration
├── next.config.mjs                       # Next.js configuration (images, origins)
├── package.json                          # Dependencies and scripts
├── postcss.config.js                     # PostCSS with Tailwind CSS
├── tailwind.config.js                    # Tailwind design tokens (colors, fonts)
├── tsconfig.json                         # TypeScript strict mode config
├── public/
│   ├── free-shipping.png                 # Free shipping progress bar image
│   └── placeholder-product.svg           # Product image placeholder
└── src/
    ├── app/                              # Next.js App Router — 36 pages
    │   ├── layout.tsx                    # Root layout (10KB) — Header, Footer, Tracking, SEO
    │   ├── page.tsx                      # Home page (16KB) — Hero, featured products, categories
    │   ├── globals.css                   # Global styles, animations, scrollbar, utilities
    │   ├── providers.tsx                 # Client-side providers (Toaster)
    │   ├── loading.tsx                   # Global loading skeleton
    │   ├── error.tsx                     # Error boundary page
    │   ├── not-found.tsx                 # 404 page
    │   ├── robots.ts                     # Dynamic robots.txt generation
    │   ├── sitemap.ts                    # Dynamic sitemap.xml generation
    │   ├── [slug]/                       # Dynamic CMS pages (About, Terms, etc.)
    │   ├── about-us/                     # About Us page
    │   ├── contact/                      # Contact form page
    │   ├── privacy-policy/               # Privacy policy page
    │   ├── terms-of-service/             # Terms of service page
    │   ├── refund-policy/                # Refund policy page
    │   ├── login/                        # Login page
    │   ├── register/                     # Registration page
    │   ├── forgot-password/              # Forgot password page
    │   ├── reset-password/               # Password reset page
    │   ├── products/
    │   │   ├── page.tsx                  # Product listing (19KB) with filters & pagination
    │   │   └── [slug]/                   # Product detail page
    │   ├── categories/
    │   │   ├── page.tsx                  # Category listing page
    │   │   └── [slug]/                   # Category product listing
    │   ├── cart/                         # Shopping cart page
    │   ├── checkout/
    │   │   ├── page.tsx                  # Checkout flow (89KB) — the largest page
    │   │   ├── success/                  # Checkout success page
    │   │   ├── failed/                   # Checkout failure page
    │   │   └── cancelled/               # Checkout cancellation page
    │   ├── order-received/               # Order confirmation page (11KB)
    │   ├── order-cancel/                 # Order cancellation confirmation
    │   ├── orders/
    │   │   ├── page.tsx                  # Order history redirect
    │   │   └── [id]/                     # Order detail page
    │   ├── track-order/                  # Public order tracking (18KB)
    │   ├── payment/
    │   │   ├── stripe/[orderId]/         # Stripe payment processing page
    │   │   └── bkash/[orderId]/          # bKash payment processing page
    │   ├── account/
    │   │   ├── layout.tsx                # Account layout with sidebar
    │   │   ├── page.tsx                  # Account dashboard (14KB)
    │   │   ├── profile/                  # Profile management
    │   │   ├── addresses/                # Address management (23KB)
    │   │   ├── orders/
    │   │   │   ├── page.tsx              # Order history (11KB)
    │   │   │   └── [id]/                 # Order detail
    │   │   ├── security/                 # Password change (11KB)
    │   │   └── payment-methods/          # Saved payment methods (6KB)
    │   ├── profile/                      # User profile page
    │   ├── l/
    │   │   └── [slug]/                   # Landing pages (73KB) — marketing pages
    │   └── api/                          # Next.js API routes (proxy layer)
    │       ├── internal/[...path]/       # Internal proxy → adds X-Internal-Secret
    │       ├── proxy/[...path]/          # Auth proxy → forwards Bearer token
    │       └── public/
    │           ├── [...path]/            # Public proxy → direct passthrough
    │           └── orders/               # Order proxy → adds X-Internal-Secret
    ├── components/                       # 29 reusable components across 8 categories
    │   ├── index.ts                      # Component barrel exports
    │   ├── auth/
    │   │   ├── AuthGuard.tsx             # Route protection wrapper
    │   │   └── index.ts
    │   ├── cart/
    │   │   ├── CartItem.tsx              # Cart line item component
    │   │   ├── CartSummary.tsx           # Cart total summary
    │   │   ├── FreeShippingProgress.tsx  # Free shipping progress bar (7KB)
    │   │   ├── SideCartDrawer.tsx        # Slide-out cart drawer (16KB)
    │   │   └── index.ts
    │   ├── categories/
    │   │   ├── CategoryCard.tsx          # Category display card
    │   │   ├── CategoryGrid.tsx          # Category grid layout
    │   │   └── index.ts
    │   ├── home/
    │   │   └── HeroSlider.tsx            # Hero section slider (7KB)
    │   ├── integrations/
    │   │   ├── LiveChatWidget.tsx         # WhatsApp/Messenger chat (15KB)
    │   │   └── TrackingIntegrations.tsx   # GTM/GA4/FB/TikTok pixels (8KB)
    │   ├── layout/
    │   │   ├── Header.tsx                # Main header/navigation (28KB)
    │   │   ├── Footer.tsx                # Site footer (3KB)
    │   │   ├── AccountSidebar.tsx        # Account navigation sidebar (5KB)
    │   │   ├── ConditionalLayout.tsx     # Conditional layout wrapper
    │   │   ├── DeferredClientWidgets.tsx  # Deferred client-side widgets
    │   │   ├── ScrollToTop.tsx           # Scroll-to-top button
    │   │   └── index.ts
    │   ├── products/
    │   │   ├── ProductCard.tsx           # Product card component (10KB)
    │   │   ├── HomeProductCard.tsx        # Home page product card (5KB)
    │   │   ├── ProductGrid.tsx           # Configurable product grid (3KB)
    │   │   ├── FilterSidebar.tsx         # Product filter sidebar (5KB)
    │   │   └── index.ts
    │   └── ui/
    │       ├── Badge.tsx                 # Status badge component
    │       ├── Button.tsx                # Button with variants (2KB)
    │       ├── EmptyState.tsx            # Empty state placeholder
    │       ├── Input.tsx                 # Form input component
    │       ├── SearchableSelect.tsx       # Searchable dropdown select (4KB)
    │       ├── Skeleton.tsx              # Loading skeleton component (3KB)
    │       ├── Spinner.tsx               # Loading spinner
    │       ├── Textarea.tsx              # Textarea component
    │       ├── VariantSelector.tsx        # Product variant selector (9KB)
    │       └── index.ts
    ├── services/                         # 16 API service modules
    │   ├── index.ts                      # Service barrel exports
    │   ├── api.ts                        # Core API client (9KB) — dual Axios instances, caching, retries
    │   ├── normalizers.ts                # Response envelope unwrapping utilities
    │   ├── checkout-session.ts           # Checkout session ID management
    │   ├── auth.service.ts               # Authentication (login, register, logout, me)
    │   ├── product.service.ts            # Products, categories, attributes (5KB)
    │   ├── cart.service.ts               # Cart CRUD operations
    │   ├── order.service.ts              # Order placement and history (3KB)
    │   ├── payment.service.ts            # Stripe + bKash payments (7KB)
    │   ├── shipping.service.ts           # Shipping methods and calculation
    │   ├── settings.service.ts           # All settings with normalizers (14KB)
    │   ├── wishlist.service.ts           # Wishlist operations
    │   ├── address.service.ts            # Address CRUD + BD locations (5KB)
    │   ├── abandoned-cart.service.ts      # Checkout progress tracking
    │   ├── page.service.ts               # CMS page content
    │   ├── landing-page.service.ts       # Landing page data (1KB)
    │   └── server-content.service.ts     # Server-safe content fetching for RSC contexts (e.g. Footer) that can't use client-only hooks
    ├── stores/                           # 3 Zustand state stores
    │   ├── index.ts                      # Store barrel exports
    │   ├── auth.store.ts                 # Auth state with persistence (4KB)
    │   ├── cart.store.ts                 # Cart state with full operations (19KB)
    │   └── wishlist.store.ts             # Wishlist state (2KB)
    ├── types/                            # 9 TypeScript type definition modules
    │   ├── index.ts                      # Type barrel exports
    │   ├── api.ts                        # API response types (PaginatedResponse, ApiError)
    │   ├── auth.ts                       # User, LoginCredentials, RegisterData
    │   ├── category.ts                   # Category type
    │   ├── product.ts                    # Product, Variant, Review, Attribute types (2KB)
    │   ├── cart.ts                       # Cart and CartItem types
    │   ├── order.ts                      # Order, OrderItem, OrderTracking types (4KB)
    │   ├── payment.ts                    # Payment and PaymentGateway types (2KB)
    │   └── shipping.ts                   # ShippingMethod and rate types (1KB)
    └── utils/                            # 5 utility modules
        ├── index.ts                      # Utility barrel exports
        ├── helpers.ts                    # cn(), formatPrice(), getImageUrl(), truncateText()
        ├── product-grid.ts              # Product grid column configuration (2KB)
        ├── tracking.ts                  # Multi-platform analytics tracking (10KB)
        └── sanitize.ts                   # sanitizeHtml()/sanitizeCss() — strips scripts, event handlers, and dangerous CSS before dangerouslySetInnerHTML
```

---

## Pages & Routes

### Public Pages

| Route | File | Description | Size |
|---|---|---|---|
| `/` | `page.tsx` | Home page — hero slider, featured products, categories, new arrivals | 16KB |
| `/products` | `products/page.tsx` | Product listing with filters, search, pagination | 19KB |
| `/products/[slug]` | `products/[slug]/page.tsx` | Product detail — images, variants, reviews, related products | — |
| `/categories` | `categories/page.tsx` | Category grid listing | 2KB |
| `/categories/[slug]` | `categories/[slug]/page.tsx` | Products filtered by category | — |
| `/cart` | `cart/page.tsx` | Shopping cart with quantity controls | — |
| `/track-order` | `track-order/page.tsx` | Public order tracking by number | 18KB |
| `/contact` | `contact/page.tsx` | Contact form | — |
| `/l/[slug]` | `l/[slug]/page.tsx` | Marketing landing pages | 73KB |
| `/[slug]` | `[slug]/page.tsx` | Dynamic CMS pages (about, terms, etc.) | 2KB |
| `/about-us` | `about-us/page.tsx` | About us page | — |
| `/privacy-policy` | `privacy-policy/page.tsx` | Privacy policy | — |
| `/terms-of-service` | `terms-of-service/page.tsx` | Terms of service | — |
| `/refund-policy` | `refund-policy/page.tsx` | Refund policy | — |

### Auth Pages

| Route | File | Description |
|---|---|---|
| `/login` | `login/page.tsx` | User login form |
| `/register` | `register/page.tsx` | User registration form |
| `/forgot-password` | `forgot-password/page.tsx` | Password reset request |
| `/reset-password` | `reset-password/page.tsx` | Password reset with token |

### Checkout Flow

| Route | File | Description | Size |
|---|---|---|---|
| `/checkout` | `checkout/page.tsx` | **Main checkout page** — dynamic form, shipping, payment, coupon | **89KB** |
| `/checkout/success` | `checkout/success/page.tsx` | Payment success confirmation | 2KB |
| `/checkout/failed` | `checkout/failed/page.tsx` | Payment failure page | 2KB |
| `/checkout/cancelled` | `checkout/cancelled/page.tsx` | Payment cancellation page | 4KB |
| `/order-received` | `order-received/page.tsx` | Order confirmation with details | 11KB |
| `/order-cancel` | `order-cancel/page.tsx` | Order cancellation confirmation | 3KB |

### Payment Pages

| Route | File | Description |
|---|---|---|
| `/payment/stripe/[orderId]` | `payment/stripe/[orderId]/page.tsx` | Stripe Elements payment form |
| `/payment/bkash/[orderId]` | `payment/bkash/[orderId]/page.tsx` | bKash payment redirect |

### Account Pages (Authenticated)

| Route | File | Description | Size |
|---|---|---|---|
| `/account` | `account/page.tsx` | Account dashboard with order summary | 14KB |
| `/account/profile` | `account/profile/page.tsx` | Edit name, email, phone | — |
| `/account/addresses` | `account/addresses/page.tsx` | Address book with BD location picker | 23KB |
| `/account/orders` | `account/orders/page.tsx` | Order history with pagination | 11KB |
| `/account/orders/[id]` | `account/orders/[id]/page.tsx` | Order detail view | — |
| `/account/security` | `account/security/page.tsx` | Change password | 11KB |
| `/account/payment-methods` | `account/payment-methods/page.tsx` | Saved Stripe cards | 6KB |

### SEO Routes

| Route | Type | Description |
|---|---|---|
| `/robots.txt` | `robots.ts` | Dynamic robots.txt — allows `/`, disallows `/api/`, `/account/`, `/checkout`, `/payment/`, `/orders/` |
| `/sitemap.xml` | `sitemap.ts` | Dynamic sitemap — home, products, categories with priorities |

### API Proxy Routes

| Route | Handler | Description |
|---|---|---|
| `/api/internal/[...path]` | Catch-all route handler | Proxies to backend with `X-Internal-Secret` header |
| `/api/proxy/[...path]` | Catch-all route handler | Proxies with forwarded Bearer token |
| `/api/public/[...path]` | Catch-all route handler | Direct passthrough proxy |
| `/api/public/orders` | Special order handler | Order creation with injected `X-Internal-Secret` |

---

## Components

### Layout Components (7 files)

| Component | Description | Size |
|---|---|---|
| `Header` | Main site header — logo, navigation menu (from settings), search, cart icon, auth links, mobile drawer | **28KB** |
| `Footer` | Site footer — links, contact info, dynamic brand from settings | 3KB |
| `AccountSidebar` | Account section sidebar navigation with active state | 5KB |
| `ConditionalLayout` | Wraps content in Header/Footer conditionally | 1KB |
| `DeferredClientWidgets` | Lazy-loaded client widgets (tracking, live chat) | 1KB |
| `ScrollToTop` | Floating scroll-to-top button | 1KB |

### UI Primitives (9 files)

| Component | Description | Size |
|---|---|---|
| `Button` | Button with size/variant/loading props | 2KB |
| `Input` | Form input with label, error, and icon support | 1KB |
| `Textarea` | Textarea with label and error support | 1KB |
| `Badge` | Status badge with color variants | 1KB |
| `Spinner` | Loading spinner animation | 1KB |
| `Skeleton` | Loading skeleton with card, list, and text variants | 3KB |
| `EmptyState` | Empty state placeholder with icon and message | 1KB |
| `SearchableSelect` | Searchable dropdown select for location pickers | 4KB |
| `VariantSelector` | Product variant selector (color swatches, size buttons, dropdowns) | **9KB** |

### Product Components (4 files)

| Component | Description | Size |
|---|---|---|
| `ProductCard` | Full product card — image, price, sale badge, wishlist, add-to-cart | **10KB** |
| `HomeProductCard` | Compact product card for homepage sections | 5KB |
| `ProductGrid` | Responsive grid with configurable columns (admin-controlled) | 3KB |
| `FilterSidebar` | Product filter sidebar — categories, price range, attributes | 5KB |

### Cart Components (4 files)

| Component | Description | Size |
|---|---|---|
| `SideCartDrawer` | Slide-out cart panel with full item management | **16KB** |
| `CartItem` | Cart line item with quantity controls and variant info | 4KB |
| `CartSummary` | Cart totals, coupon input, checkout button | 5KB |
| `FreeShippingProgress` | Animated progress bar towards free shipping threshold | 7KB |

### Category Components (2 files)

| Component | Description | Size |
|---|---|---|
| `CategoryCard` | Category card with image and name | 2KB |
| `CategoryGrid` | Category grid layout | 1KB |

### Home Components (1 file)

| Component | Description | Size |
|---|---|---|
| `HeroSlider` | Hero section with dynamic slides from backend settings | 7KB |

### Auth Components (1 file)

| Component | Description | Size |
|---|---|---|
| `AuthGuard` | Route protection — redirects unauthenticated users to `/login` | 1KB |

### Integration Components (2 files)

| Component | Description | Size |
|---|---|---|
| `TrackingIntegrations` | Dynamically loads GTM, GA4, Facebook Pixel, TikTok Pixel from admin settings; validates IDs; tracks page views on route changes | **8KB** |
| `LiveChatWidget` | Floating chat bubble with WhatsApp and Messenger integration; configurable position, color, and welcome text | **15KB** |

---

## Services Layer

17 service modules handling all API communication:

### Core Services

| Service | File | Description | Size |
|---|---|---|---|
| `api` | `api.ts` | **Core Axios client** — dual instances (`api` + `internalApi`), token management, CSRF, retry logic, in-memory + localStorage caching, request deduplication | **9KB** |
| `normalizers` | `normalizers.ts` | Response envelope unwrapping (`unwrapEnvelope`, `extractCollection`, `normalizePaginated`) | 2KB |
| `checkout-session` | `checkout-session.ts` | Generates and persists unique checkout session IDs for abandoned cart tracking | 1KB |

### Domain Services

| Service | File | API Endpoints | Size |
|---|---|---|---|
| `authService` | `auth.service.ts` | Login, register, logout, getMe, forgot/reset password | 2KB |
| `productService` | `product.service.ts` | Products (list, featured, new, search, by slug/category), categories, attributes, reviews | **5KB** |
| `cartService` | `cart.service.ts` | Get cart, add/update/remove items, clear cart, apply/remove coupon | 2KB |
| `orderService` | `order.service.ts` | Create order, get orders, get by ID, get by number, cancel, payment summary | 3KB |
| `paymentService` | `payment.service.ts` | Stripe (config, create intent, confirm), bKash (config, create, callback), payment gateways | **7KB** |
| `shippingService` | `shipping.service.ts` | List shipping methods, calculate rates, BD locations (divisions, districts, upazilas, unions) | 2KB |
| `settingsService` | `settings.service.ts` | Hero, general, banner, checkout, integrations, navigation, live chat settings with full normalization | **14KB** |
| `wishlistService` | `wishlist.service.ts` | List, add, remove, toggle, check, count, clear, move-to-cart | 2KB |
| `addressService` | `address.service.ts` | CRUD, defaults, BD location hierarchy fetching | 5KB |
| `abandonedCartService` | `abandoned-cart.service.ts` | Track checkout progress, mark recovered | 2KB |
| `pageService` | `page.service.ts` | Fetch CMS page by slug | 1KB |
| `landingPageService` | `landing-page.service.ts` | Fetch landing page data by slug | 1KB |
| `serverContentService` | `server-content.service.ts` | Server Component-safe data fetching (used by `Footer` and other server-rendered pieces that can't rely on client-side stores) | — |

### API Client Details (`api.ts`)

The core API client has sophisticated features:

| Feature | Description |
|---|---|
| **Dual Instances** | `api` for authenticated proxy calls, `internalApi` for internal storefront calls |
| **URL Normalization** | Auto-normalizes API URLs (appends `/api/v1` if missing) |
| **Token Management** | `setAuthToken()`, `getAuthToken()`, `clearAuthToken()` with localStorage persistence |
| **CSRF Support** | Optional CSRF cookie flow for Sanctum stateful auth (disabled by default) |
| **Internal GET Caching** | In-memory + localStorage cache with stable key generation |
| **Request Deduplication** | Concurrent identical requests share a single network call |
| **Retry Logic** | 2 retries with exponential backoff on 408/429/5xx errors |
| **Cache Fallback** | Returns cached data if network request fails after retries |
| **Response Validation** | Detects HTML error pages masquerading as API responses |
| **Auto 401 Handling** | Clears token and redirects to `/login` on authentication failures |
| **CSRF 419 Retry** | Auto-refreshes CSRF token and retries on 419 responses |

---

## State Management (Zustand)

3 persistent Zustand stores managing client-side state:

### `useAuthStore` (4KB)

| State | Type | Description |
|---|---|---|
| `user` | `User \| null` | Current authenticated user |
| `isAuthenticated` | `boolean` | Authentication status |
| `isLoading` | `boolean` | Loading state for auth operations |
| `isInitialized` | `boolean` | Whether the store has been initialized from localStorage |
| `error` | `string \| null` | Last auth error message |

| Action | Description |
|---|---|
| `login(credentials)` | Authenticate and store user |
| `register(data)` | Register and auto-login |
| `logout()` | Clear token and user state |
| `fetchUser()` | Refresh user from API |
| `initialize()` | Restore auth state from localStorage on app load |
| `clearError()` | Clear error message |

**Persistence**: User and `isAuthenticated` persisted to `auth-storage` in localStorage.

### `useCartStore` (19KB)

The largest store — manages the full shopping cart lifecycle:

| State | Description |
|---|---|
| Cart items, totals, coupon | Full cart state |
| Loading states | Per-operation loading flags |
| Side cart drawer | Open/close state |
| Shipping settings | Free shipping threshold from backend |

| Actions | Description |
|---|---|
| `fetchCart()` | Load cart from API |
| `addItem()` | Add product/variant to cart with side cart open option |
| `updateQuantity()` | Update item quantity |
| `removeItem()` | Remove item from cart |
| `clearCart()` | Clear all items |
| `applyCoupon()` / `removeCoupon()` | Coupon management |
| `toggleSideCart()` | Toggle side cart drawer |

### `useWishlistStore` (2KB)

| Actions | Description |
|---|---|
| `fetchWishlist()` | Load wishlist from API |
| `toggleItem()` | Add/remove product from wishlist |
| `isInWishlist()` | Check if product is wishlisted |
| `removeItem()` | Remove specific item |
| `clearWishlist()` | Clear all items |

---

## TypeScript Type System

9 type modules providing full type safety:

| Module | Key Types | Description |
|---|---|---|
| `api.ts` | `PaginatedResponse<T>`, `ApiError`, `ApiResponse` | Generic API response types |
| `auth.ts` | `User`, `LoginCredentials`, `RegisterData` | Authentication types |
| `category.ts` | `Category` | Category with parent/child hierarchy |
| `product.ts` | `Product`, `ProductVariant`, `ProductImage`, `Attribute`, `AttributeValue`, `Review`, `ReviewSummary` | Full product domain types |
| `cart.ts` | `Cart`, `CartItem`, `AddToCartData`, `UpdateCartData` | Cart operation types |
| `order.ts` | `Order`, `OrderItem`, `OrderStatus`, `OrderTracking`, `OrderTrackingEvent`, `CreateOrderData`, `ShippingFormData` | Comprehensive order types |
| `payment.ts` | `Payment`, `PaymentGateway`, `StripeConfig`, `BkashConfig`, `SavedPaymentMethod` | Payment gateway types |
| `shipping.ts` | `ShippingMethod`, `ShippingRate`, `Division`, `District`, `Upazila`, `Union` | Shipping and BD location types |

---

## Utilities

### `helpers.ts` — Core Helper Functions

| Function | Description |
|---|---|
| `cn(...inputs)` | Tailwind class name merger using `clsx` |
| `formatPrice(price)` | Format price with BDT taka sign (৳), smart decimal handling |
| `getImageUrl(url)` | Auto-rewrite image extensions to `.webp`; resolve relative URLs against API origin |
| `truncateText(text, maxLength)` | Truncate text with ellipsis |

### `product-grid.ts` — Product Grid Configuration

| Export | Description |
|---|---|
| `normalizeDesktopColumns(value)` | Normalize desktop grid columns (3, 4, 5, or 6) |
| `normalizeMobileColumns(value)` | Normalize mobile grid columns (1 or 2) |
| `getProductGridClassName(desktop, mobile)` | Generate Tailwind grid classes with spacing options |
| `DEFAULT_PRODUCT_GRID_COLUMNS_DESKTOP` | Default: 5 columns |
| `DEFAULT_PRODUCT_GRID_COLUMNS_MOBILE` | Default: 2 columns |

### `sanitize.ts` — HTML/CSS Sanitization

| Function | Description |
|---|---|
| `sanitizeHtml(html)` | Strips `<script>` tags, inline event handler attributes (`onclick`, `onerror`, etc.), and `javascript:`/`data:text/html` URIs from a raw HTML string before it's passed to `dangerouslySetInnerHTML`. Used everywhere the backend can return admin-authored rich content: CMS pages, product/landing page descriptions, static legal pages. |
| `sanitizeCss(css)` | Strips `expression()`, `javascript:` URIs, and `@import` from raw CSS strings before injection into `<style>` blocks. |

Applying this at render time is defense-in-depth — it assumes the backend response could theoretically be compromised or an admin account misused, and refuses to trust HTML/CSS coming from the API as safe to inject verbatim.

### `tracking.ts` — Multi-Platform Analytics (10KB)

Standardized eCommerce event tracking across four platforms:

| Function | GA4 Event | Facebook Event | TikTok Event |
|---|---|---|---|
| `trackPageView()` | `page_view` | `PageView` | `page()` |
| `trackViewContent()` | `view_item` | `ViewContent` | `ViewContent` |
| `trackAddToCart()` | `add_to_cart` | `AddToCart` | `AddToCart` |
| `trackInitiateCheckout()` | `begin_checkout` | `InitiateCheckout` | `InitiateCheckout` |
| `trackPurchase()` | `purchase` | `Purchase` | `PlaceAnOrder` |

All tracking functions:
- Push events to `dataLayer` (for GTM)
- Call `gtag()` directly (for GA4)
- Call `fbq()` (for Facebook Pixel)
- Call `ttq.track()` (for TikTok Pixel)
- Sanitize and normalize all item data
- Handle missing/malformed values gracefully
- Default currency: `BDT`

---

## Analytics & Tracking

### Supported Platforms

| Platform | Admin Setting | ID Validation |
|---|---|---|
| **Google Tag Manager** | `gtm_enabled` + `gtm_container_id` | `/^GTM-[A-Z0-9]+$/i` |
| **Google Analytics 4** | `google_analytics_enabled` + `google_analytics_measurement_id` | `/^G-[A-Z0-9]+$/i` |
| **Facebook Pixel** | `facebook_pixel_enabled` + `facebook_pixel_id` | `/^[0-9]{5,20}$/` |
| **TikTok Pixel** | `tiktok_pixel_enabled` + `tiktok_pixel_id` | `/^[A-Za-z0-9_-]{5,64}$/` |

### How It Works

1. `TrackingIntegrations` component loads settings from `settingsService.getIntegrations()`
2. Enabled platforms have their scripts injected via `next/script`
3. On route changes, `trackPageView()` is called for all active platforms
4. eCommerce events (`trackAddToCart`, `trackPurchase`, etc.) are called from components

### Site Verification

The root layout reads `site_verification_entries` from integration settings and injects `<meta>` verification tags for:
- Google Search Console
- Bing Webmaster Tools
- Yandex Webmaster
- Pinterest
- Facebook Domain Verification
- Custom meta verification tags

---

## SEO Infrastructure

### Dynamic `robots.ts`

- Resolves site URL from `NEXT_PUBLIC_SITE_URL`, `SITE_URL`, or `NEXT_PUBLIC_APP_URL` env vars
- Allows `/` for all user agents
- Disallows: `/api/`, `/account/`, `/checkout`, `/payment/`, `/orders/`
- References dynamic sitemap URL

### Dynamic `sitemap.ts`

- Generates XML sitemap with entries for:
  - Home page (priority 1.0, daily)
  - Products page (priority 0.9, daily)
  - Categories page (priority 0.8, weekly)

### Per-Page Metadata

The root layout dynamically fetches:
- Site name and title from general settings
- SEO meta descriptions
- Open Graph tags
- Site verification meta tags

---

## Design System

### Color Palette

| Token | Usage | Values |
|---|---|---|
| `primary` | Slate/gray palette | 50–950 (12 shades) |
| `accent` | Teal highlights and CTAs | 50–950 via CSS custom properties |

### Typography

- **Font**: Inter (Google Fonts) with system-ui fallback
- **Display font**: Same as body (Inter)
- **Letter spacing**: Custom `extra-wide` at `0.2em`
- **Heading weight**: 700 with `-0.01em` tracking

### CSS Custom Properties

```css
--foreground-rgb: 18, 18, 18
--background-rgb: 255, 255, 255
--font-inter: 'Inter', system-ui, sans-serif
--accent-color: #108474
```

### Animations

| Animation | Usage |
|---|---|
| `animate-fadeIn` | Fade in elements (0.5s) |
| `animate-slideUp` | Slide up from below (0.5s) |
| `animate-slideIn` | Slide in from left (0.5s) |

### Custom Utilities

- `.font-display` — Display font weight
- `.text-balance` — Balanced text wrapping
- `.custom-line-clamp-2` — Two-line text clamp
- `.no-scrollbar` — Hidden scrollbar (cross-browser)
- Custom scrollbar styling (6px width, slate colors)

### Plugins

- `@tailwindcss/typography` — Prose content styling for CMS pages

---

## Configuration Files

| File | Purpose |
|---|---|
| `next.config.mjs` | Image domains (all HTTPS + localhost), unoptimized images, SVG support, allowed dev origins |
| `tailwind.config.js` | Color tokens, font families, letter spacing, typography plugin |
| `tsconfig.json` | Strict TypeScript with `@/*` path alias, bundler module resolution, ES2017 target |
| `postcss.config.js` | PostCSS with `@tailwindcss/postcss` |
| `eslint.config.mjs` | ESLint with Next.js config |
| `.npmrc` | npm configuration |
| `.node-version` | Node.js version requirement |

### Next.js Image Configuration

```js
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '**' },                    // All HTTPS images
    { protocol: 'http', hostname: 'localhost', port: '8000' }, // Dev backend
    { protocol: 'http', hostname: '127.0.0.1', port: '8000' } // Dev backend alt
  ],
  unoptimized: true,      // Compatible with any host (Cloudflare, etc.)
  dangerouslyAllowSVG: true
}
```

---

## Environment Variables

| Variable | Required | Scope | Description |
|---|---|---|---|
| `PORT` | No | Server | Port for Next.js server (default: `3000`) |
| `NEXT_PUBLIC_API_URL` | **Yes** | Client + Server | Laravel backend API URL (e.g., `https://api.example.com/api/v1`) |
| `NEXT_PUBLIC_ENABLE_CSRF` | No | Client | Enable Sanctum CSRF cookie flow (default: `false`) |
| `INTERNAL_API_SECRET` | **Yes** | Server only | Secret for internal proxy → must match backend `INTERNAL_API_SECRET` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Client | Stripe publishable key for payment forms |
| `NEXT_PUBLIC_SITE_URL` | No | Server | Site URL for robots.txt/sitemap generation |

### Guest Checkout

Guest checkout is controlled from the **admin panel**, not frontend env flags:
- `Admin Panel → Site Settings → Checkout → Enable Guest Checkout`

---

## Requirements

- **Node.js** 20.9+
- **npm** (or yarn)

---

## Installation

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Update .env.local with your configuration
```

### Minimum `.env.local` Configuration

```env
PORT=3000
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api/v1
INTERNAL_API_SECRET=your-internal-api-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

---

## Development

### Standard Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Turbopack Development (Faster)

```bash
npm run dev:turbo
```

Uses Next.js Turbopack for significantly faster HMR and rebuilds.

### Linting

```bash
npm run lint
```

### Clean Build Artifacts

```bash
npm run clean
```

Removes `.next`, `out`, and `tsconfig.tsbuildinfo`.

---

## Build & Production

### Build

```bash
npm run build
```

### Start Production Server

```bash
npm run start
```

The start script auto-reads the `PORT` from `.env` if set, defaulting to `3000`.

---

## Production Deployment

### Option 1: PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start npm --name "ecommerce-frontend" -- start

# Save and configure auto-restart
pm2 save
pm2 startup
```

### Option 2: aaPanel

1. Go to **Website** → **Node project** → **Add Node project**
2. Set the run command to `npm start`
3. Map your domain — aaPanel auto-configures Nginx reverse proxy to port `3000`

### Option 3: Direct Node.js

```bash
# Build first
npm run build

# Start production server
npm run start
```

### Production Checklist

- [ ] Set `NEXT_PUBLIC_API_URL` to production API URL
- [ ] Set `INTERNAL_API_SECRET` matching backend value
- [ ] Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to live Stripe key
- [ ] Set `NEXT_PUBLIC_SITE_URL` for SEO (robots.txt, sitemap.xml)
- [ ] Configure reverse proxy (Nginx) for port forwarding
- [ ] Enable HTTPS on the reverse proxy
- [ ] Set up process manager (PM2) for auto-restart
- [ ] Verify all tracking integrations are configured in admin panel

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Only the header/footer render — products, categories, settings, everything data-driven is blank | No `.env.local` file, or `INTERNAL_API_SECRET` isn't set. `/api/internal/[...path]` returns HTTP 500 (`"Internal API secret is not configured."`) for every request when the secret is missing, and nearly every storefront section reads through that proxy. The header still renders because it doesn't depend on it. | Create `.env.local` from `.env.example` and set `NEXT_PUBLIC_API_URL` + `INTERNAL_API_SECRET`. The secret must match the backend's `INTERNAL_API_SECRET` exactly. |
| Products/categories load in `curl` against the backend directly but not through the frontend | The frontend's `INTERNAL_API_SECRET` doesn't match the backend's, or `NEXT_PUBLIC_API_URL` points at the wrong host/port. | Compare both `.env`/`.env.local` files side by side; restart `npm run dev` after changing env vars (Next.js only reads them at server start). |
| `Cannot find module 'playwright'` (or similar) when running a one-off Node script against this app | Node's CJS resolution walks up from the script's own directory, not the current working directory — a script outside `frontend/` won't see `frontend/node_modules`. | Run `npm install --no-save <package>` inside `frontend/` and place the script directly inside the project directory before running it. |
| Build succeeds but ESLint reports dozens of pre-existing warnings/errors unrelated to your change | This is known lint debt, not a regression — verified by stashing changes and re-linting the base branch (same error count with/without a given change set). | Only worry about lint errors in files your diff touches; don't try to fix unrelated pre-existing violations in the same PR. |

---

## API Integration

This frontend is a **headless client** for the Laravel backend API. For the complete list of all API endpoints, request/response contracts, and authentication requirements, refer to the backend's [`API_DOCUMENTATION.md`](../API_DOCUMENTATION.md).

### Integrated API Modules

| Module | Service | Backend Endpoints |
|---|---|---|
| **Authentication** | `authService` | Register, Login, Logout, Me, Forgot/Reset Password |
| **Catalog** | `productService` | Products (list, featured, new, search, slug, category), Categories, Attributes |
| **Shopping** | `cartService` | Cart CRUD, Coupon apply/remove |
| **Checkout** | `orderService` + `abandonedCartService` | Order placement, Checkout tracking, Recovery |
| **Orders** | `orderService` | Order history, Detail, Cancel, Tracking, Payment summary |
| **Payments** | `paymentService` | Stripe (config, intent, confirm), bKash (config, create, callback), Gateways |
| **Shipping** | `shippingService` | Shipping methods, Rate calculation, BD locations |
| **Engagement** | `wishlistService` | List, Toggle, Check, Count, Move-to-cart |
| **Addresses** | `addressService` | CRUD, Default shipping/billing, BD location hierarchy |
| **Settings** | `settingsService` | General, Hero, Banner, Checkout, Integrations, Navigation, Live chat |
| **Content** | `pageService` + `landingPageService` | CMS pages, Landing pages |

---

## NPM Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev` | Start development server |
| `dev:turbo` | `next dev --turbopack` | Start with Turbopack (faster HMR) |
| `build` | `next build` | Create production build |
| `start` | `next start -p $PORT` | Start production server on configured port |
| `clean` | `rm -rf .next out tsconfig.tsbuildinfo` | Remove build artifacts |
| `lint` | `eslint src --ext .js,.jsx,.ts,.tsx` | Run ESLint on source files |

---

## License

MIT
