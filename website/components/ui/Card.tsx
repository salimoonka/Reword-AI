import { cn } from '@/lib/utils/cn';
import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent' | 'highlight';
}

export default function Card({
  className,
  variant = 'default',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-6 transition-all duration-300',
        {
          'border-border bg-surface': variant === 'default',
          'border-border-accent bg-surface glow-accent': variant === 'accent',
          'border-accent/50 bg-gradient-to-b from-accent-muted to-surface':
            variant === 'highlight',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
