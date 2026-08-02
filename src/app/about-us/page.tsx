import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { sanitizeHtml } from '@/utils/sanitize';
import { fetchServerPage } from '@/services/server-content.service';

interface PageProps {
  params: Promise<{ slug?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchServerPage('about-us');
  if (!page) return { title: 'About Us' };
  
  return {
    title: page.meta_title || page.title,
    description: page.meta_description || `Learn more about us`,
  };
}

export default async function AboutUsPage() {
  const page = await fetchServerPage('about-us');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-accent-900 text-white overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-[1000px] h-[1000px] rounded-full bg-accent-800 opacity-50 blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-accent-700 opacity-30 blur-3xl" />
        </div>
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            {page?.title || 'About Us'}
          </h1>
          <p className="text-xl md:text-2xl text-accent-100 max-w-2xl mx-auto font-light">
            Crafting the best shopping experience for you. We believe in quality, trust, and exceptional service.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 -mt-16 relative z-20 pb-20">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Dynamic Content from Admin */}
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <span className="w-12 h-1 bg-accent-500 rounded-full inline-block"></span>
                Our Story
              </h2>
              {page?.content ? (
                <div 
                  className="prose prose-lg prose-accent max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-p:leading-relaxed prose-img:rounded-2xl prose-img:shadow-md"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
                />
              ) : (
                <p className="text-gray-600 text-lg leading-relaxed">
                  We started with a simple idea: to bring high-quality products directly to our customers. 
                  Our journey has been incredible so far, and we're just getting started. 
                  We carefully curate every item in our store to ensure it meets our strict standards for quality and value.
                </p>
              )}
            </div>

            {/* Sidebar Details */}
            <div className="space-y-8">
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Our Values</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-600 flex items-center justify-center shrink-0 font-bold">1</div>
                    <p className="text-gray-700 mt-1">Customer satisfaction is our top priority.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-600 flex items-center justify-center shrink-0 font-bold">2</div>
                    <p className="text-gray-700 mt-1">Uncompromising quality in every product.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-600 flex items-center justify-center shrink-0 font-bold">3</div>
                    <p className="text-gray-700 mt-1">Transparent and honest communication.</p>
                  </li>
                </ul>
              </div>

              <div className="bg-accent-50 rounded-2xl p-8 border border-accent-100">
                <h3 className="text-xl font-bold text-accent-900 mb-2">Need Help?</h3>
                <p className="text-accent-800 mb-6 text-sm">Our support team is always ready to assist you.</p>
                <a href="/contact" className="inline-block w-full text-center bg-accent-600 text-white font-medium py-3 px-6 rounded-xl hover:bg-accent-700 transition-colors">
                  Contact Us
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
