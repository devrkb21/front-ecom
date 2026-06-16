const CHECKOUT_SESSION_STORAGE_KEY = 'innercollection_checkout_session_v1';

const generateCheckoutSessionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2, 12);
  return `chk_${Date.now().toString(36)}_${random}`;
};

export const getCheckoutSessionId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const existing = window.localStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY);
    if (existing && existing.trim().length > 0) {
      return existing;
    }

    const created = generateCheckoutSessionId();
    window.localStorage.setItem(CHECKOUT_SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return null;
  }
};

export const getCheckoutSessionHeaders = (): Record<string, string> => {
  const sessionId = getCheckoutSessionId();
  if (!sessionId) {
    return {};
  }

  return {
    'X-Session-ID': sessionId,
  };
};
