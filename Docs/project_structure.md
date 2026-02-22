# Project Structure — Reword AI

> Comprehensive folder structure and file organization for the Reword AI project  
> Last Updated: February 2026

---

## Root Directory Overview

```
reword-ai/
├── mobile/                    # React Native companion app (Expo)
├── keyboard-ios/              # iOS Keyboard Extension (Swift)
├── keyboard-android/          # Android Keyboard Extension (Kotlin)
├── backend/                   # Node.js + Fastify backend services
├── infrastructure/            # Render/Railway configs, Docker, CI/CD
├── docs/                      # Project documentation
├── scripts/                   # Utility scripts
└── shared/                    # Shared types, constants, assets
```

---

## Detailed Structure

### 1. Mobile App (React Native + Expo)

```
mobile/
├── app/                           # Expo Router app directory
│   ├── (tabs)/                    # Tab-based navigation
│   │   ├── _layout.tsx            # Tab layout configuration
│   │   ├── index.tsx              # Home / Notes screen
│   │   └── settings.tsx           # Settings screen
│   ├── onboarding/                # Onboarding flow
│   │   ├── _layout.tsx            # Onboarding stack layout
│   │   ├── welcome.tsx            # Screen 1: Value proposition
│   │   ├── enable-keyboard.tsx    # Screen 2: Enable keyboard instructions
│   │   └── full-access.tsx        # Screen 3: Full Access explanation
│   ├── subscription/              # Subscription/billing screens
│   │   ├── _layout.tsx
│   │   ├── plans.tsx              # PRO plans display
│   │   └── success.tsx            # Purchase success
│   ├── _layout.tsx                # Root layout
│   └── +not-found.tsx             # 404 screen
│
├── src/
│   ├── components/                # Reusable UI components
│   │   ├── ui/                    # Base UI elements
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Switch.tsx
│   │   │   └── Text.tsx
│   │   ├── notes/                 # Notes editor components
│   │   │   ├── NotesEditor.tsx
│   │   │   └── NotesToolbar.tsx
│   │   ├── settings/              # Settings components
│   │   │   ├── SettingsRow.tsx
│   │   │   ├── ThemeSelector.tsx
│   │   │   └── SubscriptionCard.tsx
│   │   ├── onboarding/            # Onboarding components
│   │   │   ├── OnboardingSlide.tsx
│   │   │   ├── KeyboardSteps.tsx
│   │   │   └── PrivacyInfo.tsx
│   │   └── common/                # Common components
│   │       ├── Header.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── useSubscription.ts     # Subscription status hook
│   │   ├── useTheme.ts            # Theme management hook
│   │   ├── useKeyboardStatus.ts   # Keyboard enabled check
│   │   ├── useApi.ts              # API calls hook
│   │   └── useQuota.ts            # Usage quota hook
│   │
│   ├── services/                  # API and external services
│   │   ├── api/
│   │   │   ├── client.ts          # Axios instance configuration
│   │   │   ├── auth.ts            # Authentication endpoints
│   │   │   ├── paraphrase.ts      # Paraphrase API calls
│   │   │   ├── user.ts            # User management
│   │   │   └── types.ts           # API response types
│   │   ├── storage/
│   │   │   ├── secureStore.ts     # Secure token storage
│   │   │   └── mmkv.ts            # MMKV key-value storage
│   │   └── iap/
│   │       ├── purchase.ts        # In-app purchase logic
│   │       └── products.ts        # Product IDs and config
│   │
│   ├── stores/                    # Zustand state stores
│   │   ├── useUserStore.ts        # User state
│   │   ├── useSettingsStore.ts    # App settings state
│   │   ├── useSubscriptionStore.ts # Subscription state
│   │   └── useNotesStore.ts       # Notes content state
│   │
│   ├── utils/                     # Utility functions
│   │   ├── validation.ts          # Input validation
│   │   ├── formatters.ts          # Text/date formatters
│   │   ├── constants.ts           # App constants
│   │   └── helpers.ts             # General helpers
│   │
│   ├── types/                     # TypeScript type definitions
│   │   ├── navigation.ts          # Navigation types
│   │   ├── api.ts                 # API types
│   │   ├── user.ts                # User types
│   │   └── settings.ts            # Settings types
│   │
│   └── theme/                     # Theme configuration
│       ├── colors.ts              # Color palette
│       ├── typography.ts          # Font styles
│       ├── spacing.ts             # Spacing scale
│       └── index.ts               # Theme export
│
├── assets/                        # Static assets
│   ├── images/
│   │   ├── logo.png
│   │   ├── onboarding/
│   │   │   ├── slide1.png
│   │   │   ├── slide2.png
│   │   │   └── keyboard-enable.png
│   │   └── icons/
│   │       └── ...
│   ├── fonts/
│   │   └── Inter-*.ttf
│   └── animations/
│       └── loading.json           # Lottie animations
│
├── app.json                       # Expo app configuration
├── eas.json                       # EAS Build configuration
├── babel.config.js                # Babel configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies
└── metro.config.js                # Metro bundler config
```

