import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Container from '@/components/layout/Container';

export const metadata = {
  title: 'Возврат средств — Reword AI',
};

export default function RefundPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen py-16">
        <Container size="sm">
          <h1 className="text-3xl font-bold text-text-primary">
            Политика возврата средств
          </h1>
          <p className="mt-2 text-sm text-text-tertiary">
            Последнее обновление: февраль 2026
          </p>

          <div className="prose-invert mt-8 space-y-6 text-text-secondary text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                Право на возврат
              </h2>
              <p>
                Вы имеете право на полный возврат средств в течение 7 дней
                с момента оплаты подписки через сайт.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                Как оформить возврат
              </h2>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Напишите на{' '}
                  <a href="mailto:support@reword-ai.ru" className="text-accent underline">
                    support@reword-ai.ru
                  </a>
                </li>
                <li>Укажите адрес электронной почты аккаунта</li>
                <li>Укажите дату и номер платежа (если есть)</li>
                <li>Опишите причину возврата</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                Сроки обработки
              </h2>
              <p>
                Возврат обрабатывается в течение 3 рабочих дней. Средства
                возвращаются тем же способом, которым была произведена оплата.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary">
                Подписки через Google Play
              </h2>
              <p>
                Если подписка была оформлена через Google Play, возврат
                осуществляется через Google Play Store в соответствии с
                политикой Google.
              </p>
            </section>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
