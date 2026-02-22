# Reword AI — Руководство по сборке APK

> Все сборки выполняются через **Expo Application Services (EAS)** в облаке.
> Локальный Android SDK/Gradle **не требуется**.

---

## Содержание

1. [Требования](#1-требования)
2. [Первоначальная настройка](#2-первоначальная-настройка)
3. [Профили сборки](#3-профили-сборки)
4. [Сборка APK (preview)](#4-сборка-apk-preview)
5. [Продакшн сборка (AAB)](#5-продакшн-сборка-aab)
6. [Скачивание готового APK](#6-скачивание-готового-apk)
7. [Просмотр истории сборок](#7-просмотр-истории-сборок)
8. [Переменные окружения](#8-переменные-окружения)
9. [Частые ошибки и решения](#9-частые-ошибки-и-решения)
10. [Чек-лист перед сборкой](#10-чек-лист-перед-сборкой)

---

## 1. Требования

| Инструмент | Версия | Установка |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| EAS CLI | 14.0.0+ | `npm install -g eas-cli` |
| Expo аккаунт | — | https://expo.dev (аккаунт: **salimoon**) |
| Git | любая | https://git-scm.com |

> **Локально НЕ нужны:** Android Studio, Java JDK, Gradle, Kotlin.

---

## 2. Первоначальная настройка

### 2.1 Установить EAS CLI

```bash
npm install -g eas-cli
```

### 2.2 Войти в Expo аккаунт

```bash
eas login
# Введи: логин salimoon, пароль
```

Проверить что залогинен:

```bash
eas whoami
# Должно показать: salimoon
```

### 2.3 Перейти в папку mobile

```bash
cd "e:\Reword Ai\mobile"
# или на Mac/Linux:
cd ~/path/to/reword-ai/mobile
```

### 2.4 Установить зависимости (если не установлены)

```bash
npm install
```

---

## 3. Профили сборки

Профили определены в файле [mobile/eas.json](../mobile/eas.json):

| Профиль | Тип файла | Назначение | Команда |
|---|---|---|---|
| `preview` | **APK** | Тестирование на устройстве, внутренний дистриб. | `eas build --profile preview --platform android` |
| `production` | **APK** | Публичный релиз (пока APK, не AAB) | `eas build --profile production --platform android` |
| `development` | APK debug | Expo Dev Client для разработки | `eas build --profile development --platform android` |

> **Для тестирования всегда используй `preview`** — даёт APK который можно сразу установить на телефон.

---

## 4. Сборка APK (preview)

### Команда:

```bash
cd "e:\Reword Ai\mobile"
npx eas build --profile preview --platform android
```

### С флагом `--non-interactive` (для CI / без подтверждений):

```bash
npx eas build --profile preview --platform android --non-interactive
```

### Что происходит после запуска:

1. EAS CLI загружает код на серверы Expo
2. На сервере Expo запускается сборка (занимает **5–15 минут**)
3. В терминале появится ссылка на страницу сборки:
   ```
   Build details: https://expo.dev/accounts/salimoon/projects/RewordApp/builds/xxxxxxxx
   ```
4. После завершения — там же будет ссылка на скачивание APK

### Пример вывода успешной сборки:

```
✓ Build finished
APK: https://expo.dev/artifacts/eas/xxxxxxxx.apk
```

---

## 5. Продакшн сборка (AAB)

> Для публикации в Google Play нужен **AAB** (Android App Bundle).
> Сейчас в `production` профиле настроен тип `apk` — при необходимости меняется в `eas.json`.

```bash
npx eas build --profile production --platform android --non-interactive
```

---

## 6. Скачивание готового APK

### Вариант A — Через браузер (самый простой):

1. Открыть https://expo.dev → войти как **salimoon**
2. Projects → **RewordApp** → Builds
3. Найти последнюю сборку → кнопка **Download**

### Вариант B — Через EAS CLI:

```bash
# Посмотреть последние сборки
npx eas build:list --platform android --limit 5

# Скачать артефакт (URL из output выше)
curl -L "https://expo.dev/artifacts/eas/XXXX.apk" -o reword-preview.apk
```

### Вариант C — QR-код для установки на телефон:

На странице сборки в Expo Dashboard есть QR-код — отсканируй с Android-телефона для прямой установки.

---

## 7. Просмотр истории сборок

```bash
# Последние 5 сборок Android
npx eas build:list --platform android --limit 5

# Только последняя
npx eas build:list --platform android --limit 1
```

Или в браузере: https://expo.dev/accounts/salimoon/projects/reword-ai/builds

---

## 8. Переменные окружения

Все переменные уже вшиты в `eas.json` для каждого профиля:

| Переменная | Значение |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://reword-ai.onrender.com` |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://wlmfsohrvcxatgnwezfy.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | (задан в eas.json) |

> Редактировать переменные: файл `mobile/eas.json`, секция `build → preview → env`.
>
> После изменения — просто запусти новую сборку, изменения подхватятся автоматически.

---

## 9. Частые ошибки и решения

### ❌ `Not logged in`
```bash
eas login
```

### ❌ `eas-cli` устарел
```bash
npm install -g eas-cli@latest
```

### ❌ `Invalid EAS project ID`
```bash
# Убедись что находишься в папке mobile/
cd "e:\Reword Ai\mobile"
npx eas build --profile preview --platform android
```

### ❌ `Build failed: Gradle error`
1. Открыть ссылку на сборку в браузере
2. Нажать **View logs** → найти строки `ERROR` или `FAILURE`
3. Чаще всего: проблема в Kotlin-коде клавиатуры — проверить `mobile/plugins/keyboard-src/`

### ❌ `Build failed: Duplicate class`
Обычно означает конфликт зависимостей в Android. Проверить `mobile/android/app/build.gradle`.

### ❌ `Quota exceeded` на EAS Free
EAS Free даёт ~30 сборок в месяц. Если лимит исчерпан — нужно подождать до следующего месяца или перейти на платный план.

---

## 10. Чек-лист перед сборкой

Перед запуском новой сборки убедись что:

- [ ] Все изменения закоммичены в Git:
  ```bash
  git add .
  git commit -m "fix: описание изменений"
  git push origin main
  ```
- [ ] Нет TypeScript ошибок (опционально):
  ```bash
  cd "e:\Reword Ai\mobile"
  npx tsc --noEmit
  ```
- [ ] Версия приложения обновлена (при необходимости) в `mobile/app.json`:
  ```json
  "version": "1.0.1",
  "android": { "versionCode": 2 }
  ```
- [ ] Залогинен в EAS:
  ```bash
  eas whoami  # должен показать: salimoon
  ```

---

## Быстрый старт (после всего настроено)

```bash
# 1. Перейти в папку
cd "e:\Reword Ai\mobile"

# 2. Запустить сборку
npx eas build --profile preview --platform android --non-interactive

# 3. Открыть ссылку из вывода в браузере → скачать APK
```

Сборка занимает **5–15 минут**. Ссылка на APK придёт в терминал и будет доступна на https://expo.dev.

---

*Последнее обновление: 22 февраля 2026*
