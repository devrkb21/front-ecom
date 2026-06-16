'use client';

import dynamic from 'next/dynamic';

const SideCartDrawer = dynamic(
  () => import('@/components/cart/SideCartDrawer').then((module) => module.SideCartDrawer),
  {
    ssr: false,
  }
);

const TrackingIntegrations = dynamic(
  () => import('@/components/integrations/TrackingIntegrations'),
  {
    ssr: false,
  }
);

export function DeferredClientWidgets() {
  return (
    <>
      <SideCartDrawer />
      <TrackingIntegrations />
    </>
  );
}

export default DeferredClientWidgets;
