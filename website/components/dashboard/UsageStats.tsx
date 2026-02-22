import Card from '../ui/Card';

interface UsageStatsProps {
  quota: {
    tier: string;
    daily_limit: number;
    daily_used: number;
    remaining: number;
    reset_at: string;
  } | null;
  isPremium: boolean;
}

export default function UsageStats({ quota, isPremium }: UsageStatsProps) {
  const used = quota?.daily_used ?? 0;
  const limit = isPremium ? Infinity : (quota?.daily_limit ?? 30);
  const remaining = isPremium ? Infinity : (quota?.remaining ?? 30);
  const percentage = isPremium ? 0 : limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <Card>
      <h3 className="font-semibold text-text-primary">Использование сегодня</h3>

      <div className="mt-4">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl font-bold text-text-primary">{used}</span>
            <span className="text-text-tertiary">
              {isPremium ? ' / ∞' : ` / ${limit}`}
            </span>
          </div>
          {!isPremium && (
            <span className="text-sm text-text-secondary">
              Осталось: {remaining}
            </span>
          )}
        </div>

        {!isPremium && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                  background:
                    percentage > 80
                      ? '#E35A5A'
                      : percentage > 50
                      ? '#F5A623'
                      : '#39C07C',
                }}
              />
            </div>
          </div>
        )}

        {isPremium ? (
          <p className="mt-3 text-sm text-accent">✨ Безлимитное использование</p>
        ) : (
          <p className="mt-3 text-xs text-text-tertiary">
            Лимит обновляется ежедневно
          </p>
        )}
      </div>
    </Card>
  );
}