---

### 2. iOS Keyboard Extension (Swift)

```
keyboard-ios/
├── RewordAI/                      # Main app target
│   ├── App/
│   │   ├── RewordAIApp.swift      # App entry point
│   │   └── AppDelegate.swift      # App delegate (if needed)
│   ├── Views/
│   │   └── ContentView.swift      # Main content view (redirects to RN)
│   ├── Resources/
│   │   ├── Assets.xcassets        # App icons, images
│   │   └── LaunchScreen.storyboard
│   └── Info.plist
│
├── RewordKeyboard/                # Keyboard Extension target
│   ├── KeyboardViewController.swift    # Main keyboard controller
│   ├── Views/
│   │   ├── KeyboardView.swift          # Full keyboard layout
│   │   ├── KeyRow.swift                # Row of keys
│   │   ├── KeyButton.swift             # Individual key button
│   │   ├── SuggestionStrip.swift       # Autocomplete suggestions
│   │   ├── FloatingPanel/
│   │   │   ├── FloatingPanelView.swift # Preview panel container
│   │   │   ├── DiffTextView.swift      # Red/green diff display
│   │   │   ├── ModeChipsView.swift     # Mode selection chips
│   │   │   └── ActionBar.swift         # Bottom action buttons
│   │   └── Components/
│   │       ├── ModernButton.swift
│   │       └── ChipButton.swift
│   │
│   ├── Models/
│   │   ├── KeyboardState.swift         # Keyboard state management
│   │   ├── TextCorrection.swift        # Correction data model
│   │   ├── ParaphraseMode.swift        # Paraphrase mode enum
│   │   └── DiffSegment.swift           # Diff segment model
│   │
│   ├── Services/
│   │   ├── SpellChecker/
│   │   │   ├── SpellCheckService.swift     # Main spellcheck service
│   │   │   ├── HunspellWrapper.swift       # Hunspell integration
│   │   │   ├── TrieLookup.swift            # Trie for fast lookup
│   │   │   └── LevenshteinDistance.swift   # Edit distance calc
│   │   ├── Morphology/
│   │   │   ├── MorphologyChecker.swift     # Agreement checks
│   │   │   └── RuleEngine.swift            # Punctuation rules
│   │   ├── API/
│   │   │   ├── APIClient.swift             # HTTP client
│   │   │   ├── ParaphraseService.swift     # Paraphrase API
│   │   │   └── AuthService.swift           # JWT handling
│   │   ├── Diff/
│   │   │   └── DiffComputer.swift          # Text diff computation
│   │   └── Storage/
│   │       ├── SharedDefaults.swift        # App Group UserDefaults
│   │       └── KeychainService.swift       # Secure storage
│   │
│   ├── Resources/
│   │   ├── Dictionaries/
│   │   │   ├── ru_RU.dic              # Russian dictionary
│   │   │   ├── ru_RU.aff              # Affix file
│   │   │   └── frequency.dat          # Word frequency data
│   │   ├── Assets.xcassets
│   │   └── Localizable.strings        # Russian localization
│   │
│   ├── Extensions/
│   │   ├── String+Extensions.swift
│   │   ├── UIColor+Theme.swift
│   │   └── View+Keyboard.swift
│   │
│   └── Info.plist                      # Extension info (NSExtension)
│
├── Shared/                             # Shared between app and extension
│   ├── Constants.swift                 # Shared constants
│   ├── AppGroup.swift                  # App Group identifier
│   └── Theme.swift                     # Shared theme colors
│
├── RewordAI.xcodeproj/                 # Xcode project
├── RewordAI.xcworkspace/               # Xcode workspace (with SPM)
├── Package.swift                       # Swift Package dependencies
└── Podfile                             # CocoaPods (if needed)
```

