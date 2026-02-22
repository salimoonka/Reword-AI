# Supabase & Production Setup Guide — Reword AI

> Пошаговая инструкция по настройке Supabase, Google OAuth, и деплою backend для продакшена.

---

## 1. Supabase Dashboard — базовая настройка

### 1.1 Убедитесь, что проект создан

Ваш Supabase проект:
- **URL**: `https://wlmfsohrvcxatgnwezfy.supabase.co`
- **Anon Key**: уже используется в `mobile/.env`

### 1.2 Получите ключи (для backend)

1. Откройте **Supabase Dashboard** → ваш проект
2. Перейдите в **Settings → API**
3. Скопируйте **service_role key** (секретный, НИКОГДА не кладите в клиентский код)
   - Используйте его как `SUPABASE_SERVICE_KEY` на backend

> ℹ️ `SUPABASE_JWT_SECRET` **не нужен** — ваш проект использует **ECC P-256** (асимметричный алгоритм). Backend верифицирует токены через публичный ключ JWKS (`/auth/v1/.well-known/jwks.json`) — секрет не нужен.

### 1.3 Миграции базы данных

> **Уже применены!** Проверено через MCP — таблицы `profiles`, `subscriptions`, `usage_log`, `paraphrase_cache` созданы, RLS включён, все функции и триггеры на месте.

Если нужно пересоздать с нуля, используйте файлы из **`backend/supabase/migrations/`** (НЕ из корневой `supabase/migrations/`):

```bash
# Через Supabase Dashboard → SQL Editor, выполните по порядку:
# 1. backend/supabase/migrations/001_initial_schema.sql
# 2. backend/supabase/migrations/002_rls_policies.sql
# 3. backend/supabase/migrations/003_subscription_schema_update.sql (опционально)
```

> ⚠️ НЕ используйте файлы с TypeScript-комментариями (`//`). SQL поддерживает только `--` комментарии.

---

## 2. Google OAuth — настройка провайдера

### 2.1 Google Cloud Console

