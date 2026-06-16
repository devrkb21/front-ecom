import { Metadata } from 'next';
import ContactForm from './ContactForm';

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

async function fetchGeneral() {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/settings/general`, {
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
  const page = await fetchPage('contact');
  if (!page) return { title: 'Contact Us' };
  
  return {
    title: page.meta_title || page.title,
    description: page.meta_description || `Contact our support team`,
  };
}

export default async function ContactPage() {
  const [page, general] = await Promise.all([
    fetchPage('contact'),
    fetchGeneral()
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
