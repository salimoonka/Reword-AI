# Reword AI

AI-powered Russian keyboard for intelligent text rewriting.

## Overview

Reword AI provides smart text paraphrasing directly in your keyboard. Write in any app, select text, and get instant AI-powered suggestions to reword your message with different tones.

### Features
- 🎯 8 paraphrasing modes (shorten, expand, formal, friendly, etc.)
- 🔒 Privacy-first: PII masking before LLM processing
- ☁️ Optional cloud sync for history
- 🎨 Beautiful dark theme UI

## Tech Stack

- **Mobile**: React Native 0.81.5 + Expo SDK 54
- **Backend**: Node.js 22 + Fastify 5
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenRouter (DeepSeek-V3, GPT-4o-mini fallback)

## Getting Started

See [DEVELOPMENT.md](./Docs/DEVELOPMENT.md) for setup instructions.

```bash
# Quick start
cd mobile && npm install && npm start
cd backend && npm install && npm run dev
```

## Documentation

- [Product Requirements](./Docs/PRD.md)
- [Technical Stack](./Docs/TechStack.md)
- [Implementation Guide](./Docs/Implementation.md)
- [Development Setup](./Docs/DEVELOPMENT.md)

## License

Proprietary - All rights reserved