---

### 3. Android Keyboard Extension (Kotlin)

```
keyboard-android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/rewordai/
│   │   │   │   ├── app/                    # Main app module
│   │   │   │   │   ├── MainActivity.kt     # Launches RN bridge
│   │   │   │   │   └── RewordApplication.kt
│   │   │   │   │
│   │   │   │   ├── keyboard/               # Keyboard IME module
│   │   │   │   │   ├── RewordIME.kt        # InputMethodService
│   │   │   │   │   ├── KeyboardView.kt     # Main keyboard view
│   │   │   │   │   ├── views/
│   │   │   │   │   │   ├── KeyRow.kt
│   │   │   │   │   │   ├── KeyButton.kt
│   │   │   │   │   │   ├── SuggestionStrip.kt
│   │   │   │   │   │   ├── FloatingPanel.kt
│   │   │   │   │   │   ├── DiffTextView.kt
│   │   │   │   │   │   ├── ModeChipsView.kt
│   │   │   │   │   │   └── ActionBar.kt
│   │   │   │   │   ├── state/
│   │   │   │   │   │   ├── KeyboardState.kt
│   │   │   │   │   │   └── KeyboardViewModel.kt
│   │   │   │   │   └── utils/
│   │   │   │   │       └── InputHelper.kt
│   │   │   │   │
│   │   │   │   ├── services/
│   │   │   │   │   ├── spellcheck/
│   │   │   │   │   │   ├── SpellCheckService.kt
│   │   │   │   │   │   ├── HunspellWrapper.kt
│   │   │   │   │   │   ├── TrieLookup.kt
│   │   │   │   │   │   └── LevenshteinDistance.kt
│   │   │   │   │   ├── morphology/
│   │   │   │   │   │   ├── MorphologyChecker.kt
│   │   │   │   │   │   └── RuleEngine.kt
│   │   │   │   │   ├── api/
│   │   │   │   │   │   ├── ApiClient.kt
│   │   │   │   │   │   ├── ParaphraseRepository.kt
│   │   │   │   │   │   └── AuthRepository.kt
│   │   │   │   │   └── diff/
│   │   │   │   │       └── DiffComputer.kt
│   │   │   │   │
│   │   │   │   ├── models/
│   │   │   │   │   ├── TextCorrection.kt
│   │   │   │   │   ├── ParaphraseMode.kt
│   │   │   │   │   ├── DiffSegment.kt
│   │   │   │   │   └── ApiModels.kt
│   │   │   │   │
│   │   │   │   ├── storage/
│   │   │   │   │   ├── SharedPrefsManager.kt
│   │   │   │   │   └── SecureStorage.kt
│   │   │   │   │
│   │   │   │   └── di/                     # Dependency injection
│   │   │   │       ├── AppModule.kt
│   │   │   │       └── NetworkModule.kt
│   │   │   │
│   │   │   ├── res/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── keyboard_view.xml
│   │   │   │   │   ├── key_row.xml
│   │   │   │   │   ├── floating_panel.xml
│   │   │   │   │   └── suggestion_strip.xml
│   │   │   │   ├── values/
│   │   │   │   │   ├── colors.xml
│   │   │   │   │   ├── strings.xml
│   │   │   │   │   ├── strings_ru.xml
│   │   │   │   │   ├── dimens.xml
│   │   │   │   │   └── themes.xml
│   │   │   │   ├── drawable/
│   │   │   │   │   ├── key_background.xml
│   │   │   │   │   ├── chip_background.xml
│   │   │   │   │   └── ic_*.xml
│   │   │   │   ├── xml/
│   │   │   │   │   └── method.xml          # IME method configuration
│   │   │   │   └── raw/
│   │   │   │       ├── ru_ru.dic           # Russian dictionary
│   │   │   │       └── ru_ru.aff
│   │   │   │
│   │   │   └── AndroidManifest.xml
│   │   │
│   │   └── test/                           # Unit tests
│   │       └── java/com/rewordai/
│   │           ├── SpellCheckServiceTest.kt
│   │           └── DiffComputerTest.kt
│   │
│   ├── build.gradle.kts                    # App-level Gradle
│   └── proguard-rules.pro
│
├── gradle/
│   └── libs.versions.toml                  # Version catalog
├── build.gradle.kts                        # Project-level Gradle
├── settings.gradle.kts
└── gradle.properties
```

