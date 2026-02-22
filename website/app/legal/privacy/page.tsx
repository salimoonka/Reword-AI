import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Container from '@/components/layout/Container';

export const metadata = {
  title: 'Политика конфиденциальности — Reword AI',
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen py-16">
        <Container size="sm">
          <h1 className="text-3xl font-bold text-text-primary">
            Политика конфиденциальности
          </h1>
          <p className="mt-2 text-sm text-text-tertiary">
            Последнее обновление: февраль 2026
          </p>

          <div className="prose-invert mt-8 space-y-6 text-text-secondary text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                1. Сбор данных
              </h2>
              <p>
                Мы собираем минимальный объём данных, необходимый для работы
                Сервиса: адрес электронной почты (при входе через Google) и
                данные об использовании (количество перефразирований).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                2. Обработка текстов
              </h2>
              <p>
                Тексты, отправленные на перефразирование, обрабатываются в
                реальном времени и не сохраняются на серверах. Персональные
                данные в текстах автоматически маскируются перед отправкой в
                AI-модель.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                3. Хранение данных
              </h2>
              <p>
                Данные аккаунта хранятся на серверах Supabase (EU). Платёжные
                данные обрабатываются YooKassa и не хранятся на наших серверах.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                4. Cookies
              </h2>
              <p>
                Сайт использует cookies для поддержания сессии авторизации.
                Аналитические cookies не используются.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                5. Права пользователя
              </h2>
              <p>
                Вы можете запросить удаление своих данных, обратившись на{' '}
                <a href="mailto:support@reword-ai.ru" className="text-accent underline">
                  support@reword-ai.ru
                </a>
                . Аккаунт и все связанные данные будут удалены в течение 30
                дней.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                6. Контакты
              </h2>
              <p>
                Ответственный за обработку данных:{' '}
                <a href="mailto:support@reword-ai.ru" className="text-accent underline">
                  support@reword-ai.ru
                </a>
              </p>
            </section>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
