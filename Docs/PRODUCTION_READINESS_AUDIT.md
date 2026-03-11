# Аудит готовности к продакшену — Reword AI

> Дата: Июль 2025
> Версия: 1.0.0

---

## Итоговая таблица

| Область | Статус | Комментарий |
|---------|--------|-------------|
| Конфигурация приложения | ⚠️ WARNING | Плейсхолдеры в eas.json (submit секция) |
| Android сборка | ⚠️ WARNING | Release использует debug keystore |
| Безопасность | ⚠️ WARNING | Anon key в eas.json (перенести в EAS Secrets) |
| Deep Linking | ✅ OK | Настроен корректно с валидацией |
| Обработка ошибок | ⚠️ WARNING | Нет crash-репортинга (Sentry / Bugsnag) |
| Производительность | ✅ OK | Hermes, R8, PNG crunching включены |
| Соответствие сторам | ⚠️ WARNING | Privacy policy URL не прописан в app.json |
| Конфигурация бэкенда | ✅ OK | CORS, rate limit, security headers |
| Переменные окружения | ✅ OK | `.env` не в репозитории, примеры есть |
| Тестирование | ⚠️ WARNING | Тесты есть, пороги покрытия не настроены |
| Ассеты | ✅ OK | Все иконки на месте |
| Keyboard Plugin | ✅ OK | Подключён корректно для production |
| Supabase | ✅ OK | RLS-политики, миграции организованы |

---

## 1. Конфигурация приложения — ⚠️

### app.json
- ✅ **Версия**: `1.0.0`
- ✅ **Bundle ID (iOS)**: `com.rewordai.app`
- ✅ **Package (Android)**: `com.rewordai.app`
- ✅ **Scheme**: `rewordai` (для deep linking)
- ✅ **Иконки/Splash**: Все файлы присутствуют в `mobile/assets/`
- ✅ **Плагины**: expo-router, expo-secure-store, expo-font, withAndroidKeyboard, expo-web-browser
- ✅ **EAS Project ID**: Настроен
- ✅ **New Architecture**: Включена

### eas.json
- ✅ **Профили сборки**: development, preview, production
- ⚠️ **Submit → iOS**: Плейсхолдеры `your-apple-id@example.com` и `your-app-store-connect-app-id`
- ⚠️ **Submit → Android**: `track: "internal"` — для релиза сменить на `"production"`
- ⚠️ **Production buildType**: `"apk"` — для Google Play нужен `"aab"` (Android App Bundle)

### Действия:
1. Заменить плейсхолдеры Apple ID и ASC App ID
2. Сменить `buildType` production на `"aab"`
3. Сменить `track` на `"production"` при публикации

---

## 2. Android сборка — ⚠️

### build.gradle
- ✅ **versionCode**: `1`
- ✅ **versionName**: `1.0.0`
- ✅ **minSdkVersion / targetSdkVersion**: Из gradle.properties
- ✅ **R8 minification**: Включена для release
- ✅ **Resource shrinking**: Настроен

### gradle.properties
- ✅ **Hermes**: `hermesEnabled=true`
- ✅ **ABI**: `armeabi-v7a, arm64-v8a, x86, x86_64`
- ✅ **Edge-to-Edge**: Включён

### Проблема:
- ⚠️ **Release keystore**: Файл `build.gradle` использует `signingConfigs.debug` для release сборки

### Действия:
1. Сгенерировать release keystore:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore \
     -alias rewordai -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Загрузить keystore в EAS Credentials или настроить в `build.gradle`
3. При использовании EAS Build — EAS автоматически управляет signing, так что это проблема только для локальных сборок

---

## 3. Безопасность — ⚠️

### Секреты в коде
- ✅ **`.env` НЕ в репозитории** — `.gitignore` корректно исключает
- ✅ **`.env.example` и `.env.production.example`** — без реальных ключей
- ⚠️ **eas.json**: `EXPO_PUBLIC_SUPABASE_ANON_KEY` в открытом виде

> **Примечание**: Supabase Anon Key — это публичный ключ, безопасно использовать на клиенте. Однако для лучших практик рекомендуется использовать EAS Secrets.

### Мобильное приложение
- ✅ **Токены в SecureStore**: `access_token`, `refresh_token` хранятся через expo-secure-store
- ✅ **EXPO_PUBLIC переменные**: Только публично-безопасные значения
- ✅ **Token Refresh**: Реализован корректный JWT refresh flow
- ✅ **`__DEV__` gating**: Отладочный код загейтован

### .gitignore
- ✅ `.env`, `.env.local`, `.env.*.local` исключены
- ✅ `*.pem`, `*.p8`, `*.p12`, `*.key` исключены
- ✅ `secrets/` директория исключена

