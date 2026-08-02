import { Metadata } from 'next';
import ContactForm from './ContactForm';
import { fetchServerPage, fetchServerGeneralSettings } from '@/services/server-content.service';

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchServerPage('contact');
  if (!page) return { title: 'Contact Us' };

  return {
    title: page.meta_title || page.title,
    description: page.meta_description || `Contact our support team`,
  };
}

export default async function ContactPage() {
  const [page, general] = await Promise.all([
    fetchServerPage('contact'),
    fetchServerGeneralSettings()
  ]);

  const phone = general?.contact_phone || '+1 (555) 123-4567';
  const email = general?.contact_email || 'support@ourstore.com';
  const address = general?.address || '123 Commerce St.\nSuite 100\nNew York, NY 10001';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header Banner */}
      <div className="bg-slate-900 py-16 text-center border-b-4 border-accent-500">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
          {page?.title || 'Contact Us'}
        </h1>
        <p className="text-slate-300 max-w-xl mx-auto px-4">
          We'd love to hear from you. Please fill out this form or shoot us an email.
        </p>
      </div>

      <ContactForm phone={phone} email={email} address={address} />
    </div>
  );
}
