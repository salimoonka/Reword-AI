'use client';

import { createClient } from '@/lib/supabase/client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Container from '@/components/layout/Container';
import Spinner from '@/components/ui/Spinner';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}

function SignInContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/subscribe';
  const urlError = searchParams.get('error');

  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      setError('Ошибка входа. Попробуйте ещё раз.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <Container size="sm" className="relative z-10 py-20">
        <div className="mx-auto max-w-sm">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-accent">
                <span className="text-lg font-bold text-white">R</span>
              </div>
              <span className="text-xl font-bold text-text-primary">
                Reword <span className="text-accent">AI</span>
              </span>
            </Link>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border bg-surface p-8">
            <h1 className="text-center text-2xl font-bold text-text-primary">
              Вход в аккаунт
            </h1>
            <p className="mt-2 text-center text-sm text-text-secondary">
              Используйте тот же Google аккаунт, что и в приложении
            </p>

            {(error || urlError) && (
              <div className="mt-4 rounded-lg bg-red/10 border border-red/20 px-4 py-3">
                <p className="text-sm text-red">
                  {error || 'Ошибка авторизации. Попробуйте ещё раз.'}
                </p>
              </div>
            )}

            <div className="mt-6">
              <Button
                onClick={handleGoogleSignIn}
                loading={loading}
                variant="outline"
                size="lg"
                className="w-full gap-3"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Войти через Google
              </Button>
            </div>

            <p className="mt-6 text-center text-xs text-text-tertiary">
              Продолжая, вы соглашаетесь с{' '}
              <Link href="/legal/terms" className="underline hover:text-text-secondary">
                Условиями использования
              </Link>{' '}
              и{' '}
              <Link href="/legal/privacy" className="underline hover:text-text-secondary">
                Политикой конфиденциальности
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-text-tertiary">
            <Link href="/" className="hover:text-text-secondary">
              ← Вернуться на главную
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}
