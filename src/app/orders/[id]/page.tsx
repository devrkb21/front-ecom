import { redirect } from 'next/navigation';

interface OrderDetailsPageProps {
  params: Promise<{ id: string }>;
}

// Server-side alias redirect (matches the pattern used by src/app/orders/page.tsx) —
// previously this redirected via a client useEffect after mount, which caused a blank
// page flash before the redirect fired.
export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { id } = await params;
  redirect(`/account/orders/${id}`);
}
