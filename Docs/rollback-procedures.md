# Reword AI — Процедуры отката (Rollback Procedures)

## 1. Backend Rollback

### Откат деплоя (Render / Railway / Fly.io)

**Render:**
```bash
# В Dashboard → Service → Deploys → выбрать предыдущий → Manual Deploy
# Или через CLI:
render deploys list --service srv-xxxxx
render rollback --service srv-xxxxx --deploy dep-xxxxx
```

**Railway:**
```bash
# В Dashboard → Deployments → выбрать предыдущий → Redeploy
railway up --detach  # деплой текущей версии
```

**Fly.io:**
```bash
# Список релизов
fly releases --app reword-ai-backend

# Откат к предыдущему релизу
fly deploy --image registry.fly.io/reword-ai-backend:v<N-1>
```

### Откат Docker-образа
```bash
# Если используется Docker registry
docker pull your-registry/reword-ai-backend:previous-tag
docker tag your-registry/reword-ai-backend:previous-tag your-registry/reword-ai-backend:latest
docker push your-registry/reword-ai-backend:latest
```

### Проверка после отката
```bash
curl https://api.reword.ai/health
curl https://api.reword.ai/health/ready
```

---

## 2. Database Rollback (Supabase)

### Откат миграции

⚠️ **ВАЖНО:** Supabase миграции не имеют встроенного `down`. Откат выполняется вручную.

**Перед каждой миграцией:**
1. Создать бэкап через Supabase Dashboard → Database → Backups
2. Записать текущую версию схемы

**Откат RLS-политик (002):**
```sql
-- Удалить политики
DROP POLICY IF EXISTS "policy_name" ON table_name;

-- Восстановить предыдущие
-- (из файла 002_rls_policies.sql — закомментированные версии)
```

**Полный откат данных:**
```bash
# Через Supabase CLI
supabase db reset  # ТОЛЬКО для dev/staging!

# Для production — восстановить из бэкапа через Dashboard
```

---

## 3. Mobile App Rollback

### iOS
- В App Store Connect → выбрать предыдущую одобренную версию
- "Remove from Sale" текущую → Submit предыдущую
- ⏱ Занимает 24-48 часов (Apple review)

### Android
- В Google Play Console → Release → выбрать предыдущий APK/AAB
- Staged rollout: сначала 1% → 10% → 100%
- Возможен мгновенный откат через "Halt rollout"

### Аварийный выключатель (Kill Switch)
Если критический баг — отключить облачные функции на бэкенде:
```bash
# Вернуть 503 на /v1/paraphrase
# Добавить feature flag в env:
MAINTENANCE_MODE=true
```

---

## 4. Конфигурация (Environment Variables)

### Откат переменных окружения
```bash
# Render
render env set --service srv-xxxxx KEY=previous_value

# Railway
railway variables set KEY=previous_value

# Fly.io
fly secrets set KEY=previous_value
```

### Критические переменные (порядок проверки)
1. `SUPABASE_URL` — подключение к БД
2. `SUPABASE_SERVICE_KEY` — авторизация
3. `OPENROUTER_API_KEY` — LLM доступ
4. `NODE_ENV` — должно быть `production`

---

## 5. Мониторинг при откате

### Что проверять после отката
1. `/health` → `{"status": "ok"}`
2. `/health/ready` → `{"status": "ready"}` (БД доступна)
3. Логи: нет `unhandled_error` событий
4. Sentry: нет новых ошибок
5. Uptime Robot: статус 200

### Эскалация
| Уровень | Проблема | Действие |
|---------|----------|----------|
| P0 — Критический | Сервис недоступен, данные потеряны | Немедленный откат, уведомить всех |
| P1 — Высокий | API ошибки >5%, подписки не работают | Откат в течение 1 часа |
| P2 — Средний | Отдельные фичи сломаны | Hotfix или откат в течение 24 часов |
| P3 — Низкий | Мелкие баги UI | Фикс в следующем релизе |

---

## 6. Команды для быстрого диагноза

```bash
# Проверить логи (Fly.io)
fly logs --app reword-ai-backend

# Проверить логи (Render)
# → Dashboard → Service → Logs

# Проверить здоровье БД
curl https://api.reword.ai/health/detailed | jq

# Проверить текущую версию
curl https://api.reword.ai/health | jq '.version'
```
