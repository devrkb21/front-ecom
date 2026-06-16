# eCommerce Frontend

A modern eCommerce frontend built with Next.js, TypeScript, Tailwind CSS, and Zustand. This application consumes a Laravel REST API backend.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Auth**: Bearer Token
- **Deployment**: Node.js Server (PM2 / aaPanel)

## Features

- 🏠 Home page with featured products and categories
- 🗂 Category listing and product browsing
- 📦 Product details with add-to-cart functionality
- 🛒 Shopping cart management
- 💰 Checkout flow with order creation
- 🔐 User authentication (login/register)
- 📦 Order history and tracking
- 👤 User profile management

## Project Structure

```text
src/
├── app/                    # Next.js App Router pages
│   ├── account/           # Account management
│   ├── api/               # Next.js API routes (internal proxy)
│   ├── cart/              # Shopping cart page
│   ├── categories/        # Category listing pages
│   ├── checkout/          # Checkout flow
│   ├── forgot-password/   # Forgot password page
│   ├── login/             # User login
│   ├── orders/            # Order history & details
│   ├── payment/           # Payment processing pages
│   ├── products/          # Product details & listings
│   ├── profile/           # User profile
│   ├── register/          # User registration
│   ├── reset-password/    # Password reset page
│   ├── track-order/       # Order tracking
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/             # Reusable UI components
│   ├── auth/              # Authentication components
│   ├── cart/              # Cart-related components
│   ├── categories/        # Category components
│   ├── layout/            # Layout (Header, Footer, Sidebar)
│   ├── products/          # Product display components
│   └── ui/                # Base UI primitives
├── services/               # API service layer (Axios)
├── stores/                 # State management (Zustand)
├── types/                  # TypeScript interfaces
└── utils/                  # Helper functions
```

## Getting Started

### Prerequisites

- Node.js 20.9+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the environment file:

```bash
cp .env.example .env.local
```

4. Update `.env.local` with your API URL:

```
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api/v1
INTERNAL_API_SECRET=your-internal-api-secret
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Production Deployment (Node.js Server / PM2 / aaPanel)

To deploy this Next.js application to a production Node.js server:

1. **Build the project:**
   On the server (or build locally and upload the `.next`, `public`, and `package.json` files):
   ```bash
   npm run build
   ```

2. **Start the application:**
   You can start the production server directly using:
   ```bash
   npm run start
   ```
   By default, it will start on port `3000`.

3. **Production Process Manager (PM2 / aaPanel):**
   It is highly recommended to run the app using a process manager like **PM2** so it runs in the background and restarts automatically if it crashes.
   
   If using **aaPanel**:
   * Go to **Website** > **Node project** > **Add Node project**.
   * Set the run command to `npm start` (which runs `next start`).
   * Map your domain, and aaPanel will automatically configure an Nginx reverse proxy pointing to port `3000`.
   
   If using **PM2 directly**:
   ```bash
   npm install -g pm2
   pm2 start npm --name "ecommerce-frontend" -- start
   pm2 save
   pm2 startup
   ```

## API Integration

This frontend acts as a headless client for the backend API.
For a complete and comprehensive list of all API endpoints, request contracts, responses, and authentication requirements, please refer to the backend's `API_DOCUMENTATION.md`.

Key API modules integrated into the frontend:
- **Authentication**: Registration, Login, Password Reset, Email Verification, User Profile.
- **Catalog**: Products (Featured, Search, Related), Categories, Attributes.
- **Shopping**: Cart management, Checkout tracking, Abandoned cart recovery.
- **Orders**: Order placement, Tracking, Invoice generation, History.
- **Payments**: Stripe Intent/Confirm, bKash Create/Execute.
- **Engagement**: Wishlist, Reviews, Loyalty rewards and redemptions.
- **Locations**: Bangladesh geographic divisions, districts, upazilas, unions.
- **Configuration**: Settings, Hero/Banners, SEO, Social links.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Base URL for the API (e.g., `https://api.example.com/api/v1`) |
| `NEXT_PUBLIC_ENABLE_CSRF` | Set `true` only if backend requires Sanctum CSRF cookie flow. Default should be `false` for bearer-token auth. |
| `INTERNAL_API_SECRET` | Server-only secret used by Next.js `/api/internal/*` proxy for backend `internal.api` endpoints |

Guest checkout access is controlled from admin settings instead of frontend env flags:
- `Admin Panel -> Site Settings -> Checkout -> Enable Guest Checkout`

## License

MIT
