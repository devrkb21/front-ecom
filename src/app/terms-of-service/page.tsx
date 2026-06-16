import { Metadata } from 'next';
import { ArrowLeft, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const page = await fetchPage('terms-of-service');
  if (!page) return { title: 'Terms of Service' };
  
  return {
    title: page.meta_title || page.title,
    description: page.meta_description || `Our Terms of Service`,
  };
}

export default async function TermsOfServicePage() {
  const page = await fetchPage('terms-of-service');

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
            <div className="absolute top-0 right-0 w-full h-full bg-accent-600/10" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-accent-500/20 rounded-full blur-3xl translate-y-1/2" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-accent-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-accent-400/30">
                <FileText className="w-8 h-8 text-accent-400" />
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
                {page?.title || 'Terms of Service'}
              </h1>
              <p className="text-slate-300 max-w-2xl mx-auto">
                Please read these terms carefully before using our services.
              </p>
            </div>
          </div>

          {/* Quick Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/50">
            <div className="p-8 flex items-start gap-4">
              <CheckCircle2 className="w-8 h-8 text-accent-600 shrink-0" />
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Clear & Transparent</h4>
                <p className="text-sm text-gray-500">We outline our terms simply so you know exactly what to expect.</p>
              </div>
            </div>
            <div className="p-8 flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-accent-600 shrink-0" />
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Updates to Terms</h4>
                <p className="text-sm text-gray-500">We will notify you of any major changes to these policies.</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 md:p-16">
            <div className="prose prose-lg prose-accent max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-a:text-accent-600 hover:prose-a:text-accent-700">
              {page?.content ? (
                <div dangerouslySetInnerHTML={{ __html: page.content }} />
              ) : (
                <>
                  <h2>1. Terms</h2>
                  <p>By accessing this website, you are agreeing to be bound by these web site Terms and Conditions of Use, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.</p>
                  
                  <h2>2. Use License</h2>
                  <p>Permission is granted to temporarily download one copy of the materials (information or software) on our website for personal, non-commercial transitory viewing only.</p>
                  <ul>
                    <li>modify or copy the materials;</li>
                    <li>use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
                    <li>attempt to decompile or reverse engineer any software contained on our web site;</li>
                    <li>remove any copyright or other proprietary notations from the materials; or</li>
                  </ul>

                  <h2>3. Limitations</h2>
                  <p>In no event shall we or our suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption,) arising out of the use or inability to use the materials on our Internet site.</p>

                  <h2>4. Revisions and Errata</h2>
                  <p>The materials appearing on our web site could include technical, typographical, or photographic errors. We do not warrant that any of the materials on its web site are accurate, complete, or current.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
