# Reword AI — Полный аудит безопасности и качества кода

> **Дата:** 2026-02-28  
> **Область:** Весь проект — backend, mobile, native keyboards, Supabase, инфраструктура  
> **Общее количество находок:** 107

---

## Сводка по критичности

| Критичность | Кол-во | Описание |
|-------------|--------|----------|
| 🔴 CRITICAL | **8** | Заглушки платежей, захардкоженные ключи, токены в AsyncStorage, RLS без ограничений |
| 🟠 HIGH | **21** | Auth bypass, CORS, race conditions, отсутствие верификации, дублирование кода |
| 🟡 MEDIUM | **42** | Отсутствие accessibility, hardcoded URL, stub UI, no i18n, конфиг ошибки |
| 🟢 LOW | **36** | Качество кода, deprecated API, пустые директории, минорные edge cases |

---

## Содержание

1. [CRITICAL — Требуют немедленного исправления](#1-critical)
2. [HIGH — Высокий приоритет](#2-high)
3. [MEDIUM — Средний приоритет](#3-medium)
4. [LOW — Низкий приоритет](#4-low)
5. [Покрытие тестами](#5-тесты)
6. [Заглушки и placeholder-ы](#6-заглушки)
7. [Рекомендуемый порядок исправления](#7-план-действий)

---

## 1. CRITICAL

### C-01. Google Play верификация покупок — ЗАГЛУШКА
- **Файл:** `backend/src/routes/v1/subscription.ts` (строки 107–126)
- **Категория:** Безопасность / Заглушка
- **Описание:** `verifyGoogleReceipt()` **не проверяет ничего**. Любой произвольный `purchase_token` безусловно даёт 30 дней PRO-подписки. Комментарий `TODO: Implement proper Google Play Developer API verification`.
- **Риск:** Любой может получить бесплатную подписку, отправив фейковый токен.
- **Исправление:** Реализовать проверку через [Google Play Developer API `purchases.subscriptions.get`](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions).

### C-02. YooKassa webhook без проверки подписи / IP
- **Файл:** `backend/src/routes/v1/webhooks.ts` (строки 47–57)
- **Категория:** Безопасность
- **Описание:** Endpoint `/v1/webhooks/yookassa` принимает POST от любого IP без проверки HMAC-подписи. Комментарий "verified by IP / idempotency", но **верификация не реализована**.
- **Риск:** Атакующий может подделать webhook и выдать себе PRO-подписку.
- **Исправление:** Реализовать проверку IP (YooKassa публикует список) или HMAC-подпись тела запроса через `config.yookassa.secretKey`.

### C-03. Auth токены дублируются в незашифрованный AsyncStorage
- **Файл:** `mobile/src/stores/useUserStore.ts` (строки 103–108)
- **Категория:** Безопасность — хранение токенов
- **Описание:** `partialize` в Zustand persist сохраняет `accessToken` и `refreshToken` в **AsyncStorage** (plaintext на диске). Параллельно токены хранятся в `expo-secure-store` (зашифрованном), но AsyncStorage копия доступна любому приложению на рутированном устройстве.
- **Исправление:** Убрать `accessToken` и `refreshToken` из `partialize`. Использовать только SecureStore для токенов.

### C-04. Supabase anon key захардкожен в eas.json (3 профиля)
- **Файл:** `mobile/eas.json` (строки 11, 26, 40)
- **Категория:** Захардкоженные секреты
- **Описание:** Полный Supabase anon key (`eyJhbGciOiJIUzI1NiIs...`) закоммичен в репозиторий во всех трёх build-профилях (development, preview, production). Хотя anon key публичный, это создаёт паттерн, где секреты хранятся в VCS.
- **Исправление:** Перенести в EAS Secrets (`eas secret:create`), использовать через `%ENV_VAR%`.

### C-05. Supabase anon key захардкожен в Android APIService.kt
- **Файл:** `mobile/plugins/keyboard-src/java/ai/reword/keyboard/api/APIService.kt` (строка 24)
- **Категория:** Захардкоженные секреты
- **Описание:** Полный anon key вшит прямо в Kotlin код клавиатуры. Тривиально извлекается декомпиляцией APK.
- **Исправление:** Читать ключ из `BuildConfig.SUPABASE_ANON_KEY` (инжектить при билде) или из `SharedStorage`.

### C-06. Захардкоженный Supabase URL в config.ts бэкенда
- **Файл:** `backend/src/config.ts` (строка 77)
- **Категория:** Безопасность / Config
- **Описание:** Дефолт `SUPABASE_URL = 'https://wlmfsohrvcxatgnwezfy.supabase.co'`. Если переменная окружения не задана, приложение молча подключится к реальному проекту.
- **Исправление:** Убрать дефолт, падать при старте если `SUPABASE_URL` не установлен.

### C-07. RLS `external_payments` — INSERT/UPDATE без ограничений
- **Файл:** `supabase/migrations/004_external_payments.sql` (строки 84–91)
- **Категория:** RLS / Безопасность
- **Описание:** Политики INSERT и UPDATE для `external_payments` используют `WITH CHECK (true)` / `USING (true)` **без ограничения `TO service_role`**. Любой аутентифицированный пользователь может вставлять и обновлять записи платежей.
- **Исправление:** Добавить `TO service_role` к обеим политикам.

### C-08. Ноль тестов на экраны приложения
- **Файл:** `mobile/__tests__/`
- **Категория:** Тестирование
- **Описание:** Из 14 экранов (HomeScreen, SettingsScreen, SignInScreen, EditorScreen, Subscription, 4 onboarding) — **ни один не имеет ни одного теста**. Нет тестов на auth flow, deep links, IAP, навигацию.
- **Исправление:** Приоритетно добавить тесты на: auth flow, navigation guards, IAP purchase flow.

---

## 2. HIGH

### H-01. CORS wildcard — `origin: true`
- **Файл:** `backend/src/index.ts` (строки 31–34)
- **Описание:** `origin: true` с `credentials: true` позволяет ЛЮБОМУ сайту делать authenticated cross-origin запросы.
- **Исправление:** Ограничить список разрешённых origins.

### H-02. Dev Mode auth bypass через `X-Dev-Mode` header
- **Файл:** `backend/src/plugins/auth.ts` (строки 86–94)
- **Описание:** `X-Dev-Mode: true` полностью обходит аутентификацию. Защита только через `NODE_ENV === 'development'`. Если продакшн-деплой запустится без `NODE_ENV=production`, bypass активен.
- **Исправление:** Удалить или привязать к дополнительному флагу `ENABLE_DEV_AUTH=true`.

### H-03. JWT хранится как ключ в in-memory кэше
- **Файл:** `backend/src/plugins/auth.ts` (строки 53–67)
- **Описание:** `tokenCache` Map использует raw JWT строки как ключи. Memory dump = утечка всех активных токенов.
- **Исправление:** Хешировать JWT (SHA-256) и использовать хеш как ключ. Использовать LRU-кэш.

### H-04. Rate limiter игнорирует config.rateLimit
- **Файл:** `backend/src/index.ts` (строки 37–42)
- **Описание:** Захардкоженный `max: 100` вместо `config.rateLimit.max`. `userId` может не быть заполнен когда rate limiter запускается (зависит от порядка хуков).
- **Исправление:** Использовать `config.rateLimit.*` и проверить порядок хуков.

### H-05. Webhook URL-based auth skip вместо config-based
- **Файл:** `backend/src/plugins/auth.ts` (строки 81–85)
- **Описание:** Auth пропускается по `request.url.startsWith('/v1/webhooks/')`. Свойство `config: { skipAuth: true }` в роутах **не читается** — оно декоративное. Любой новый роут под `/v1/webhooks/` молча пропустит аутентификацию.
- **Исправление:** Реализовать проверку `skipAuth` в auth plugin.

### H-06. Apple Receipt — deprecated endpoint
- **Файл:** `backend/src/routes/v1/subscription.ts` (строки 55–89)
- **Описание:** Используются deprecated `buy.itunes.apple.com/verifyReceipt` endpoints. Apple перешла на App Store Server API v2.
- **Исправление:** Мигрировать на App Store Server API с JWS-verified transactions.

### H-07. logUsage в catch блоке может выбросить необработанное исключение
- **Файл:** `backend/src/routes/v1/paraphrase.ts` (строки 93–103)
- **Описание:** В catch блоке `await logUsage(...)` вызывается без обёртки в try-catch. Если Supabase недоступен, ошибка маскирует оригинальную.
- **Исправление:** Обернуть в `.catch(() => {})`.

### H-08. Token refresh — `isRefreshing` не сбрасывается при отсутствии refresh token
- **Файл:** `mobile/src/services/api/client.ts` (строки 113–157)
- **Описание:** Когда refresh token отсутствует, вызывается `logout()` но `isRefreshing` остаётся `true`, а `refreshSubscribers` не дренятся. Все последующие запросы с 401 повиснут навечно.
- **Исправление:** Сбросить `isRefreshing = false; refreshSubscribers = [];` перед logout.

### H-09. Queued requests при token refresh никогда не rejected
- **Файл:** `mobile/src/services/api/client.ts` (строки 153–157)
- **Описание:** В catch блоке refresh `refreshSubscribers = []` молча уничтожает все ожидающие промисы. Запросы повисают навечно, утечка памяти.
- **Исправление:** Reject каждый pending subscriber с ошибкой refresh.

### H-10. IAP транзакция не завершается при ошибке верификации
- **Файл:** `mobile/src/services/iap/purchase.ts` (строки 332–351)
- **Описание:** Если `verifyReceipt()` бросает ошибку, `finishTransaction()` не вызывается. Store будет повторно доставлять покупку при каждом запуске, вызывая петлю ошибок. На iOS это может заблокировать будущие покупки.
- **Исправление:** Вызывать `finishTransaction` в `finally` блоке.

### H-11. SharedStorage NativeModule вызовы без null-guard
- **Файл:** `mobile/src/native/SharedStorage.ts` (строки 52–196)
- **Описание:** Большинство методов вызывают `NativeModule.xxx()` напрямую. В Expo Go / web NativeModule = `undefined` → `TypeError`.
- **Исправление:** Добавить универсальную проверку `if (!NativeModule) throw/return`.

### H-12. Supabase client с пустым anon key fallback
- **Файл:** `mobile/src/services/supabase/client.ts` (строки 12–13)
- **Описание:** `SUPABASE_ANON_KEY || ''`. Пустой ключ → все auth операции молча fail.
- **Исправление:** Throw ошибку если ключ пуст в non-dev билдах.

### H-13. API base URL fallback на localhost в production
- **Файл:** `mobile/src/services/api/client.ts` (строка 18)
- **Описание:** `|| 'http://localhost:3000'`. В release билде без env var все запросы идут в никуда.
- **Исправление:** Throw в production, или hardcode production URL.

### H-14. Навигация после удаления данных — пользователь остаётся на Settings
- **Файл:** `mobile/app/(tabs)/settings.tsx` (строки 217–241)
- **Описание:** После `apiDelete('/v1/user/delete')` → `logout()`, но **нет навигации**. Пользователь остаётся на Settings в разлогиненном состоянии.
- **Исправление:** Добавить `router.replace('/auth/sign-in')` после logout.

### H-15. Дублирование кода подписки — два файла по 550 строк
- **Файлы:** `mobile/app/(tabs)/subscription.tsx` + `mobile/app/subscription/index.tsx`
- **Описание:** ~95% идентичный код в двух файлах. Любое изменение надо делать дважды.
- **Исправление:** Вынести в общий `<SubscriptionContent />` компонент.

### H-16. SECURITY DEFINER функции принимают чужой user_id
- **Файл:** `supabase/migrations/001_initial_schema.sql` (строки 172–240)
- **Описание:** `has_premium_access(p_user_id)`, `get_daily_usage_count(p_user_id)`, `get_remaining_quota(p_user_id)` — любой пользователь может узнать статус подписки и использование ЛЮБОГО другого пользователя.
- **Исправление:** Добавить `IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'unauthorized';`.

### H-17. Auth токены в iOS UserDefaults (клавиатура)
- **Файл:** `mobile/ios/RewordKeyboard/SharedStorage.swift` (строки 20–23)
- **Описание:** JWT и refresh token хранятся в UserDefaults App Group — не зашифровано.
- **Исправление:** Использовать iOS Keychain с shared access group.

### H-18. Auth токены в Android SharedPreferences (клавиатура)
- **Файл:** `mobile/plugins/keyboard-src/java/.../SharedStorage.kt` (строки 80–82)
- **Описание:** Токены в plain SharedPreferences (MODE_PRIVATE). На rooted устройствах доступны.
- **Исправление:** Использовать `EncryptedSharedPreferences` из AndroidX Security.

### H-19. Захардкоженный Supabase URL в Android SharedStorage
- **Файл:** `mobile/plugins/keyboard-src/java/.../SharedStorage.kt` (строка 109)
- **Описание:** `"https://wlmfsohrvcxatgnwezfy.supabase.co/functions"` — вшит в код.
- **Исправление:** Инжектить через `BuildConfig`.

### H-20. Нет SSL certificate pinning (Android keyboard)
- **Файл:** `mobile/plugins/keyboard-src/java/.../APIService.kt` (строки 81–85)
- **Описание:** Используется `HttpURLConnection` без cert pinning. MITM атака может перехватить весь трафик клавиатуры, включая токены и пользовательский текст.
- **Исправление:** Реализовать pinning через `network_security_config.xml`.

### H-21. Нет retry логики в Android APIService
- **Файл:** `mobile/plugins/keyboard-src/java/.../APIService.kt` (строки 46–123)
- **Описание:** В отличие от iOS (exponential backoff, 2 retry), Android не имеет retry. Любой transient failure → ошибка.
- **Исправление:** Реализовать retry с backoff по аналогии с iOS.

---

## 3. MEDIUM

### M-01. PII маскер INN паттерн слишком широкий
- **Файл:** `backend/src/services/pii/masker.ts` (строка 40)
- **Описание:** `\b\d{10,12}\b` матчит любое 10-12-значное число. Ложные срабатывания на телефоны, даты.
- **Исправление:** Добавить проверку контрольной суммы ИНН.

### M-02. PII unmask — неуникальные placeholder-ы
- **Файл:** `backend/src/services/pii/masker.ts` (строки 104–116)
- **Описание:** Если текст содержит два `[ТЕЛЕФОН]`, первый `indexOf` всегда найдёт первое вхождение → неправильная подстановка.
- **Исправление:** Нумерованные placeholder-ы: `[ТЕЛЕФОН_1]`, `[ТЕЛЕФОН_2]`.

### M-03. `preserveEnglishWords` — regex injection
- **Файл:** `backend/src/services/paraphrase/service.ts` (строки 157–165)
- **Описание:** Слово из текста напрямую интерполируется в RegExp. Сейчас ограничено `[a-zA-Z0-9]`, но хрупко.
- **Исправление:** Добавить regex-escape как defense-in-depth.

### M-04. Diff алгоритм O(n²) по памяти
- **Файл:** `backend/src/services/paraphrase/diff.ts` (строки 79–95)
- **Описание:** LCS DP-таблица для 10000 символьного лимита может быть очень большой.
- **Исправление:** Использовать Hirschberg или `diff-match-patch`.

### M-05. Захардкоженная цена 199₽ для подписок
- **Файл:** `backend/src/routes/v1/subscription.ts` (строки 185, 216)
- **Описание:** `priceAmount: 199` вшита в код. Если цена меняется, нужно обновлять бэкенд.
- **Исправление:** Получать из receipt или конфигурации.

### M-06. Supabase client с placeholder fallback
- **Файл:** `backend/src/services/supabase/client.ts` (строки 14–20)
- **Описание:** Если ключи не заданы → клиент создаётся с `'placeholder-key'`. Молча ломается в runtime.
- **Исправление:** Throw при старте в production.

### M-07. Race condition в incrementHitCount кэша
- **Файл:** `backend/src/services/cache/paraphrase-cache.ts` (строки 166–181)
- **Описание:** SELECT → UPDATE = classic read-modify-write race. Конкурентные запросы теряют инкремент.
- **Исправление:** Атомарный `hit_count = hit_count + 1` через RPC.

### M-08. Нет per-endpoint rate limiting для LLM
- **Файлы:** `backend/src/routes/v1/paraphrase.ts`, `check.ts`
- **Описание:** Глобальный лимит 100 req/min. LLM-вызовы дорогие — можно забомбить 100 раз за минуту.
- **Исправление:** Добавить 10 req/min на `/paraphrase` и `/check`.

### M-09. getGlobalTokenStats без access control
- **Файл:** `backend/src/services/billing/token-accounting.ts` (строки 115–155)
- **Описание:** Функция "admin only" без проверки роли. Если добавить роут, данные доступны всем.
- **Исправление:** Добавить role check перед вызовом.

### M-10. Курс USD→RUB захардкожен (90)
- **Файл:** `backend/src/services/billing/token-accounting.ts` (строка 108)
- **Исправление:** Env var или внешний API.

### M-11. `config.host` не используется — всегда 0.0.0.0
- **Файл:** `backend/src/index.ts` (строки 66–69)
- **Исправление:** `host: config.host`.

### M-12. Token cache hit count race condition
- (уже в M-07)

### M-13. Notes хранятся незашифрованно в AsyncStorage
- **Файл:** `mobile/src/stores/useNotesStore.ts` (строки 39–42)
- **Описание:** Текст заметок в plaintext на диске. На rooted устройствах доступен.
- **Исправление:** Шифровать или документировать как accepted risk.

### M-14. Auth токены в SharedPreferences для keyboard extension
- **Файл:** `mobile/src/native/SharedStorage.ts` (строки 52–69)
- **Описание:** Дизайн-компромисс — нужен shared доступ для клавиатуры. Документировать.

### M-15. Нет input validation на paraphrase/check запросы
- **Файл:** `mobile/src/services/api/paraphrase.ts` (строки 58–80)
- **Описание:** Пустой текст, слишком длинный текст — всё отправляется на сервер.
- **Исправление:** Клиентская валидация: trim, max length.

### M-16. useKeyboardStatus — нет AppState listener
- **Файл:** `mobile/src/hooks/useKeyboardStatus.ts` (строки 52–56)
- **Описание:** Статус проверяется только при mount. Если пользователь включит клавиатуру в Settings и вернётся — статус не обновится.
- **Исправление:** Добавить `AppState.addEventListener('change', ...)`.

### M-17. Subscription sync молча использует кэш при ошибке
- **Файл:** `mobile/src/stores/useSubscriptionStore.ts` (строки 106–112)
- **Описание:** Если sync fails, кэшированный `isPremium: true` сохраняется локально даже если подписка истекла.
- **Исправление:** Проверять `expiresAt` локально, даунгрейдить если в прошлом.

### M-18. IAP module-level mutable state — HMR leak
- **Файл:** `mobile/src/services/iap/purchase.ts` (строки 60–63)
- **Исправление:** Guard в `initIAP` для cleanup перед re-init.

### M-19. Hardcoded Supabase URL fallback в мобильном клиенте
- **Файл:** `mobile/src/services/supabase/client.ts` (строки 10–11)
- **Исправление:** Fail fast если env var пуст.

### M-20. Unvalidated deep link noteId
- **Файл:** `mobile/app/_layout.tsx` (строки 139–148)
- **Описание:** `noteId` из deep link не валидируется. `rewordai://editor/../../some-path` может внести unexpected params.
- **Исправление:** Валидировать как UUID.

### M-21. Нет auth guard на protected routes
- **Файл:** `mobile/app/_layout.tsx` (строки 57–67)
- **Описание:** Навигация только при mount (once). Deep link на `/(tabs)` пока юзер не залогинен — **нет middleware**.
- **Исправление:** Добавить route-level auth guard.

### M-22. Мёртвые ссылки ("условия использования") на sign-in
- **Файл:** `mobile/app/auth/sign-in.tsx` (строки 437–441)
- **Описание:** Текст стилизован как ссылки, но **нет onPress handler**. Apple/Google могут отклонить приложение.
- **Исправление:** Добавить `onPress` с `WebBrowser.openBrowserAsync(url)`.

### M-23. Race condition в auth flow — hardcoded 1500ms wait
- **Файл:** `mobile/app/auth/sign-in.tsx` (строки 209–222)
- **Описание:** После dismiss браузера ждёт 1.5s. На медленной сети сессия может не успеть; на быстрой — бессмысленная задержка.
- **Исправление:** Polling с exponential backoff или прямое ожидание `onAuthStateChange`.

### M-24. No user feedback при ошибке загрузки продуктов
- **Файлы:** `(tabs)/subscription.tsx` (75–80), `subscription/index.tsx` (72–78)
- **Описание:** Если IAP products не загрузились, пользователь видит бесконечный loader.
- **Исправление:** Показать error state с кнопкой retry.

### M-25. Нет origin validation на deep link callback
- **Файл:** `mobile/app/auth/callback.tsx` (строки 93–120)
- **Исправление:** Валидировать origin/scheme URL.

### M-26. Note "not found" — пустой editor
- **Файл:** `mobile/app/editor/[id].tsx` (строки 54–60)
- **Описание:** Если noteId не найден, рендерится пустой editor. Пользователь может "сохранить" с invalid ID.
- **Исправление:** Показать error state или redirect back.

### M-27. `has_premium_access()` — inconsistency между миграциями
- **Файлы:** `001_initial_schema.sql` vs `003_subscription_schema_update.sql`
- **Описание:** v1 считает `expires_at IS NULL` как premium (бесконечная подписка). v3 проверяет trial и plan, но зависит от порядка миграций.
- **Исправление:** В финальной версии требовать `expires_at IS NOT NULL`.

### M-28. Нет DELETE policy на usage_log
- **Файл:** `supabase/migrations/002_rls_policies.sql` (строки 62–79)
- **Исправление:** Добавить `POLICY FOR DELETE USING (false)` для explicit deny.

### M-29. `profiles` нет INSERT policy для пользователей
- **Файл:** `supabase/migrations/002_rls_policies.sql` (строки 18–49)
- **Описание:** Если trigger `handle_new_user()` fails, профиль не создастся и пользователь не сможет создать его сам.
- **Исправление:** Добавить fallback policy.

### M-30. Backend migration 004 использует `\i` (psql-only)
- **Файл:** `backend/supabase/migrations/004_external_payments.sql` (строка 8)
- **Исправление:** Дублировать SQL inline.

### M-31. No token refresh в iOS keyboard extension
- **Файл:** `mobile/ios/RewordKeyboard/APIService.swift` (строки 30–32)
- **Описание:** Клавиатура читает token из SharedStorage, но не умеет его обновлять.
- **Исправление:** Реализовать refresh или уведомлять пользователя.

### M-32. `exportData()` в SharedStorage утекает credentials
- **Файл:** `mobile/ios/RewordKeyboard/SharedStorage.swift` (строки 274–276)
- **Исправление:** Защитить `#if DEBUG`.

### M-33. `android:allowBackup="true"` — токены клавиатуры в backup
- **Файл:** `mobile/android/app/src/main/AndroidManifest.xml` (строка 15)
- **Исправление:** Исключить `reword_shared_prefs.xml` из backup rules.

### M-34. Избыточные permissions в AndroidManifest
- **Файл:** `mobile/android/app/src/main/AndroidManifest.xml` (строки 3–6)
- **Описание:** `READ/WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW` — не нужны клавиатуре.
- **Исправление:** Удалить для production.

### M-35. Debug keystore в репозитории
- **Файл:** `mobile/android/app/debug.keystore`
- **Исправление:** Добавить в `.gitignore`.

### M-36. Minification отключена для release builds
- **Файл:** `mobile/android/app/build.gradle` (строка 66)
- **Описание:** `enableMinifyInReleaseBuilds = false` → код тривиально декомпилируется.
- **Исправление:** Включить `= true`, добавить ProGuard rules.

### M-37. XML merge в config plugin использует хрупкий regex
- **Файл:** `mobile/plugins/withAndroidKeyboard.js` (строки 158–174)
- **Исправление:** Использовать XML-парсер.

### M-38. Все build profiles используют одинаковый API URL
- **Файл:** `mobile/eas.json`
- **Описание:** Dev, preview, production → один и тот же Supabase и API. Нет staging.
- **Исправление:** Разделить окружения.

### M-39. Email confirmations отключены
- **Файл:** `supabase/config.toml.example` (строка 23)
- **Описание:** `enable_confirmations = false`. Если так на production — можно создать аккаунт с любым email.
- **Исправление:** `true` для production.

### M-40. No Google OAuth в Supabase config
- **Файл:** `supabase/config.toml.example` (строки 26–29)
- **Исправление:** Добавить конфигурацию Google OAuth.

### M-41. Accessibility — ПОЛНОЕ ОТСУТСТВИЕ
- **Файлы:** Все 14+ экранов приложения
- **Описание:** **Ни один файл в приложении не содержит ни одного `accessibilityLabel`, `accessibilityRole` или `accessibilityHint`**. Приложение полностью недоступно для screen reader пользователей. Apple и Google требуют базовую accessibility.
- **Исправление:** Поэтапно добавить a11y props на все интерактивные элементы.

### M-42. Нет i18n — все строки захардкожены на русском
- **Файлы:** Все экраны
- **Исправление:** Внедрить `i18next` / `expo-localization`.

---

## 4. LOW

### L-01. Helmet CSP отключена — `contentSecurityPolicy: false`
- **Файл:** `backend/src/index.ts` (строки 27–29)

### L-02. /health/detailed без аутентификации
- **Файл:** `backend/src/routes/health.ts` (строки 43–59)
- **Описание:** Экспозит latency, uptime, версии, статусы таблиц.

### L-03. `paraphrase_cache` delete в user delete — нет `user_id` колонки
- **Файл:** `backend/src/routes/v1/user.ts` (строка 189)

### L-04. Нет explicit body size limit
- **Файл:** `backend/src/index.ts`

### L-05. Source maps в production Docker image
- **Файл:** `backend/tsconfig.json` (строка 16)

### L-06. `cleanOutput` regex может удалить легитимный контент
- **Файл:** `backend/src/services/llm/openrouter.ts` (строки 136–170)

### L-07. Error в check route — `inputHash` как `request_id`
- **Файл:** `backend/src/routes/v1/check.ts` (строка 89)

### L-08. Нет request ID propagation для tracing
- **Файлы:** Все route handlers бэкенда

### L-09. `utils/` директория пуста (backend)
- **Файл:** `backend/src/utils/`

### L-10. Нет timeout на Supabase операции
- **Файлы:** Все service файлы с `supabaseAdmin`

### L-11. onAuthStateChange subscription never unsubscribed
- **Файл:** `mobile/src/services/supabase/auth.ts` (строка 121)

### L-12. `syncApiBaseUrl()` side-effect при import
- **Файл:** `mobile/src/stores/useUserStore.ts` (строка 52)

### L-13. `useApi` hook теряет type safety
- **Файл:** `mobile/src/hooks/useApi.ts` (строка 67)

### L-14. Hardcoded colors в ErrorBoundary
- **Файл:** `mobile/src/components/common/ErrorBoundary.tsx` (строки 68–93)

### L-15. Hardcoded color в QuotaExceededModal
- **Файл:** `mobile/src/components/common/QuotaExceededModal.tsx` (строка 78)

### L-16. `any` typed API response в paraphrase service
- **Файл:** `mobile/src/services/api/paraphrase.ts` (строка 73)

### L-17. HTTP 403 маппится на UNAUTHORIZED вместо FORBIDDEN
- **Файл:** `mobile/src/utils/errors.ts` (строка 91)

### L-18. `checkText` reuses paraphrase error message
- **Файл:** `mobile/src/services/api/paraphrase.ts` (строки 89–91)

### L-19. Supabase anon key отправляется на non-Supabase backend
- **Файл:** `mobile/src/services/api/client.ts` (строка 33)

### L-20. Dynamic `require()` в settings store
- **Файл:** `mobile/src/stores/useSettingsStore.ts` (строка 46)

### L-21. Magic number 999999 для "unlimited"
- **Файл:** `mobile/src/stores/useSubscriptionStore.ts` (строки 61, 104, 121)

### L-22. Dev logging может утечь данные
- **Файл:** `mobile/src/services/api/client.ts` (строки 25–28)

### L-23. `isUserCancelledError` с `catch (error: any)`
- **Файл:** `mobile/src/services/iap/purchase.ts` (строка 193)

### L-24. 6 пустых директорий
- `mobile/src/components/notes/`, `onboarding/`, `settings/`, `ui/`, `services/storage/`, `types/`

### L-25. Placeholder illustration на Welcome screen
- **Файл:** `mobile/app/onboarding/welcome.tsx` (строка 56)

### L-26. Placeholder скриншот на enable-keyboard
- **Файл:** `mobile/app/onboarding/enable-keyboard.tsx` (строки 83–87)

### L-27. Unvalidated remote image URL (avatar)
- **Файл:** `mobile/app/(tabs)/settings.tsx` (строка 103)

### L-28. Division by zero в quota progress bar
- **Файл:** `mobile/app/(tabs)/settings.tsx` (строка 180)

### L-29. Timeout vs processing race в auth callback
- **Файл:** `mobile/app/auth/callback.tsx` (строки 157–168)

### L-30. Auto-save edge case — последний edit может не сохраниться
- **Файл:** `mobile/app/editor/[id].tsx` (строки 85–93)

### L-31. Нет maxLength на TextInput в editor
- **Файл:** `mobile/app/editor/[id].tsx` (строки 100–125)

### L-32. `.bak` файл в source tree
- **Файл:** `mobile/app/subscription/index.tsx.bak`

### L-33. Demo dictionary ~500 слов для iOS клавиатуры
- **Файл:** `mobile/ios/RewordKeyboard/RussianDictionary.swift`

### L-34. Deprecated `NSLinguisticTagger`
- **Файл:** `mobile/ios/RewordKeyboard/SpellChecker.swift` (строки 148–156)

### L-35. EAS production — APK вместо AAB
- **Файл:** `mobile/eas.json` (строка 44)

### L-36. Дубликаты миграций (supabase/ и backend/supabase/)

---

## 5. Тесты

### Что покрыто:
| Область | Файлы | Что тестируется |
|---------|-------|-----------------|
| Components | 6 файлов | Button, Card, ErrorBoundary, ModeSelector, QuotaExceededModal, TextInput |
| Hooks | 2 файла | useApi, useQuotaCheck |
| Stores | 4 файла | useNotesStore, useSettingsStore, useSubscriptionStore, useUserStore |
| Backend | 8 файлов | config, cache, diff, logger, prompts, schemas, token-accounting, pii-masker, prd-criteria |

### Критические пробелы:
| Пробел | Критичность | Описание |
|--------|-------------|----------|
| **0 тестов на экраны** | 🔴 | Ни один из 14 экранов не тестируется |
| **Auth flow** | 🟠 | Google OAuth → token → session → navigation — 0 тестов |
| **Deep links** | 🟠 | Парсинг URL, роутинг, malformed input — 0 тестов |
| **IAP flow** | 🟠 | Purchase → verify → finish transaction — 0 тестов |
| **Editor paraphrase** | 🟡 | generate → diff → accept/reject — 0 тестов |
| **Navigation guards** | 🟡 | Auth/unauth/onboarding routing — 0 тестов |
| **Backend integration** | 🟡 | Только health endpoint. Нет тестов на paraphrase, check, subscription, webhooks |

---

## 6. Заглушки

| # | Файл | Описание |
|---|------|----------|
| 1 | `backend/src/routes/v1/subscription.ts:107` | `verifyGoogleReceipt()` — всегда true |
| 2 | `backend/src/routes/v1/subscription.ts:55` | Apple verifyReceipt — deprecated endpoint |
| 3 | `backend/src/utils/` | Пустая директория |
| 4 | `mobile/src/components/notes/` | Пустая директория |
| 5 | `mobile/src/components/onboarding/` | Пустая директория |
| 6 | `mobile/src/components/settings/` | Пустая директория |
| 7 | `mobile/src/components/ui/` | Пустая директория |
| 8 | `mobile/src/services/storage/` | Пустая директория |
| 9 | `mobile/src/types/` | Пустая директория |
| 10 | `mobile/app/onboarding/welcome.tsx:56` | Placeholder illustration (пустой View) |
| 11 | `mobile/app/onboarding/enable-keyboard.tsx:83` | Placeholder скриншот |
| 12 | `mobile/app/auth/sign-in.tsx:437` | Нерабочие ссылки на "условия" и "политику" |
| 13 | `mobile/ios/.../RussianDictionary.swift` | Demo ~500 слов вместо полного словаря |
| 14 | `shared/` | Пустая директория (planned shared types) |
| 15 | `scripts/` | Пустая директория (planned utility scripts) |
| 16 | `infrastructure/` | Пустая директория |
| 17 | `keyboard-android/` | Пустая директория |
| 18 | `keyboard-ios/` | Пустая директория |
| 19 | `mobile/eas.json:56-57` | Placeholder Apple ID / ASC App ID |

---

## 7. План действий

### 🔴 Немедленно (перед релизом)

| Приоритет | Задача | Файлы |
|-----------|--------|-------|
| 1 | Реализовать Google Play receipt verification | `backend/src/routes/v1/subscription.ts` |
| 2 | Добавить YooKassa webhook signature/IP проверку | `backend/src/routes/v1/webhooks.ts` |
| 3 | Убрать токены из AsyncStorage persist | `mobile/src/stores/useUserStore.ts` |
| 4 | Исправить RLS для `external_payments` — `TO service_role` | `supabase/migrations/004` |
| 5 | Убрать hardcoded ключи из `eas.json` и `APIService.kt` | `mobile/eas.json`, `APIService.kt` |
| 6 | Сделать legal links рабочими (условия/политика) | `mobile/app/auth/sign-in.tsx` |
| 7 | Добавить `router.replace` после user delete | `mobile/app/(tabs)/settings.tsx` |

### 🟠 До релиза v1.0

| Приоритет | Задача | Файлы |
|-----------|--------|-------|
| 8 | Ограничить CORS origins | `backend/src/index.ts` |
| 9 | Исправить token refresh race conditions | `mobile/src/services/api/client.ts` |
| 10 | Вызывать `finishTransaction` в finally | `mobile/src/services/iap/purchase.ts` |
| 11 | SharedStorage null guards | `mobile/src/native/SharedStorage.ts` |
| 12 | Добавить базовую accessibility | Все экраны |
| 13 | Вынести подписку в shared component | `subscription.tsx` × 2 |
| 14 | Шифровать токены клавиатуры (Keychain / EncryptedSharedPrefs) | iOS/Android keyboard |
| 15 | Включить minification для release builds | `build.gradle` |
| 16 | Убрать hardcoded Supabase URL из всех fallback-ов | `config.ts`, `client.ts`, `SharedStorage.kt` |
| 17 | Android retry logic | `APIService.kt` |
| 18 | Certificate pinning (Android) | `network_security_config.xml` |

### 🟡 После релиза

| Приоритет | Задача |
|-----------|--------|
| 19 | Мигрировать Apple на App Store Server API v2 |
| 20 | Добавить screen-level тесты (auth, editor, IAP) |
| 21 | Внедрить i18n |
| 22 | PII маскер — нумерованные placeholder-ы |
| 23 | Per-endpoint rate limiting |
| 24 | Staging environment (отдельный Supabase) |
| 25 | Полный русский словарь (iOS keyboard) |
| 26 | Очистить пустые директории или заполнить |
