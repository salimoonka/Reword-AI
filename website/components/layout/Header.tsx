'use client';

import Link from 'next/link';
import Container from './Container';
import Button from '../ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <Container size="xl">
        <nav className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-accent">
              <span className="text-sm font-bold text-white">R</span>
            </div>
            <span className="text-lg font-bold text-text-primary">
              Reword <span className="text-accent">AI</span>
            </span>
          </Link>

          {/* Navigation */}
          <div className="hidden items-center gap-6 md:flex">
            <Link
              href="/#features"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Возможности
            </Link>
            <Link
              href="/#pricing"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Цены
            </Link>
            <Link
              href="/#faq"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              FAQ
            </Link>
          </div>

          {/* Auth / CTA */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    Кабинет
                  </Button>
                </Link>
                <Link href="/subscribe">
                  <Button size="sm">Подписка</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/sign-in">
                  <Button variant="ghost" size="sm">
                    Войти
                  </Button>
                </Link>
                <Link href="/subscribe">
                  <Button size="sm">Подписка Pro</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      </Container>
    </header>
  );
}
