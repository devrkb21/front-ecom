import { Metadata } from 'next';
import { ArrowLeft, ShieldCheck, RefreshCcw, Clock } from 'lucide-react';
import Link from 'next/link';

async function fetchPage(slug: string) {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/pages/${slug}`, {
      headers: { 'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return payload?.data || null;
  } catch (err) {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchPage('refund-policy');
  if (!page) return { title: 'Refund Policy' };
  
  return {
    title: page.meta_title || page.title,
    description: page.meta_description || `Our Refund Policy`,
  };
}

export default async function RefundPolicyPage() {
  const page = await fetchPage('refund-policy');

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-accent-600 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 px-8 py-12 md:px-16 md:py-16 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-accent-600/10" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent-500/20 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-accent-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-accent-400/30">
                <RefreshCcw className="w-8 h-8 text-accent-400" />
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
                {page?.title || 'Refund Policy'}
              </h1>
              <p className="text-slate-300 max-w-2xl mx-auto">
                We stand behind our products. Here is everything you need to know about returns, refunds, and exchanges.
              </p>
            </div>
          </div>

          {/* Quick Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/50">
            <div className="p-8 text-center flex flex-col items-center">
              <ShieldCheck className="w-8 h-8 text-accent-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-1">Secure Returns</h4>
              <p className="text-sm text-gray-500">100% money back guarantee on defective items.</p>
            </div>
            <div className="p-8 text-center flex flex-col items-center">
              <Clock className="w-8 h-8 text-accent-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-1">30 Days</h4>
              <p className="text-sm text-gray-500">You have 30 days to return most items.</p>
            </div>
            <div className="p-8 text-center flex flex-col items-center">
              <RefreshCcw className="w-8 h-8 text-accent-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-1">Easy Exchanges</h4>
              <p className="text-sm text-gray-500">Swap for a different size or color easily.</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 md:p-16">
            <div className="prose prose-lg prose-accent max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-a:text-accent-600 hover:prose-a:text-accent-700">
              {page?.content ? (
                <div dangerouslySetInnerHTML={{ __html: page.content }} />
              ) : (
                <>
                  <h2>Our Promise to You</h2>
                  <p>If you're not completely satisfied with your purchase, we're here to help. Our return and refund policy is designed to be fair, simple, and straightforward.</p>
                  
                  <h3>Returns</h3>
                  <p>You have 30 calendar days to return an item from the date you received it. To be eligible for a return, your item must be:</p>
                  <ul>
                    <li>Unused and in the same condition that you received it.</li>
                    <li>In the original packaging.</li>
                    <li>Accompanied by the receipt or proof of purchase.</li>
                  </ul>

                  <h3>Refunds</h3>
                  <p>Once we receive your item, we will inspect it and notify you that we have received your returned item. We will immediately notify you on the status of your refund after inspecting the item.</p>
                  <p>If your return is approved, we will initiate a refund to your credit card (or original method of payment). You will receive the credit within a certain amount of days, depending on your card issuer's policies.</p>

                  <h3>Shipping</h3>
                  <p>You will be responsible for paying for your own shipping costs for returning your item. Shipping costs are non-refundable. If you receive a refund, the cost of return shipping will be deducted from your refund.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
