# Tech Stack — Reword AI Keyboard (MVP)

> Comprehensive technical stack with all dependencies, libraries, and their compatible versions.  
> Last updated: February 2026
> Status: MVP Development Ready
> **Architecture: Vendor-Neutral, Security-First, Server-Side Proxy**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Mobile Application (React Native)](#mobile-application-react-native)
4. [Native Keyboard Extensions](#native-keyboard-extensions)
5. [Backend API (Node.js)](#backend-api-nodejs)
6. [Database & Authentication (Supabase)](#database--authentication-supabase)
7. [LLM Integration (OpenRouter)](#llm-integration-openrouter)
8. [Caching Layer](#caching-layer)
9. [Server Responsibilities](#server-responsibilities)
10. [Security Model](#security-model)
11. [PII Masking Layer](#pii-masking-layer)
12. [Hosting & Infrastructure](#hosting--infrastructure)
13. [DevOps & CI/CD](#devops--cicd)
14. [Testing & Quality Assurance](#testing--quality-assurance)
15. [Analytics & Monitoring](#analytics--monitoring)
16. [Compatibility Matrix](#compatibility-matrix)

---

## Overview

| Layer | Technology | Version |
|-------|------------|---------|
| Mobile App | React Native + Expo | RN 0.79.x / Expo SDK 54 |
| Keyboard iOS | Swift | 5.10+ |
| Keyboard Android | Kotlin | 2.0.x |
| **Backend** | **Node.js + Fastify** | **22.x LTS / 5.x** |
| **Language** | **TypeScript** | **5.9.x** |
| **Database** | **Supabase (PostgreSQL)** | **Managed** |
| **Auth** | **Supabase Auth** | **Managed** |
| Cache | Redis (Optional) | 7.4.x |
| **LLM Router** | **OpenRouter** | **REST API** |
| **Hosting** | **Render / Railway / Fly.io** | **Managed** |

---

## Architecture Principles

### Core Design Decisions

| Principle | Implementation |
|-----------|----------------|
| **No Vendor Lock-in** | Platform-agnostic services, standard APIs |
| **Server-Side LLM Proxy** | All LLM calls go through backend only |
| **Security-First** | No API keys on client, PII masking before LLM |
| **Privacy by Design** | No raw text storage, anonymized logs |
| **Scalability Ready** | Stateless backend, managed services |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │  React Native    │  │  iOS Keyboard    │  │  Android IME     │      │
│  │  Companion App   │  │  Extension       │  │  Extension       │      │
│  │  (Expo SDK 54)   │  │  (Swift 5.10+)   │  │  (Kotlin 2.0.x)  │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘      │
│           │                     │                     │                 │
│           └─────────────────────┼─────────────────────┘                 │
│                                 │                                       │
│                          HTTPS/TLS 1.3                                  │
│                                 │                                       │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND LAYER                                  │
│                     (Node.js + Fastify + TypeScript)                    │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    SERVER RESPONSIBILITIES                        │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │  ✓ JWT Validation (Supabase Auth)                                │   │
│  │  ✓ Subscription Verification                                     │   │
│  │  ✓ Quota Management & Rate Limiting                              │   │
│  │  ✓ PII Masking (emails, phones, cards, IDs)                     │   │
│  │  ✓ Text Hash for Deduplication                                   │   │
│  │  ✓ LLM Proxy (OpenRouter)                                        │   │
│  │  ✓ Diff Generation (input vs output)                             │   │
│  │  ✓ Token Accounting                                              │   │
│  │  ✓ Metadata-only Logging (no raw text)                          │   │
│  │  ✓ Circuit Breaker for LLM failures                             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                 │                                       │
│           ┌─────────────────────┼─────────────────────┐                 │
│           │                     │                     │                 │
│           ▼                     ▼                     ▼                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐        │
│  │   Supabase     │  │     Redis      │  │    OpenRouter      │        │
│  │  (PostgreSQL   │  │    (Cache)     │  │   (LLM Gateway)    │        │
│  │   + Auth)      │  │   [Optional]   │  │                    │        │
│  └────────────────┘  └────────────────┘  └────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Rules

```
❌ FORBIDDEN:
- Client calling OpenRouter directly
- LLM API keys in client code
- Storing raw user text in database
- Logging raw text in error logs
- Passing API keys to client

✅ REQUIRED:
- All LLM calls through backend proxy
- API keys in server environment variables only
- PII masking before any LLM call
- Metadata-only logging
- JWT validation on every request
```

---

## Mobile Application (React Native)

### Core Framework

| Package | Version | Description |
|---------|---------|-------------|
| `react` | ^18.3.1 | UI library |
| `react-native` | ^0.79.2 | Mobile framework |
| `expo` | ~54.0.0 | Universal development platform |
| `typescript` | ^5.9.2 | Type safety |

### Navigation & Routing

| Package | Version | Description |
|---------|---------|-------------|
| `@react-navigation/native` | ^7.1.x | Navigation container |
| `@react-navigation/stack` | ^7.1.x | Stack navigator |
| `@react-navigation/bottom-tabs` | ^7.2.x | Tab navigator |
| `react-native-screens` | ^4.10.x | Native screens optimization |
| `react-native-safe-area-context` | ^5.3.x | Safe area handling |

### UI & Animation

| Package | Version | Description |
|---------|---------|-------------|
| `react-native-reanimated` | ^4.1.5 | Smooth animations |
| `react-native-gesture-handler` | ^2.29.1 | Touch gestures |
| `react-native-svg` | ^15.11.x | SVG support |
| `@expo/vector-icons` | ^14.0.x | Icon library |
| `react-native-linear-gradient` | ^2.8.x | Gradient backgrounds |

### State Management

| Package | Version | Description |
|---------|---------|-------------|
| `zustand` | ^5.0.8 | Lightweight state management |
| `@tanstack/react-query` | ^5.80.x | Server state management |
| `immer` | ^10.1.x | Immutable state updates |

### Supabase Client

| Package | Version | Description |
|---------|---------|-------------|
| `@supabase/supabase-js` | ^2.49.x | Supabase client SDK |
| `@supabase/auth-helpers-react` | ^0.5.x | Auth React helpers |

### Storage & Data

| Package | Version | Description |
|---------|---------|-------------|
| `react-native-mmkv` | ^3.3.x | High-performance key-value storage |
| `@react-native-async-storage/async-storage` | ^2.2.0 | Async storage (fallback) |
| `expo-secure-store` | ~14.0.x | Secure storage for tokens |

### Network & API

| Package | Version | Description |
|---------|---------|-------------|
| `axios` | ^1.9.x | HTTP client |
| `axios-retry` | ^4.5.x | Automatic retry logic |

### In-App Purchases

| Package | Version | Description |
|---------|---------|-------------|
| `react-native-iap` | ^14.x.x | In-app purchases iOS/Android |
| `expo-iap` | ~2.0.x | Expo IAP module (alternative) |

### Utilities

| Package | Version | Description |
|---------|---------|-------------|
| `date-fns` | ^4.1.x | Date manipulation |
| `lodash` | ^4.17.x | Utility functions |
| `uuid` | ^11.1.x | UUID generation |
| `zod` | ^3.25.x | Schema validation |

### Development Dependencies

| Package | Version | Description |
|---------|---------|-------------|
| `@types/react` | ^18.3.x | React types |
| `@types/react-native` | ^0.79.x | RN types |
| `eslint` | ^9.20.x | Linting |
| `prettier` | ^3.5.x | Code formatting |
| `jest` | ^29.7.x | Testing framework |
| `@testing-library/react-native` | ^12.9.x | Component testing |

---

## Native Keyboard Extensions

### iOS Keyboard Extension (Swift)

| Dependency | Version | Description |
|------------|---------|-------------|
| Swift | 5.10+ | Programming language |
| iOS Deployment Target | 15.0+ | Minimum iOS version |
| Xcode | 16.x | IDE |

**Native Libraries:**

| Library | Purpose |
|---------|---------|
| `UIKit` | UI framework |
| `Foundation` | Core utilities |
| `NaturalLanguage` | Apple NLP framework |
| `CoreML` | On-device ML inference |

**SPM Dependencies:**

| Package | Version | Description |
|---------|---------|-------------|
| `KeyboardKit` | ^9.x | Keyboard development framework |
| `SwiftyJSON` | ^5.0.x | JSON parsing |
| `Alamofire` | ^5.10.x | HTTP networking |

### Android Keyboard Extension (Kotlin)

| Dependency | Version | Description |
|------------|---------|-------------|
| Kotlin | 2.0.x | Programming language |
| compileSdk | 35 | Android compile SDK |
| minSdk | 24 | Minimum Android version |
| targetSdk | 35 | Target Android version |
| Android Studio | Ladybug (2024.2.x) | IDE |

**Gradle Dependencies:**

```kotlin
// build.gradle.kts
plugins {
    id("com.android.application") version "8.8.x"
    id("org.jetbrains.kotlin.android") version "2.0.x"
}

dependencies {
    // Core
    implementation("androidx.core:core-ktx:1.17.x")
    implementation("androidx.appcompat:appcompat:1.7.x")
    
    // Keyboard/Input
    implementation("androidx.inputmethod:inputmethod:1.0.0-alphaXX")
    
    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.11.x")
    implementation("com.squareup.okhttp3:okhttp:4.12.x")
    implementation("com.squareup.moshi:moshi-kotlin:1.15.x")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.x")
    
    // JSON
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.x")
}
```

### On-Device NLP (Both Platforms)

| Component | iOS | Android | Description |
|-----------|-----|---------|-------------|
| Spellcheck | `UITextChecker` | `SpellCheckerSession` | System spellcheck |
| Dictionary | Custom Trie + Hunspell RU | Custom Trie + Hunspell RU | Russian dictionary |
| Morphology | Rule-based local | Rule-based local | Agreement checks |

---

## Backend API (Node.js)

### Core Framework

| Package | Version | Description |
|---------|---------|-------------|
| `node` | 22.x LTS | Runtime |
| `fastify` | ^5.x | High-performance web framework |
| `typescript` | ^5.9.x | Type safety |
| `tsx` | ^4.x | TypeScript execution |
| `@fastify/cors` | ^10.x | CORS support |
| `@fastify/helmet` | ^13.x | Security headers |
| `@fastify/rate-limit` | ^10.x | Rate limiting |

### Database & Auth (Supabase)

| Package | Version | Description |
|---------|---------|-------------|
| `@supabase/supabase-js` | ^2.49.x | Supabase client |
| `@supabase/auth-helpers-node` | ^0.10.x | Server-side auth |

### Validation & Schema

| Package | Version | Description |
|---------|---------|-------------|
| `zod` | ^3.25.x | Schema validation |
| `@sinclair/typebox` | ^0.34.x | JSON Schema (Fastify native) |

### LLM Integration (OpenRouter)

| Package | Version | Description |
|---------|---------|-------------|
| `openai` | ^4.x | OpenAI-compatible SDK (for OpenRouter) |
| `gpt-tokenizer` | ^2.x | Token counting |

### Caching

| Package | Version | Description |
|---------|---------|-------------|
| `ioredis` | ^5.x | Redis client (optional) |

### PII Detection & Masking

| Package | Version | Description |
|---------|---------|-------------|
| `validator` | ^13.x | Email/phone validation |
| Custom regex | - | Russian PII patterns |

### Diff Computation

| Package | Version | Description |
|---------|---------|-------------|
| `diff` | ^7.x | Text diff library |
| `fast-diff` | ^1.3.x | Lightweight diff |

### Utilities

| Package | Version | Description |
|---------|---------|-------------|
| `dotenv` | ^16.x | Environment variables |
| `pino` | ^9.x | Fast structured logging |
| `pino-pretty` | ^13.x | Dev log formatting |
| `crypto` | built-in | Hashing for deduplication |
| `uuid` | ^11.x | UUID generation |

### Circuit Breaker

| Package | Version | Description |
|---------|---------|-------------|
| `opossum` | ^8.x | Circuit breaker pattern |

### Development & Testing

| Package | Version | Description |
|---------|---------|-------------|
| `vitest` | ^3.x | Testing framework |
| `supertest` | ^7.x | HTTP testing |
| `tsx` | ^4.x | TypeScript runner |
| `eslint` | ^9.x | Linting |
| `prettier` | ^3.x | Code formatting |
| `@types/node` | ^22.x | Node.js types |

---

## Database & Authentication (Supabase)

### Why Supabase?

| Benefit | Description |
|---------|-------------|
| **Managed PostgreSQL** | No DB administration overhead |
| **Built-in Auth** | JWT-based auth out of the box |
| **Row Level Security** | Fine-grained access control |
| **Real-time** | Optional real-time subscriptions |
| **No Vendor Lock** | Standard PostgreSQL, exportable |

### Supabase Services Used

| Service | Purpose |
|---------|---------|
| **PostgreSQL** | User data, subscriptions, usage logs |
| **Auth** | JWT authentication, session management |
| **Storage** | (Optional) User assets |

### Database Schema (Supabase)

```sql
-- Users table (managed by Supabase Auth)
-- auth.users is automatically created

-- User profiles (custom data)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) UNIQUE,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    paraphrase_count INTEGER DEFAULT 0,
    billing_period_start TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Usage log (anonymized, no raw text)
CREATE TABLE public.usage_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    action_type VARCHAR(50), -- 'paraphrase', 'check'
    mode VARCHAR(50),
    input_hash VARCHAR(64), -- SHA-256 hash (for deduplication)
    token_count INTEGER,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No raw text columns! Only metadata.

-- Subscriptions
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform VARCHAR(20), -- 'ios', 'android'
    product_id VARCHAR(100),
    receipt_data TEXT, -- encrypted
    status VARCHAR(50) DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Supabase Configuration

```typescript
// supabase/config.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side client with service role (for backend)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// For JWT verification
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
```

---

## LLM Integration (OpenRouter)

### Why OpenRouter?

| Benefit | Description |
|---------|-------------|
| **Model Flexibility** | Access OpenAI, Anthropic, Meta, etc. |
| **Single API** | One integration, multiple providers |
| **Cost Optimization** | Route to cheapest capable model |
| **Fallback** | Automatic failover between models |
| **No Vendor Lock** | Switch models without code changes |

### OpenRouter Configuration

```typescript
// services/llm/openrouter.ts
import OpenAI from 'openai';

// OpenRouter is OpenAI API-compatible
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!, // SERVER-SIDE ONLY!
  defaultHeaders: {
    'HTTP-Referer': 'https://reword.ai',
    'X-Title': 'Reword AI Keyboard'
  }
});

export const llmConfig = {
  // Primary model for paraphrasing
  model: 'openai/gpt-4o-mini', // or 'anthropic/claude-3-haiku'
  temperature: 0.2, // Low for deterministic output
  max_tokens: 2048,
  top_p: 1.0
};

// Alternative models for fallback
export const fallbackModels = [
  'anthropic/claude-3-haiku',
  'meta-llama/llama-3.1-8b-instruct',
  'google/gemini-flash-1.5'
];
```

### LLM Models for Russian

| Model | Provider | Quality | Cost | Notes |
|-------|----------|---------|------|-------|
| `gpt-4o-mini` | OpenAI | Excellent | $$ | Best Russian quality |
| `claude-3-haiku` | Anthropic | Very Good | $ | Fast, cost-effective |
| `llama-3.1-8b` | Meta | Good | $ | Self-host option |
| `gemini-flash-1.5` | Google | Good | $ | Fast inference |

### Prompt Templates

```typescript
// services/llm/prompts.ts
export const systemPrompt = `
Ты — ассистент по перефразированию текста на русском языке. 
Сохраняй смысл, не добавляй фактов. 
Оставляй английские слова без изменений. 
Не используй эмодзи. 
Запрещены оскорбления.
Формат ответа: только итоговый текст, без объяснений.
`.trim();

export const modeInstructions: Record<string, string> = {
  shorten: 'Сократи текст максимально, сохранив основной смысл.',
  expand: 'Расширь текст, добавив деталей и пояснений.',
  formal: 'Преобразуй в формальный стиль. Без сокращений и разговорных оборотов.',
  friendly: 'Сделай текст тёплым и дружелюбным, сохрани смысл.',
  confident: 'Сделай текст уверенным и убедительным.',
  professional: 'Преобразуй в профессиональный деловой стиль.',
  colloquial: 'Сделай текст разговорным, естественным.',
  empathetic: 'Добавь эмпатии и понимания в текст.'
};
```

---

## Caching Layer

### Redis (Optional but Recommended)

| Use Case | Key Pattern | TTL |
|----------|-------------|-----|
| Paraphrase cache | `cache:paraphrase:{input_hash}:{mode}` | 24h |
| Rate limiting | `rate:{user_id}` | 1min |
| Quota tracking | `quota:{user_id}:{period}` | 30d |

### Cache Configuration

```typescript
// services/cache/redis.ts
import Redis from 'ioredis';

const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL)
  : null; // Fallback to in-memory if no Redis

export async function getCachedParaphrase(
  inputHash: string, 
  mode: string
): Promise<string | null> {
  if (!redis) return null;
  return redis.get(`cache:paraphrase:${inputHash}:${mode}`);
}

export async function cacheParaphrase(
  inputHash: string, 
  mode: string, 
  output: string
): Promise<void> {
  if (!redis) return;
  await redis.set(
    `cache:paraphrase:${inputHash}:${mode}`, 
    output, 
    'EX', 
    86400 // 24 hours
  );
}
```

---

## Server Responsibilities

### Mandatory Backend Functions

| Responsibility | Implementation |
|----------------|----------------|
| **JWT Validation** | Verify Supabase JWT on every request |
| **Subscription Check** | Query Supabase for active subscription |
| **Quota Enforcement** | Track usage, enforce free tier limits |
| **Rate Limiting** | Fastify rate-limit plugin |
| **PII Masking** | Mask before sending to LLM |
| **Text Hashing** | SHA-256 for deduplication cache |
| **LLM Proxy** | Single point of LLM access |
| **Diff Generation** | Compute input/output diff |
| **Token Accounting** | Track token usage for billing |
| **Circuit Breaker** | Handle LLM service failures |
| **Metadata Logging** | Log latency, counts (no raw text) |

### API Endpoint: POST /v1/paraphrase

```typescript
// routes/v1/paraphrase.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const paraphraseSchema = z.object({
  text: z.string().min(1).max(10000),
  mode: z.enum([
    'shorten', 'expand', 'formal', 'friendly',
    'confident', 'professional', 'colloquial', 'empathetic'
  ]),
  preserve_english: z.boolean().default(true)
});

export async function paraphraseRoute(fastify: FastifyInstance) {
  fastify.post('/v1/paraphrase', {
    preHandler: [
      fastify.authenticate,  // 1. Verify JWT (Supabase)
    ]
  }, async (request, reply) => {
    const startTime = Date.now();
    const user = request.user; // from JWT
    
    // 2. Validate input
    const { text, mode, preserve_english } = paraphraseSchema.parse(request.body);
    
    // 3. Check subscription & quota
    const { canProceed, remaining } = await checkQuota(user.id);
    if (!canProceed) {
      return reply.code(402).send({ 
        error: 'quota_exceeded',
        message: 'Лимит бесплатных перефразов исчерпан',
        upgrade_url: '/subscription/plans'
      });
    }
    
    // 4. PII Masking (BEFORE LLM call)
    const { maskedText, masks } = maskPII(text);
    
    // 5. Check cache (hash of masked text + mode)
    const inputHash = hashText(maskedText);
    const cached = await getCachedParaphrase(inputHash, mode);
    if (cached) {
      const unmasked = unmaskPII(cached, masks);
      return reply.send({
        output_text: unmasked,
        diff: computeDiff(text, unmasked),
        cached: true,
        latency_ms: Date.now() - startTime
      });
    }
    
    // 6. Call OpenRouter (through circuit breaker)
    const llmResult = await callLLM(maskedText, mode, preserve_english);
    
    // 7. Unmask PII in result
    const outputText = unmaskPII(llmResult, masks);
    
    // 8. Compute diff
    const diff = computeDiff(text, outputText);
    
    // 9. Cache result
    await cacheParaphrase(inputHash, mode, llmResult);
    
    // 10. Update quota
    await incrementUsage(user.id);
    
    // 11. Log metadata only (no raw text!)
    logUsage({
      user_id: user.id,
      action: 'paraphrase',
      mode,
      input_hash: inputHash,
      token_count: countTokens(maskedText),
      latency_ms: Date.now() - startTime
    });
    
    // 12. Return response
    return reply.send({
      output_text: outputText,
      diff,
      remaining_quota: remaining - 1,
      latency_ms: Date.now() - startTime
    });
  });
}
```

### Response Format

```typescript
interface ParaphraseResponse {
  request_id: string;
  output_text: string;
  diff: DiffSegment[];
  remaining_quota: number;
  latency_ms: number;
}

interface DiffSegment {
  type: 'delete' | 'insert' | 'equal';
  start: number;
  end: number;
  text: string;
}
```

---

## Security Model

### Transport Security

| Layer | Implementation |
|-------|----------------|
| Protocol | TLS 1.3 (minimum 1.2) |
| HSTS | Strict-Transport-Security header |
| Certificate | Let's Encrypt (auto-renewal) |

### Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                       │
└──────────────────────────────────────────────────────────────┘

1. Client login via Supabase Auth
   └─> Supabase returns JWT + Refresh Token

2. Client stores tokens securely
   └─> iOS: Keychain
   └─> Android: EncryptedSharedPreferences
   └─> RN: expo-secure-store

3. Client sends request with JWT
   └─> Authorization: Bearer <JWT>

4. Backend validates JWT
   └─> Verify signature with Supabase public key
   └─> Check expiration
   └─> Extract user_id

5. Backend checks subscription
   └─> Query Supabase profiles table
   └─> Verify subscription status
```

### API Key Security

| Rule | Implementation |
|------|----------------|
| **OpenRouter Key** | Server environment variable only |
| **Supabase Service Key** | Server environment variable only |
| **Client Keys** | Only Supabase Anon Key (public) |

### Data Security

| Data Type | Protection |
|-----------|------------|
| At Rest | Supabase encryption (AES-256) |
| In Transit | TLS 1.3 |
| JWT | RS256 signature |
| PII | Masked before LLM, never stored |
| Raw Text | Never persisted, never logged |

---

## PII Masking Layer

### Masked Categories

| Category | Pattern | Mask |
|----------|---------|------|
| Email | `user@example.com` | `[EMAIL_1]` |
| Phone (RU) | `+7 (999) 123-45-67` | `[PHONE_1]` |
| Phone (int) | `+1-555-123-4567` | `[PHONE_2]` |
| Credit Card | `4111-1111-1111-1111` | `[CARD_1]` |
| Russian Passport | `12 34 567890` | `[PASSPORT_1]` |
| SNILS | `123-456-789 01` | `[SNILS_1]` |
| INN | `123456789012` | `[INN_1]` |

### PII Masking Implementation

```typescript
// services/pii/masker.ts
interface MaskResult {
  maskedText: string;
  masks: Map<string, string>; // [PHONE_1] -> "+7 999 123-45-67"
}

const patterns = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phoneRu: /\+?7[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}/g,
  phoneInt: /\+[1-9][0-9]{0,2}[\s\-]?[0-9]{3,4}[\s\-]?[0-9]{3,4}[\s\-]?[0-9]{2,4}/g,
  creditCard: /[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}/g,
  passportRu: /[0-9]{2}[\s]?[0-9]{2}[\s]?[0-9]{6}/g,
  snils: /[0-9]{3}[\s\-]?[0-9]{3}[\s\-]?[0-9]{3}[\s]?[0-9]{2}/g,
  inn: /[0-9]{10,12}/g
};

export function maskPII(text: string): MaskResult {
  const masks = new Map<string, string>();
  let maskedText = text;
  let counter: Record<string, number> = {};
  
  for (const [type, pattern] of Object.entries(patterns)) {
    counter[type] = 0;
    maskedText = maskedText.replace(pattern, (match) => {
      counter[type]++;
      const placeholder = `[${type.toUpperCase()}_${counter[type]}]`;
      masks.set(placeholder, match);
      return placeholder;
    });
  }
  
  return { maskedText, masks };
}

export function unmaskPII(text: string, masks: Map<string, string>): string {
  let result = text;
  for (const [placeholder, original] of masks) {
    result = result.replace(placeholder, original);
  }
  return result;
}
```

---

## Hosting & Infrastructure

### Recommended Hosting Options (Vendor-Neutral)

| Provider | Type | Pros | Cons |
|----------|------|------|------|
| **Render** | PaaS | Simple, auto-scaling, free tier | Limited regions |
| **Railway** | PaaS | Easy deploy, good DX | Newer platform |
| **Fly.io** | Edge | Global edge, fast | More complex config |
| **DigitalOcean App Platform** | PaaS | Simple, predictable pricing | Less features |

### Recommended Setup (MVP)

| Service | Provider | Tier | Cost |
|---------|----------|------|------|
| Backend API | Render | Starter ($7/mo) | ~$7/mo |
| Database | Supabase | Free → Pro | $0-25/mo |
| Redis | Upstash | Free tier | $0/mo |
| Domain/CDN | Cloudflare | Free | $0/mo |

### Environment Variables

```bash
# .env (SERVER ONLY - NEVER COMMIT!)

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...  # Public, OK for client
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # SECRET - server only!

# OpenRouter (LLM)
OPENROUTER_API_KEY=sk-or-...  # SECRET - server only!

# Redis (optional)
REDIS_URL=redis://default:xxx@xxx.upstash.io:6379

# App
NODE_ENV=production
PORT=3000
```

### Deployment Configuration (Render)

```yaml
# render.yaml
services:
  - type: web
    name: reword-api
    runtime: node
    buildCommand: npm ci && npm run build
    startCommand: npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: OPENROUTER_API_KEY
        sync: false
    healthCheckPath: /health
    autoDeploy: true
```

---

## DevOps & CI/CD

### Container Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | 27.x | Containerization |
| Docker Compose | 2.32.x | Local development |

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy API

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Render
        uses: johnbeynon/render-deploy-action@v0.0.8
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}
```

### Dockerfile

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

## Testing & Quality Assurance

### Backend Testing

| Tool | Purpose |
|------|---------|
| Vitest | Unit & integration tests |
| Supertest | HTTP endpoint testing |
| MSW | Mock Service Worker for LLM |

### Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist']
    }
  }
});
```

### Example Test

```typescript
// tests/paraphrase.test.ts
import { describe, it, expect, vi } from 'vitest';
import { maskPII, unmaskPII } from '../src/services/pii/masker';

describe('PII Masking', () => {
  it('should mask Russian phone numbers', () => {
    const input = 'Позвоните мне: +7 999 123-45-67';
    const { maskedText, masks } = maskPII(input);
    
    expect(maskedText).toBe('Позвоните мне: [PHONERU_1]');
    expect(masks.get('[PHONERU_1]')).toBe('+7 999 123-45-67');
  });
  
  it('should unmask correctly', () => {
    const masks = new Map([['[EMAIL_1]', 'test@example.com']]);
    const result = unmaskPII('Мой email: [EMAIL_1]', masks);
    
    expect(result).toBe('Мой email: test@example.com');
  });
});
```

### Mobile Testing

| Tool | Purpose |
|------|---------|
| Jest | Unit tests |
| Detox | E2E testing |
| React Native Testing Library | Component tests |

### Code Quality

| Tool | Purpose | Config |
|------|---------|--------|
| ESLint | Linting | `eslint.config.js` |
| Prettier | Formatting | `.prettierrc` |
| TypeScript | Type checking | `tsconfig.json` |
| Husky | Git hooks | `.husky/` |

---

## Analytics & Monitoring

### Application Monitoring

| Tool | Purpose |
|------|---------|
| Sentry | Error tracking |
| Uptime Robot | Uptime monitoring |
| Render Metrics | Basic metrics (if using Render) |

### Logging (Metadata Only)

```typescript
// services/logging.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization'], // Never log tokens
});

// CORRECT: Log metadata only
logger.info({
  event: 'paraphrase_request',
  user_id_hash: hashUserId(userId),
  mode: 'friendly',
  input_length: text.length,
  latency_ms: 420,
  token_count: 150
});

// FORBIDDEN: Never log raw text
// logger.info({ text: userInput }); // ❌ NEVER DO THIS
```

### Mobile Analytics

| Tool | Purpose |
|------|---------|
| Firebase Analytics | User events |
| Sentry | Crash reporting |

---

## Compatibility Matrix

### Node.js Backend

| Package | Min Version | Max Version | Notes |
|---------|-------------|-------------|-------|
| node | 20.x | 22.x | 22 LTS recommended |
| fastify | 5.0.0 | 5.x | Latest stable |
| typescript | 5.5.0 | 5.9.x | - |
| @supabase/supabase-js | 2.45.0 | 2.49.x | - |
| zod | 3.22.0 | 3.25.x | - |

### React Native + Expo SDK 54

| Package | Min Version | Max Version | Notes |
|---------|-------------|-------------|-------|
| react | 18.3.1 | 18.3.x | Required |
| react-native | 0.79.0 | 0.79.x | Expo SDK 54 |
| @supabase/supabase-js | 2.45.0 | 2.49.x | Same as backend |

### iOS Keyboard Extension

| Requirement | Version |
|-------------|---------|
| iOS | 15.0+ |
| Swift | 5.10+ |
| Xcode | 16.0+ |

### Android Keyboard Extension

| Requirement | Version |
|-------------|---------|
| Android | API 24+ (7.0) |
| Kotlin | 2.0.x |
| Gradle | 8.8.x |

---

## Quick Start Commands

### Backend (Node.js)

```bash
# Clone and setup
cd backend
npm install

# Setup environment
cp .env.example .env
# Edit .env with your Supabase and OpenRouter keys

# Development
npm run dev

# Build
npm run build

# Production
npm run start

# Test
npm run test
```

### Mobile App

```bash
# Install dependencies
cd mobile
npm install

# Start development
npx expo start

# Build iOS
eas build --platform ios

# Build Android
eas build --platform android
```

### Docker (Local Development)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

---

## Package.json (Backend Reference)

```json
{
  "name": "reword-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  },
  "dependencies": {
    "fastify": "^5.0.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/helmet": "^13.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "@supabase/supabase-js": "^2.49.0",
    "openai": "^4.70.0",
    "ioredis": "^5.4.0",
    "zod": "^3.25.0",
    "diff": "^7.0.0",
    "gpt-tokenizer": "^2.5.0",
    "opossum": "^8.1.0",
    "pino": "^9.5.0",
    "dotenv": "^16.4.0",
    "uuid": "^11.0.0",
    "validator": "^13.12.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/validator": "^13.12.0",
    "typescript": "^5.9.0",
    "tsx": "^4.19.0",
    "vitest": "^3.0.0",
    "supertest": "^7.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.5.0",
    "pino-pretty": "^13.0.0"
  }
}
```

---

## Migration Notes (from Previous Architecture)

### Removed (Yandex.Cloud specific)

- ❌ Yandex Compute Cloud
- ❌ Yandex Managed PostgreSQL
- ❌ Yandex Managed Redis
- ❌ Yandex Object Storage
- ❌ Yandex Cloud IAM/SDK
- ❌ Yandex Container Registry
- ❌ Yandex Cloud Logging

### Replaced

| Old | New |
|-----|-----|
| Python + FastAPI | Node.js + Fastify + TypeScript |
| Standalone PostgreSQL | Supabase (PostgreSQL + Auth) |
| Direct OpenAI calls | OpenRouter (LLM proxy) |
| Self-managed auth | Supabase Auth |
| Cloud-specific hosting | Vendor-neutral PaaS |

### Preserved

- ✅ React Native + Expo (mobile app)
- ✅ Swift iOS keyboard extension
- ✅ Kotlin Android keyboard extension
- ✅ Freemium business model
- ✅ Paraphrase modes (8 types)
- ✅ Diff highlighting (red/green)
- ✅ On-device spellcheck
- ✅ API contract structure (`POST /v1/paraphrase`)

---

*Document maintained by Technical Architecture Team*  
*Architecture: Vendor-Neutral, Server-Side Proxy, Security-First*
