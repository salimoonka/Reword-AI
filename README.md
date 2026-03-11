# ✨ Reword AI — Умная русская клавиатура с ИИ

<p align="center">
  <strong>Перефразируйте текст в одно касание. Прямо с клавиатуры.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/React%20Native-0.81-61dafb" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo%20SDK-54-000020" alt="Expo" />
  <img src="https://img.shields.io/badge/AI-DeepSeek%20V3-green" alt="AI" />
  <img src="https://img.shields.io/badge/License-Proprietary-red" alt="License" />
</p>

---

## 🎯 О проекте

**Reword AI** — это полноценная клавиатура для Android и iOS, которая позволяет мгновенно перефразировать текст с помощью искусственного интеллекта. Никаких копирований, переключений между приложениями или долгих ожиданий — просто пишите, выделяйте и получайте улучшенный текст за секунды.

> *«Писать грамотно и красиво — легко, когда ИИ всегда под рукой»*

---

## 🚀 Ключевые возможности

### 🎹 Клавиатура нового поколения
- **Полноценная русская клавиатура** — ЙЦУКЕН-раскладка с автокоррекцией
- **Встроенная панель ИИ** — кнопка перефразирования прямо над клавишами
- **Работает в любом приложении** — мессенджеры, соцсети, почта, браузер
- **Двойная раскладка** — русский и английский (QWERTY) с переключением
- **Эмодзи-панель** — поиск по ключевым словам на русском и английском

### 🧠 8 режимов перефразирования
| Режим | Описание |
|-------|----------|
| ✂️ **Сократить** | Убирает воду, оставляет суть |
| 📝 **Расширить** | Добавляет детали и объём |
| 👔 **Формальный** | Деловой стиль для писем и документов |
| 😊 **Дружелюбный** | Тёплый, неформальный тон |
| 🎯 **Простой** | Понятный язык без сложных оборотов |
| 💼 **Деловой** | Профессиональный бизнес-стиль |
| 🎨 **Креативный** | Яркие метафоры и оригинальные формулировки |
| ✅ **Грамматика** | Исправление ошибок без изменения стиля |

### 🔒 Приватность на первом месте
- **PII-маскирование** — телефоны, email, ИНН, паспорта автоматически маскируются перед отправкой на ИИ-сервер
- **Не храним тексты** — после обработки запроса текст не сохраняется на серверах
- **Токены в Keychain / EncryptedSharedPreferences** — аутентификация защищена на уровне ОС
- **SSL Certificate Pinning** — защита от перехвата трафика
- **RLS-политики** — каждый пользователь видит только свои данные

### 💎 PRO-подписка
- **7 дней бесплатно** — полный доступ без ограничений
- **Безлимитные генерации** — перефразируйте сколько угодно текстов
- **Приоритетная обработка** — ваши запросы первые в очереди
- **Все 8 режимов** — полный набор стилей
- **Без рекламы** — чистый интерфейс
- **3 способа оплаты**: Google Play, App Store, ЮKassa (для РФ)

---

## 🏗 Архитектура

```
┌────────────────────────────────────────────────────────┐
│                    Mobile App (Expo)                    │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ React    │  │  Keyboard    │  │  Subscription    │ │
│  │ Native   │  │  Extension   │  │  (react-native-  │ │
│  │ Screens  │  │  (Kotlin/    │  │   iap)           │ │
│  │          │  │   Swift)     │  │                  │ │
│  └─────┬────┘  └──────┬───────┘  └────────┬─────────┘ │
│        │              │                    │           │
│        └──────────────┼────────────────────┘           │
│                       │                                │
└───────────────────────┼────────────────────────────────┘
                        │ HTTPS (TLS 1.3 + Cert Pinning)
                        ▼
┌───────────────────────────────────────────────────────┐
│              Backend (Fastify + TypeScript)            │
│  ┌────────────┐  ┌───────────┐  ┌─────────────────┐  │
│  │ Auth (JWT  │  │ Paraphrase│  │ Subscription    │  │
│  │  JWKS)     │  │ + PII     │  │ Verification    │  │
│  │            │  │ Masking   │  │ (Google/Apple)  │  │
│  └─────┬──────┘  └─────┬─────┘  └────────┬────────┘  │
│        │              │                   │           │
└────────┼──────────────┼───────────────────┼───────────┘
         │              │                   │
         ▼              ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│   Supabase   │  │  OpenRouter  │  │ Google Play /    │
│  (Auth +     │  │  (DeepSeek   │  │ App Store /      │
│   Postgres)  │  │   V3, GPT-4o)│  │ YooKassa API     │
└──────────────┘  └──────────────┘  └──────────────────┘
```

---

## 🛠 Технологический стек

### Mobile (React Native + Expo SDK 54)
| Технология | Назначение |
|-----------|-----------|
| React Native 0.81 | Кроссплатформенный UI |
| Expo SDK 54 | Сборка, OTA-обновления, навигация |
| Expo Router v4 | Файловая навигация |
| Zustand + AsyncStorage | Управление состоянием с персистентностью |
| expo-secure-store | Безопасное хранение токенов |
| react-native-iap | Покупки в приложении |
| Kotlin (Android) | Нативная клавиатура InputMethodService |
| Swift (iOS) | Нативное расширение клавиатуры |

