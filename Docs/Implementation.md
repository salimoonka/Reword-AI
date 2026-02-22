# Implementation Plan for Reword AI

> Comprehensive implementation plan for the Russian AI Keyboard MVP  
> App Name: **Reword AI**  
> Last Updated: February 2026

---

## Feature Analysis

### Identified Features

| # | Feature | Description | Type |
|---|---------|-------------|------|
| 1 | Native Keyboard (iOS/Android) | Russian keyboard with standard layout, suggestion strip | Native |
| 2 | Local Spellcheck | On-device spell checking using dictionary + Levenshtein | Native |
| 3 | Morphological Analysis | Agreement checking (gender/case/number) | Native |
| 4 | Punctuation Rules Engine | Basic punctuation correction | Native |
| 5 | Floating Preview Panel | Popup over keyboard showing diff/results | Native |
| 6 | Diff Highlighting | Red (errors) / Green (corrections) highlights | Native |
| 7 | AI Paraphrase (Cloud) | LLM-based text rewriting with modes | Full-stack |
| 8 | Paraphrase Modes | Shorten, Expand, Formal, Friendly, etc. | Full-stack |
| 9 | English Token Preservation | Keep English words unchanged | Backend |
| 10 | Onboarding Flow | Enable keyboard + Full Access explanation | Frontend |
| 11 | Notes Editor | Demo text editor in companion app | Frontend |
| 12 | Settings Screen | Theme, local/online mode, subscription | Frontend |
| 13 | In-App Purchases | PRO subscription 199 ₽/month | Full-stack |
| 14 | Freemium Limits | X free paraphrases per month | Full-stack |
| 15 | PII Masking | Phone/email masking before LLM | Backend |
| 16 | User Data Deletion | GDPR-style data purge API | Backend |
| 17 | Analytics Events | Install, enable, paraphrase tracking | Full-stack |
| 18 | Caching System | Redis cache for paraphrase results | Backend |

### Feature Categorization

#### Must-Have Features (MVP)
- Native keyboard (iOS + Android) with RU layout
- Local spellcheck with red highlighting
- Floating preview panel with diff view
- AI paraphrase with 8 modes
- Onboarding flow (enable keyboard instructions)
- Settings screen (theme, local/online toggle)
- In-app purchase / subscription
- Freemium limits
- PII masking
- TLS encryption

#### Should-Have Features
- Morphological analysis (agreement checks)
- Punctuation rules engine
- Notes editor for testing
- Analytics events tracking
- Paraphrase result caching

#### Nice-to-Have Features
- User data deletion API
- Advanced autocomplete suggestions
- Voice input support
- Theme customization (multiple colors)
- Usage statistics dashboard

---

## Recommended Tech Stack

### Frontend (React Native Companion App)

| Technology | Version | Justification |
|------------|---------|---------------|
| **React Native** | 0.79.x | Cross-platform, native performance |
| **Expo** | SDK 54 | Rapid development, OTA updates |
| **TypeScript** | 5.9.x | Type safety, better DX |
| **Supabase Client** | 2.49.x | Auth & data access |

