# Reword AI — План разработки сайта оплаты подписки

> **Версия**: 1.0  
> **Дата**: Июль 2025  
> **Статус**: Утверждён к разработке

---

## Содержание

1. [Обзор архитектуры](#1-обзор-архитектуры)
2. [Структура проекта](#2-структура-проекта)
3. [Стек технологий и зависимости](#3-стек-технологий-и-зависимости)
4. [Миграции базы данных](#4-миграции-базы-данных)
5. [Аутентификация (Supabase SSR)](#5-аутентификация-supabase-ssr)
6. [Интеграция YooKassa](#6-интеграция-yookassa)
7. [Webhook-обработка платежей](#7-webhook-обработка-платежей)
8. [Синхронизация подписки с мобильным приложением](#8-синхронизация-подписки-с-мобильным-приложением)
9. [UI/UX дизайн страниц](#9-uiux-дизайн-страниц)
10. [Безопасность](#10-безопасность)
11. [Деплой и инфраструктура](#11-деплой-и-инфраструктура)
12. [Тестирование](#12-тестирование)
13. [Фазы реализации](#13-фазы-реализации)
14. [Риски и их митигация](#14-риски-и-их-митигация)
15. [Соответствие требованиям App Store / Google Play](#15-соответствие-требованиям-app-store--google-play)

---

## 1. Обзор архитектуры

### Общая схема

```
┌─────────────────────┐    ┌──────────────────────────┐    ┌──────────────────┐
│   Next.js Website   │───▶│  Supabase Auth (SSR)     │◀───│  Mobile App      │
│   (Vercel)          │    │  Общий проект, единые    │    │  (Expo/RN)       │
│                     │    │  пользователи            │    │                  │
│  - Landing page     │    └──────────────────────────┘    │  - IAP подписки  │
│  - Auth (Google)    │                                     │  - syncFromServer│
│  - Payment page     │    ┌──────────────────────────┐    │                  │
│  - Dashboard        │───▶│  YooKassa API            │    └──────────────────┘
│  - Success/Fail     │    │  (СБП + Карты)           │            │
│                     │    └─────────┬────────────────┘            │
└─────────────────────┘              │ webhook                     │
                                     ▼                             ▼
                        ┌──────────────────────────┐    ┌──────────────────┐
                        │  Fastify Backend          │◀───│  GET /v1/        │
                        │  (Render)                 │    │  subscription    │
                        │                           │    └──────────────────┘
                        │  POST /v1/webhooks/       │
                        │       yookassa            │
                        │                           │
                        └─────────┬────────────────┘
                                  │
                                  ▼
                        ┌──────────────────────────┐
                        │  Supabase PostgreSQL      │
                        │  - subscriptions          │
                        │  - external_payments      │
                        │  - usage_log              │
                        └──────────────────────────┘
```

### Ключевые принципы

1. **Единая база пользователей** — Google OAuth через Supabase Auth (один проект `wlmfsohrvcxatgnwezfy`)
2. **Единая таблица подписок** — `subscriptions` с новым значением `store = 'external'`
3. **Разделение ответственности** — сайт создаёт платёж, бэкенд обрабатывает webhook
4. **Идемпотентность** — повторный webhook не создаёт дублирующей подписки
5. **Аудит** — все платежи логируются в отдельную таблицу `external_payments`

---

## 2. Структура проекта

```
website/
├── .env.local                      # Локальные переменные окружения
├── .env.example                    # Шаблон переменных
├── .gitignore
├── next.config.ts                  # Конфиг Next.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts              # Tailwind CSS конфиг
├── postcss.config.js
├── middleware.ts                    # Auth middleware (защита маршрутов)
│
├── public/
│   ├── favicon.ico
│   ├── og-image.png                # Open Graph изображение
│   ├── robots.txt
│   └── sitemap.xml
│
├── app/
│   ├── layout.tsx                  # Корневой layout (шрифты, metadata, providers)
│   ├── page.tsx                    # Landing page (/)
│   ├── globals.css                 # Tailwind imports + кастомные стили
│   │
│   ├── auth/
│   │   ├── callback/
│   │   │   └── route.ts           # GET /auth/callback — OAuth callback handler
│   │   ├── sign-in/
│   │   │   └── page.tsx           # Страница входа через Google
│   │   └── sign-out/
│   │       └── route.ts           # POST /auth/sign-out — выход
│   │
│   ├── subscribe/
│   │   ├── page.tsx               # Выбор плана + оплата (защищён middleware)
│   │   └── loading.tsx            # Loading skeleton
│   │
│   ├── payment/
│   │   ├── success/
│   │   │   └── page.tsx           # Страница успешной оплаты
│   │   ├── cancel/
│   │   │   └── page.tsx           # Страница отмены оплаты
│   │   └── status/
│   │       └── route.ts           # GET /payment/status?id=xxx — проверка статуса
│   │
│   ├── dashboard/
│   │   ├── page.tsx               # Личный кабинет (текущая подписка, квота)
│   │   └── loading.tsx
│   │
│   ├── api/
│   │   └── payments/
│   │       └── create/
│   │           └── route.ts       # POST /api/payments/create — создание платежа
│   │
│   ├── legal/
│   │   ├── terms/
│   │   │   └── page.tsx           # Условия использования
│   │   ├── privacy/
│   │   │   └── page.tsx           # Политика конфиденциальности
│   │   └── refund/
│   │       └── page.tsx           # Политика возврата
│   │
│   └── not-found.tsx              # 404 страница
│
├── components/
│   ├── ui/                        # Базовые UI компоненты
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Spinner.tsx
│   │   └── Toast.tsx
│   │
│   ├── layout/
│   │   ├── Header.tsx             # Шапка с навигацией
│   │   ├── Footer.tsx             # Подвал с ссылками
│   │   └── Container.tsx          # Контейнер контента
│   │
│   ├── landing/
│   │   ├── Hero.tsx               # Главный блок с CTA
│   │   ├── Features.tsx           # Фичи приложения
│   │   ├── Pricing.tsx            # Блок с ценами
│   │   ├── Testimonials.tsx       # Отзывы
│   │   └── FAQ.tsx                # Частые вопросы
│   │
│   ├── payment/
│   │   ├── PlanSelector.tsx       # Выбор тарифа
│   │   ├── PaymentMethodSelector.tsx  # Выбор способа оплаты
│   │   ├── SbpQrCode.tsx         # QR-код для СБП
│   │   ├── PaymentStatus.tsx     # Статус платежа (polling)
│   │   └── PriceTag.tsx          # Отображение цены
│   │
│   └── dashboard/
│       ├── SubscriptionCard.tsx   # Карточка текущей подписки
│       ├── UsageStats.tsx         # Статистика использования
│       └── ManageSubscription.tsx # Управление подпиской
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient()
│   │   ├── server.ts             # createServerClient() для Server Components
│   │   ├── middleware.ts          # createServerClient() для middleware
│   │   └── types.ts              # Supabase DB types
│   │
│   ├── yookassa/
│   │   ├── client.ts             # YooKassa API клиент
│   │   ├── types.ts              # TypeScript типы для API
│   │   └── constants.ts          # ID магазина, URL, webhook URL
│   │
│   └── utils/
│       ├── format.ts             # Форматирование цен, дат
│       └── cn.ts                 # Утилита clsx + twMerge
│
└── types/
    └── index.ts                   # Общие типы
```

---

## 3. Стек технологий и зависимости

### package.json

```json
{
  "name": "reword-ai-website",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.3",
    "@supabase/supabase-js": "^2.49",
    "@supabase/ssr": "^0.6",
    "tailwindcss": "^4.1",
    "clsx": "^2.1",
    "tailwind-merge": "^3.0",
    "uuid": "^11.1",
    "zod": "^3.25"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/uuid": "^10",
    "typescript": "^5.9",
    "eslint": "^9",
    "eslint-config-next": "^15.3",
    "@tailwindcss/postcss": "^4.1",
    "postcss": "^8"
  }
}
```

### Обоснование выбора

| Технология | Причина |
|-----------|---------|
| **Next.js 15 (App Router)** | SSR для SEO, Server Components, API Routes, middleware — всё в одном |
| **Supabase SSR (`@supabase/ssr`)** | Cookie-based сессии, совместимость с мобильным приложением, один проект auth |
| **Tailwind CSS v4** | Быстрая стилизация, tree-shaking, отличная поддержка Next.js |
| **Zod** | Уже используется в бэкенде, единая валидация |
| **YooKassa REST API** | Без SDK — прямые HTTP запросы для полного контроля |
| **Vercel** | Нативный хостинг для Next.js, Edge Functions, автодеплой |

### Почему НЕ используем YooKassa SDK

YooKassa SDK для Node.js (`@yookassa/sdk`) не обновляется и имеет проблемы с типизацией. Вместо этого используем прямые `fetch` запросы к REST API — это надёжнее, прозрачнее и не зависит от стороннего пакета.

---

## 4. Миграции базы данных

### Миграция 004: Поддержка внешних платежей

**Файл**: `supabase/migrations/004_external_payments.sql`

```sql
-- Migration: 004_external_payments.sql
-- Description: Add support for external (web) payments via YooKassa
-- Date: 2025-07

-- ============================================
-- 1. Расширить store CHECK constraint
-- ============================================

-- Удаляем старый constraint
ALTER TABLE subscriptions 
  DROP CONSTRAINT IF EXISTS subscriptions_store_check;

-- Добавляем новый с 'external'
ALTER TABLE subscriptions 
  ADD CONSTRAINT subscriptions_store_check 
  CHECK (store IN ('apple', 'google', 'external'));

-- ============================================
-- 2. Добавить payment_id для YooKassa
-- ============================================

ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS external_payment_id TEXT;

-- Индекс для поиска по payment_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_external_payment 
  ON subscriptions(external_payment_id) 
  WHERE external_payment_id IS NOT NULL;

-- ============================================
-- 3. Таблица аудита внешних платежей
-- ============================================

CREATE TABLE IF NOT EXISTS external_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Связь с пользователем
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- YooKassa данные
    yookassa_payment_id TEXT NOT NULL UNIQUE,
    yookassa_status TEXT NOT NULL,  -- 'pending', 'waiting_for_capture', 'succeeded', 'canceled'
    idempotency_key TEXT NOT NULL UNIQUE,
    
    -- Детали платежа
    amount_value NUMERIC(10, 2) NOT NULL,
    amount_currency TEXT NOT NULL DEFAULT 'RUB',
    description TEXT,
    
    -- План подписки
    plan TEXT NOT NULL CHECK (plan IN ('pro_monthly', 'pro_yearly')),
    
    -- Способ оплаты
    payment_method_type TEXT,  -- 'sbp', 'bank_card', 'yoo_money', etc.
    
    -- Подтверждение
    confirmation_type TEXT,  -- 'redirect', 'qr'
    confirmation_url TEXT,
    
    -- Метаданные
    metadata JSONB DEFAULT '{}',
    
    -- Webhook данные
    webhook_received_at TIMESTAMPTZ,
    webhook_event TEXT,
    
    -- Флаг обработки
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_ext_payments_user 
  ON external_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_ext_payments_status 
  ON external_payments(yookassa_status);
CREATE INDEX IF NOT EXISTS idx_ext_payments_created 
  ON external_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ext_payments_pending 
  ON external_payments(yookassa_status, processed) 
  WHERE yookassa_status = 'pending' AND processed = false;

-- Триггер для updated_at
CREATE TRIGGER update_external_payments_updated_at
    BEFORE UPDATE ON external_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. RLS политики для external_payments
-- ============================================

ALTER TABLE external_payments ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только свои платежи
CREATE POLICY "Users can view own payments"
  ON external_payments FOR SELECT
  USING (auth.uid() = user_id);

-- Вставка только через service role (бэкенд)
CREATE POLICY "Service role can insert payments"
  ON external_payments FOR INSERT
  WITH CHECK (true);

-- Обновление только через service role (webhook)
CREATE POLICY "Service role can update payments"
  ON external_payments FOR UPDATE
  USING (true);

-- ============================================
-- 5. Обновить has_premium_access для 'external'
-- ============================================

CREATE OR REPLACE FUNCTION has_premium_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id = p_user_id 
    AND status IN ('active', 'trial')
    AND (
      (status = 'active' AND (expires_at IS NULL OR expires_at > NOW()))
      OR
      (status = 'trial' AND (trial_ends_at IS NULL OR trial_ends_at > NOW()))
    )
    AND plan IN ('pro_monthly', 'pro_yearly')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Примечание: функция не зависит от store, поэтому внешние подписки
-- автоматически работают без изменения логики.
```

### Обновить TypeScript типы в бэкенде

**Файл**: `backend/src/types/database.ts` — добавить:

```typescript
// Обновить Store type
export type Store = 'apple' | 'google' | 'external';

// Новый тип для внешних платежей
export interface ExternalPayment {
  id: string;
  user_id: string;
  yookassa_payment_id: string;
  yookassa_status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  idempotency_key: string;
  amount_value: number;
  amount_currency: string;
  description: string | null;
  plan: 'pro_monthly' | 'pro_yearly';
  payment_method_type: string | null;
  confirmation_type: string | null;
  confirmation_url: string | null;
  metadata: Record<string, unknown>;
  webhook_received_at: string | null;
  webhook_event: string | null;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## 5. Аутентификация (Supabase SSR)

### Принцип работы

Сайт использует **тот же Supabase проект** (`wlmfsohrvcxatgnwezfy`), что и мобильное приложение. Когда пользователь входит через Google на сайте, Supabase распознаёт его как того же пользователя (по email/provider), и подписка в таблице `subscriptions` привязана к одному `user_id`.

### 5.1. Browser Client

**Файл**: `website/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 5.2. Server Client

**Файл**: `website/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // В Server Component нельзя менять cookies — 
            // это нормально, middleware обработает refresh
          }
        },
      },
    }
  );
}
```

### 5.3. Middleware

**Файл**: `website/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Защищённые маршруты
const PROTECTED_ROUTES = ['/subscribe', '/dashboard'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Обновляем сессию (refresh token, если нужно)
  const { data: { user } } = await supabase.auth.getUser();

  // Проверяем защищённые маршруты
  const isProtected = PROTECTED_ROUTES.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### 5.4. OAuth Callback

**Файл**: `website/app/auth/callback/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') || '/subscribe';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // Ошибка — показать страницу входа
  return NextResponse.redirect(`${origin}/auth/sign-in?error=auth_callback_failed`);
}
```

### 5.5. Страница входа

**Файл**: `website/app/auth/sign-in/page.tsx`

```tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      setError('Ошибка входа. Попробуйте ещё раз.');
      setLoading(false);
    }
  };

  return (
    // UI: кнопка "Войти через Google" с лого
    // + текст "Используйте тот же Google аккаунт, что и в приложении"
    // + ссылки на Условия использования и Политику конфиденциальности
  );
}
```

### 5.6. Настройки Supabase Dashboard

В разделе **Authentication → URL Configuration** добавить:

| Поле | Значение |
|------|----------|
| Site URL | `https://reword-ai.ru` (или ваш домен) |
| Additional Redirect URLs | `https://reword-ai.ru/auth/callback`, `rewordai://auth/callback`, `rewordai://**`, `exp://192.168.*:8081/--/auth/callback` |

---

## 6. Интеграция YooKassa

### 6.1. Конфигурация

**Переменные окружения** (для сайта на Vercel):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://wlmfsohrvcxatgnwezfy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# YooKassa
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key

# App
NEXT_PUBLIC_APP_URL=https://reword-ai.ru
NEXT_PUBLIC_BACKEND_URL=https://reword-ai.onrender.com
```

**Переменные окружения** (для бэкенда на Render — добавить):

```env
# YooKassa (для webhook верификации)
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key
```

### 6.2. YooKassa API клиент

**Файл**: `website/lib/yookassa/client.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import type { 
  CreatePaymentRequest, 
  PaymentResponse, 
} from './types';

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

export class YooKassaClient {
  private shopId: string;
  private secretKey: string;

  constructor() {
    this.shopId = process.env.YOOKASSA_SHOP_ID!;
    this.secretKey = process.env.YOOKASSA_SECRET_KEY!;

    if (!this.shopId || !this.secretKey) {
      throw new Error('YooKassa credentials not configured');
    }
  }

  private get authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');
  }

  /**
   * Создать платёж
   */
  async createPayment(
    params: CreatePaymentRequest,
    idempotencyKey?: string
  ): Promise<PaymentResponse> {
    const key = idempotencyKey || uuidv4();

    const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authHeader,
        'Idempotence-Key': key,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new YooKassaError(
        `Payment creation failed: ${response.status}`,
        response.status,
        error
      );
    }

    return response.json() as Promise<PaymentResponse>;
  }

  /**
   * Получить статус платежа
   */
  async getPayment(paymentId: string): Promise<PaymentResponse> {
    const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
      headers: {
        'Authorization': this.authHeader,
      },
    });

    if (!response.ok) {
      throw new YooKassaError(
        `Payment fetch failed: ${response.status}`,
        response.status
      );
    }

    return response.json() as Promise<PaymentResponse>;
  }
}

export class YooKassaError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'YooKassaError';
  }
}

// Singleton (Server-side only)
let instance: YooKassaClient | null = null;
export function getYooKassaClient(): YooKassaClient {
  if (!instance) {
    instance = new YooKassaClient();
  }
  return instance;
}
```

### 6.3. TypeScript типы для YooKassa

**Файл**: `website/lib/yookassa/types.ts`

```typescript
// ─── Запрос на создание платежа ─────────────────

export interface CreatePaymentRequest {
  amount: {
    value: string;   // "299.00"
    currency: string; // "RUB"
  };
  capture: boolean;  // true = автосписание
  confirmation: PaymentConfirmation;
  description?: string;
  metadata?: Record<string, string>;
  receipt?: FiscalReceipt;  // Для ФЗ-54
}

// Способ подтверждения: redirect (карты) или QR (СБП)
export type PaymentConfirmation =
  | { type: 'redirect'; return_url: string }
  | { type: 'qr' };

// ─── Ответ от YooKassa ──────────────────────────

export interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  amount: {
    value: string;
    currency: string;
  };
  description?: string;
  confirmation?: {
    type: 'redirect' | 'qr';
    confirmation_url?: string;       // Для redirect
    confirmation_data?: string;      // QR-код для СБП (base64 или URL)
  };
  payment_method?: {
    type: string;
    id: string;
    saved: boolean;
    title?: string;
  };
  metadata?: Record<string, string>;
  created_at: string;
  expires_at?: string;
  paid: boolean;
  refundable: boolean;
  test: boolean;
}

export type PaymentStatus =
  | 'pending'
  | 'waiting_for_capture'
  | 'succeeded'
  | 'canceled';

// ─── Webhook payload ────────────────────────────

export interface YooKassaWebhookEvent {
  type: 'notification';
  event: 'payment.succeeded' | 'payment.canceled' | 'payment.waiting_for_capture' | 'refund.succeeded';
  object: PaymentResponse;
}

// ─── Фискальный чек (ФЗ-54) ────────────────────

export interface FiscalReceipt {
  customer: {
    email?: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    quantity: string;
    amount: {
      value: string;
      currency: string;
    };
    vat_code: number;                // 1 = без НДС
    payment_subject: string;         // 'service'
    payment_mode: string;            // 'full_payment'
  }>;
}
```

### 6.4. Тарифы и цены

**Файл**: `website/lib/yookassa/constants.ts`

```typescript
export const PLANS = {
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Pro Ежемесячно',
    description: 'Безлимитные перефразирования на месяц',
    price: 299,
    currency: 'RUB',
    period: 'month' as const,
    periodDays: 30,
    features: [
      'Безлимитные перефразирования',
      'Все режимы стиля',
      'Приоритетная обработка',
      'Без рекламы',
    ],
  },
  pro_yearly: {
    id: 'pro_yearly',
    name: 'Pro Годовой',
    description: 'Безлимитные перефразирования на год',
    price: 2499,
    currency: 'RUB',
    period: 'year' as const,
    periodDays: 365,
    savings: '30%',
    features: [
      'Всё из ежемесячного плана',
      'Экономия 30%',
      'Приоритетная поддержка',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
```

### 6.5. API Route: Создание платежа

**Файл**: `website/app/api/payments/create/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { getYooKassaClient } from '@/lib/yookassa/client';
import { PLANS, type PlanId } from '@/lib/yookassa/constants';
import { NextResponse, type NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const requestSchema = z.object({
  plan: z.enum(['pro_monthly', 'pro_yearly']),
  method: z.enum(['card', 'sbp']),  // card = redirect, sbp = qr
});

export async function POST(request: NextRequest) {
  try {
    // 1. Проверить аутентификацию
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // 2. Валидация запроса
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Неверные параметры', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { plan: planId, method } = parsed.data;
    const plan = PLANS[planId];

    // 3. Проверить, нет ли уже активной подписки
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('status, expires_at, store')
      .eq('user_id', user.id)
      .single();

    if (existingSub?.status === 'active') {
      const expiresAt = existingSub.expires_at 
        ? new Date(existingSub.expires_at) 
        : null;
      if (!expiresAt || expiresAt > new Date()) {
        return NextResponse.json(
          { error: 'У вас уже есть активная подписка' },
          { status: 409 }
        );
      }
    }

    // 4. Создать idempotency key
    const idempotencyKey = uuidv4();

    // 5. Сформировать параметры платежа
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

    const confirmation = method === 'sbp'
      ? { type: 'qr' as const }
      : { 
          type: 'redirect' as const, 
          return_url: `${appUrl}/payment/success?plan=${planId}` 
        };

    // 6. Создать платёж в YooKassa
    const yookassa = getYooKassaClient();
    const payment = await yookassa.createPayment({
      amount: {
        value: plan.price.toFixed(2),
        currency: plan.currency,
      },
      capture: true,
      confirmation,
      description: `Reword AI ${plan.name}`,
      metadata: {
        user_id: user.id,
        plan: planId,
        user_email: user.email || '',
        idempotency_key: idempotencyKey,
      },
      receipt: {
        customer: {
          email: user.email || undefined,
        },
        items: [{
          description: `Подписка Reword AI ${plan.name}`,
          quantity: '1',
          amount: {
            value: plan.price.toFixed(2),
            currency: plan.currency,
          },
          vat_code: 1,  // Без НДС (или 2 для 20% НДС)
          payment_subject: 'service',
          payment_mode: 'full_payment',
        }],
      },
    }, idempotencyKey);

    // 7. Сохранить платёж в аудит-таблицу через бэкенд
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/payments/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        yookassa_payment_id: payment.id,
        idempotency_key: idempotencyKey,
        amount_value: plan.price,
        amount_currency: plan.currency,
        plan: planId,
        payment_method_type: method,
        confirmation_type: confirmation.type,
        confirmation_url: payment.confirmation?.confirmation_url || null,
      }),
    });

    // 8. Вернуть данные для клиента
    return NextResponse.json({
      payment_id: payment.id,
      status: payment.status,
      confirmation: payment.confirmation,
    });

  } catch (error) {
    console.error('[Payment Create Error]', error);
    return NextResponse.json(
      { error: 'Ошибка создания платежа' },
      { status: 500 }
    );
  }
}
```

### 6.6. Клиентский flow для СБП (QR-код)

**Файл**: `website/components/payment/SbpQrCode.tsx`

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface SbpQrCodeProps {
  paymentId: string;
  confirmationData: string;  // QR URL от YooKassa
  onSuccess: () => void;
  onExpired: () => void;
}

export function SbpQrCode({ 
  paymentId, 
  confirmationData, 
  onSuccess, 
  onExpired 
}: SbpQrCodeProps) {
  const [status, setStatus] = useState<'pending' | 'succeeded' | 'canceled'>('pending');

  // Polling статуса платежа каждые 3 секунды
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/payment/status?id=${paymentId}`);
      const data = await res.json();

      if (data.status === 'succeeded') {
        setStatus('succeeded');
        onSuccess();
      } else if (data.status === 'canceled') {
        setStatus('canceled');
        onExpired();
      }
    } catch {
      // Повторим позже
    }
  }, [paymentId, onSuccess, onExpired]);

  useEffect(() => {
    if (status !== 'pending') return;
    const interval = setInterval(pollStatus, 3000);
    // Таймаут 15 минут
    const timeout = setTimeout(() => {
      setStatus('canceled');
      onExpired();
    }, 15 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [status, pollStatus, onExpired]);

  return (
    <div className="text-center">
      <h3>Отсканируйте QR-код</h3>
      <p>Откройте приложение банка и отсканируйте код для оплаты через СБП</p>
      
      {/* QR-код — используем <img> с URL от YooKassa */}
      <img 
        src={confirmationData} 
        alt="QR-код для оплаты" 
        width={280} 
        height={280}
        className="mx-auto border rounded-2xl p-4 bg-white"
      />
      
      <p className="text-sm text-gray-500 mt-4">
        Ожидаем подтверждение оплаты...
      </p>
    </div>
  );
}
```

### 6.7. API Route: Проверка статуса платежа (polling)

**Файл**: `website/app/payment/status/route.ts`

```typescript
import { getYooKassaClient } from '@/lib/yookassa/client';
import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get('id');

  if (!paymentId) {
    return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
  }

  // Проверяем авторизацию
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const yookassa = getYooKassaClient();
    const payment = await yookassa.getPayment(paymentId);

    // Проверяем, что платёж принадлежит текущему пользователю
    if (payment.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      status: payment.status,
      paid: payment.paid,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to check payment' }, { status: 500 });
  }
}
```

---

## 7. Webhook-обработка платежей

### 7.1. Endpoint на Fastify бэкенде

Webhook обрабатывается на **существующем бэкенде** (Render), а не на сайте (Vercel), потому что:
- Бэкенд уже имеет `supabaseAdmin` (service role key)
- Бэкенд отвечает за все мутации подписок
- Единая точка для subscription management

**Файл**: `backend/src/routes/v1/webhooks.ts`

```typescript
import { FastifyPluginAsync } from 'fastify';
import { supabaseAdmin } from '../../services/supabase/client.js';
import { updateSubscription } from '../../services/subscription/service.js';
import logger from '../../services/logging/logger.js';
import config from '../../config.js';

