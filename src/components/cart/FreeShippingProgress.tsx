'use client';

import { useEffect, useMemo, useState } from 'react';
import { shippingService } from '@/services';
import { formatPrice } from '@/utils';

type SliderStatus = 'zero' | 'low' | 'mid' | 'done';

interface FreeShippingProgressProps {
  cartValue: number;
  threshold?: number | string | null;
  className?: string;
}

let cachedGlobalThreshold: number | null | undefined;
let pendingGlobalThresholdPromise: Promise<number | null> | null = null;

const normalizeThresholdValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
};

const pickMinimumPositiveThreshold = (thresholds: unknown[]): number | null => {
  const values = thresholds
    .map((value) => normalizeThresholdValue(value))
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  return Math.min(...values);
};

const resolveGlobalThreshold = async (): Promise<number | null> => {
  if (cachedGlobalThreshold !== undefined) {
    return cachedGlobalThreshold;
  }

  if (pendingGlobalThresholdPromise) {
    return pendingGlobalThresholdPromise;
  }

  pendingGlobalThresholdPromise = (async () => {
    try {
      const methods = await shippingService.getShippingMethods();
      const threshold = pickMinimumPositiveThreshold(methods.map((method) => method.free_shipping_threshold));
      cachedGlobalThreshold = threshold;
      return threshold;
    } catch {
      cachedGlobalThreshold = null;
      return null;
    } finally {
      pendingGlobalThresholdPromise = null;
    }
  })();

  return pendingGlobalThresholdPromise;
};

const getStatus = (progressPercent: number): SliderStatus => {
  if (progressPercent <= 0) return 'zero';
  if (progressPercent <= 50) return 'low';
  if (progressPercent < 100) return 'mid';
  return 'done';
};

const STATUS_STYLES: Record<SliderStatus, { fill: string; text: string; rail: string; accent: string }> = {
  zero: {
    fill: 'bg-red-500',
    text: 'text-red-700',
    rail: 'bg-red-100',
    accent: '#ef4444',
  },
  low: {
    fill: 'bg-amber-500',
    text: 'text-amber-700',
    rail: 'bg-amber-100',
    accent: '#f59e0b',
  },
  mid: {
    fill: 'bg-sky-500',
    text: 'text-sky-700',
    rail: 'bg-sky-100',
    accent: '#0ea5e9',
  },
  done: {
    fill: 'bg-emerald-500',
    text: 'text-emerald-700',
    rail: 'bg-emerald-100',
    accent: '#10b981',
  },
};

function DeliveryCar({ accentColor }: { accentColor: string }) {
  return (
    <div className="pointer-events-none relative h-6 w-6">
      <div
        className="h-full w-full"
        style={{
          backgroundColor: accentColor,
          WebkitMaskImage: "url('/free-shipping.png')",
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskImage: "url('/free-shipping.png')",
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          maskSize: 'contain',
        }}
        aria-hidden="true"
      />
    </div>
  );
}

export function FreeShippingProgress({ cartValue, threshold, className = '' }: FreeShippingProgressProps) {
  const [autoThreshold, setAutoThreshold] = useState<number | null>(null);

  const explicitThreshold = useMemo<number | null | undefined>(() => {
    if (threshold === undefined) {
      return undefined;
    }

    if (threshold === null) {
      return null;
    }

    return normalizeThresholdValue(threshold);
  }, [threshold]);

  const resolvedThreshold = explicitThreshold !== undefined ? explicitThreshold : autoThreshold;

  useEffect(() => {
    let isMounted = true;

    if (explicitThreshold !== undefined) {
      return () => {
        isMounted = false;
      };
    }

    const loadThreshold = async () => {
      const value = await resolveGlobalThreshold();
      if (!isMounted) {
        return;
      }

      setAutoThreshold(value);
    };

    void loadThreshold();

    return () => {
      isMounted = false;
    };
  }, [explicitThreshold]);

  const safeCartValue = Math.max(0, Number.isFinite(cartValue) ? cartValue : 0);

  const computed = useMemo(() => {
    if (!resolvedThreshold || resolvedThreshold <= 0) {
      return null;
    }

    const rawPercent = (safeCartValue / resolvedThreshold) * 100;
    const progressPercent = Math.max(0, Math.min(100, rawPercent));
    const roundedPercent = Math.round(progressPercent);
    const remaining = Math.max(0, resolvedThreshold - safeCartValue);
    const status = getStatus(progressPercent);

    return {
      progressPercent,
      roundedPercent,
      remaining,
      status,
      threshold: resolvedThreshold,
    };
  }, [safeCartValue, resolvedThreshold]);

  if (!computed) {
    return null;
  }

  const styles = STATUS_STYLES[computed.status];
  const markerLeft = `calc(${computed.progressPercent}% - 12px)`;

  return (
    <div className={`rounded-xl border border-gray-200 bg-white px-3 py-2.5 ${className}`}>
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[11px] font-semibold text-gray-900">Free Delivery Progress</h3>
          <p className={`mt-0.5 text-[10px] font-medium ${styles.text}`}>
            {computed.remaining <= 0
              ? 'You unlocked free shipping!'
              : `Add ${formatPrice(computed.remaining)} more to unlock free shipping.`}
          </p>
        </div>
      </div>

      <div className="relative pb-4 pt-2">
        <div className={`h-1.5 overflow-hidden rounded-full ${styles.rail}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${styles.fill}`}
            style={{ width: `${computed.progressPercent}%` }}
          />
        </div>

        <div
          className="absolute -top-3 transition-all duration-500"
          style={{ left: `${computed.progressPercent}%`, transform: 'translateX(-50%)' }}
          aria-label={`Free shipping progress ${computed.roundedPercent}%`}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <DeliveryCar accentColor={styles.accent} />
          </div>
        </div>

        <div
          className="absolute top-2 transition-all duration-500"
          style={{ left: `${computed.progressPercent}%`, transform: 'translateX(-50%)' }}
          aria-hidden="true"
        >
          <span
            className="inline-flex min-w-[32px] items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm"
            style={{ backgroundColor: styles.accent }}
          >
            {computed.roundedPercent}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default FreeShippingProgress;