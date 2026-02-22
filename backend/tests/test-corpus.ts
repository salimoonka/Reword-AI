/**
 * Russian Paraphrase Quality Test Corpus
 * Contains sample texts and expected quality criteria for paraphrase modes
 * 
 * Used for manual and automated quality testing of the paraphrase service.
 * Each entry has: input text, mode, and quality criteria.
 */

export interface TestCase {
  id: string;
  description: string;
  input: string;
  mode: string;
  criteria: {
    mustContain?: string[];
    mustNotContain?: string[];
    maxLengthRatio?: number;
    minLengthRatio?: number;
    preserveLanguage?: 'ru' | 'mixed';
    preserveEnglishWords?: string[];
  };
}

export const testCorpus: TestCase[] = [
  // ─── Formal mode ──────────────────────────
  {
    id: 'formal-001',
    description: 'Simple greeting → formal',
    input: 'Привет! Как дела? Давно не виделись!',
    mode: 'formal',
    criteria: {
      mustNotContain: ['Привет'],
      preserveLanguage: 'ru',
    },
  },
  {
    id: 'formal-002',
    description: 'Informal request → formal business letter style',
    input: 'Слушай, можешь скинуть мне тот файл? Срочно надо, босс просит.',
    mode: 'formal',
    criteria: {
      mustNotContain: ['Слушай', 'скинуть', 'босс'],
      preserveLanguage: 'ru',
    },
  },
  {
    id: 'formal-003',
    description: 'Colloquial complaint → formal feedback',
    input: 'Этот товар полное барахло, деньги на ветер. Верните мне деньги!',
    mode: 'formal',
    criteria: {
      mustNotContain: ['барахло', 'на ветер'],
      preserveLanguage: 'ru',
    },
  },

  // ─── Friendly mode ──────────────────────────
  {
    id: 'friendly-001',
    description: 'Formal text → friendly',
    input: 'Уважаемые сотрудники, информирую вас о предстоящем совещании.',
    mode: 'friendly',
    criteria: {
      mustNotContain: ['Уважаемые'],
      preserveLanguage: 'ru',
    },
  },
  {
    id: 'friendly-002',
    description: 'Dry instructions → friendly guide',
    input: 'Для регистрации необходимо заполнить форму и предоставить документ.',
    mode: 'friendly',
    criteria: {
      preserveLanguage: 'ru',
    },
  },

  // ─── Shorten mode ──────────────────────────
  {
    id: 'shorten-001',
    description: 'Long paragraph → shortened',
    input: 'На данный момент мы находимся в процессе активного обсуждения различных вариантов и возможностей, которые могли бы быть применены для решения данной проблемы в ближайшем будущем.',
    mode: 'shorten',
    criteria: {
      maxLengthRatio: 0.75,
      preserveLanguage: 'ru',
    },
  },
  {
    id: 'shorten-002',
    description: 'Verbose email → concise',
    input: 'Я хотел бы с вашего позволения поинтересоваться, будет ли у вас свободное время в течение следующей недели, чтобы мы могли бы обсудить некоторые вопросы, которые я хотел бы с вами обсудить.',
    mode: 'shorten',
    criteria: {
      maxLengthRatio: 0.6,
      preserveLanguage: 'ru',
    },
  },

  // ─── Expand mode ──────────────────────────
  {
    id: 'expand-001',
    description: 'Short sentence → expanded',
    input: 'Проект завершён.',
    mode: 'expand',
    criteria: {
      minLengthRatio: 2.0,
      preserveLanguage: 'ru',
    },
  },
  {
    id: 'expand-002',
    description: 'Bullet point → full paragraph',
    input: 'Встреча в понедельник. Тема: бюджет.',
    mode: 'expand',
    criteria: {
      minLengthRatio: 1.5,
      preserveLanguage: 'ru',
    },
  },

  // ─── Professional mode ──────────────────────────
  {
    id: 'professional-001',
    description: 'Casual work message → professional',
    input: 'Ребят, проект горит, надо поднажать. Кто может помочь?',
    mode: 'professional',
    criteria: {
      mustNotContain: ['Ребят', 'горит', 'поднажать'],
      preserveLanguage: 'ru',
    },
  },

  // ─── Confident mode ──────────────────────────
  {
    id: 'confident-001',
    description: 'Uncertain proposal → confident',
    input: 'Может быть, мы могли бы попробовать сделать это по-другому? Не уверен, но, кажется, это может сработать.',
    mode: 'confident',
    criteria: {
      mustNotContain: ['Может быть', 'Не уверен', 'кажется'],
      preserveLanguage: 'ru',
    },
  },

  // ─── Colloquial mode ──────────────────────────
  {
    id: 'colloquial-001',
    description: 'Formal document → colloquial',
    input: 'Настоящим сообщаем о необходимости предоставления вышеуказанных документов в установленные сроки.',
    mode: 'colloquial',
    criteria: {
      mustNotContain: ['Настоящим', 'вышеуказанных'],
      preserveLanguage: 'ru',
    },
  },

  // ─── Empathetic mode ──────────────────────────
  {
    id: 'empathetic-001',
    description: 'Dry rejection → empathetic',
    input: 'Ваша заявка отклонена. Причина: несоответствие требованиям.',
    mode: 'empathetic',
    criteria: {
      preserveLanguage: 'ru',
    },
  },

  // ─── Mixed language preservation ──────────────────────────
  {
    id: 'mixed-001',
    description: 'Text with English terminology',
    input: 'Добавь middleware для logging и error handling в Express.js приложение.',
    mode: 'formal',
    criteria: {
      preserveLanguage: 'mixed',
      preserveEnglishWords: ['middleware', 'logging', 'error handling', 'Express.js'],
    },
  },
  {
    id: 'mixed-002',
    description: 'Tech text with English abbreviations',
    input: 'Запусти CI/CD pipeline и задеплой на staging сервер.',
    mode: 'professional',
    criteria: {
      preserveLanguage: 'mixed',
      preserveEnglishWords: ['CI/CD', 'pipeline', 'staging'],
    },
  },

  // ─── PII handling (should mask and restore) ──────────────────────────
  {
    id: 'pii-001',
    description: 'Text with phone number should preserve PII after paraphrase',
    input: 'Позвоните мне по номеру +7 999 123-45-67 для обсуждения деталей.',
    mode: 'formal',
    criteria: {
      mustContain: ['+7 999 123-45-67'],
      preserveLanguage: 'ru',
    },
  },
  {
    id: 'pii-002',
    description: 'Text with email should preserve PII after paraphrase',
    input: 'Отправьте отчёт на user@example.com до конца дня.',
    mode: 'professional',
    criteria: {
      mustContain: ['user@example.com'],
      preserveLanguage: 'ru',
    },
  },

  // ─── Edge cases ──────────────────────────
  {
    id: 'edge-001',
    description: 'Very short text (1 word)',
    input: 'Здравствуйте',
    mode: 'friendly',
    criteria: {
      preserveLanguage: 'ru',
    },
  },
  {
    id: 'edge-002',
    description: 'Punctuation-heavy text',
    input: 'Что?! Серьёзно??? Нет, нет, нет... Это невозможно!!!',
    mode: 'formal',
    criteria: {
      preserveLanguage: 'ru',
    },
  },
  {
    id: 'edge-003',
    description: 'Text with emojis',
    input: 'Супер новость! 🎉 Проект запущен 🚀 и всё работает 💯',
    mode: 'professional',
    criteria: {
      preserveLanguage: 'ru',
    },
  },
];

export default testCorpus;
