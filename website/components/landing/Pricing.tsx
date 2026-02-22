'use client';

import Link from 'next/link';
import Container from '../layout/Container';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { PLANS } from '@/lib/yookassa/constants';
import { formatPrice } from '@/lib/utils/format';

export default function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <Container size="md">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-text-primary sm:text-4xl">
            Простые и прозрачные цены
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Начните бесплатно — переходите на Pro, когда будете готовы
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {/* Free Plan */}
          <Card className="flex flex-col">
            <h3 className="text-xl font-semibold text-text-primary">
              Бесплатно
            </h3>
            <div className="mt-4">
              <span className="text-4xl font-bold text-text-primary">0 ₽</span>
              <span className="text-text-tertiary"> / навсегда</span>
            </div>
            <ul className="mt-6 flex-1 space-y-3">
              <FeatureItem>30 перефразирований в день</FeatureItem>
              <FeatureItem>Базовые режимы стиля</FeatureItem>
              <FeatureItem>Подсветка различий</FeatureItem>
            </ul>
            <div className="mt-8">
              <Button variant="outline" className="w-full" disabled>
                Текущий план
              </Button>
            </div>
          </Card>

          {/* Pro Monthly */}
          <Card variant="highlight" className="relative flex flex-col">
            <Badge className="absolute -top-3 right-6">Популярный</Badge>
            <h3 className="text-xl font-semibold text-text-primary">
              {PLANS.pro_monthly.name}
            </h3>
            <div className="mt-4">
              <span className="text-4xl font-bold text-text-primary">
                {formatPrice(PLANS.pro_monthly.price)}
              </span>
              <span className="text-text-tertiary"> / месяц</span>
            </div>
            <ul className="mt-6 flex-1 space-y-3">
              {PLANS.pro_monthly.features.map((f) => (
                <FeatureItem key={f}>{f}</FeatureItem>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/subscribe?plan=pro_monthly">
                <Button className="w-full">Оформить подписку</Button>
              </Link>
            </div>
          </Card>

          {/* Pro Yearly */}
          <Card className="relative flex flex-col">
            {PLANS.pro_yearly.badge && (
              <Badge variant="green" className="absolute -top-3 right-6">
                {PLANS.pro_yearly.badge}
              </Badge>
            )}
            <h3 className="text-xl font-semibold text-text-primary">
              {PLANS.pro_yearly.name}
            </h3>
            <div className="mt-4">
              <span className="text-4xl font-bold text-text-primary">
                {formatPrice(PLANS.pro_yearly.price)}
              </span>
              <span className="text-text-tertiary"> / год</span>
            </div>
            <div className="mt-1 text-sm text-green">
              {formatPrice(Math.round(PLANS.pro_yearly.price / 12))}/мес —
              выгоднее на 30%
            </div>
            <ul className="mt-6 flex-1 space-y-3">
              {PLANS.pro_yearly.features.map((f) => (
                <FeatureItem key={f}>{f}</FeatureItem>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/subscribe?plan=pro_yearly">
                <Button variant="secondary" className="w-full">
                  Оформить годовую
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </Container>
    </section>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg
        className="mt-0.5 h-5 w-5 shrink-0 text-green"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-sm text-text-secondary">{children}</span>
    </li>
  );
}
