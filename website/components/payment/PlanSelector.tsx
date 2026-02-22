'use client';

import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { PLANS, type PlanId } from '@/lib/yookassa/constants';
import { formatPrice } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

interface PlanSelectorProps {
  selectedPlan: PlanId;
  onSelect: (plan: PlanId) => void;
}

export default function PlanSelector({
  selectedPlan,
  onSelect,
}: PlanSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(Object.keys(PLANS) as PlanId[]).map((planId) => {
        const plan = PLANS[planId];
        const isSelected = selectedPlan === planId;

        return (
          <button
            key={planId}
            onClick={() => onSelect(planId)}
            className="text-left"
          >
            <Card
              variant={isSelected ? 'highlight' : 'default'}
              className={cn(
                'relative cursor-pointer transition-all hover:border-border-accent',
                isSelected && 'ring-2 ring-accent'
              )}
            >
              {plan.badge && (
                <Badge variant="green" className="absolute -top-2.5 right-4">
                  {plan.badge}
                </Badge>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-text-primary">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    {plan.description}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    isSelected
                      ? 'border-accent bg-accent'
                      : 'border-text-tertiary'
                  )}
                >
                  {isSelected && (
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <span className="text-2xl font-bold text-text-primary">
                  {formatPrice(plan.price)}
                </span>
                <span className="text-sm text-text-tertiary">
                  {' '}
                  / {plan.period === 'month' ? 'мес' : 'год'}
                </span>
              </div>

              {planId === 'pro_yearly' && (
                <p className="mt-1 text-xs text-green">
                  {formatPrice(Math.round(plan.price / 12))}/мес
                </p>
              )}
            </Card>
          </button>
        );
      })}
    </div>
  );
}
