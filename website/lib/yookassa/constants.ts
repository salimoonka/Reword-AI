export const PLANS = {
  pro_monthly: {
    id: 'pro_monthly' as const,
    name: 'Pro Ежемесячно',
    description: 'Безлимитные перефразирования на месяц',
    price: 149,
    currency: 'RUB',
    period: 'month' as const,
    periodDays: 30,
    badge: null,
    features: [
      'Безлимитные перефразирования',
      'Все режимы стиля',
      'Приоритетная обработка',
      'Без рекламы',
    ],
  },
  pro_yearly: {
    id: 'pro_yearly' as const,
    name: 'Pro Годовой',
    description: 'Безлимитные перефразирования на год',
    price: 1249,
    currency: 'RUB',
    period: 'year' as const,
    periodDays: 365,
    badge: 'Экономия 30%',
    features: [
      'Всё из ежемесячного плана',
      'Экономия 30%',
      'Приоритетная поддержка',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export const PAYMENT_METHODS = [
  {
    id: 'card' as const,
    name: 'Банковская карта',
    description: 'Visa, Mastercard, МИР',
    icon: '💳',
  },
  {
    id: 'sbp' as const,
    name: 'СБП',
    description: 'Система быстрых платежей',
    icon: '🏦',
  },
];