### Действия:
1. Перенести `EXPO_PUBLIC_SUPABASE_ANON_KEY` в EAS Secrets (опционально)
2. Добавить pre-commit hook для проверки секретов (например, `detect-secrets`)

---

## 4. Deep Linking — ✅

### Конфигурация
- ✅ **Scheme**: `rewordai://` в `app.json`
- ✅ **Redirect URLs** в Supabase config:
  - `rewordai://auth/callback` (мобильное приложение)
  - `exp://localhost:8081/--/auth/callback` (разработка)

### Реализация в `_layout.tsx`
- ✅ **getInitialURL**: Обработка cold start deep links
- ✅ **Event listener**: Обработка deep links при открытом приложении
- ✅ **UUID валидация**: Для редактора заметок
- ✅ **Проверка авторизации**: Не-auth deep links требуют авторизации

### Поддерживаемые маршруты:
| Deep Link | Экран |
|-----------|-------|
| `rewordai://settings` | Настройки |
| `rewordai://subscription` | Подписка |
| `rewordai://editor/:id` | Редактор (UUID) |
| `rewordai://keyboard-setup` | Онбординг клавиатуры |
| `rewordai://auth/callback` | OAuth callback |

---

## 5. Обработка ошибок — ⚠️

### Мобильное приложение
- ✅ **ErrorBoundary**: `src/components/common/ErrorBoundary.tsx`
- ✅ **getDerivedStateFromError**: Используется
- ✅ **Логирование ошибок**: Реализовано

### Бэкенд
- ✅ **Global error handler**: В `index.ts`
- ✅ **Stack traces только в dev**: Предотвращает утечку информации

### Недостаёт:
- ❌ **Crash-репортинг**: Не настроен (Sentry, Bugsnag, Crashlytics)

### Действия:
1. Установить Sentry:
   ```bash
   cd mobile && npx expo install @sentry/react-native
   ```
2. Инициализировать в `_layout.tsx`
3. Добавить Sentry DSN в переменные окружения

---

## 6. Производительность — ✅

- ✅ **Hermes Engine**: Включён (`hermesEnabled=true`)
- ✅ **New Architecture**: Включена (`newArchEnabled: true`)
- ✅ **R8 minification**: Для release сборок
- ✅ **PNG crunching**: Включён
- ✅ **Resource shrinking**: Настроен
- ✅ **Backend warm-up**: Вызов `/health` при запуске для пробуждения Render free tier

---

## 7. Соответствие сторам — ⚠️

### Политика конфиденциальности
- ✅ **Документ**: `Docs/privacy-policy.md` — полный, на русском
- ✅ **PII маскирование**: Задокументировано (телефоны, email, карты, паспорта, ИНН, СНИЛС)
- ✅ **Дата вступления**: Июнь 2025
- ⚠️ **Не привязан к приложению**: URL privacy policy не настроен в app.json

### Описания для сторов
- ✅ **`Docs/store-descriptions.md`**: Полные описания для App Store и Google Play на русском
- ✅ **8 режимов перефразирования**: Задокументированы
- ✅ **Модель Free + Pro**: 199 ₽/месяц

### Действия:
1. Разместить privacy policy на домене (уже на сайте — `/legal/privacy`)
2. Добавить URL в описание в сторах
3. Подготовить скриншоты для каждого стора (не менее 3 для Google Play, 5 для App Store)
4. Заполнить анкету «App Privacy» (Data Safety) в Google Play Console

---

## 8. Конфигурация бэкенда — ✅

### Безопасность
- ✅ **Helmet**: Security headers в `index.ts`
- ✅ **CORS**: Ограничен известными origins (`reword-website.onrender.com`, `reword-ai.onrender.com`)
- ✅ **Rate Limiting**: 100 запросов/минуту по умолчанию
- ✅ **Проверка переменных**: Выбрасывает ошибку при отсутствии обязательных переменных в production

### Dockerfile
- ✅ **Multi-stage build**: Отдельные стадии builder и production
- ✅ **Non-root user**: `appuser`
- ✅ **Health check**: Настроен
- ✅ **Минимальный образ**: `node:22-alpine`
- ✅ **Без dev-зависимостей**: `npm ci --omit=dev`

---

## 9. Переменные окружения — ✅

### Backend (обязательные)
| Переменная | Обязательна | Описание |
|-----------|-------------|----------|
| `SUPABASE_URL` | Да | URL Supabase проекта |
| `SUPABASE_SERVICE_KEY` | Да | Service role key |
| `OPENROUTER_API_KEY` | Да | API ключ для перефразирования |
| `REDIS_URL` | Нет | Для кеширования (опционально) |
| `RATE_LIMIT_MAX` | Нет | Лимит запросов (default: 100) |
| `FREE_PARAPHRASES_LIMIT` | Нет | Бесплатный лимит (default: 30) |

