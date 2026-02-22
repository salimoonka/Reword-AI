# Reword AI - Development Setup Guide

## Prerequisites

### Required Software
- **Node.js** 22.x LTS
- **npm** 10.x+
- **Expo CLI** (installed via npx)
- **Git**

### For iOS Development (macOS only)
- **Xcode** 15.0+
- **CocoaPods**
- iOS Simulator or physical device

### For Android Development
- **Android Studio** Hedgehog+
- **Android SDK** 34
- **Java** 17

### Recommended Tools
- VS Code with extensions:
  - ESLint
  - Prettier
  - TypeScript Vue Plugin
  - Expo Tools

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/your-org/reword-ai.git
cd reword-ai
```

### 2. Install Dependencies

**Mobile App:**
```bash
cd mobile
npm install
```

**Backend:**
```bash
cd backend
npm install
```

### 3. Environment Setup

**Backend (.env):**
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `OPENROUTER_API_KEY` - OpenRouter API key

**Mobile (app.json):**
- Update `extra.supabaseUrl` and `extra.supabaseAnonKey` for your Supabase project

### 4. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Run migrations:
```bash
# Using Supabase CLI
supabase db push

# Or manually run SQL files in supabase/migrations/
```

### 5. Start Development Servers

**Backend:**
```bash
cd backend
npm run dev
# Server starts at http://localhost:3000
```

**Mobile:**
```bash
cd mobile
npm start
# Expo DevTools opens in browser
# Press 'i' for iOS Simulator
# Press 'a' for Android Emulator
# Scan QR with Expo Go app for physical device
```

## Project Structure

```
reword-ai/
├── mobile/                 # React Native + Expo app
│   ├── app/                # Expo Router pages
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── services/       # API clients
│   │   ├── stores/         # Zustand state
│   │   └── theme/          # Design tokens
│   └── ios/                # Native iOS code (keyboard)
├── backend/                # Fastify API server
│   └── src/
│       ├── routes/         # API endpoints
│       ├── services/       # Business logic
│       ├── plugins/        # Fastify plugins
│       └── schemas/        # Zod schemas
├── supabase/               # Database migrations
└── .github/                # CI/CD workflows
```

## Available Scripts

### Mobile
| Command | Description |
|---------|-------------|
| `npm start` | Start Expo development server |
| `npm run ios` | Run on iOS Simulator |
| `npm run android` | Run on Android Emulator |
| `npm run lint` | Check code style |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

### Backend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm test` | Run tests |
| `npm run lint` | Check code style |
| `npm run typecheck` | TypeScript type checking |

## Testing

### Backend Tests
```bash
cd backend
npm test           # Watch mode
npm run test:run   # Single run
```

### Mobile Testing
Use Expo Go app for development testing. For production builds, use EAS Build.

**Unit Tests (Jest + React Native Testing Library):**
```bash
cd mobile
npm test                # Run all 80 tests
npm run test:watch      # Watch mode for TDD
npm run test:coverage   # Coverage report
```

Test structure:
```
mobile/__tests__/
├── components/        # UI component tests
│   ├── Button.test.tsx
│   ├── Card.test.tsx
│   ├── TextInput.test.tsx
│   ├── ModeSelector.test.tsx
│   ├── ErrorBoundary.test.tsx
│   └── QuotaExceededModal.test.tsx
├── stores/            # Zustand store tests
│   ├── useNotesStore.test.ts
│   ├── useSettingsStore.test.ts
│   ├── useUserStore.test.ts
│   └── useSubscriptionStore.test.ts
└── hooks/             # Custom hook tests
    ├── useApi.test.ts
    └── useQuotaCheck.test.ts
```

## Building for Production

### Mobile (EAS Build)
```bash
cd mobile

# Preview build (TestFlight/Internal testing)
eas build --platform all --profile preview

# Production build
eas build --platform all --profile production
```

### Backend (Docker)
```bash
cd backend
docker build -t reword-ai-backend .
docker run -p 3000:3000 reword-ai-backend
```

## Troubleshooting

### Common Issues

**Metro bundler issues:**
```bash
cd mobile
npx expo start --clear
```

**iOS pods not linking:**
```bash
cd mobile/ios
pod install --repo-update
```

**Type errors after dependency update:**
```bash
npm run typecheck
# Fix reported issues
```

### Getting Help
- Check [Implementation.md](./Docs/Implementation.md) for technical decisions
- Review [PRD.md](./Docs/PRD.md) for requirements
- Open an issue on GitHub for bugs

## Code Style

- **TypeScript** strict mode enabled
- **ESLint** with Prettier integration
- Run `npm run lint:fix` before committing
- Follow React/React Native best practices

## Security Notes

- Never commit `.env` files
- Use Supabase RLS for data access control
- PII is masked before LLM processing
- Logs never contain raw user text