---

### 4. Backend (Node.js + Fastify + TypeScript)

```
backend/
├── src/
│   ├── index.ts                       # Fastify app entry point
│   ├── config.ts                      # Configuration / environment
│   │
│   ├── routes/
│   │   ├── index.ts                   # Route registration
│   │   ├── v1/
│   │   │   ├── index.ts               # V1 API router
│   │   │   ├── paraphrase.ts          # POST /v1/paraphrase
│   │   │   ├── check.ts               # POST /v1/check
│   │   │   ├── user.ts                # /v1/user/*
│   │   │   └── subscription.ts        # /v1/subscription/*
│   │   └── health.ts                  # Health check endpoint
│   │
│   ├── plugins/
│   │   ├── auth.ts                    # Supabase JWT validation plugin
│   │   ├── cors.ts                    # CORS configuration
│   │   ├── rate-limit.ts              # Rate limiting plugin
│   │   └── helmet.ts                  # Security headers
│   │
│   ├── services/
│   │   ├── llm/
│   │   │   ├── openrouter.ts          # OpenRouter LLM integration
│   │   │   ├── prompts.ts             # Prompt templates (8 modes)
│   │   │   └── circuit-breaker.ts     # LLM circuit breaker (Opossum)
│   │   ├── paraphrase/
│   │   │   ├── service.ts             # Paraphrase service
│   │   │   └── diff.ts                # Diff computation
│   │   ├── pii/
│   │   │   ├── masker.ts              # PII masking service
│   │   │   └── patterns.ts            # Regex patterns for PII
│   │   ├── cache/
│   │   │   └── redis.ts               # Redis caching service
│   │   ├── supabase/
│   │   │   ├── client.ts              # Supabase client setup
│   │   │   ├── auth.ts                # Auth helpers
│   │   │   └── queries.ts             # Database queries
│   │   ├── quota/
│   │   │   └── service.ts             # Quota management
│   │   ├── billing/
│   │   │   ├── service.ts             # Billing service
│   │   │   ├── apple.ts               # App Store receipt validation
│   │   │   └── google.ts              # Google Play validation
│   │   └── logging/
│   │       └── logger.ts              # Pino structured logging (no raw text!)
│   │
│   ├── schemas/
│   │   ├── paraphrase.ts              # Zod schemas for paraphrase
│   │   ├── check.ts                   # Zod schemas for check
│   │   ├── user.ts                    # User schemas
│   │   └── common.ts                  # Common schemas
│   │
│   ├── types/
│   │   ├── api.ts                     # API request/response types
│   │   ├── database.ts                # Database types (from Supabase)
│   │   └── index.ts                   # Type exports
│   │
│   └── utils/
│       ├── hash.ts                    # Text hashing for deduplication
│       ├── tokenizer.ts               # Token counting
│       └── helpers.ts                 # Utility functions
│
├── tests/
│   ├── unit/
│   │   ├── pii-masker.test.ts
│   │   ├── diff.test.ts
│   │   └── prompts.test.ts
│   └── integration/
│       ├── paraphrase.test.ts
│       └── auth.test.ts
│
├── supabase/
│   ├── migrations/                    # Database migrations
│   │   └── 001_initial_schema.sql
│   └── seed.sql                       # Seed data (optional)
│
├── Dockerfile                         # Production Dockerfile
├── docker-compose.yml                 # Local development stack
├── package.json                       # Dependencies
├── package-lock.json
├── tsconfig.json                      # TypeScript configuration
├── vitest.config.ts                   # Vitest configuration
├── .env.example                       # Environment variables template
└── README.md
```

---

### 5. Infrastructure (Vendor-Neutral)

```
infrastructure/
├── docker/
│   ├── backend/
│   │   ├── Dockerfile
│   │   └── entrypoint.sh
│   └── docker-compose.prod.yml
│
├── render/                            # Render.com deployment
│   └── render.yaml                    # Render Blueprint
│
├── railway/                           # Railway deployment (alternative)
│   └── railway.toml
│
├── fly/                               # Fly.io deployment (alternative)
│   └── fly.toml
│
├── supabase/                          # Supabase configuration
│   ├── config.toml                    # Supabase local config
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
│
└── .github/
    └── workflows/
        ├── ci.yml                     # CI pipeline
        ├── deploy-staging.yml         # Staging deployment
        └── deploy-production.yml      # Production deployment
```

