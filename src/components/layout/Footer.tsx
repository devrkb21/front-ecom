import Link from 'next/link';

async function fetchGeneralSettings() {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/settings/general`, {
      headers: { 'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '' },
      next: { revalidate: 300 }
    });
    const payload = await res.json();
    return payload?.data;
  } catch (err) {
    return null;
  }
}

async function fetchPages() {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
  if (!apiUrl) return [];
  try {
    const res = await fetch(`${apiUrl}/pages`, {
      headers: { 'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '' },
      next: { revalidate: 300 }
    });
    const payload = await res.json();
    return payload?.data || [];
  } catch (err) {
    return [];
  }
}

export async function Footer() {
  const [general, pages] = await Promise.all([
    fetchGeneralSettings(),
    fetchPages()
  ]);
  const siteName = general?.site_title || 'Our Store';

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="container mx-auto px-4 py-8">
        {/* Policy Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
          {pages.length > 0 ? (
            pages.map((page: any) => (
              <Link key={page.id} href={`/${page.slug}`} className="hover:text-accent-600 transition-colors">
                {page.title}
              </Link>
            ))
          ) : (
            <>
              <Link href="/about-us" className="hover:text-accent-600 transition-colors">About Us</Link>
              <Link href="/contact" className="hover:text-accent-600 transition-colors">Contact</Link>
              <Link href="/refund-policy" className="hover:text-accent-600 transition-colors">Refund Policy</Link>
              <Link href="/privacy-policy" className="hover:text-accent-600 transition-colors">Privacy Policy</Link>
              <Link href="/terms-of-service" className="hover:text-accent-600 transition-colors">Terms of Service</Link>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 mt-6 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>

            {/* Payment Methods */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Payment methods</span>
              <div className="flex gap-1.5">
                {['Visa', 'Mastercard', 'bKash', 'Stripe'].map((method) => (
                  <span key={method} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded border border-gray-200">
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
