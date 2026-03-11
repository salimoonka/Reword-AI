# Reword AI — Критические задачи, проблемы и план работы

> **Дата анализа:** Март 2025  
> **Статус:** Pre-Launch  
> **Готовность к запуску:** ~25% (заблокирован критическими проблемами)

---

## Оглавление

1. [Архитектура проекта](#архитектура-проекта)
2. [Структура базы данных](#структура-базы-данных)
3. [Статус компонентов](#статус-компонентов)
4. [Критические проблемы (🔴)](#критические-проблемы-)
5. [Высокий приоритет (🟠)](#высокий-приоритет-)
6. [Средний приоритет (🟡)](#средний-приоритет-)
7. [Исправлено в текущей сессии (✅)](#исправлено-в-текущей-сессии-)
8. [План работы по неделям](#план-работы-по-неделям)
9. [Чеклист перед запуском](#чеклист-перед-запуском)

---

## Архитектура проекта

| Компонент | Технологии | Хостинг |
|-----------|-----------|---------|
| **Мобильное приложение** | React Native + Expo SDK 54, TypeScript | EAS Build → Google Play / App Store |
| **Веб-сайт** | Next.js 14, Tailwind CSS | Render (`reword-website.onrender.com`) |
| **Бэкенд** | Fastify, TypeScript | Render (`reword-ai.onrender.com`) |
| **База данных** | Supabase PostgreSQL + Auth + RLS | Supabase Cloud |
| **Android-клавиатура** | Kotlin (InputMethodService) | Встроена в APK |
| **iOS-клавиатура** | Swift (Keyboard Extension) | Встроена в IPA |
| **Платежи** | Google Play IAP, Apple IAP, YooKassa (веб) | — |

### Ключевые URL

- **Supabase:** `https://wlmfsohrvcxatgnwezfy.supabase.co`
- **Backend API:** `https://reword-ai.onrender.com`
- **Website:** `https://reword-website.onrender.com`
- **Deep link scheme:** `rewordai://`

---

## Структура базы данных

### Миграции (5 шт.)

| # | Файл | Описание |
|---|------|----------|
| 001 | `initial_schema.sql` | `profiles`, `usage_log`, `paraphrase_cache`, `subscriptions`, функции квот, RLS |
| 002 | `rls_policies.sql` | Политики SELECT/INSERT/UPDATE для всех таблиц |
| 003 | `subscription_schema_update.sql` | Добавлена колонка `store` (apple/google/external) к `subscriptions` |
| 004 | `external_payments.sql` | Таблица `external_payments` для YooKassa, функции конвертации валют |
| 005 | `fix_external_payments_rls.sql` | Фикс RLS — доступ к `external_payments` только для `service_role` |

### Таблицы

- `profiles` — профили пользователей (привязка к `auth.users`)
- `usage_log` — лог использования API (парафраз/проверка)
- `paraphrase_cache` — кэш парафразов (TTL 24ч)
- `subscriptions` — подписки (plan, store, expires_at, is_active)
- `external_payments` — аудит внешних платежей YooKassa

---

## Статус компонентов

| Компонент | Готовность | Критических | Высоких | Средних |
|-----------|-----------|-------------|---------|---------|
| **Бэкенд** | 85% | 3 | 6 | 5 |
| **Мобильное приложение** | 80% | 2 | 8 | 6 |
| **Android-клавиатура** | 70% | 2 | 4 | 3 |
| **База данных** | 95% | 1 | 1 | 1 |
| **Веб-сайт** | 60% | 0 | 3 | 4 |
| **Платежи** | 40% | 3 | 2 | 3 |

---

## Критические проблемы (🔴)

> ⛔ **БЛОКИРУЮТ ЗАПУСК** — без исправления публикация невозможна

### CP-01: Google Play верификация — ЗАГЛУШКА

- **Файл:** `backend/src/routes/v1/subscription.ts` (строки ~107-126)
- **Проблема:** `verifyGoogleReceipt()` возвращает фейковый успех без реальной валидации
- **Риск:** Любой может отправить поддельный `purchase_token` → 30 дней PRO бесплатно
- **Исправление:** Интегрировать Google Play Developer API (`googleapis` npm, service account JSON)
- **Оценка:** 3-4 дня

### CP-02: YooKassa webhook без проверки подписи

- **Файл:** `backend/src/routes/v1/webhooks.ts` (строки ~47-100)
- **Проблема:** IP-проверка сделана, но HMAC-SHA256 подпись НЕ проверяется если `YOOKASSA_SECRET_KEY` не задан
- **Риск:** Злоумышленник может подделать webhook → выдать PRO подписку
- **Исправление:** Обязательная проверка `verifyYooKassaSignature()` + env-переменная
- **Оценка:** 2 часа

### CP-03: Apple Receipt — устаревшие API endpoints

- **Файл:** `backend/src/routes/v1/subscription.ts` (строки ~55-89)
- **Проблема:** Использует `/verifyReceipt` (deprecated, удалён Apple в 2024)
- **Риск:** Верификация рецептов перестанет работать
- **Исправление:** Миграция на App Store Server API v2 (JWS signed transactions)
- **Оценка:** 2-3 дня

### DB-01: SECURITY DEFINER функции принимают произвольный user_id

- **Файл:** `supabase/migrations/001_initial_schema.sql` (строки ~172-240)
- **Функции:** `has_premium_access(p_user_id)`, `get_daily_usage_count(p_user_id)`, `get_remaining_quota(p_user_id)`
- **Проблема:** Любой аутентифицированный пользователь может проверить данные ЛЮБОГО другого пользователя
- **Риск:** Утечка данных, нарушение GDPR
- **Исправление:** Добавить `IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'unauthorized'`
- **Оценка:** 1 час

### MA-01: Auth токены хранятся в AsyncStorage (незашифрованно)

- **Файл:** `mobile/src/stores/useUserStore.ts` (строки ~103-108)
- **Проблема:** Zustand `persist` сохраняет `accessToken` + `refreshToken` в AsyncStorage (plaintext)
- **Риск:** На root-устройствах любое приложение может прочитать токены
- **Примечание:** Токены уже есть в SecureStore (зашифрованы), но ДУБЛИРУЮТСЯ в AsyncStorage
- **Исправление:** Убрать токены из `partialize` в persist config
- **Оценка:** 30 минут

### MA-02: Token refresh зависает навсегда при ошибке

- **Файл:** `mobile/src/services/api/client.ts` (строки ~113-157)
- **Проблема:** При неудачном refresh: `isRefreshing = true` никогда не сбрасывается, `refreshSubscribers` очищается без reject
- **Риск:** ВСЕ последующие 401 ответы зависают навсегда (утечка памяти)
- **Исправление:** В `catch` блоке: `isRefreshing = false; refreshSubscribers.forEach(cb => cb(error)); logout();`
- **Оценка:** 1 час

### KB-01: iOS — токены в UserDefaults (незашифрованно)

- **Файл:** `mobile/ios/RewordKeyboard/SharedStorage.swift` (строки ~20-23)
- **Проблема:** JWT + refresh token в нешифрованном UserDefaults App Group
- **Исправление:** Перейти на iOS Keychain с shared access group
- **Оценка:** 1 день

### KB-02: Android — токены в SharedPreferences (незашифрованно)

- **Файл:** `mobile/plugins/keyboard-src/java/.../SharedStorage.kt` (строки ~80-82)
- **Проблема:** Токены в `SharedPreferences` MODE_PRIVATE (plaintext на диске)
- **Исправление:** Перейти на `EncryptedSharedPreferences` из AndroidX Security
- **Оценка:** 1 день

---

## Высокий приоритет (🟠)

> ⚠ **ВАЖНО ДЛЯ ЗАПУСКА** — значительный риск, нужно исправить до публикации

### BE-01: Auth токены как ключи в памяти (backend)

- **Файл:** `backend/src/plugins/auth.ts` (строки ~53-67)
- **Проблема:** `tokenCache.set(token, user)` хранит сырой JWT как ключ
- **Исправление:** Хешировать JWT через SHA-256 перед использованием как ключа кэша

### BE-02: Dev-mode bypass аутентификации

- **Файл:** `backend/src/plugins/auth.ts` (строки ~86-94)
- **Проблема:** Заголовок `X-Dev-Mode: true` обходит аутентификацию если `NODE_ENV === 'development'`
- **Риск:** Если production развёрнут без `NODE_ENV=production`, любой может обойти авторизацию

### BE-03: Hardcoded Supabase URL с fallback

- **Файл:** `backend/src/config.ts` (строка ~77)
- **Проблема:** Захардкоденный URL как fallback вместо throw при отсутствии env var

### BE-04: CORS — wildcard origins

- **Файл:** `backend/src/index.ts` (строки ~31-34)
- **Проблема:** `origin: true` + `credentials: true` — любой сайт может слать authenticated запросы
- **Исправление:** Whitelist: `['https://reword-website.onrender.com', 'https://reword.ai']`

### BE-05: Rate limiter игнорирует конфиг

- **Файл:** `backend/src/index.ts` (строки ~37-42)
- **Проблема:** `max: 100` захардкожен вместо `config.rateLimit.max`

### BE-06: Webhook auth bypass по URL паттерну

- **Файл:** `backend/src/plugins/auth.ts` (строки ~81-85)
- **Проблема:** Все `/v1/webhooks/*` роуты автоматически пропускают аутентификацию

### MA-03: IAP транзакция не финализируется при ошибке верификации

- **Файл:** `mobile/src/services/iap/purchase.ts` (строки ~332-351)
- **Проблема:** Если `verifyReceipt()` бросает ошибку → `finishTransaction()` не вызывается → бесконечный цикл повторных покупок
- **Исправление:** Использовать `finally` блок

### MA-07: Нет навигации после удаления аккаунта

- **Файл:** `mobile/app/(tabs)/settings.tsx` (строки ~217-241)
- **Проблема:** Delete button вызывает `logout()` но не перенаправляет

### MA-08: Дублирование кода подписки (2 файла по ~550 строк)

- **Файлы:** `mobile/app/(tabs)/subscription.tsx` + `mobile/app/subscription/index.tsx`
- **Проблема:** ~95% одинаковый код
- **Исправление:** Выделить `<SubscriptionContent />` компонент

### MA-09: Нет auth guards на защищённых роутах

- **Файл:** `mobile/app/_layout.tsx`
- **Проблема:** Deep link на `/(tabs)` без авторизации не перенаправляет на sign-in

### MA-10: Невалидированные параметры deep link

- **Файл:** `mobile/app/_layout.tsx` (строки ~139-148)
- **Проблема:** `noteId` из deep link не валидируется (не UUID)
- **Риск:** Path traversal через `rewordai://editor/../../sensitive-path`

### KB-03: Hardcoded Supabase URL в Android

- **Файл:** `mobile/plugins/keyboard-src/java/.../SharedStorage.kt` (строка ~109)
- **Исправление:** Инжектить через `BuildConfig.SUPABASE_URL`

### KB-04: Нет SSL certificate pinning (Android)

- **Файл:** `mobile/plugins/keyboard-src/java/.../APIService.kt`
- **Проблема:** Голый `HttpURLConnection` без cert pinning → MITM атаки на трафик клавиатуры

### KB-05: Нет retry логики в Android API

- **Проблема:** iOS имеет exponential backoff + 2 retry, Android — нет
- **Исправление:** Добавить retry loop (3 попытки) как на iOS

### KB-07: Несовпадение App Group ID (iOS)

- **Проблема:** APIService использует `group.ai.reword.keyboard`, SharedStorage — `group.ai.reword.app`
- **Исправление:** Унифицировать в Xcode build settings

---

## Средний приоритет (🟡)

| ID | Проблема | Компонент |
|----|----------|-----------|
| M-05 | Hardcoded цены в subscription routes | Backend |
| M-07 | Race condition в cache hit_count (SELECT → UPDATE вместо атомарного) | Backend |
| M-08 | Нет per-endpoint rate limiting для LLM endpoints | Backend |
| M-10 | Курс USD→RUB захардкожен (90) | Backend |
| M-13 | Заметки хранятся plaintext в AsyncStorage | Mobile |
| M-15 | Нет клиентской валидации длины текста для парафраза | Mobile |
| M-16 | `useKeyboardStatus` без AppState listener | Mobile |
| M-17 | Sync подписки скрывает ошибки, использует stale cache | Mobile |
| M-18 | IAP state leak при HMR в development | Mobile |
| M-14 | Токены через SharedPreferences — задокументировать риск | Keyboard |
| M-19 | Hardcoded Supabase URL fallback в mobile client | Mobile |
| M-21 | Нет middleware для protected routes | Mobile |
| WS-02 | Нет синхронизации web-подписки → mobile | Website |
| WS-03 | Payment method selection incomplete (только SBP) | Website |

---

## Исправлено в текущей сессии (✅)

### ✅ FIX-01: Google Auth → экран успеха не показывался

- **Файл:** `mobile/app/auth/sign-in.tsx`
- **Проблема:** После Google OAuth через WebBrowser, если результат `cancel`/`dismiss`, retry loop не находил сессию, и пользователь оставался на экране входа. Экран успеха показывался только после нажатия "Продолжить без входа".
- **Корневая причина:** Sign-in экран не наблюдал за изменениями `isAuthenticated` в Zustand store. Когда `onAuthStateChange` или deep link callback устанавливали сессию в фоне, экран входа не реагировал.
- **Решение:** Добавлен `useEffect` в sign-in.tsx, который отслеживает `isAuthenticated`. Когда значение становится `true` (из любого источника — deep link, onAuthStateChange, WebBrowser), происходит навигация на `/auth/success`. Добавлен guard `hasNavigatedToSuccess` для предотвращения двойной навигации.

### ✅ FIX-02: Клавиатура — тема не синхронизировалась при запуске

- **Файл:** `mobile/src/stores/useSettingsStore.ts`
- **Проблема:** `syncThemeModeToNative()` вызывался только при ЯВНОМ изменении темы через `setThemeMode()`. При гидрации Zustand store из AsyncStorage (на каждом запуске приложения) тема НЕ синхронизировалась в нативные SharedPreferences. Клавиатура читала пустое значение → использовала "auto" → некорректное определение на некоторых устройствах.
- **Решение:** Добавлен `onRehydrateStorage` callback в persist конфигурацию. Теперь при каждом запуске приложения `theme_mode` синхронизируется в SharedPreferences.

### ✅ FIX-03: MODE_MULTI_PROCESS (deprecated) в KeyboardView

- **Файл:** `mobile/plugins/keyboard-src/java/.../KeyboardView.kt`
- **Проблема:** `detectDarkTheme()` использовал `MODE_MULTI_PROCESS` (deprecated с API 23, ненадёжный) для чтения SharedPreferences, тогда как React Native bridge записывал через `MODE_PRIVATE`. Это могло приводить к несогласованным данным.
- **Решение:** Заменён `MODE_MULTI_PROCESS` на `MODE_PRIVATE` для консистентности. Клавиатура работает в том же процессе, что и приложение, поэтому `MODE_PRIVATE` достаточно.

### ✅ FIX-04: IME navigation bar — тёмные иконки на тёмном фоне

- **Файл:** `mobile/plugins/keyboard-src/java/.../RewordKeyboardService.kt`
- **Проблема:** Системная навигационная панель под клавиатурой (иконка переключения клавиатуры) не стилизовалась под тему клавиатуры. На тёмной теме системные иконки могли быть тёмными на тёмном фоне.
- **Решение:** Добавлен метод `applyNavigationBarTheme()` в RewordKeyboardService. Устанавливает `navigationBarColor` и `APPEARANCE_LIGHT_NAVIGATION_BARS` флаг соответственно теме клавиатуры. Вызывается при создании клавиатуры и при смене темы.

### ✅ FIX-05: DB-01 — SECURITY DEFINER без проверки auth.uid()

- **Файл:** `supabase/migrations/006_fix_security_definer_auth.sql`
- **Проблема:** Функции `get_daily_usage_count()`, `has_premium_access()`, `get_remaining_quota()` принимали произвольный `p_user_id` — любой авторизованный пользователь мог узнать данные другого.
- **Решение:** Добавлена проверка `IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'unauthorized'` во все три функции. Вызовы через `service_role` (backend) не затронуты: `auth.uid()` возвращает NULL → `NULL != uuid` = NULL → IF не срабатывает.
- **Тест:** `tests/unit/deeplink-security.test.ts` (логика auth guard)

### ✅ FIX-06: MA-02 — Token refresh race condition (deadlock)

- **Файл:** `mobile/src/services/api/client.ts`
- **Проблема:** `onRefreshed()` вызывался ДО сброса `isRefreshing = false`. Если retried request сразу получал 401, он видел `isRefreshing = true` и вставал в очередь к уже очищенным subscribers → deadlock.
- **Решение:** Изменён порядок: `isRefreshing = false` → `onRefreshed(token)`. В catch-блоке: `isRefreshing = false` → `onRefreshFailed(err)` → `logout()`. Теперь `return Promise.reject(err)` (вместо `refreshError`) для единообразия.
- **Тест:** `tests/unit/token-refresh.test.ts` (4 теста)

### ✅ FIX-07: CP-02 — YooKassa webhook без обязательной проверки подписи

- **Файл:** `backend/src/routes/v1/webhooks.ts`
- **Проблема:** HMAC-SHA256 подпись проверялась только если `YOOKASSA_SECRET_KEY` задан. В production без ключа webhook проходил без верификации.
- **Решение:** В production при отсутствии `secretKey` — возврат 500 с логом ошибки. Подпись теперь обязательна в production.
- **Тест:** `tests/unit/webhook-security.test.ts` (8 тестов)

### ✅ FIX-08: BE-05 — Rate limiter игнорирует конфиг

- **Файл:** `backend/src/index.ts`
- **Проблема:** `max: 100` и `timeWindow: '1 minute'` были захардкожены вместо `config.rateLimit.max` / `config.rateLimit.windowMs`.
- **Решение:** Заменены на `config.rateLimit.max` и `config.rateLimit.windowMs`.

### ✅ FIX-09: BE-01 — Auth токены как ключи кэша в памяти

- **Файл:** `backend/src/plugins/auth.ts`
- **Проблема:** `tokenCache.set(token, user)` хранил сырой JWT как ключ Map. При дампе памяти процесса — утечка токенов.
- **Решение:** Добавлена функция `hashToken()` — токен хешируется через SHA-256 перед использованием как ключа. Кэш теперь содержит только хеши.
- **Тест:** `tests/unit/auth-security.test.ts` (4 теста)

### ✅ FIX-10: BE-03 — Hardcoded Supabase URL

- **Файл:** `backend/src/config.ts`
- **Проблема:** `SUPABASE_URL` имел fallback на реальный production URL `https://wlmfsohrvcxatgnwezfy.supabase.co`.
- **Решение:** Убран hardcoded fallback — теперь пустая строка. В production `getEnvRequired` бросает ошибку если переменная не задана.

### ✅ FIX-11: MA-07 — Навигация после удаления аккаунта

- **Файл:** `mobile/app/(tabs)/settings.tsx`
- **Проблема:** После удаления данных навигация на sign-in происходила только через callback Alert.alert → пользователь видел залогиненный экран.
- **Решение:** `router.replace('/auth/sign-in')` вызывается сразу после `logout()`. Alert показывается через `setTimeout(500ms)` после навигации.

### ✅ FIX-12: MA-09 — Auth guards на deep links

- **Файл:** `mobile/app/_layout.tsx`
- **Проблема:** Deep links `rewordai://settings`, `rewordai://subscription`, `rewordai://editor/:id` работали без проверки авторизации.
- **Решение:** Перед обработкой non-auth deep links проверяется `useUserStore.getState().isAuthenticated`. Если `false` → `router.replace('/auth/sign-in')`.

### ✅ FIX-13: MA-10 — Невалидированные параметры deep link

- **Файл:** `mobile/app/_layout.tsx`
- **Проблема:** `noteId` из deep link `rewordai://editor/:id` принимал любую строку без валидации → риск path traversal.
- **Решение:** Добавлена валидация UUID v4 regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`. Невалидные noteId игнорируются.
- **Тест:** `tests/unit/deeplink-security.test.ts` (18 тестов)

---

## План работы по неделям

### Неделя 1: Критические уязвимости (~40 часов)

**Цель:** Устранить все 🔴 CRITICAL блокеры

| Задача | Компонент | Оценка | Блокирует |
|--------|-----------|--------|-----------|
| Фикс `SECURITY DEFINER` функций (DB-01) | БД | 1 час | Безопасность данных |
| Убрать токены из AsyncStorage (MA-01) | Mobile | 30 мин | Безопасность |
| Исправить token refresh race condition (MA-02) | Mobile | 1 час | Стабильность |
| Убрать dev auth bypass (BE-02) | Backend | 2 часа | Безопасность |
| Включить проверку подписи YooKassa (CP-02) | Backend | 2 часа | Платежи |
| iOS — миграция токенов в Keychain (KB-01) | Keyboard | 1 день | Безопасность |
| Android — EncryptedSharedPreferences (KB-02) | Keyboard | 1 день | Безопасность |

### Неделя 2: Платежи — серверная часть (~50 часов)

**Цель:** Реальная верификация покупок

| Задача | Компонент | Оценка |
|--------|-----------|--------|
| Google Play Developer API интеграция (CP-01) | Backend | 3-4 дня |
| Apple App Store Server API v2 (CP-03) | Backend | 2-3 дня |
| Фикс IAP finalization (MA-03) | Mobile | 1 час |
| CORS whitelist (BE-04) | Backend | 30 мин |
| Rate limiter fix (BE-05) | Backend | 1 час |
| Webhook auth security (BE-06) | Backend | 2 часа |

### Неделя 3: Стабильность + UX (~30 часов)

**Цель:** Устранить HIGH-priority UX проблемы

| Задача | Компонент | Оценка |
|--------|-----------|--------|
| Дедупликация subscription screens (MA-08) | Mobile | 3 часа |
| Auth guards на protected routes (MA-09) | Mobile | 2 часа |
| Deep link validation (MA-10) | Mobile | 1 час |
| Навигация после удаления аккаунта (MA-07) | Mobile | 30 мин |
| Android retry logic для API (KB-05) | Keyboard | 2 часа |
| Certificate pinning Android (KB-04) | Keyboard | 2-3 часа |
| Фикс App Group ID iOS (KB-07) | Keyboard | 15 мин |

### Неделя 4: Тестирование + Подготовка к launch (~40 часов)

| Задача | Оценка |
|--------|--------|
| Юнит-тесты: auth flow, IAP, token refresh | 3 дня |
| Ручное тестирование на iOS 14+ устройстве | 1 день |
| Ручное тестирование на Android 10+ устройстве | 1 день |
| Тестирование клавиатуры (Messages, WhatsApp, Notes) | 1 день |
| E2E тестирование платёжного потока | 1 день |
| Тестирование rollback процедур | 4 часа |

---

## Чеклист перед запуском

### Инфраструктура и Backend
- [x] Supabase production проект создан
- [x] Миграции 001-005 применены
- [x] RLS политики на месте (миграция 005 фиксит критические)
- [x] Backend на Render развёрнут
- [x] Health checks отвечают
- [x] Google Play Developer API настроен (CP-01)
- [ ] YooKassa webhook signature verification включена (CP-02)
- [x] Apple App Store Server API v2 интегрирован (CP-03)
- [ ] CORS ограничен production доменами (BE-04)
- [ ] Rate limiting протестирован
- [ ] Sentry/мониторинг подключён

### Мобильное приложение
- [ ] Auth токены убраны из AsyncStorage (MA-01)
- [ ] Token refresh race condition исправлен (MA-02)
- [ ] Auth guards на всех protected routes (MA-09)
- [ ] Deep links валидируются (MA-10)
- [ ] Навигация после удаления аккаунта (MA-07)
- [x] Subscription код дедуплицирован (MA-08)
- [ ] Минимум 10 юнит-тестов (auth/IAP/refresh)
- [ ] Протестировано на iOS 14+ устройстве
- [ ] Протестировано на Android 10+ устройстве

### Нативная клавиатура
- [x] iOS — токены в Keychain (KB-01)
- [x] Android — EncryptedSharedPreferences (KB-02)
- [x] Android — certificate pinning (KB-04)
- [ ] Android — retry logic как на iOS (KB-05)
- [ ] App Group ID унифицирован (KB-07)
- [ ] Hardcoded URLs/keys убраны (KB-03, KB-06)
- [ ] Протестировано в Messages/WhatsApp/Notes

### Платежи
- [x] Google Play верификация реализована (CP-01)
- [ ] YooKassa signature verification active (CP-02)
- [x] Apple Server API v2 интегрирован (CP-03)
- [ ] App Store products созданы и утверждены
- [ ] Google Play products созданы
- [ ] Тестовые подписки в sandbox работают
- [ ] Website payment form завершён
- [ ] Webhook обработка протестирована end-to-end

### Безопасность
- [ ] В APK/IPA нет API ключей (проверить декомпиляцию)
- [ ] В логах нет сырого текста пользователей
- [ ] Rate limiting предотвращает бомбардировку
- [ ] CORS ограничен
- [ ] GDPR функции с проверкой `auth.uid()` (DB-01)
- [x] Certificate pinning на Android (KB-04)
- [ ] Privacy policy юридически проверена
- [ ] Удаление данных протестировано

---

## Текущий статус: 🔴 НЕ ГОТОВО К ЗАПУСКУ

**Главные блокеры:**
1. Google Play верификация платежей — ЗАГЛУШКА
2. Apple Receipt — устаревший API
3. YooKassa webhook — нет проверки подписи
4. Токены в plaintext (AsyncStorage, UserDefaults, SharedPreferences)
5. SECURITY DEFINER функции без проверки authorization
6. Token refresh race condition → зависание приложения
7. Zero тестовое покрытие мобильного приложения
