import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { sanitizeHtml } from '@/utils/sanitize';
import { fetchServerPage } from '@/services/server-content.service';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const page = await fetchServerPage(slug);

    if (!page) {
      return { title: 'Page Not Found' };
    }

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
    const page = await fetchServerPage(slug);

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
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
