'use client';

import Card from '../ui/Card';
import { PAYMENT_METHODS } from '@/lib/yookassa/constants';
import { cn } from '@/lib/utils/cn';

interface PaymentMethodSelectorProps {
  selectedMethod: 'card' | 'sbp';
  onSelect: (method: 'card' | 'sbp') => void;
}

export default function PaymentMethodSelector({
  selectedMethod,
  onSelect,
}: PaymentMethodSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PAYMENT_METHODS.map((method) => {
        const isSelected = selectedMethod === method.id;

        return (
          <button
            key={method.id}
            onClick={() => onSelect(method.id)}
            className="text-left"
          >
            <Card
              className={cn(
                'cursor-pointer transition-all hover:border-border-accent',
                isSelected && 'border-accent ring-1 ring-accent'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{method.icon}</span>
                <div>
                  <p className="font-medium text-text-primary">{method.name}</p>
                  <p className="text-xs text-text-secondary">
                    {method.description}
                  </p>
                </div>
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