### Backend (Node.js 22 + Fastify 5)
| Технология | Назначение |
|-----------|-----------|
| Fastify 5.7 | HTTP-сервер с автоматической валидацией |
| TypeScript 5.9 | Типобезопасность |
| Supabase JS | Клиент базы данных и аутентификации |
| jose | JWT-верификация (JWKS, P-256) |
| googleapis | Google Play Developer API |
| Pino | Структурированное логирование |
| Vitest | 168+ юнит/интеграционных тестов |

### Infrastructure
| Сервис | Назначение |
|--------|-----------|
| Supabase | PostgreSQL + Auth + RLS |
| Render.com | Хостинг бэкенда |
| OpenRouter | LLM API (DeepSeek V3, GPT-4o-mini fallback) |
| EAS Build | CI/CD для мобильного приложения |
| Google Play Console | Публикация Android |
| App Store Connect | Публикация iOS |

---

## 📱 Структура проекта

```
reword-ai/
├── mobile/               # React Native + Expo приложение
│   ├── app/              # Экраны (Expo Router)
│   │   ├── (tabs)/       # Главные табы (Editor, Settings, Subscription)
│   │   ├── auth/         # Аутентификация (Google, Email, Guest)
│   │   ├── onboarding/   # Онбординг (3 экрана)
│   │   └── subscription/ # Модальная страница подписки
│   ├── src/
│   │   ├── components/   # Переиспользуемые компоненты
│   │   ├── hooks/        # Хуки (тема, клавиатура, цвета)
│   │   ├── services/     # API, IAP, Supabase
│   │   ├── stores/       # Zustand (user, settings, subscription)
│   │   └── theme/        # Дизайн-система (цвета, типографика)
│   ├── plugins/
│   │   ├── withAndroidKeyboard.js  # Expo config plugin
│   │   └── keyboard-src/           # Исходники нативной клавиатуры
│   └── ios/              # Нативный iOS-код (клавиатура)
├── backend/              # Fastify API-сервер
│   ├── src/
│   │   ├── routes/       # HTTP-маршруты (health, v1/*)
│   │   ├── services/     # Бизнес-логика (PII-маскирование, LLM)
│   │   ├── plugins/      # Fastify-плагины (auth)
│   │   └── utils/        # Утилиты (кеш, логгер)
│   └── tests/            # Vitest тесты (168+)
├── website/              # Next.js лендинг + подписка через ЮKassa
├── supabase/             # Миграции БД (6 файлов)
└── Docs/                 # Документация проекта
```

---

## ⚡ Быстрый старт

### Предварительные требования
- Node.js 22+
- npm 10+
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (для Android) или Xcode (для iOS)

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/salimoon/reword-ai.git
cd reword-ai

# Мобильное приложение
cd mobile
npm install
npx expo prebuild
npx expo start

# Бэкенд
cd ../backend
npm install
npm run dev

# Веб-сайт
cd ../website
npm install
npm run dev
```

### Переменные окружения

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
OPENROUTER_API_KEY=your-openrouter-key
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
APPLE_SHARED_SECRET=your-apple-secret
YOOKASSA_SHOP_ID=your-shop-id
YOOKASSA_SECRET_KEY=your-yookassa-key
```

**Mobile** (`mobile/.env`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://your-backend.onrender.com
```

---

## 🧪 Тестирование

```bash
cd backend

# Запуск всех тестов
npm test

# С покрытием
npm run test:coverage

# Конкретный тест
npx vitest run tests/unit/auth-security.test.ts
```

**168+ тестов** покрывают: аутентификацию, HMAC-верификацию веб-хуков, PII-маскирование, rate limiting, валидацию deep-link URI, схемы API.

---

## 🔐 Безопасность

- **JWT JWKS (P-256)** — верификация токенов через публичные ключи Supabase
- **SHA-256 хеширование** — кеш токенов не хранит оригиналы
- **RLS-политики** — Row Level Security на каждой таблице
- **PII-маскирование** — автоматическая маскировка персональных данных
- **HMAC-SHA-256** — обязательная верификация веб-хуков ЮKassa
- **EncryptedSharedPreferences** (Android) — шифрованное хранилище
- **iOS Keychain** — системное безопасное хранилище
- **Certificate Pinning** — защита от MITM-атак
- **Rate Limiting** — защита от злоупотреблений API

---

## 📊 База данных

6 миграций PostgreSQL с полным набором RLS-политик:

| Таблица | Назначение |
|---------|-----------|
| `users` | Профили пользователей |
| `notes` | Сохранённые тексты |
| `subscriptions` | Статус подписок |
| `usage_stats` | Статистика использования |
| `feedback` | Отзывы пользователей |
| `external_payments` | Платежи через ЮKassa |

---

## 📈 Монетизация

| Канал | Рынок | Процессинг |
|-------|-------|-----------|
| Google Play Billing | Глобальный | Google Play Developer API |
| App Store IAP | Глобальный | App Store Server API v2 |
| ЮKassa | Россия | Webhook + HMAC верификация |

---

## 📚 Документация

- [Product Requirements](./Docs/PRD.md)
- [Technical Stack](./Docs/TechStack.md)
- [Implementation Guide](./Docs/Implementation.md)
- [Development Setup](./Docs/DEVELOPMENT.md)
- [UI/UX Specification](./Docs/UI_UX_doc.md)
- [Supabase Setup](./Docs/SUPABASE_SETUP_GUIDE.md)

---

## 👤 Автор

**Salimoon** — Full-stack разработчик

## 📄 Лицензия

Proprietary. Все права защищены.

Proprietary - All rights reserved
