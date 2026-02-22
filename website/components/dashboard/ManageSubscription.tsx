import Link from 'next/link';
import Card from '../ui/Card';
import Button from '../ui/Button';
import SignOutButton from './SignOutButton';

interface ManageSubscriptionProps {
  isPremium: boolean;
  store?: string;
}

export default function ManageSubscription({
  isPremium,
  store,
}: ManageSubscriptionProps) {
  return (
    <Card>
      <h3 className="font-semibold text-text-primary">Управление</h3>

      <div className="mt-4 space-y-3">
        {!isPremium && (
          <Link href="/subscribe">
            <Button className="w-full">Оформить подписку Pro</Button>
          </Link>
        )}

        {isPremium && store === 'external' && (
          <div className="rounded-lg bg-surface-secondary p-4">
            <p className="text-sm text-text-secondary">
              Подписка оформлена через сайт. Она не продлевается автоматически.
              Когда она истечёт, вы сможете оформить новую здесь.
            </p>
          </div>
        )}

        {isPremium && store === 'google' && (
          <div className="rounded-lg bg-surface-secondary p-4">
            <p className="text-sm text-text-secondary">
              Подписка оформлена через Google Play. Управляйте подпиской в{' '}
              <a
                href="https://play.google.com/store/account/subscriptions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline"
              >
                настройках Google Play
              </a>
              .
            </p>
          </div>
        )}

        <SignOutButton />
      </div>
    </Card>
  );
}
