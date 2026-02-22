import Link from 'next/link';
import Button from '../ui/Button';
import Container from '../layout/Container';

export default function Hero() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <Container size="lg" className="relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-accent bg-accent-muted px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm text-accent">Работает на AI</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
            Перефразируйте текст{' '}
            <span className="gradient-accent-text">умно и быстро</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary sm:text-xl">
            Reword AI — интеллектуальный помощник для перефразирования текста.
            Исправляйте ошибки, меняйте стиль, улучшайте тексты одним нажатием.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/subscribe">
              <Button size="lg" className="w-full sm:w-auto">
                Попробовать Pro бесплатно
              </Button>
            </Link>
            <Link href="/#features">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Узнать больше
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-sm text-text-tertiary">
            30 бесплатных перефразирований в день • Без кредитной карты
          </p>
        </div>

        {/* Demo visual */}
        <div className="mx-auto mt-16 max-w-2xl animate-fade-in-up animation-delay-400">
          <div className="rounded-2xl border border-border bg-surface p-6 glow-accent">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red/60" />
              <div className="h-3 w-3 rounded-full bg-orange/60" />
              <div className="h-3 w-3 rounded-full bg-green/60" />
              <span className="ml-2 text-xs text-text-tertiary">Reword AI</span>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg bg-surface-secondary p-4">
                <p className="text-sm text-text-tertiary">Исходный текст:</p>
                <p className="mt-1 text-text-primary">
                  Я хочу <span className="rounded bg-red/20 px-1 text-red">сказать</span> что
                  эта технология очень <span className="rounded bg-red/20 px-1 text-red">хорошая</span> и
                  она помогает <span className="rounded bg-red/20 px-1 text-red">людям</span> работать лучше.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-accent">
                  <span className="text-sm">↓</span>
                </div>
              </div>
              <div className="rounded-lg bg-surface-secondary p-4">
                <p className="text-sm text-text-tertiary">Результат:</p>
                <p className="mt-1 text-text-primary">
                  Хочу <span className="rounded bg-green/20 px-1 text-green">отметить</span>, что
                  данная технология невероятно <span className="rounded bg-green/20 px-1 text-green">эффективна</span> и
                  значительно повышает <span className="rounded bg-green/20 px-1 text-green">продуктивность пользователей</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
