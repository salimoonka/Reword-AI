'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Container from '@/components/layout/Container';
import PlanSelector from '@/components/payment/PlanSelector';
import PaymentMethodSelector from '@/components/payment/PaymentMethodSelector';
import PaymentStatus from '@/components/payment/PaymentStatus';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import type { PlanId } from '@/lib/yookassa/constants';
import { PLANS } from '@/lib/yookassa/constants';
import { formatPrice } from '@/lib/utils/format';

type Step = 'plan' | 'method' | 'processing' | 'redirect';

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  );
}

function SubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = (searchParams.get('plan') as PlanId) || 'pro_monthly';

  const [step, setStep] = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(initialPlan);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'sbp'>('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          method: selectedMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка создания платежа');
        setLoading(false);
        return;
      }

      setPaymentId(data.paymentId);

      // For card payments, redirect to YooKassa payment page
      if (
        selectedMethod === 'card' &&
        data.confirmation?.confirmation_url
      ) {
        setStep('redirect');
        window.location.href = data.confirmation.confirmation_url;
        return;
      }

      // For SBP, show QR code / payment status polling
      setStep('processing');
    } catch {
      setError('Произошла ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const plan = PLANS[selectedPlan];

  return (
    <>
      <Header />
      <main className="min-h-screen py-12">
        <Container size="sm">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-text-primary">
              Оформление подписки
            </h1>
            <p className="mt-2 text-text-secondary">
              Выберите план и способ оплаты
            </p>
          </div>

          {/* Steps indicator */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {['План', 'Оплата', 'Готово'].map((label, i) => {
              const stepIndex =
                step === 'plan' ? 0 : step === 'method' ? 1 : 2;
              const isActive = i <= stepIndex;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                      isActive
                        ? 'gradient-accent text-white'
                        : 'bg-surface-secondary text-text-tertiary'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-sm ${
                      isActive ? 'text-text-primary' : 'text-text-tertiary'
                    }`}
                  >
                    {label}
                  </span>
                  {i < 2 && (
                    <div className="mx-2 h-px w-8 bg-border" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step: Plan selection */}
          {step === 'plan' && (
            <div className="space-y-6">
              <PlanSelector
                selectedPlan={selectedPlan}
                onSelect={setSelectedPlan}
              />
              <div className="rounded-xl border border-border bg-surface p-4 text-center">
                <p className="text-sm text-text-secondary">
                  Итого:{' '}
                  <span className="text-lg font-bold text-text-primary">
                    {formatPrice(plan.price)}
                  </span>{' '}
                  за {plan.period === 'month' ? 'месяц' : 'год'}
                </p>
              </div>
              <Button
                onClick={() => setStep('method')}
                size="lg"
                className="w-full"
              >
                Продолжить
              </Button>
            </div>
          )}

          {/* Step: Payment method */}
          {step === 'method' && (
            <div className="space-y-6">
              <PaymentMethodSelector
                selectedMethod={selectedMethod}
                onSelect={setSelectedMethod}
              />

              {error && (
                <div className="rounded-lg bg-red/10 border border-red/20 px-4 py-3">
                  <p className="text-sm text-red">{error}</p>
                </div>
              )}

              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    {plan.name}
                  </span>
                  <span className="font-bold text-text-primary">
                    {formatPrice(plan.price)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('plan')}
                  className="flex-1"
                >
                  Назад
                </Button>
                <Button
                  onClick={handlePay}
                  loading={loading}
                  size="lg"
                  className="flex-[2]"
                >
                  Оплатить {formatPrice(plan.price)}
                </Button>
              </div>

              <p className="text-center text-xs text-text-tertiary">
                Подписка не продлевается автоматически. Оплата защищена
                YooKassa.
              </p>
            </div>
          )}

          {/* Step: Processing (SBP / polling) */}
          {step === 'processing' && paymentId && (
            <PaymentStatus
              paymentId={paymentId}
              onSuccess={() => router.push('/payment/success')}
              onCancel={() => router.push('/payment/cancel')}
            />
          )}

          {/* Step: Redirect (card payment) */}
          {step === 'redirect' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-text-secondary">
                Перенаправляем на страницу оплаты...
              </p>
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
