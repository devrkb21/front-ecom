import { Metadata } from 'next';
import { ArrowLeft, Lock, Shield, EyeOff } from 'lucide-react';
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
  const page = await fetchPage('privacy-policy');
  if (!page) return { title: 'Privacy Policy' };
  
  return {
    title: page.meta_title || page.title,
    description: page.meta_description || `Our Privacy Policy`,
  };
}

export default async function PrivacyPolicyPage() {
  const page = await fetchPage('privacy-policy');

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
            <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl -translate-y-1/2" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-accent-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-accent-400/30">
                <Lock className="w-8 h-8 text-accent-400" />
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
                {page?.title || 'Privacy Policy'}
              </h1>
              <p className="text-slate-300 max-w-2xl mx-auto">
                Your privacy is important to us. Discover how we protect your personal data and respect your choices.
              </p>
            </div>
          </div>

          {/* Quick Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/50">
            <div className="p-8 text-center flex flex-col items-center">
              <Shield className="w-8 h-8 text-accent-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-1">Data Protection</h4>
              <p className="text-sm text-gray-500">Industry-standard encryption to keep you safe.</p>
            </div>
            <div className="p-8 text-center flex flex-col items-center">
              <EyeOff className="w-8 h-8 text-accent-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-1">No Third-Party Selling</h4>
              <p className="text-sm text-gray-500">We never sell your data to outside marketers.</p>
            </div>
            <div className="p-8 text-center flex flex-col items-center">
              <Lock className="w-8 h-8 text-accent-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-1">Total Control</h4>
              <p className="text-sm text-gray-500">You can delete your account and data at any time.</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 md:p-16">
            <div className="prose prose-lg prose-accent max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-a:text-accent-600 hover:prose-a:text-accent-700">
              {page?.content ? (
                <div dangerouslySetInnerHTML={{ __html: page.content }} />
              ) : (
                <>
                  <h2>Introduction</h2>
                  <p>Welcome to our Privacy Policy. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website.</p>
                  
                  <h3>1. The Data We Collect About You</h3>
                  <p>Personal data, or personal information, means any information about an individual from which that person can be identified. We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
                  <ul>
                    <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
                    <li><strong>Contact Data</strong> includes billing address, delivery address, email address and telephone numbers.</li>
                    <li><strong>Transaction Data</strong> includes details about payments to and from you and other details of products you have purchased from us.</li>
                  </ul>

                  <h3>2. How We Use Your Data</h3>
                  <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                  <ul>
                    <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                    <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                    <li>Where we need to comply with a legal or regulatory obligation.</li>
                  </ul>

                  <h3>3. Data Security</h3>
                  <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
