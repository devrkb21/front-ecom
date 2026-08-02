'use client';

import { useState } from 'react';
import axios from 'axios';
import { Mail, MapPin, Phone, CheckCircle2, Loader2 } from 'lucide-react';
import api from '@/services/api';

interface ContactFormState {
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactForm({ phone, email, address }: { phone: string; email: string; address: string }) {
  const [form, setForm] = useState<ContactFormState>({
    first_name: '',
    last_name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Go through the public BFF proxy (/api/public/*) like the rest of the app,
      // instead of calling the backend API directly from the browser.
      const response = await api.post('/contact', form);
      const data = response.data;

      if (data?.success) {
        setSuccess(true);
        setForm({ first_name: '', last_name: '', email: '', subject: '', message: '' });
      } else {
        setError(data?.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setError(message || 'Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 -mt-8 relative z-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Contact Information */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-accent-50 flex items-center justify-center text-accent-600 shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Call Us</h4>
                  <p className="text-gray-900 font-medium">{phone}</p>
                  <p className="text-sm text-gray-500 mt-1">Mon-Fri from 8am to 5pm.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-accent-50 flex items-center justify-center text-accent-600 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Email Us</h4>
                  <p className="text-gray-900 font-medium">{email}</p>
                  <p className="text-sm text-gray-500 mt-1">We typically reply within 24 hours.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-accent-50 flex items-center justify-center text-accent-600 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Visit Us</h4>
                  <p className="text-gray-900 font-medium whitespace-pre-line">{address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 md:p-10 h-full">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Send us a message</h3>

            {success && (
              <div className="mb-6 flex items-center gap-3 bg-green-50 text-green-700 border border-green-200 rounded-xl p-4">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p>Thank you! Your message has been sent successfully. We'll get back to you soon.</p>
              </div>
            )}

            {error && (
              <div className="mb-6 bg-red-50 text-red-700 border border-red-200 rounded-xl p-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name <span className="text-red-500">*</span></label>
                  <input type="text" name="first_name" value={form.first_name} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all" placeholder="John" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input type="text" name="last_name" value={form.last_name} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all" placeholder="Doe" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all" placeholder="john@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input type="text" name="subject" value={form.subject} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all" placeholder="How can we help you?" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message <span className="text-red-500">*</span></label>
                <textarea name="message" value={form.message} onChange={handleChange} required rows={5} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all resize-none" placeholder="Write your message here..."></textarea>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-accent-600 hover:bg-accent-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-accent-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
