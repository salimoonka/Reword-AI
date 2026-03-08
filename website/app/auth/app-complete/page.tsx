'use client';

import { useEffect, useState } from 'react';

/**
 * /auth/app-complete
 *
 * Shown when the mobile app's OAuth redirect lands on the website.
 * The browser is *supposed* to auto-close (via WebBrowser.openAuthSessionAsync
 * interception), but if it doesn't this page:
 *
 * 1. Extracts tokens from the URL hash fragment (#access_token=...&refresh_token=...)
 * 2. Attempts to redirect back to the app via deep link (rewordai://auth/callback#...)
 * 3. Falls back to a manual "return to app" message with a button
 *
 * Also attempts `window.close()` after a short delay.
 */

const APP_SCHEME = 'rewordai';

export default function AppCompletePage() {
  const [closing, setClosing] = useState(true);
  const [deepLinkAttempted, setDeepLinkAttempted] = useState(false);

  useEffect(() => {
    // Extract hash fragment from the current URL (implicit OAuth tokens)
    const hash = window.location.hash;
    const hasTokens = hash && hash.includes('access_token');

    // Step 1: Try to redirect to the mobile app via deep link with the tokens
    if (hasTokens) {
      // Build a deep link that passes the tokens back to the mobile app
      const deepLinkUrl = `${APP_SCHEME}://auth/callback${hash}`;
      try {
        window.location.href = deepLinkUrl;
        setDeepLinkAttempted(true);
      } catch {
        // Deep link failed — fall through to manual close
      }
    }

    // Step 2: Try to close the browser tab (works for Chrome Custom Tabs)
    const timer = setTimeout(() => {
      window.close();
      // If still open after close attempt, show the manual message
      setTimeout(() => setClosing(false), 600);
    }, hasTokens ? 2000 : 1200);

    return () => clearTimeout(timer);
  }, []);

  const handleReturnToApp = () => {
    // Try deep link first, then fallback to window.close()
    const hash = window.location.hash;
    const hasTokens = hash && hash.includes('access_token');
    if (hasTokens) {
      window.location.href = `${APP_SCHEME}://auth/callback${hash}`;
    } else {
      window.location.href = `${APP_SCHEME}://`;
    }
    setTimeout(() => window.close(), 500);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* ── Decorative blurs ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 -translate-x-1/2 h-[420px] w-[520px] rounded-full bg-accent/10 blur-[140px]" />
        <div className="absolute right-1/4 bottom-1/4 h-[260px] w-[260px] rounded-full bg-blue/8 blur-[100px]" />
      </div>

      {/* ── Glassmorphism card ── */}
      <div
        className="
          relative z-10 mx-auto max-w-sm w-full
          rounded-3xl border border-white/[0.08]
          bg-white/[0.04] backdrop-blur-2xl
          p-8 text-center
          shadow-[0_8px_64px_rgba(155,109,255,0.12)]
          animate-fade-in-up
        "
      >
        {/* Animated checkmark */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full gradient-accent shadow-[0_0_32px_rgba(155,109,255,0.3)]">
          <svg
            className="h-10 w-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-text-primary">
          Вход выполнен
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Ваш Google аккаунт подключён.
          <br />
          Подписка и история синхронизированы с приложением.
        </p>

        {closing ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-text-tertiary">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            Возвращаю в приложение…
          </div>
        ) : (
          <>
            <div className="mt-8 rounded-xl border border-accent/20 bg-accent/5 px-5 py-3">
              <p className="text-sm font-medium text-accent-light">
                Вернитесь в приложение Reword&nbsp;AI
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {deepLinkAttempted
                  ? 'Если приложение не открылось, нажмите кнопку ниже'
                  : 'Закройте эту вкладку вручную'}
              </p>
            </div>

            <button
              onClick={handleReturnToApp}
              className="
                mt-5 w-full rounded-xl gradient-accent
                py-3 text-sm font-semibold text-white
                transition-opacity hover:opacity-90
              "
            >
              Открыть Reword AI
            </button>
          </>
        )}

        {/* Subtle branding */}
        <div className="mt-8 flex items-center justify-center gap-1.5 opacity-40">
          <div className="flex h-5 w-5 items-center justify-center rounded-md gradient-accent">
            <span className="text-[10px] font-bold text-white">R</span>
          </div>
          <span className="text-[11px] font-medium text-text-tertiary tracking-wide">
            Reword AI
          </span>
        </div>
      </div>
    </div>
  );
}
