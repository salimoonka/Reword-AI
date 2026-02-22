import Link from 'next/link';
import Container from './Container';

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background py-12">
      <Container size="xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-accent">
                <span className="text-sm font-bold text-white">R</span>
              </div>
              <span className="text-lg font-bold text-text-primary">
                Reword <span className="text-accent">AI</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-text-tertiary">
              Умный перефразировщик текста на основе искусственного интеллекта
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-text-primary">
              Продукт
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/#features"
                  className="text-sm text-text-tertiary transition-colors hover:text-text-secondary"
                >
                  Возможности
                </Link>
              </li>
              <li>
                <Link
                  href="/#pricing"
                  className="text-sm text-text-tertiary transition-colors hover:text-text-secondary"
                >
                  Цены
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="text-sm text-text-tertiary transition-colors hover:text-text-secondary"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-text-primary">
              Документы
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/legal/terms"
                  className="text-sm text-text-tertiary transition-colors hover:text-text-secondary"
                >
                  Условия использования
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="text-sm text-text-tertiary transition-colors hover:text-text-secondary"
                >
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/refund"
                  className="text-sm text-text-tertiary transition-colors hover:text-text-secondary"
                >
                  Возврат средств
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-text-primary">
              Поддержка
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:support@reword-ai.ru"
                  className="text-sm text-text-tertiary transition-colors hover:text-text-secondary"
                >
                  support@reword-ai.ru
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border/50 pt-6">
          <p className="text-center text-xs text-text-tertiary">
            © {new Date().getFullYear()} Reword AI. Все права защищены.
          </p>
        </div>
      </Container>
    </footer>
  );
}
