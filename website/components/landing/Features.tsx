import Container from '../layout/Container';
import Card from '../ui/Card';

const FEATURES = [
  {
    icon: '✨',
    title: 'Умное перефразирование',
    description:
      'AI анализирует контекст и подбирает наиболее подходящие синонимы и конструкции.',
  },
  {
    icon: '🎨',
    title: '5 режимов стиля',
    description:
      'Формальный, неформальный, академический, простой и креативный стили на выбор.',
  },
  {
    icon: '⌨️',
    title: 'Клавиатура',
    description:
      'Встроенная клавиатура для перефразирования прямо в любом приложении на Android.',
  },
  {
    icon: '🔍',
    title: 'Подсветка изменений',
    description:
      'Наглядное сравнение исходного и результата с цветовой подсветкой различий.',
  },
  {
    icon: '🛡️',
    title: 'Конфиденциальность',
    description:
      'Тексты не сохраняются на серверах. Персональные данные автоматически маскируются.',
  },
  {
    icon: '⚡',
    title: 'Мгновенный результат',
    description:
      'Интеллектуальное кеширование обеспечивает мгновенный отклик для повторных запросов.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24">
      <Container size="lg">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-text-primary sm:text-4xl">
            Всё для идеальных текстов
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Мощные инструменты для работы с текстом, доступные на мобильном
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Card
              key={feature.title}
              className="group hover:border-border-accent animate-fade-in-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-muted text-2xl transition-transform group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