// Типы YooKassa webhook
interface YooKassaWebhookPayload {
  type: 'notification';
  event: string;
  object: {
    id: string;
    status: string;
    amount: { value: string; currency: string };
    metadata?: Record<string, string>;
    payment_method?: { type: string; id: string };
    paid: boolean;
    created_at: string;
  };
}

// План → срок подписки
const PLAN_DURATION: Record<string, number> = {
  pro_monthly: 30,
  pro_yearly: 365,
};

const webhooksRoute: FastifyPluginAsync = async (fastify) => {

  /**
   * POST /v1/webhooks/yookassa
   * Принимает webhooks от YooKassa
   */
  fastify.post('/webhooks/yookassa', {
    config: {
      // Отключить auth middleware для webhook endpoint
      requireAuth: false,
    },
  }, async (request, reply) => {
    try {
      const payload = request.body as YooKassaWebhookPayload;

      // 1. Базовая валидация
      if (!payload?.type || payload.type !== 'notification') {
        return reply.status(400).send({ error: 'Invalid payload' });
      }

      const { event, object: payment } = payload;
      const paymentId = payment.id;

      logger.info({
        event: 'yookassa_webhook_received',
        yookassa_event: event,
        payment_id: paymentId,
        status: payment.status,
      });

      // 2. Верификация: проверяем, что платёж существует в YooKassa
      const isValid = await verifyPaymentExists(paymentId);
      if (!isValid) {
        logger.warn({
          event: 'yookassa_webhook_invalid',
          payment_id: paymentId,
          reason: 'Payment not found in YooKassa API',
        });
        return reply.status(400).send({ error: 'Payment verification failed' });
      }

      // 3. Идемпотентность: проверяем, не обработан ли уже
      const { data: existingPayment } = await supabaseAdmin
        .from('external_payments')
        .select('id, processed, yookassa_status')
        .eq('yookassa_payment_id', paymentId)
        .single();

      if (existingPayment?.processed && existingPayment.yookassa_status === payment.status) {
        logger.info({
          event: 'yookassa_webhook_duplicate',
          payment_id: paymentId,
        });
        return reply.status(200).send({ ok: true });
      }

      // 4. Обновить статус платежа в аудит-таблице
      await supabaseAdmin
        .from('external_payments')
        .update({
          yookassa_status: payment.status,
          webhook_received_at: new Date().toISOString(),
          webhook_event: event,
          payment_method_type: payment.payment_method?.type || null,
        })
        .eq('yookassa_payment_id', paymentId);

      // 5. Обработать событие
      if (event === 'payment.succeeded' && payment.status === 'succeeded') {
        await handlePaymentSucceeded(payment);
      } else if (event === 'payment.canceled' && payment.status === 'canceled') {
        await handlePaymentCanceled(payment);
      }

      return reply.status(200).send({ ok: true });

    } catch (error) {
      logger.error({
        event: 'yookassa_webhook_error',
        error: error instanceof Error ? error.message : 'Unknown',
      });
      // Возвращаем 200 чтобы YooKassa не ретраила
      return reply.status(200).send({ ok: true });
    }
  });

  /**
   * POST /v1/payments/record
   * Записать созданный платёж в аудит-таблицу (вызывается с сайта)
   */
  fastify.post('/payments/record', async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const body = request.body as {
      yookassa_payment_id: string;
      idempotency_key: string;
      amount_value: number;
      amount_currency: string;
      plan: string;
      payment_method_type: string;
      confirmation_type: string;
      confirmation_url: string | null;
    };

    try {
      await supabaseAdmin.from('external_payments').insert({
        user_id: userId,
        yookassa_payment_id: body.yookassa_payment_id,
        yookassa_status: 'pending',
        idempotency_key: body.idempotency_key,
        amount_value: body.amount_value,
        amount_currency: body.amount_currency,
        plan: body.plan,
        payment_method_type: body.payment_method_type,
        confirmation_type: body.confirmation_type,
        confirmation_url: body.confirmation_url,
      });

      return reply.status(201).send({ ok: true });
    } catch (error) {
      logger.error({
        event: 'payment_record_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return reply.status(500).send({ error: 'Failed to record payment' });
    }
  });
};

// ─── Вспомогательные функции ────────────────────────

async function verifyPaymentExists(paymentId: string): Promise<boolean> {
  try {
    const shopId = config.yookassaShopId;
    const secretKey = config.yookassaSecretKey;

    if (!shopId || !secretKey) {
      logger.error({ event: 'yookassa_verify_missing_creds' });
      return false;
    }

    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    const response = await fetch(
      `https://api.yookassa.ru/v3/payments/${paymentId}`,
      {
        headers: { 'Authorization': `Basic ${auth}` },
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

async function handlePaymentSucceeded(
  payment: YooKassaWebhookPayload['object']
): Promise<void> {
  const userId = payment.metadata?.user_id;
  const plan = payment.metadata?.plan as 'pro_monthly' | 'pro_yearly' | undefined;

  if (!userId || !plan) {
    logger.error({
      event: 'yookassa_webhook_missing_metadata',
      payment_id: payment.id,
      metadata: payment.metadata,
    });
    return;
  }

  const periodDays = PLAN_DURATION[plan] || 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + periodDays);

  const success = await updateSubscription(userId, {
    status: 'active',
    plan: plan,
    store: 'external',
    storeProductId: `web_${plan}`,
    storeTransactionId: payment.id,
    expiresAt,
    priceAmount: Math.round(parseFloat(payment.amount.value) * 100),
    priceCurrency: payment.amount.currency,
  });

  if (success) {
    await supabaseAdmin
      .from('external_payments')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('yookassa_payment_id', payment.id);

    logger.info({
      event: 'external_subscription_activated',
      userId,
      plan,
      expiresAt: expiresAt.toISOString(),
      payment_id: payment.id,
    });
  }
}

async function handlePaymentCanceled(
  payment: YooKassaWebhookPayload['object']
): Promise<void> {
  await supabaseAdmin
    .from('external_payments')
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
    })
    .eq('yookassa_payment_id', payment.id);

  logger.info({
    event: 'external_payment_canceled',
    payment_id: payment.id,
    user_id: payment.metadata?.user_id,
  });
}

export default webhooksRoute;
```

### 7.2. Важные настройки в YooKassa Dashboard

1. **URL для webhook**: `https://reword-ai.onrender.com/v1/webhooks/yookassa`
2. **События**: `payment.succeeded`, `payment.canceled`
3. **Формат**: JSON

### 7.3. Обновить updateSubscription

Текущий `updateSubscription` принимает `store: 'apple' | 'google'`. Нужно расширить тип:

```typescript
// backend/src/services/subscription/service.ts
export async function updateSubscription(
  userId: string,
  params: {
    status: SubscriptionStatus;
    plan: SubscriptionPlan;
    store: 'apple' | 'google' | 'external';  // ← добавить 'external'
    // ... остальные поля
  }
): Promise<boolean> { ... }
```

### 7.4. Зарегистрировать роут в index.ts

```typescript
// backend/src/routes/v1/index.ts
import webhooksRoute from './webhooks.js';

// Внутри registerV1Routes:
fastify.register(webhooksRoute);
```

### 7.5. Добавить YooKassa config

```typescript
// backend/src/config.ts — добавить поля:
yookassaShopId: getEnvOrDefault('YOOKASSA_SHOP_ID', ''),
yookassaSecretKey: getEnvOrDefault('YOOKASSA_SECRET_KEY', ''),
```

---

## 8. Синхронизация подписки с мобильным приложением

### Как это работает (без изменений в мобильном коде)

1. Пользователь оплачивает подписку на сайте через YooKassa
2. Webhook активирует подписку в таблице `subscriptions` (status='active', store='external')
3. Мобильное приложение вызывает `GET /v1/subscription` при каждом запуске и при focus
4. Бэкенд возвращает `is_premium: true` — приложение обновляет store
5. `syncFromServer()` в `useSubscriptionStore` работает автоматически

### Существующий код, который уже обеспечивает синхронизацию

**Mobile store** (`useSubscriptionStore.ts` → `syncFromServer`):
```typescript
const response = await apiGet<{...}>('/v1/subscription');
const { subscription, quota } = response;
const tier = subscription.is_premium ? 'pro' : 'free';
```

**Backend** (`GET /v1/subscription`):
```typescript
const [subscription, quota] = await Promise.all([
  getSubscription(userId),  // Проверяет subscriptions таблицу
  getQuotaInfo(userId),     // Использует has_premium_access()
]);
```

**Database** (`has_premium_access`):
```sql
-- Не зависит от store! Проверяет только status и plan
WHERE status IN ('active', 'trial')
AND plan IN ('pro_monthly', 'pro_yearly')
```

### Вывод

**Изменения в мобильном коде НЕ НУЖНЫ** для базовой синхронизации. Подписка, купленная на сайте, автоматически подхватится при следующем `syncFromServer()`.

### Опционально: ускорить синхронизацию (пост-MVP)

Можно добавить realtime подписку на изменения в subscriptions:

```typescript
// mobile/src/hooks/useRealtimeSubscription.ts (ОПЦИОНАЛЬНО, не MVP)
supabase
  .channel('subscription-changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'subscriptions',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    syncFromServer();
  })
  .subscribe();
```

---

## 9. UI/UX дизайн страниц

### 9.1. Landing Page (`/`)

```
┌──────────────────────────────────────────────┐
│  HEADER: Лого Reword AI | Возможности | Цены │
├──────────────────────────────────────────────┤
│                                              │
│  HERO SECTION:                               │
│  "Перефразируйте любой текст               │
│   с помощью ИИ"                             │
│                                              │
│  Описание: Reword AI мгновенно перепишет    │
│  ваш текст в нужном стиле...               │
│                                              │
│  [Попробовать бесплатно]  [Оформить Pro]    │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  FEATURES: 3 карточки                        │
│  📝 8 режимов стиля                         │
│  ⚡ Мгновенный результат                    │
│  🔒 Приватность                             │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  PRICING SECTION:                            │
│  ┌─────────────┐  ┌─────────────────┐       │
│  │ Free        │  │ Pro (рекоменд.) │       │
│  │ 30 /день    │  │ 299₽/мес        │       │
│  │ Базовые     │  │ 2499₽/год −30%  │       │
│  │ режимы      │  │ Безлимит        │       │
│  │             │  │ Все режимы      │       │
│  │ [Скачать]   │  │ [Подписаться]   │       │
│  └─────────────┘  └─────────────────┘       │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  FAQ: Аккордеон с вопросами                  │
│                                              │
├──────────────────────────────────────────────┤
│  FOOTER: © 2025 | Условия | Конфиденциальность│
│          | Политика возврата                  │
└──────────────────────────────────────────────┘
```

### 9.2. Страница подписки (`/subscribe`)

```
┌──────────────────────────────────────────────┐
│                                              │
│  Шаг 1: Выберите план                        │
│  ○ Pro Ежемесячно  — 299 ₽/мес              │
│  ● Pro Годовой     — 2 499 ₽/год (−30%)     │
│                                              │
│  Шаг 2: Способ оплаты                        │
│  ● Банковская карта                          │
│  ○ СБП (QR-код)                              │
│                                              │
│  ┌────────────────────────┐                  │
│  │  Итого: 2 499 ₽        │                 │
│  │  [Оплатить]            │                  │
│  └────────────────────────┘                  │
│                                              │
│  Мелкий текст: Оплата через ЮKassa.         │
│  Данные карты не хранятся на наших серверах. │
│  Нажимая "Оплатить", вы принимаете условия. │
│                                              │
└──────────────────────────────────────────────┘
```

### 9.3. Страница успеха (`/payment/success`)

```
┌──────────────────────────────────────────────┐
│                                              │
│          ✓ Оплата прошла успешно!            │
│                                              │
│  Подписка Reword AI Pro активирована.        │
│  Откройте приложение — подписка уже          │
│  синхронизирована с вашим аккаунтом.         │
│                                              │
│  [Открыть приложение]  [Личный кабинет]      │
│                                              │
└──────────────────────────────────────────────┘
```

### 9.4. Личный кабинет (`/dashboard`)

```
┌──────────────────────────────────────────────┐
│                                              │
│  Добро пожаловать, user@gmail.com            │
│                                              │
│  ┌──── Текущая подписка ─────┐              │
│  │ Reword AI Pro              │              │
│  │ План: Годовой              │              │
│  │ Истекает: 15.07.2026       │              │
│  │ Осталось: 365 дней         │              │
│  │ [Управление подпиской]     │              │
│  └────────────────────────────┘              │
│                                              │
│  ┌──── Использование ────────┐              │
│  │ Сегодня: 12 из ∞          │              │
│  │ За месяц: 234             │              │
│  └────────────────────────────┘              │
│                                              │
│  [Выйти из аккаунта]                        │
│                                              │
└──────────────────────────────────────────────┘
```

### Цветовая схема

Используем цвета из мобильного приложения для консистентности:

```css
:root {
  --accent-primary: #9B6DFF;
  --accent-secondary: #B794FF;
  --accent-muted: rgba(155, 109, 255, 0.15);
  --bg-primary-dark: #0A0A0A;
  --bg-secondary-dark: #161616;
  --error: #E35A5A;
  --success: #39C07C;
}
```

---

## 10. Безопасность

### 10.1. Webhook верификация

YooKassa не использует HMAC-подписи по умолчанию. Вместо этого:

1. **Проверяем платёж через API** — при получении webhook делаем `GET /v3/payments/{id}` к YooKassa API и сверяем статус
2. **IP-фильтрация** (опционально) — YooKassa отправляет webhooks с определённых IP

```typescript
// Верификация через API (уже реализована в verifyPaymentExists)
const response = await fetch(
  `https://api.yookassa.ru/v3/payments/${paymentId}`,
  { headers: { 'Authorization': `Basic ${auth}` } }
);
```

### 10.2. CSRF защита

Next.js API routes по умолчанию проверяют `Origin` header. Дополнительно:

```typescript
// В API route создания платежа
const origin = request.headers.get('origin');
if (origin && !origin.includes('reword-ai.ru')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 10.3. Rate Limiting

Ограничить создание платежей — не более 5 в минуту на пользователя (через проверку в `external_payments`):

```typescript
// Проверка в /api/payments/create
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
const { count } = await supabase
  .from('external_payments')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .gte('created_at', fiveMinutesAgo);

if ((count || 0) >= 5) {
  return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
}
```

### 10.4. Content Security Policy

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://api.yookassa.ru",
      "connect-src 'self' https://wlmfsohrvcxatgnwezfy.supabase.co https://api.yookassa.ru https://reword-ai.onrender.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];
```

### 10.5. Переменные окружения

Все секреты хранятся в environment variables:
- `YOOKASSA_SECRET_KEY` — **НИКОГДА** не экспонируется клиенту
- Prefix `NEXT_PUBLIC_` только для Supabase URL и Anon Key (публичные)
- YooKassa API вызовы **только** в Server Components / API Routes

### 10.6. PCI DSS

Мы **НЕ** обрабатываем данные карт. YooKassa является PCI DSS Level 1 сертифицированной платформой. Пользователь вводит карту на странице YooKassa (redirect flow) или сканирует QR (SBP flow).

---

## 11. Деплой и инфраструктура

### 11.1. Vercel

```json
// vercel.json
{
  "framework": "nextjs",
  "regions": ["fra1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "YOOKASSA_SHOP_ID": "@yookassa-shop-id",
    "YOOKASSA_SECRET_KEY": "@yookassa-secret-key",
    "NEXT_PUBLIC_APP_URL": "https://reword-ai.ru",
    "NEXT_PUBLIC_BACKEND_URL": "https://reword-ai.onrender.com"
  }
}
```

### 11.2. Домен

- **Основной**: `reword-ai.ru` (или другой RU домен)
- **DNS**: A-запись → Vercel IP
- **SSL**: Автоматический через Vercel (Let's Encrypt)

### 11.3. Деплой pipeline

```
GitHub push → Vercel auto-deploy
  ├── Build: next build
  ├── Type check: tsc --noEmit
  └── Deploy: Vercel Edge Network
```

### 11.4. Обновления бэкенда на Render

1. Добавить новые env vars: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`
2. Добавить `webhooks.ts` route
3. Обновить `subscription/service.ts` (тип store)
4. Обновить `config.ts` (YooKassa поля)
5. Обновить `routes/v1/index.ts` (регистрация webhook route)
6. `git push` → Render auto-deploy

### 11.5. Supabase миграция

```bash
# Применить миграцию
supabase db push
# Или через Dashboard → SQL Editor → вставить содержимое 004_external_payments.sql
```

---

## 12. Тестирование

### 12.1. Unit-тесты

| Что тестируем | Файл | Инструмент |
|--------------|------|-----------|
| YooKassa client | `website/__tests__/yookassa/client.test.ts` | Vitest + msw |
| Webhook handler | `backend/tests/unit/webhook.test.ts` | Vitest |
| Payment schema validation | `website/__tests__/schemas.test.ts` | Vitest + Zod |
| Subscription sync | `backend/tests/unit/subscription-external.test.ts` | Vitest |

### 12.2. Интеграционные тесты

| Тест | Описание |
|------|----------|
| Auth flow | Google OAuth → callback → session → redirect to /subscribe |
| Payment creation | Создать платёж → проверить запись в external_payments |
| Webhook → subscription | Отправить mock webhook → проверить subscription.status = 'active' |
| Polling | Создать pending платёж → polling вернёт 'pending' → webhook → polling вернёт 'succeeded' |

### 12.3. YooKassa Sandbox

YooKassa предоставляет тестовое окружение:
- **Тестовый shopId + secretKey**: получить в ЛК YooKassa при создании магазина
- **Тестовая карта**: `1111 1111 1111 1026` (успешная оплата)
- **Тестовая карта с 3DS**: `1111 1111 1111 1002`
- **Все webhook'и в sandbox работают** — можно тестировать полный flow

### 12.4. E2E тесты (пост-MVP)

Playwright:
- Landing page → Pricing → Click "Subscribe" → Redirect to auth
- Auth → Payment page → Select plan → Create payment → Redirect to YooKassa
- Dashboard: проверка статуса подписки

### 12.5. Ручной чек-лист перед запуском

- [ ] Google OAuth на сайте входит и создаёт/находит того же пользователя
- [ ] Оплата картой через YooKassa (sandbox) → webhook → subscription active
- [ ] Оплата через СБП → QR-код отображается → (имитация) → webhook → subscription active
- [ ] Мобильное приложение показывает Pro после оплаты на сайте
- [ ] Повторный webhook не дублирует подписку
- [ ] Неавторизованный пользователь не может создать платёж
- [ ] /dashboard показывает правильный статус подписки
- [ ] Страницы /legal/* доступны без авторизации
- [ ] Site meta tags и OG image работают
- [ ] Мобильная версия сайта корректно отображается

---

## 13. Фазы реализации

### Фаза 0: Подготовка (1 день)

| # | Задача | Зависимости |
|---|--------|------------|
| 0.1 | Создать Next.js проект (`npx create-next-app@latest website`) | — |
| 0.2 | Настроить Tailwind CSS, ESLint, TypeScript | 0.1 |
| 0.3 | Создать `.env.local` с Supabase credentials | 0.1 |
| 0.4 | Зарегистрировать магазин в YooKassa, получить тестовые ключи | — |
| 0.5 | Применить миграцию 004 к Supabase | — |
| 0.6 | Обновить типы в `backend/src/types/database.ts` | 0.5 |

### Фаза 1: Аутентификация (1-2 дня)

| # | Задача | Зависимости |
|---|--------|------------|
| 1.1 | Реализовать `lib/supabase/client.ts`, `server.ts`, `middleware.ts` | 0.3 |
| 1.2 | Реализовать `middleware.ts` (защита маршрутов) | 1.1 |
| 1.3 | Создать `/auth/sign-in` страницу (Google OAuth) | 1.1 |
| 1.4 | Создать `/auth/callback/route.ts` | 1.1 |
| 1.5 | Тестировать: вход → сессия → редирект → выход | 1.2, 1.3, 1.4 |

### Фаза 2: Landing Page (1-2 дня)

| # | Задача | Зависимости |
|---|--------|------------|
| 2.1 | Создать UI компоненты (`Button`, `Card`, `Badge`) | 0.2 |
| 2.2 | Создать `Header` + `Footer` layout | 2.1 |
| 2.3 | Реализовать Hero section | 2.1 |
| 2.4 | Реализовать Features section | 2.1 |
| 2.5 | Реализовать Pricing section | 2.1 |
| 2.6 | Реализовать FAQ section | 2.1 |
| 2.7 | SEO: meta tags, OG image, sitemap.xml | 2.3 |
| 2.8 | Адаптивная вёрстка (мобильная + десктоп) | 2.2-2.6 |

### Фаза 3: Интеграция YooKassa (2-3 дня)

| # | Задача | Зависимости |
|---|--------|------------|
| 3.1 | Реализовать `lib/yookassa/client.ts` + `types.ts` | 0.4 |
| 3.2 | Создать API Route `/api/payments/create` | 3.1, 1.1 |
| 3.3 | Реализовать `PlanSelector` + `PaymentMethodSelector` компоненты | 2.1 |
| 3.4 | Создать страницу `/subscribe` | 3.2, 3.3 |
| 3.5 | Реализовать `SbpQrCode` компонент с polling | 3.1 |
| 3.6 | Создать `/payment/status/route.ts` | 3.1 |
| 3.7 | Создать `/payment/success` и `/payment/cancel` страницы | 2.1 |
| 3.8 | Тестировать card flow (redirect) в sandbox | 3.2, 3.4 |
| 3.9 | Тестировать SBP flow (QR) в sandbox | 3.5, 3.6 |

### Фаза 4: Webhook + Backend (1-2 дня)

| # | Задача | Зависимости |
|---|--------|------------|
| 4.1 | Обновить `backend/src/config.ts` (YooKassa поля) | — |
| 4.2 | Обновить `subscription/service.ts` (store: 'external') | 0.6 |
| 4.3 | Создать `backend/src/routes/v1/webhooks.ts` | 4.1, 4.2 |
| 4.4 | Зарегистрировать route в `routes/v1/index.ts` | 4.3 |
| 4.5 | Создать endpoint `/v1/payments/record` | 4.3 |
| 4.6 | Тестировать webhook: mock payload → subscription active | 4.3 |
| 4.7 | Настроить webhook URL в YooKassa Dashboard | 4.3 |

### Фаза 5: Dashboard + Личный кабинет (1 день)

| # | Задача | Зависимости |
|---|--------|------------|
| 5.1 | Создать `/dashboard` страницу | 1.1, 2.1 |
| 5.2 | Реализовать `SubscriptionCard` компонент | 5.1 |
| 5.3 | Реализовать `UsageStats` компонент | 5.1 |
| 5.4 | Реализовать `ManageSubscription` компонент | 5.1 |
| 5.5 | Тестировать dashboard с активной подпиской | 5.1-5.4, 4.6 |

### Фаза 6: Юридические страницы (0.5 дня)

| # | Задача | Зависимости |
|---|--------|------------|
| 6.1 | Создать `/legal/terms` — Условия использования | — |
| 6.2 | Создать `/legal/privacy` — Политика конфиденциальности | — |
| 6.3 | Создать `/legal/refund` — Политика возврата | — |

### Фаза 7: Тестирование и отладка (1-2 дня)

| # | Задача | Зависимости |
|---|--------|------------|
| 7.1 | E2E тест: полный flow оплаты в sandbox | Все фазы |
| 7.2 | Тест мобильной синхронизации | 4.6 |
| 7.3 | Тест edge cases (двойной платёж, expired session, etc.) | 4.6 |
| 7.4 | Адаптивность: проверка на разных экранах | 2.8 |
| 7.5 | Исправление багов | 7.1-7.4 |

### Фаза 8: Деплой (0.5 дня)

| # | Задача | Зависимости |
|---|--------|------------|
| 8.1 | Настроить Vercel проект | — |
| 8.2 | Привязать домен (DNS) | 8.1 |
| 8.3 | Настроить env vars на Vercel | 8.1 |
| 8.4 | Добавить env vars на Render (YooKassa) | — |
| 8.5 | Задеплоить бэкенд с webhook route | 4.3, 8.4 |
| 8.6 | Задеплоить сайт | 8.1-8.3 |
| 8.7 | Переключить YooKassa на боевой режим | 8.5, 8.6 |
| 8.8 | Smoke test на production | 8.7 |

### Итого: ~9-11 рабочих дней

---

## 14. Риски и их митигация

### Высокие риски

| Риск | Вероятность | Митигация |
|------|------------|----------|
| **YooKassa верификация магазина занимает время** | Высокая | Начать регистрацию магазина в день 1. Тестировать в sandbox параллельно |
| **Vercel недоступен из РФ** | Средняя | Использовать Cloudflare перед Vercel, или развернуть на VPS в РФ (Timeweb, Selectel) |
| **Supabase Auth: дубликаты пользователей** | Средняя | Проверить, что Google provider ID совпадает на сайте и в мобиле. Оба используют один Supabase проект → пользователи гарантированно одинаковые |
| **ФЗ-54: обязательная фискализация** | Высокая | YooKassa берёт на себя отправку чеков в ФНС — нужно передавать `receipt` в запросе создания платежа |

### Средние риски

| Риск | Вероятность | Митигация |
|------|------------|----------|
| **Webhook не дошёл** | Низкая | Polling на стороне сайта + cron job для проверки pending платежей старше 1 часа |
| **Двойное списание** | Низкая | Idempotency key в YooKassa + проверка в external_payments |
| **Рефанд юзера** | Средняя | Обработка `refund.succeeded` webhook → деактивация подписки |
| **Срок подписки пересекается между store и web** | Средняя | При оплате через web: если есть активная подписка через store, продлить expires_at |
| **Нагрузка на webhook** | Низкая | Rate limiting + 200 OK на любую ошибку (разбирать логи) |

### Низкие риски

| Риск | Вероятность | Митигация |
|------|------------|----------|
| **СБП QR-код не работает** | Низкая | Fallback на оплату картой |
| **Google отклонит обновление приложения** | Низкая | Сайт полностью независим от приложения, нет ссылок в коде |
| **User confusion: два места для оплаты** | Средняя | FAQ на сайте объясняет, что подписка действует кроссплатформенно |
| **Утечка YooKassa secret key** | Низкая | Ключ только в server-side коде, никогда в NEXT_PUBLIC_ |

---

## 15. Соответствие требованиям App Store / Google Play

### Правило 3.1.3(b): Multiplatform Services

> Приложения, предлагающие мультиплатформенные сервисы, могут позволять пользователям доступ к контенту или подпискам, приобретённым на других платформах, при условии, что приложение НЕ содержит кнопок, ссылок или призывов к оплате вне магазина.

### Что МОЖНО делать

- ✅ Иметь отдельный сайт для продажи подписок
- ✅ Пользователь входит на сайт через тот же Google аккаунт
- ✅ Подписка, купленная на сайте, работает в приложении
- ✅ Маркетировать сайт через email, SEO, рекламу

### Что НЕЛЬЗЯ делать

- ❌ Ссылаться на сайт оплаты из приложения
- ❌ Упоминать в приложении, что на сайте дешевле
- ❌ Показывать кнопку/баннер "Оплатить на сайте" в приложении
- ❌ Перенаправлять пользователя на сайт из приложения

### Проверка кода мобильного приложения

Убедиться, что в мобильном коде **НЕТ**:
- Ссылок на `reword-ai.ru` в UI
- Текста о веб-оплате или альтернативных способах
- WebView с сайтом оплаты
- Deep links, ведущих на сайт

### Рекомендуемый подход к маркетингу

1. **Email рассылка**: после регистрации в приложении, отправить приветственное письмо с упоминанием сайта
2. **SEO**: оптимизировать landing page под запросы "перефразировать текст", "перефразирование онлайн"
3. **Вне приложения**: социальные сети, контекстная реклама

---

## Приложение A: Быстрый старт

```bash
# 1. Создать проект
npx create-next-app@latest website --typescript --tailwind --eslint --app --src-dir=no --import-alias "@/*"

# 2. Установить зависимости
cd website
npm install @supabase/supabase-js @supabase/ssr zod uuid
npm install -D @types/uuid

# 3. Создать .env.local
cp .env.example .env.local
# Заполнить SUPABASE_URL, SUPABASE_ANON_KEY, YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY

# 4. Запустить dev сервер
npm run dev
# → http://localhost:3000

# 5. Применить миграцию к Supabase
# В SQL Editor Supabase Dashboard вставить содержимое 004_external_payments.sql
```

## Приложение B: Исправить конфликт квот

**ВАЖНО**: В текущем коде есть конфликт:
- `backend/src/config.ts`: `freeParaphrasesLimit: 30`
- `backend/src/services/quota/service.ts`: `DAILY_LIMITS.free = 5`
- `mobile/src/stores/useSubscriptionStore.ts`: `FREE_PARAPHRASES_LIMIT = 5`

**Решение**: привести всё к единому значению через `config.ts`:

```typescript
// backend/src/services/quota/service.ts
import config from '../../config.js';

const DAILY_LIMITS = {
  free: config.freeParaphrasesLimit, // Из env или default 30
  pro: -1,
} as const;
```

```typescript
// mobile/src/stores/useSubscriptionStore.ts
// Убрать хардкод, полагаться на значение с сервера
const FREE_PARAPHRASES_LIMIT = 30; // Обновить с 5 на 30
```

---

*Документ подготовлен на основе анализа кодовой базы Reword AI (бэкенд Fastify v1, мобильное приложение Expo SDK 54, Supabase PostgreSQL) и документации YooKassa API v3.*
