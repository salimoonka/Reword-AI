import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { formatDate, daysRemaining } from '@/lib/utils/format';

interface SubscriptionCardProps {
  subscription: {
    status: string;
    plan: string;
    store: string;
    expires_at: string | null;
    trial_ends_at: string | null;
  } | null;
  isPremium: boolean;
}

export default function SubscriptionCard({
  subscription,
  isPremium,
}: SubscriptionCardProps) {
  const days = daysRemaining(subscription?.expires_at ?? null);

  const storeLabel: Record<string, string> = {
    apple: 'App Store',
    google: 'Google Play',
    external: 'Сайт',
  };

  return (
    <Card variant={isPremium ? 'accent' : 'default'}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-primary">Подписка</h3>
        <Badge variant={isPremium ? 'accent' : 'orange'}>
          {isPremium ? 'Pro' : 'Бесплатно'}
        </Badge>
      </div>

      {isPremium && subscription ? (
        <div className="mt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">План</span>
            <span className="text-text-primary">
              {subscription.plan === 'pro_yearly'
                ? 'Годовой'
                : 'Ежемесячный'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Источник</span>
            <span className="text-text-primary">
              {storeLabel[subscription.store] || subscription.store}
            </span>
          </div>
          {subscription.expires_at && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Действует до</span>
                <span className="text-text-primary">
                  {formatDate(subscription.expires_at)}
                </span>
              </div>
              {days !== null && days <= 7 && (
                <div className="rounded-lg bg-orange/10 px-3 py-2">
                  <p className="text-xs text-orange">
                    ⚠️ Подписка истекает через {days}{' '}
                    {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-text-secondary">
            У вас бесплатный план. Перейдите на Pro для безлимитного
            использования.
          </p>
        </div>
      )}
    </Card>
  );
}
