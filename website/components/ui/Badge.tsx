import { cn } from '@/lib/utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'accent' | 'green' | 'orange' | 'red';
  className?: string;
}

export default function Badge({ children, variant = 'accent', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        {
          'bg-accent-muted text-accent': variant === 'accent',
          'bg-green/15 text-green': variant === 'green',
          'bg-orange/15 text-orange': variant === 'orange',
          'bg-red/15 text-red': variant === 'red',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
