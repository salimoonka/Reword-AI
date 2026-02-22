'use client';

import { useState } from 'react';
import Container from '../layout/Container';

const FAQ_ITEMS = [
  {
    question: 'Что такое Reword AI?',
    answer:
      'Reword AI — это интеллектуальный помощник для перефразирования текста на русском языке. Приложение использует искусственный интеллект для улучшения ваших текстов, исправления ошибок и изменения стиля.',
  },
  {
    question: 'Что входит в бесплатную версию?',
    answer:
      'Бесплатная версия включает 30 перефразирований в день, базовые режимы стиля и подсветку различий между исходным и результатом. Этого достаточно для повседневного использования.',
  },
  {
    question: 'Какие способы оплаты доступны?',
    answer:
      'На сайте доступна оплата через СБП (Систему быстрых платежей) и банковские карты (Visa, Mastercard, МИР). В мобильном приложении также доступна оплата через Google Play.',
  },
  {
    question: 'Подписка работает и в приложении, и на сайте?',
    answer:
      'Да! Используйте тот же Google-аккаунт для входа на сайте и в приложении. Подписка, оформленная на сайте, автоматически активируется в мобильном приложении.',
  },
  {
    question: 'Как отменить подписку?',
    answer:
      'Подписка, оформленная на сайте, не продлевается автоматически — она действует до конца оплаченного периода. Подписку через Google Play можно отменить в настройках Google Play Store.',
  },
  {
    question: 'Мои тексты сохраняются?',
    answer:
      'Нет. Мы не сохраняем ваши тексты на серверах. Все перефразирования обрабатываются в реальном времени, а персональные данные автоматически маскируются перед отправкой в AI.',
  },
  {
    question: 'Можно ли вернуть деньги?',
    answer:
      'Да, мы предоставляем возврат средств в течение 7 дней с момента оплаты, если вы недовольны сервисом. Обратитесь на support@reword-ai.ru с номером платежа.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24">
      <Container size="sm">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-text-primary sm:text-4xl">
            Частые вопросы
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Всё, что нужно знать о Reword AI
          </p>
        </div>

        <div className="mt-12 space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface overflow-hidden transition-colors hover:border-border-accent"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="pr-4 font-medium text-text-primary">
                  {item.question}
                </span>
                <svg
                  className={`h-5 w-5 shrink-0 text-text-tertiary transition-transform duration-200 ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openIndex === i && (
                <div className="border-t border-border/50 px-6 py-4">
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
