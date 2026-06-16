import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageService } from '@/services';
import { LoadingPage } from '@/components/ui';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchPage(slug: string) {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/pages/${slug}`, {
      headers: { 'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '' },
      next: { revalidate: 300 }
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return payload?.data || null;
  } catch (err) {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const page = await fetchPage(slug);
    
    return {
      title: page.meta_title || page.title,
      description: page.meta_description || `View ${page.title}`,
      openGraph: {
        title: page.meta_title || page.title,
        description: page.meta_description || `View ${page.title}`,
        type: 'website',
      },
    };
  } catch (error) {
    return {
      title: 'Page Not Found',
    };
  }
}

export default async function DynamicPage({ params }: PageProps) {
  try {
    const { slug } = await params;
    const page = await fetchPage(slug);

    if (!page) {
      notFound();
    }

    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 border-b border-gray-100 pb-6">
              {page.title}
            </h1>
            
            <div 
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-accent-600 hover:prose-a:text-accent-700 prose-img:rounded-xl prose-img:shadow-sm"
              dangerouslySetInnerHTML={{ __html: page.content || '' }} 
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
