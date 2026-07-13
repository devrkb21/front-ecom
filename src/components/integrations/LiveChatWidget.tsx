'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { settingsService, type LiveChatSettings } from '@/services/settings.service';

/* ─── Default settings (all disabled) ─── */
const DEFAULT_SETTINGS: LiveChatSettings = {
  live_chat_enabled: false,
  live_chat_whatsapp_enabled: false,
  live_chat_whatsapp_number: '',
  live_chat_whatsapp_message: 'Hello! I need help.',
  live_chat_messenger_enabled: false,
  live_chat_messenger_link: '',
  live_chat_button_position: 'bottom-right',
  live_chat_welcome_text: 'Chat with us!',
  live_chat_button_color: '#7C3AED',
};

/* ─── Provider link builders ─── */
function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, '').replace(/^\+/, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

function buildMessengerUrl(link: string): string {
  if (/^https?:\/\//i.test(link)) {
    return link;
  }
  return `https://m.me/${link}`;
}

/* ─── SVG Icons ─── */
function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function MessengerIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0084FF" aria-hidden="true">
      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.2l3.131 3.259L19.752 8.2l-6.561 6.763z" />
    </svg>
  );
}

function ChatIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CloseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ─── Component ─── */
export default function LiveChatWidget() {
  const [settings, setSettings] = useState<LiveChatSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Fetch settings ── */
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const data = await settingsService.getLiveChat();
        if (isMounted) {
          setSettings(data);
        }
      } catch {
        // Silently fall back to defaults
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  /* ── Close on outside click ── */
  useEffect(() => {
    if (!isExpanded) return;

    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isExpanded]);

  /* ── Auto show tooltip ── */
  useEffect(() => {
    if (!isLoaded || !settings.live_chat_enabled) return;

    tooltipTimerRef.current = setTimeout(() => {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 4000);
    }, 3000);

    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, [isLoaded, settings.live_chat_enabled]);

  /* ── Resolve active providers ── */
  const providers = useMemo(() => {
    const list: Array<{
      key: string;
      label: string;
      icon: React.ReactNode;
      url: string;
      bgColor: string;
    }> = [];

    if (
      settings.live_chat_whatsapp_enabled &&
      settings.live_chat_whatsapp_number.trim().length > 0
    ) {
      list.push({
        key: 'whatsapp',
        label: 'WhatsApp',
        icon: <WhatsAppIcon size={20} />,
        url: buildWhatsAppUrl(
          settings.live_chat_whatsapp_number,
          settings.live_chat_whatsapp_message
        ),
        bgColor: '#25D366',
      });
    }

    if (
      settings.live_chat_messenger_enabled &&
      settings.live_chat_messenger_link.trim().length > 0
    ) {
      list.push({
        key: 'messenger',
        label: 'Messenger',
        icon: <MessengerIcon size={20} />,
        url: buildMessengerUrl(settings.live_chat_messenger_link),
        bgColor: '#0084FF',
      });
    }

    return list;
  }, [settings]);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
    setShowTooltip(false);
  }, []);

  /* ── Don't render if disabled or no providers ── */
  if (!isLoaded || !settings.live_chat_enabled || providers.length === 0) {
    return null;
  }

  const isRight = settings.live_chat_button_position === 'bottom-right';
  const btnColor = settings.live_chat_button_color || '#7C3AED';

  return (
    <>
      {/* ── Styles (injected once) ── */}
      <style jsx global>{`
        .lcw-container {
          position: fixed;
          bottom: 24px;
          ${isRight ? 'right: 24px;' : 'left: 24px;'}
          z-index: 9999;
          display: flex;
          flex-direction: column-reverse;
          align-items: ${isRight ? 'flex-end' : 'flex-start'};
          gap: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .lcw-main-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
          position: relative;
          outline: none;
        }

        .lcw-main-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25), 0 3px 8px rgba(0, 0, 0, 0.15);
        }

        .lcw-main-btn:active {
          transform: scale(0.95);
        }

        .lcw-main-btn .lcw-icon-chat,
        .lcw-main-btn .lcw-icon-close {
          position: absolute;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
        }

        .lcw-main-btn .lcw-icon-chat {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }

        .lcw-main-btn.is-expanded .lcw-icon-chat {
          opacity: 0;
          transform: scale(0.5) rotate(90deg);
        }

        .lcw-main-btn .lcw-icon-close {
          opacity: 0;
          transform: scale(0.5) rotate(-90deg);
        }

        .lcw-main-btn.is-expanded .lcw-icon-close {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }

        /* ── Pulse ring animation ── */
        .lcw-main-btn::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid currentColor;
          opacity: 0;
          animation: lcw-pulse 2.5s ease-out infinite;
        }

        .lcw-main-btn.is-expanded::before {
          animation: none;
          opacity: 0;
        }

        @keyframes lcw-pulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        /* ── Tooltip ── */
        .lcw-tooltip {
          position: absolute;
          bottom: 50%;
          transform: translateY(50%);
          ${isRight ? 'right: calc(100% + 12px);' : 'left: calc(100% + 12px);'}
          background: #1a1a2e;
          color: #fff;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease, transform 0.3s ease;
          ${isRight ? 'transform: translateY(50%) translateX(8px);' : 'transform: translateY(50%) translateX(-8px);'}
        }

        .lcw-tooltip.is-visible {
          opacity: 1;
          pointer-events: auto;
          ${isRight ? 'transform: translateY(50%) translateX(0);' : 'transform: translateY(50%) translateX(0);'}
        }

        .lcw-tooltip::after {
          content: '';
          position: absolute;
          top: 50%;
          ${isRight ? 'right: -5px;' : 'left: -5px;'}
          transform: translateY(-50%) ${isRight ? 'rotate(45deg)' : 'rotate(-135deg)'};
          width: 10px;
          height: 10px;
          background: #1a1a2e;
          border-radius: 1px;
        }

        /* ── Provider buttons stack ── */
        .lcw-providers {
          display: flex;
          flex-direction: column-reverse;
          gap: 10px;
          align-items: ${isRight ? 'flex-end' : 'flex-start'};
        }

        .lcw-provider-item {
          display: flex;
          align-items: center;
          gap: 10px;
          opacity: 0;
          transform: translateY(16px) scale(0.8);
          transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          ${isRight ? 'flex-direction: row-reverse;' : 'flex-direction: row;'}
        }

        .lcw-provider-item.is-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .lcw-provider-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          text-decoration: none;
          outline: none;
        }

        .lcw-provider-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.12);
        }

        .lcw-provider-btn:active {
          transform: scale(0.95);
        }

        .lcw-provider-label {
          background: #1a1a2e;
          color: #fff;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }

        /* ── Entrance animation ── */
        .lcw-container {
          animation: lcw-entrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes lcw-entrance {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* ── Mobile adjustments ── */
        @media (max-width: 480px) {
          .lcw-container {
            bottom: 16px;
            ${isRight ? 'right: 16px;' : 'left: 16px;'}
          }

          .lcw-main-btn {
            width: 52px;
            height: 52px;
          }

          .lcw-provider-btn {
            width: 44px;
            height: 44px;
          }

          .lcw-provider-label {
            font-size: 12px;
            padding: 5px 10px;
          }
        }
      `}</style>

      {/* ── Widget ── */}
      <div className="lcw-container" ref={containerRef}>
        {/* Main chat button */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`lcw-main-btn ${isExpanded ? 'is-expanded' : ''}`}
            style={{ backgroundColor: btnColor }}
            onClick={toggleExpand}
            aria-label={isExpanded ? 'Close chat options' : settings.live_chat_welcome_text}
            aria-expanded={isExpanded}
          >
            <span className="lcw-icon-chat">
              <ChatIcon />
            </span>
            <span className="lcw-icon-close">
              <CloseIcon />
            </span>
          </button>

          {/* Tooltip */}
          {!isExpanded && (
            <div className={`lcw-tooltip ${showTooltip ? 'is-visible' : ''}`}>
              {settings.live_chat_welcome_text}
            </div>
          )}
        </div>

        {/* Provider buttons (expand upward) */}
        {isExpanded && (
          <div className="lcw-providers">
            {providers.map((provider, index) => (
              <div
                key={provider.key}
                className="lcw-provider-item"
                style={{
                  transitionDelay: `${index * 60}ms`,
                  animation: `none`,
                }}
                ref={(el) => {
                  if (el) {
                    requestAnimationFrame(() => {
                      el.classList.add('is-visible');
                    });
                  }
                }}
              >
                <a
                  className="lcw-provider-btn"
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Chat on ${provider.label}`}
                  onClick={() => setIsExpanded(false)}
                >
                  {provider.icon}
                </a>
                <span className="lcw-provider-label">{provider.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
