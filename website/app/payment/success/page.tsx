import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Container from '@/components/layout/Container';
import Button from '@/components/ui/Button';

export default function PaymentSuccessPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-[70vh] items-center justify-center py-12">
        <Container size="sm">
          <div className="mx-auto max-w-md text-center">
            {/* Success icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green/15">
              <svg
                className="h-10 w-10 text-green"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="mt-6 text-2xl font-bold text-text-primary">
              Оплата прошла успешно!
            </h1>
            <p className="mt-3 text-text-secondary">
              Ваша подписка Pro уже активна. Откройте приложение Reword AI —
              подписка синхронизируется автоматически.
            </p>

            <div className="mt-8 space-y-3">
              <Link href="/dashboard">
                <Button className="w-full">Перейти в кабинет</Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" className="w-full">
                  На главную
                </Button>
              </Link>
            </div>

            <div className="mt-8 rounded-xl border border-border bg-surface p-4">
              <p className="text-sm text-text-secondary">
                💡 <strong className="text-text-primary">Совет:</strong>{' '}
                Откройте приложение и перейдите в настройки, чтобы убедиться,
                что подписка активна.
              </p>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
