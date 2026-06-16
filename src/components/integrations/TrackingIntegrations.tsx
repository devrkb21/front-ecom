'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { settingsService, type TrackingIntegrationsSettings } from '@/services';
import { trackPageView } from '@/utils';

const DEFAULT_TRACKING_SETTINGS: TrackingIntegrationsSettings = {
  gtm_enabled: false,
  gtm_container_id: '',
  facebook_pixel_enabled: false,
  facebook_pixel_id: '',
  tiktok_pixel_enabled: false,
  tiktok_pixel_id: '',
  google_analytics_enabled: false,
  google_analytics_measurement_id: '',
  site_verification_entries: [],
};

const sanitizeId = (value: string): string => value.trim().replace(/[<>"'`\\]/g, '');

const isValidGtmId = (value: string): boolean => /^GTM-[A-Z0-9]+$/i.test(value);
const isValidGaMeasurementId = (value: string): boolean => /^G-[A-Z0-9]+$/i.test(value);
const isValidFacebookPixelId = (value: string): boolean => /^[0-9]{5,20}$/.test(value);
const isValidTikTokPixelId = (value: string): boolean => /^[A-Za-z0-9_-]{5,64}$/.test(value);

export default function TrackingIntegrations() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<TrackingIntegrationsSettings>(DEFAULT_TRACKING_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasSeenInitialPathRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleCallbackId: number | null = null;

    const fetchTrackingSettings = async () => {
      try {
        const data = await settingsService.getIntegrations();

        if (!isMounted) {
          return;
        }

        setSettings(data);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to load tracking integration settings:', error);
        }

        if (!isMounted) {
          return;
        }

        setSettings(DEFAULT_TRACKING_SETTINGS);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    const scheduleFetch = () => {
      void fetchTrackingSettings();
    };

    if (typeof window !== 'undefined') {
      const windowWithIdleCallbacks = window as Window & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

      if (typeof windowWithIdleCallbacks.requestIdleCallback === 'function') {
        idleCallbackId = windowWithIdleCallbacks.requestIdleCallback(scheduleFetch, { timeout: 1500 });
      } else {
        timeoutId = setTimeout(scheduleFetch, 800);
      }
    } else {
      void fetchTrackingSettings();
    }

    return () => {
      isMounted = false;

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      if (idleCallbackId !== null && typeof window !== 'undefined') {
        const windowWithIdleCallbacks = window as Window & {
          cancelIdleCallback?: (handle: number) => void;
        };

        if (typeof windowWithIdleCallbacks.cancelIdleCallback === 'function') {
          windowWithIdleCallbacks.cancelIdleCallback(idleCallbackId);
        }
      }
    };
  }, []);

  const resolved = useMemo(() => {
    const gtmId = sanitizeId(settings.gtm_container_id);
    const gaId = sanitizeId(settings.google_analytics_measurement_id);
    const facebookPixelId = sanitizeId(settings.facebook_pixel_id);
    const tiktokPixelId = sanitizeId(settings.tiktok_pixel_id);

    return {
      gtm: {
        enabled: settings.gtm_enabled && isValidGtmId(gtmId),
        id: gtmId,
      },
      ga4: {
        enabled: settings.google_analytics_enabled && isValidGaMeasurementId(gaId),
        id: gaId,
      },
      facebook: {
        enabled: settings.facebook_pixel_enabled && isValidFacebookPixelId(facebookPixelId),
        id: facebookPixelId,
      },
      tiktok: {
        enabled: settings.tiktok_pixel_enabled && isValidTikTokPixelId(tiktokPixelId),
        id: tiktokPixelId,
      },
    };
  }, [settings]);

  const pagePath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') {
      return;
    }

    if (!hasSeenInitialPathRef.current) {
      hasSeenInitialPathRef.current = true;

      if (resolved.gtm.enabled) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'page_view',
          page_path: pagePath,
          page_title: document.title,
          page_location: window.location.href,
        });
      }

      return;
    }

    trackPageView({
      pagePath,
      pageTitle: document.title,
      pageLocation: window.location.href,
    });
  }, [isLoaded, pagePath, resolved.gtm.enabled]);

  if (!isLoaded) {
    return null;
  }

  return (
    <>
      {resolved.gtm.enabled && (
        <Script
          id="tracking-gtm"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(resolved.gtm.id)});`,
          }}
        />
      )}

      {resolved.ga4.enabled && (
        <>
          <Script
            id="tracking-ga4-src"
            strategy="lazyOnload"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(resolved.ga4.id)}`}
          />
          <Script
            id="tracking-ga4"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=window.gtag||gtag;gtag('js',new Date());gtag('config',${JSON.stringify(resolved.ga4.id)});`,
            }}
          />
        </>
      )}

      {resolved.facebook.enabled && (
        <Script
          id="tracking-facebook-pixel"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(resolved.facebook.id)});fbq('track','PageView');`,
          }}
        />
      )}

      {resolved.tiktok.enabled && (
        <Script
          id="tracking-tiktok-pixel"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r='https://analytics.tiktok.com/i18n/pixel/events.js';ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement('script');o.type='text/javascript';o.async=!0;o.src=r+'?sdkid='+e+'&lib='+t;var a=document.getElementsByTagName('script')[0];a.parentNode.insertBefore(o,a)};ttq.load(${JSON.stringify(resolved.tiktok.id)});ttq.page()}(window,document,'ttq');`,
          }}
        />
      )}
    </>
  );
}
