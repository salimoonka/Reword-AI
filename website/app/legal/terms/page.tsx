import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Container from '@/components/layout/Container';

export const metadata = {
  title: 'Условия использования — Reword AI',
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen py-16">
        <Container size="sm">
          <h1 className="text-3xl font-bold text-text-primary">
            Условия использования
          </h1>
          <p className="mt-2 text-sm text-text-tertiary">
            Последнее обновление: февраль 2026
          </p>

          <div className="prose-invert mt-8 space-y-6 text-text-secondary text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                1. Общие положения
              </h2>
              <p>
                Настоящие Условия использования регулируют порядок использования
                сервиса Reword AI (далее — «Сервис»), включая мобильное
                приложение и веб-сайт.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                2. Описание Сервиса
              </h2>
              <p>
                Reword AI — это интеллектуальный инструмент для перефразирования
                текстов на русском языке с использованием технологий
                искусственного интеллекта.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                3. Подписка и оплата
              </h2>
              <p>
                Сервис предоставляет бесплатный тариф с ограничением 30
                перефразирований в день. Подписка Pro снимает это ограничение.
              </p>
              <p>
                Оплата через сайт осуществляется через платёжную систему
                YooKassa. Подписка, оформленная на сайте, не продлевается
                автоматически и действует до конца оплаченного периода.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                4. Возврат средств
              </h2>
              <p>
                Возврат средств возможен в течение 7 дней с момента оплаты.
                Для оформления возврата обращайтесь на support@reword-ai.ru
                с указанием номера платежа.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                5. Ответственность
              </h2>
              <p>
                Сервис предоставляется «как есть». Мы не гарантируем
                безошибочную работу и не несём ответственности за результаты
                перефразирования.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                6. Контакты
              </h2>
              <p>
                По всем вопросам обращайтесь:{' '}
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