1. Перейдите на [console.cloud.google.com](https://console.cloud.google.com)
2. Создайте проект (или выберите существующий)
3. Перейдите в **APIs & Services → OAuth consent screen**
   - Тип: **External**
   - Название приложения: `Reword AI`
   - Email: ваш email
   - Домен: `wlmfsohrvcxatgnwezfy.supabase.co`
   - Сохраните

### 2.2 Создайте OAuth Credentials

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Тип: **Web application**
3. Название: `Reword AI (Supabase)`
4. **Authorized redirect URIs** — добавьте:
   ```
   https://wlmfsohrvcxatgnwezfy.supabase.co/auth/v1/callback
   ```
5. Сохраните → скопируйте **Client ID** и **Client Secret**

### 2.3 Включите Google Provider в Supabase

1. Supabase Dashboard → **Authentication → Providers**
2. Найдите **Google** → Enable
3. Вставьте **Client ID** и **Client Secret** из шага 2.2
4. **Authorized Client IDs (for native apps)**: если планируете нативный Google Sign-In через `expo-auth-session`, добавьте:
   - iOS Client ID (из Google Cloud Console, тип iOS)
   - Android Client ID (тип Android, вводите SHA-1 сертификата)
5. Сохраните

### 2.4 Настройте Redirect URLs в Supabase

1. Supabase Dashboard → **Authentication → URL Configuration**
2. **Site URL**: `rewordai://auth/callback`
3. **Additional Redirect URLs** — добавьте все:
   ```
   rewordai://auth/callback
   rewordai://**
   exp://192.168.1.216:8081/--/auth/callback
   http://localhost:8081/auth/callback
   ```
   > Первые два — для продакшен билдов. Последние два — для Expo Go (разработка).

### 2.5 Проверка OAuth потока

Как работает авторизация:
1. Приложение вызывает `supabase.auth.signInWithOAuth({ provider: 'google' })`
2. Supabase возвращает URL → приложение открывает браузер
3. Пользователь выбирает Google аккаунт
4. Google редиректит на `https://wlmfsohrvcxatgnwezfy.supabase.co/auth/v1/callback`
5. Supabase обрабатывает → редирект на `rewordai://auth/callback`
6. Deep link возвращает в приложение → сессия создаётся автоматически

---

## 3. Backend — деплой на Render

### 3.1 Создайте Web Service на Render

1. Перейдите на [render.com](https://render.com) → New → Web Service
2. Подключите Git-репозиторий или используйте Docker:
   - **Root Directory**: `backend`
   - **Runtime**: Docker (Dockerfile уже есть)
   - Или Node: Build Command = `npm install && npm run build`, Start Command = `npm start`
3. **Instance Type**: Free (для тестов) или Starter ($7/мес)

### 3.2 Environment Variables на Render

Добавьте следующие переменные окружения:

| Переменная | Значение | Описание |
|---|---|---|
| `NODE_ENV` | `production` | — |
| `PORT` | `3000` | Render обычно назначает свой порт через `PORT` |
| `SUPABASE_URL` | `https://wlmfsohrvcxatgnwezfy.supabase.co` | URL проекта |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | **service_role key** из Supabase Dashboard |
| `SUPABASE_ANON_KEY` | `eyJ...` | anon key (тот же что в мобилке) |
| `OPENROUTER_API_KEY` | `sk-or-...` | Ключ OpenRouter API |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | (по умолчанию) |
| `FREE_PARAPHRASES_LIMIT` | `5` | Лимит бесплатных парафраз |
| `RATE_LIMIT_MAX` | `100` | Запросов в минуту |

> ⚠️ **Не ставьте** `REDIS_URL` если не планируете Redis-кеширование.

### 3.3 Получите URL деплоя

После деплоя Render выдаст URL, например:
```
https://reword-ai.onrender.com
```

Проверьте что backend работает:
```bash
curl https://reword-ai.onrender.com/health
# Ожидаемый ответ: {"status":"ok","timestamp":"...","version":"1.0.0"}
```

### 3.4 Обновите `eas.json` (уже сделано)

В файле `mobile/eas.json` production и preview профили уже настроены:
```json
"EXPO_PUBLIC_API_URL": "https://reword-ai.onrender.com"
```

Если URL отличается — обновите его в `eas.json` → `build.preview.env` и `build.production.env`.

---

## 4. Мобильное приложение — конфигурация

### 4.1 Файл `.env` (локальная разработка)

```env
# Для физического устройства — IP вашего компьютера
EXPO_PUBLIC_API_URL=http://192.168.1.216:3000

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://wlmfsohrvcxatgnwezfy.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...полный_ключ...
```

### 4.2 Deep Link схема

В `app.json` уже настроена:
```json
"scheme": "rewordai"
```

Это работает для OAuth callback: `rewordai://auth/callback`

### 4.3 EAS Build для тестирования

```bash
cd mobile

# Preview-сборка (APK для Android)
npx eas build --profile preview --platform android

# Production
npx eas build --profile production --platform android
```

---

## 5. Checklist перед запуском

- [ ] Supabase миграции применены (все 3 файла)
- [ ] Google OAuth provider включён в Supabase Dashboard
- [ ] Redirect URLs настроены (rewordai://auth/callback, exp://...)
- [ ] Backend задеплоен на Render
- [ ] `SUPABASE_SERVICE_KEY` установлен на Render
- [ ] `OPENROUTER_API_KEY` установлен на Render
- [ ] Health check проходит: `curl <backend-url>/health`
- [ ] `eas.json` содержит правильный `EXPO_PUBLIC_API_URL`
- [ ] Тестовая сборка установлена на физическом устройстве
- [ ] Google Sign-In работает (откроет браузер → вернётся в приложение)
- [ ] Email OTP работает (код приходит на почту → вход работает)
- [ ] Anonymous skip работает

---

## 6. Troubleshooting

### Google OAuth не редиректит обратно в приложение
- Убедитесь что `rewordai://auth/callback` добавлен в **Supabase → Authentication → URL Configuration → Additional Redirect URLs**
- Проверьте что `app.json` содержит `"scheme": "rewordai"`
- На Android: проверьте intent filter для deep link

### Ошибка JWT verification failed на backend
- Ваш проект использует **ECC P-256** (asymmetric). Backend читает публичный ключ автоматически чеႈез JWKS
- JWKS endpoint: `https://wlmfsohrvcxatgnwezfy.supabase.co/auth/v1/.well-known/jwks.json`
- Никаких секретных ключей добавлять не нужно
- Проверьте доступность: `curl https://wlmfsohrvcxatgnwezfy.supabase.co/auth/v1/.well-known/jwks.json`

### 401 Unauthorized при запросах к API
- Проверьте что access_token передаётся в заголовке `Authorization: Bearer <token>`
- Проверьте что token не истёк (Supabase JWT live ~1 час)
- В dev: header `X-Dev-Mode: true` пропускает авторизацию

### cold start на Render (free tier)
- Free tier Render засыпает после 15 мин неактивности
- Первый запрос после сна: 30-60 секунд холодного старта
- Решение: Starter plan ($7/мес) или cron ping каждые 14 мин

### Текст не генерируется / пустой ответ
- Проверьте `OPENROUTER_API_KEY` на Render
- Проверьте баланс OpenRouter аккаунта
- Проверьте логи: Render Dashboard → Logs