**Documentation:**
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Docs](https://docs.expo.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase JS](https://supabase.com/docs/reference/javascript)

### Native Keyboard Extensions

| Platform | Technology | Version | Justification |
|----------|------------|---------|---------------|
| **iOS** | Swift | 5.10+ | Native performance, memory constraints |
| **Android** | Kotlin | 2.0.x | Modern Android development |

**Documentation:**
- [Apple Custom Keyboard Guide](https://developer.apple.com/documentation/uikit/keyboards_and_input/creating_a_custom_keyboard)
- [Android Input Method Guide](https://developer.android.com/develop/ui/views/touch-and-input/creating-input-method)
- [KeyboardKit (Swift)](https://keyboardkit.github.io/KeyboardKit/)

### Backend (Node.js)

| Technology | Version | Justification |
|------------|---------|---------------|
| **Node.js** | 22.x LTS | Modern runtime, excellent performance |
| **Fastify** | 5.x | High performance web framework |
| **TypeScript** | 5.9.x | Type safety, shared types with frontend |
| **Zod** | 3.25.x | Schema validation |

**Documentation:**
- [Fastify Docs](https://fastify.dev/docs/latest/)
- [Node.js Docs](https://nodejs.org/docs/latest-v22.x/api/)
- [Zod Docs](https://zod.dev/)

### Database & Auth (Supabase)

| Technology | Version | Justification |
|------------|---------|---------------|
| **Supabase** | Managed | PostgreSQL + Auth + RLS |
| **PostgreSQL** | 15.x | Supabase managed, no admin overhead |
| **Supabase Auth** | Managed | JWT-based, built-in user management |

**Documentation:**
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

### LLM Integration (OpenRouter)

| Technology | Version | Justification |
|------------|---------|---------------|
| **OpenRouter** | REST API | Multi-model access, no vendor lock |
| **OpenAI SDK** | 4.x | OpenRouter is OpenAI-compatible |
| **gpt-tokenizer** | 2.x | Token counting |

**Documentation:**
- [OpenRouter Docs](https://openrouter.ai/docs)
- [OpenRouter Models](https://openrouter.ai/models)

### Caching (Optional)

| Technology | Version | Justification |
|------------|---------|---------------|
| **Redis** | 7.4.x | Paraphrase caching, rate limiting |
| **Upstash** | Managed | Serverless Redis, free tier available |

**Documentation:**
- [Upstash Redis](https://upstash.com/docs/redis/overall/getstarted)

### Hosting (Vendor-Neutral)

| Service | Provider | Justification |
|---------|----------|---------------|
| **Backend** | Render / Railway / Fly.io | Simple PaaS, no vendor lock |
| **Database** | Supabase | Managed PostgreSQL |
| **CDN** | Cloudflare | Free tier, global edge |

### Additional Tools

| Category | Technology | Version | Justification |
|----------|------------|---------|---------------|
| **State Management** | Zustand | 5.0.8 | Lightweight, simple API |
| **Navigation** | React Navigation | 7.x | Industry standard for RN |
| **HTTP Client** | Axios | 1.9.x | Robust, interceptors support |
| **IAP** | react-native-iap | 14.x | Both platforms supported |
| **Circuit Breaker** | Opossum | 8.x | LLM failure handling |

**Documentation:**
- [Zustand](https://zustand-demo.pmnd.rs/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [react-native-iap](https://react-native-iap.dooboolab.com/)
- [Opossum](https://nodeshift.dev/opossum/)

---

## Implementation Stages

### Stage 1: Foundation & Setup
**Dependencies:** None  
**Duration:** 2 weeks  
**Goal:** Project infrastructure and development environment

#### Sub-steps:

- [x] 1.1. Initialize React Native project with Expo SDK 54
- [x] 1.2. Set up TypeScript configuration and ESLint/Prettier
- [x] 1.3. Create iOS Keyboard Extension target in Xcode *(Swift files implemented, needs Xcode project integration)*
- [x] 1.4. Create Android InputMethodService module *(16 Kotlin files + 3 XML resources implemented in mobile/android/)*
- [x] 1.5. Initialize Node.js + Fastify + TypeScript backend project
- [x] 1.6. Set up Supabase project (PostgreSQL + Auth)
- [x] 1.7. Configure Supabase database schema (profiles, usage_log, subscriptions)
- [x] 1.8. Set up Supabase Row Level Security policies
- [x] 1.9. Configure Redis (Upstash) for caching (optional) *(implemented via Supabase paraphrase_cache table with 24h TTL)*
- [ ] 1.10. Set up hosting environment (Render/Railway/Fly.io)
- [ ] 1.11. Configure CI/CD pipeline (GitHub Actions)
- [x] 1.12. Set up development environment documentation — `Docs/DEVELOPMENT.md` updated with full test setup

**Deliverables:**
- Working RN app shell with Supabase client
- Empty keyboard extensions (iOS/Android)
- Node.js backend skeleton with health endpoints
- Supabase database with RLS policies
- CI/CD deploying to staging

---

### Stage 2: Core Keyboard Features
**Dependencies:** Stage 1 completion  
**Duration:** 4 weeks  
**Goal:** Functional keyboard with local spellcheck

#### Sub-steps:

- [x] 2.1. Implement Russian keyboard layout (iOS - Swift)
- [x] 2.2. Implement Russian keyboard layout (Android - Kotlin) *(KeyboardView.kt with ЙЦУКЕН layout, shift/caps, suggestion strip)*
- [x] 2.3. Integrate Hunspell Russian dictionary for spellcheck *(UITextChecker + Levenshtein + RussianDictionary on both platforms)*
- [x] 2.4. Implement Trie-based word lookup for suggestions
- [x] 2.5. Create floating preview panel UI component
- [x] 2.6. Implement diff highlighting (red/green) renderer
- [x] 2.7. Add suggestion strip with autocomplete
- [x] 2.8. Implement "Проверить" (Check) button functionality
- [x] 2.9. Create action buttons row (keyboard, undo, copy, confirm)
- [x] 2.10. Implement text insertion back to input field
- [x] 2.11. Add basic punctuation rules engine *(implemented but not yet wired into keyboard flow)*
- [x] 2.12. Implement English token preservation logic (tokenizer)
- [x] 2.13. Set up App Group (iOS) / SharedPreferences (Android) for RN-Native communication *(both platforms done — iOS App Group + Android SharedPreferences with RN bridge modules)*
- [x] 2.14. Performance optimization (<10ms per token check)

**Deliverables:**
- Functional keyboard typing in any app
- Local spellcheck with visual feedback
- Floating panel showing corrections
- Insert corrected text on confirm

---

### Stage 3: Backend & AI Integration
**Dependencies:** Stage 2 completion  
**Duration:** 3 weeks  
**Goal:** Cloud paraphrase API fully operational with server-side LLM proxy

#### Sub-steps:

- [x] 3.1. Implement `/v1/paraphrase` endpoint with full server responsibilities
- [x] 3.2. Implement `/v1/check` endpoint (server-side grammar)
- [x] 3.3. Integrate OpenRouter as LLM proxy (NEVER expose API keys to client)
- [x] 3.4. Create prompt templates for all 8 modes (Shorten, Expand, Formal, Friendly, Confident, Professional, Colloquial, Empathetic)
- [x] 3.5. Implement PII masking layer (emails, phones, cards, passports, INN, SNILS)
- [x] 3.6. Implement diff computation (input vs output)
- [x] 3.7. Implement text hashing for deduplication/cache
- [x] 3.8. Set up Redis caching for paraphrase results (optional) *(implemented via Supabase cache table)*
- [x] 3.9. Implement rate limiting with @fastify/rate-limit
- [x] 3.10. Implement Supabase JWT validation middleware
- [x] 3.11. Implement subscription verification service
- [x] 3.12. Implement quota tracking & enforcement
- [x] 3.13. Add circuit breaker for LLM failures (Opossum)
- [x] 3.14. Implement token accounting for billing
- [x] 3.15. Add structured logging with Pino (metadata only, NO raw text)
- [x] 3.16. Add request validation with Zod schemas

**Server Responsibilities (MANDATORY):**
- ✓ JWT validation (Supabase Auth)
- ✓ Subscription verification
- ✓ Quota management & rate limiting
- ✓ PII masking before LLM
- ✓ Text hash for deduplication
- ✓ LLM proxy (all calls through backend)
- ✓ Diff generation
- ✓ Token accounting
- ✓ Metadata-only logging

**Deliverables:**
- Paraphrase API with server-side proxy architecture
- All 8 modes working correctly
- PII masked before any LLM call
- Usage quotas enforced
- Supabase Auth integration working
- No API keys exposed to client

---

### Stage 4: React Native Companion App
**Dependencies:** Stage 1 completion (can run parallel with Stage 2-3)  
**Duration:** 3 weeks  
**Goal:** Complete companion app with onboarding, settings, notes

#### Sub-steps:

- [x] 4.1. Set up React Navigation with stack/tab navigators
- [x] 4.2. Create Onboarding Screen 1 (value proposition + Add Keyboard button)
- [x] 4.3. Create Onboarding Screen 2 (iOS/Android keyboard enable instructions)
- [x] 4.4. Implement Full Access explanation modal
- [x] 4.5. Create Settings screen (theme toggle, local/online mode)
- [x] 4.6. Implement theme system (auto/dark/light)
- [x] 4.7. Create Notes editor screen with our keyboard
- [x] 4.8. Add subscription status display in settings
- [x] 4.9. Implement usage quota display (X paraphrases left)
- [x] 4.10. Set up Zustand stores (user, settings, subscription)
- [x] 4.11. Implement secure token storage (expo-secure-store)
- [x] 4.12. Create API service layer with Axios
- [x] 4.13. Add error handling and retry logic
- [x] 4.14. Implement deep linking for keyboard settings

**Deliverables:**
- Complete onboarding flow
- Working settings screen
- Notes editor for testing
- Theme switching works
- App communicates with backend

---

### Stage 5: Keyboard-Cloud Integration
**Dependencies:** Stage 2, Stage 3, Stage 4 completion  
**Duration:** 2 weeks  
**Goal:** Connect keyboard to cloud paraphrase service

#### Sub-steps:

- [x] 5.1. Implement "Перефразировать" button in keyboard
- [x] 5.2. Create mode selection chips (horizontal scroller)
- [x] 5.3. Connect keyboard to backend API (iOS) *(⚠ App Group ID mismatch — APIService uses "group.ai.reword.keyboard" vs SharedStorage "group.ai.reword.app")*
- [x] 5.4. Connect keyboard to backend API (Android) *(APIService.kt with HttpURLConnection + Gson, reads auth from SharedPreferences)*
- [x] 5.5. Display paraphrase result in floating panel
- [x] 5.6. Show loading state during API call
- [x] 5.7. Handle errors gracefully (network, quota exceeded)
- [x] 5.8. Implement "magic" quick action button
- [x] 5.9. Add copy to clipboard functionality
- [x] 5.10. Implement undo/redo in preview
- [x] 5.11. Polish diff display with proper red/green highlighting
- [x] 5.12. Add haptic feedback on actions

**Deliverables:**
- Full paraphrase flow working end-to-end
- All modes accessible from keyboard
- Error states handled gracefully
- Polish UX interactions

---

### Stage 6: Billing & Monetization
**Dependencies:** Stage 4, Stage 5 completion  
**Duration:** 2 weeks  
**Goal:** In-app purchases and subscription management

#### Sub-steps:

- [ ] 6.1. Configure App Store Connect products (199 ₽/month subscription)
- [ ] 6.2. Configure Google Play Console products
- [x] 6.3. Integrate react-native-iap for purchases
- [x] 6.4. Implement purchase flow UI (Go PRO screen)
- [x] 6.5. Create backend subscription verification endpoint
- [x] 6.6. Implement App Store receipt validation (server-side)
- [x] 6.7. Implement Google Play receipt validation (server-side) *(⚠ stub only — trusts any receipt, TODO: implement real Google Play Developer API verification)*
- [x] 6.8. Store subscription data in Supabase (encrypted receipts)
- [x] 6.9. Update user subscription status on successful purchase
- [x] 6.10. Handle subscription renewal/expiration
- [x] 6.11. Implement quota reset on billing period start
- [x] 6.12. Add "Upgrade to PRO" CTA when quota exceeded
- [x] 6.13. Display subscription status in settings
- [x] 6.14. Implement restore purchases functionality

**Deliverables:**
- Working subscription purchase flow
- PRO unlocks unlimited paraphrases
- Subscription status synced with Supabase
- Restore purchases works

---

### Stage 7: Security & Privacy
**Dependencies:** Stage 3, Stage 5 completion  
**Duration:** 1.5 weeks  
**Goal:** Production-ready security measures with server-side proxy architecture

#### Sub-steps:

- [x] 7.1. Implement TLS 1.3 for all API communications
- [x] 7.2. Verify Supabase encryption at rest settings
- [x] 7.3. Ensure no raw text logging (metadata only in Pino logs)
- [x] 7.4. Implement `/v1/user/delete` endpoint (GDPR data purge)
- [x] 7.5. Add "Delete my data" button in settings (calls Supabase delete)
- [x] 7.6. Verify PII masking effectiveness (test all patterns)
- [x] 7.7. Implement "Local only" mode that blocks all cloud calls
- [x] 7.8. Security audit: verify no API keys in client bundles
- [x] 7.9. Security audit: verify all LLM calls go through backend
- [x] 7.10. Review App Store / Play Store privacy declarations
- [x] 7.11. Create privacy policy document
- [x] 7.12. Verify circuit breaker handles LLM failures gracefully

**Security Model Verification:**
- ✓ NO API keys in client code
- ✓ NO direct LLM calls from client
- ✓ NO raw text stored in database
- ✓ NO raw text in logs
- ✓ All LLM calls through backend proxy
- ✓ JWT validation on every request
- ✓ PII masking before LLM

**Deliverables:**
- All traffic encrypted
- No sensitive data in logs
- Users can delete their data
- Local-only mode works
- Privacy policy ready
- Server-side proxy verified

---

### Stage 8: Testing & QA
**Dependencies:** All previous stages  
**Duration:** 2 weeks  
**Goal:** Comprehensive testing before launch

#### Sub-steps:

- [x] 8.1. Write unit tests for backend services (Vitest) — 132 tests across 10 files
- [x] 8.2. Write unit tests for RN components (Jest) — 80 tests across 12 suites (4 stores, 6 components, 2 hooks)
- [x] 8.3. Create integration tests for API endpoints (Fastify inject)
- [ ] 8.4. Manual testing on iOS devices (iPhone 12-16 range)
- [ ] 8.5. Manual testing on Android devices (various manufacturers)
- [ ] 8.6. Test keyboard in multiple apps (Telegram, WhatsApp, Notes)
- [ ] 8.7. Performance testing (keyboard latency <10ms)
- [ ] 8.8. Load testing backend (target: 1000 concurrent users)
- [ ] 8.9. Test all paraphrase modes for quality
- [x] 8.10. Verify acceptance criteria from PRD (test-driven verification)
- [ ] 8.11. Accessibility testing
- [x] 8.12. Create test corpora for Russian paraphrase quality

**Deliverables:**
- >80% code coverage
- All acceptance criteria passed
- No critical bugs
- Performance benchmarks met

---

### Stage 9: Polish & Launch Preparation
**Dependencies:** Stage 8 completion  
**Duration:** 1.5 weeks  
**Goal:** Ready for App Store / Play Store submission

#### Sub-steps:

- [x] 9.1. Final UI polish (animations, transitions) — note card scale+stagger animation, onboarding fade-in, glassmorphism subscription page
- [ ] 9.2. Create App Store screenshots (required sizes)
- [ ] 9.3. Create Play Store screenshots
- [x] 9.4. Write App Store description (Russian) — `Docs/store-descriptions.md`
- [x] 9.5. Write Play Store description (Russian) — `Docs/store-descriptions.md`
- [ ] 9.6. Configure App Store Connect metadata
- [ ] 9.7. Configure Google Play Console metadata
- [x] 9.8. Set up production hosting (Dockerfile + .env template created)
- [ ] 9.9. Configure production Supabase project
- [ ] 9.10. Set up production monitoring (Sentry, Uptime Robot)
- [ ] 9.11. Deploy backend to production
- [ ] 9.12. Submit iOS app for review
- [ ] 9.13. Submit Android app for review
- [x] 9.14. Create launch checklist — `Docs/launch-checklist.md`
- [x] 9.15. Prepare rollback procedures — `Docs/rollback-procedures.md`

**Deliverables:**
- Apps submitted to both stores
- Production infrastructure running (vendor-neutral)
- Monitoring in place
- Launch documentation complete

---

## Timeline Summary

| Stage | Duration | Start | End |
|-------|----------|-------|-----|
| Stage 1: Foundation | 2 weeks | Week 1 | Week 2 |
| Stage 2: Core Keyboard | 4 weeks | Week 3 | Week 6 |
| Stage 3: Backend & AI | 3 weeks | Week 3 | Week 5 |
| Stage 4: RN Companion App | 3 weeks | Week 3 | Week 5 |
| Stage 5: Keyboard-Cloud Integration | 2 weeks | Week 7 | Week 8 |
| Stage 6: Billing | 2 weeks | Week 9 | Week 10 |
| Stage 7: Security | 1.5 weeks | Week 11 | Week 12 |
| Stage 8: Testing | 2 weeks | Week 12 | Week 14 |
| Stage 9: Launch Prep | 1.5 weeks | Week 14 | Week 15 |

**Total Estimated Duration:** ~15 weeks (parallel execution where possible)

---

## Resource Links

### Official Documentation
- [React Native](https://reactnative.dev/docs/getting-started)
- [Expo](https://docs.expo.dev/)
- [Fastify](https://fastify.dev/docs/latest/)
- [Node.js](https://nodejs.org/docs/latest-v22.x/api/)
- [Supabase](https://supabase.com/docs)
- [OpenRouter](https://openrouter.ai/docs)
- [Redis](https://redis.io/docs/)

### Native Keyboard Development
- [iOS Custom Keyboard](https://developer.apple.com/documentation/uikit/keyboards_and_input/creating_a_custom_keyboard)
- [Android InputMethodService](https://developer.android.com/develop/ui/views/touch-and-input/creating-input-method)
- [KeyboardKit (Swift)](https://keyboardkit.github.io/KeyboardKit/)

### Auth & Security
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

### In-App Purchases
- [react-native-iap](https://react-native-iap.dooboolab.com/)
- [App Store Connect](https://developer.apple.com/app-store-connect/)
- [Google Play Billing](https://developer.android.com/google/play/billing)

### Hosting
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app/)
- [Fly.io Docs](https://fly.io/docs/)

### Best Practices
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Fastify Best Practices](https://fastify.dev/docs/latest/Guides/Recommendations/)
- [12-Factor App](https://12factor.net/)

---

## Risk Mitigation Checklist

| Risk | Mitigation | Owner |
|------|------------|-------|
| iOS extension memory limits | Lightweight native code, defer to cloud | iOS Dev |
| Users refuse Full Access | Strong local-only mode, clear onboarding | Product |
| High LLM costs | Caching, rate limits, freemium, OpenRouter model flexibility | Backend |
| Poor paraphrase quality | Prompt tuning, test corpus, model switching via OpenRouter | AI/ML |
| App Store rejection | Follow guidelines, clear privacy policy | All |
| LLM service downtime | Circuit breaker, fallback models via OpenRouter | Backend |
| API key exposure | Server-side proxy architecture, no keys in client | Security |
| Vendor lock-in | Use Supabase (exportable), vendor-neutral hosting | Architecture |

---

*Document maintained by Development Team*  
*Reference: [PRD.md](PRD.md) | [AppMap.md](AppMap.md) | [TechStack.md](TechStack.md)*  
*Architecture: Node.js + Supabase + OpenRouter (Vendor-Neutral)*
