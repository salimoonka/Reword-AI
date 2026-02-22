import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Container from '@/components/layout/Container';
import Button from '@/components/ui/Button';

export default function PaymentCancelPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-[70vh] items-center justify-center py-12">
        <Container size="sm">
          <div className="mx-auto max-w-md text-center">
            {/* Cancel icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange/15">
              <svg
                className="h-10 w-10 text-orange"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1 className="mt-6 text-2xl font-bold text-text-primary">
              Оплата отменена
            </h1>
            <p className="mt-3 text-text-secondary">
              Платёж не был выполнен. Средства не списаны. Вы можете попробовать
              снова или выбрать другой способ оплаты.
            </p>

            <div className="mt-8 space-y-3">
              <Link href="/subscribe">
                <Button className="w-full">Попробовать снова</Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" className="w-full">
                  На главную
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
