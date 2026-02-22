import Link from 'next/link';
import Container from '@/components/layout/Container';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Container size="sm">
        <div className="text-center">
          <p className="text-6xl font-bold gradient-accent-text">404</p>
          <h1 className="mt-4 text-2xl font-bold text-text-primary">
            Страница не найдена
          </h1>
          <p className="mt-2 text-text-secondary">
            Запрашиваемая страница не существует или была перемещена.
          </p>
          <div className="mt-8">
            <Link href="/">
              <Button>На главную</Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