---

### 6. Documentation

```
docs/
├── PRD.md                             # Product Requirements
├── AppMap.md                          # Application map
├── TechStack.md                       # Technology stack
├── Implementation.md                  # Implementation plan
├── project_structure.md               # This file
├── UI_UX_doc.md                       # UI/UX documentation
├── API.md                             # API documentation
├── CONTRIBUTING.md                    # Contribution guidelines
└── CHANGELOG.md                       # Version changelog
```

---

### 7. Shared Resources

```
shared/
├── types/
│   └── api.d.ts                       # Shared API types (TypeScript)
│
├── constants/
│   ├── modes.json                     # Paraphrase mode definitions
│   └── errors.json                    # Error codes
│
├── assets/
│   ├── dictionaries/
│   │   ├── ru_RU.dic                  # Russian Hunspell dictionary
│   │   └── ru_RU.aff                  # Affix file
│   └── fonts/
│       └── Inter/
│
└── localization/
    ├── ru.json                        # Russian strings
    └── en.json                        # English strings (fallback)
```

---

### 8. Scripts

```
scripts/
├── setup.sh                           # Initial project setup
├── build-ios.sh                       # iOS build script
├── build-android.sh                   # Android build script
├── run-backend.sh                     # Start backend locally
├── run-tests.sh                       # Run all tests
├── generate-api-docs.sh               # Generate API documentation
└── deploy.sh                          # Deployment script
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase | `FloatingPanel.tsx` |
| React Hooks | camelCase with `use` prefix | `useSubscription.ts` |
| TypeScript Types | PascalCase | `UserSettings.ts` |
| Swift Files | PascalCase | `KeyboardView.swift` |
| Kotlin Files | PascalCase | `SpellCheckService.kt` |
| Node.js Modules | kebab-case or camelCase | `pii-masker.ts`, `openrouter.ts` |
| Node.js Services | camelCase | `service.ts`, `client.ts` |
| Config Files | kebab-case | `docker-compose.yml` |
| Documentation | PascalCase or kebab-case | `Implementation.md` |

---

## Environment Configuration Files

### Development

| File | Purpose | Location |
|------|---------|----------|
| `.env.development` | RN dev environment | `mobile/` |
| `.env.local` | Backend local config | `backend/` |
| `local.properties` | Android local SDK | `keyboard-android/` |

### Production

| File | Purpose | Location |
|------|---------|----------|
| `.env.production` | RN production | `mobile/` |
| `.env.production` | Backend production | `backend/` |
| `render.yaml` | Render deployment | `infrastructure/render/` |
| Supabase Dashboard | Production config | Supabase.com |

---

## Build Output Directories

| Platform | Directory | Gitignored |
|----------|-----------|------------|
| iOS | `keyboard-ios/build/` | ✅ |
| Android | `keyboard-android/app/build/` | ✅ |
| React Native | `mobile/dist/` | ✅ |
| Backend | `backend/dist/` | ✅ |
| Node modules | `mobile/node_modules/` | ✅ |
| Node modules | `backend/node_modules/` | ✅ |

---

## Key Configuration Files Location

| Configuration | File | Path |
|---------------|------|------|
| Expo Config | `app.json` | `mobile/` |
| EAS Build | `eas.json` | `mobile/` |
| TypeScript | `tsconfig.json` | `mobile/`, `backend/` |
| ESLint | `eslint.config.js` | `mobile/`, `backend/` |
| Prettier | `.prettierrc` | `mobile/`, `backend/` |
| iOS Podfile | `Podfile` | `keyboard-ios/` |
| Android Gradle | `build.gradle.kts` | `keyboard-android/` |
| Node.js Deps | `package.json` | `backend/` |
| Vitest | `vitest.config.ts` | `backend/` |
| Docker | `Dockerfile` | `backend/` |
| CI/CD | `ci.yml` | `infrastructure/.github/workflows/` |
| Supabase | `config.toml` | `infrastructure/supabase/` |
| Render Deploy | `render.yaml` | `infrastructure/render/` |

---

*Document maintained by Development Team*  
*Reference: [Implementation.md](Implementation.md) | [TechStack.md](TechStack.md)*  
*Architecture: Node.js + Supabase + OpenRouter (Vendor-Neutral)*
