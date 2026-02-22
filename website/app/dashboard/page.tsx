import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Container from '@/components/layout/Container';
import SubscriptionCard from '@/components/dashboard/SubscriptionCard';
import UsageStats from '@/components/dashboard/UsageStats';
import ManageSubscription from '@/components/dashboard/ManageSubscription';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in?redirect=/dashboard');
  }

  // Fetch subscription data
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Fetch quota from backend
  let quota = null;
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token && backendUrl) {
      const res = await fetch(`${backendUrl}/v1/subscription`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        quota = data.quota;
      }
    }
  } catch {
    // Quota fetch failed — show what we have
  }

  const isPremium =
    subscription?.status === 'active' &&
    subscription?.expires_at &&
    new Date(subscription.expires_at) > new Date();

  return (
    <>
      <Header />
      <main className="min-h-screen py-12">
        <Container size="md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary">
              Личный кабинет
            </h1>
            <p className="mt-1 text-text-secondary">
              {user.email || 'Пользователь'}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SubscriptionCard
              subscription={subscription}
              isPremium={isPremium || false}
            />
            <UsageStats
              quota={quota}
              isPremium={isPremium || false}
            />
          </div>

          <div className="mt-6">
            <ManageSubscription
              isPremium={isPremium || false}
              store={subscription?.store}
            />
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