### Backend (платёжные — опциональные)
| Переменная | Описание |
|-----------|----------|
| `APPLE_SHARED_SECRET` | Apple IAP валидация |
| `APPLE_ISSUER_ID` | App Store Connect API |
| `APPLE_KEY_ID` | App Store Connect API |
| `APPLE_PRIVATE_KEY` | App Store Connect API |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google Play billing |
| `YOOKASSA_SHOP_ID` | ЮKassa магазин |
| `YOOKASSA_SECRET_KEY` | ЮKassa ключ |

### Mobile (через EAS)
| Переменная | Описание |
|-----------|----------|
| `EXPO_PUBLIC_API_URL` | URL бэкенда |
| `EXPO_PUBLIC_SUPABASE_URL` | URL Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Публичный ключ Supabase |

---

## 10. Тестирование — ⚠️

### Мобильные тесты (Jest + jest-expo)
```
__tests__/components/  — 6 тестов (Button, Card, ErrorBoundary, ModeSelector, QuotaExceededModal, TextInput)
__tests__/hooks/       — 2 теста (useApi, useQuotaCheck)
__tests__/stores/      — 4 теста (useNotesStore, useSettingsStore, useSubscriptionStore, useUserStore)
```
**Итого: 12 тестовых файлов**

### Бэкенд тесты (Vitest)
- `tests/pii-masker.test.ts` — PII маскирование
- `tests/unit/` — Unit тесты
- `tests/integration/` — Интеграционные тесты
- **168 тестов проходят** (проверено в предыдущих сессиях)

### Недостаёт:
- ⚠️ Пороги покрытия не настроены
- ⚠️ Coverage report не генерируется в CI

### Действия:
1. Настроить пороги покрытия в `jest.config.js` и `vitest.config.ts`
2. Добавить `--coverage` в CI pipeline

---

## 11. Ассеты — ✅

Все необходимые файлы в `mobile/assets/`:
- ✅ `icon.png` — Основная иконка (1024×1024)
- ✅ `adaptive-icon.png` — Android adaptive icon
- ✅ `splash-icon.png` — Splash screen
- ✅ `favicon.png` — Web favicon

---

## 12. Keyboard Plugin — ✅

### `plugins/withAndroidKeyboard.js`
- ✅ **Регистрация сервиса**: RewordKeyboardService в AndroidManifest
- ✅ **Разрешения**: INTERNET, VIBRATE, RECORD_AUDIO
- ✅ **Защита от дублирования**: Guard на повторный запуск плагина
- ✅ **InputMethod binding**: Правильный intent filter
- ✅ **Gradle-зависимости**: Kotlin coroutines, Gson, security-crypto
- ✅ **Копирование нативных файлов**: Kotlin исходники → generated Android project

---

## 13. Supabase — ✅

### Миграции
```
001_initial_schema.sql              — Основная схема БД
002_rls_policies.sql                — Row Level Security
003_subscription_schema_update.sql  — Таблицы подписок
004_external_payments.sql           — Внешние платежи (ЮKassa)
005_fix_external_payments_rls.sql   — Фикс RLS для платежей
006_fix_security_definer_auth.sql   — Фикс SECURITY DEFINER (DB-01)
```

### Безопасность
- ✅ **RLS**: Включён на всех таблицах
- ✅ **Service role ограничения**: SECURITY DEFINER функции
- ✅ **Redirect URLs**: Настроены для mobile и web

---

## Чеклист перед публикацией

### P0 — Критические (обязательно перед релизом)

- [ ] Заменить плейсхолдеры в `eas.json` (Apple ID, ASC App ID)
- [ ] Сменить `buildType` на `"aab"` для production профиля
- [ ] Добавить `rewordai://auth/callback` в Supabase Dashboard → Redirect URLs
- [ ] Подготовить скриншоты для Google Play (минимум 3) и App Store (минимум 5)
- [ ] Заполнить Data Safety в Google Play Console
- [ ] Проверить, что privacy policy доступна по URL

### P1 — Важные (рекомендуется перед релизом)

- [ ] Установить и настроить Sentry для crash-репортинга
- [ ] Перенести `EXPO_PUBLIC_SUPABASE_ANON_KEY` из `eas.json` в EAS Secrets
- [ ] Настроить пороги покрытия тестами
- [ ] Создать release keystore для локальных сборок (EAS управляет автоматически)

### P2 — Желательные (после релиза)

- [ ] Добавить pre-commit hook для проверки секретов
- [ ] Настроить CI/CD pipeline с тестами и coverage
- [ ] Добавить E2E тесты (Detox / Maestro)
- [ ] Настроить A/B тестирование через Remote Config
- [ ] Подключить аналитику (Firebase Analytics / Amplitude)
