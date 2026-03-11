# Reword AI — Current State Analysis & Work Plan

**Date:** 2026-03-11  
**Status:** Not production-ready — critical bugs remaining

---

## 1. Architecture Overview

| Component | Stack | Hosting |
|-----------|-------|---------|
| Mobile App | React Native + Expo SDK 54, Zustand, expo-secure-store, react-native-iap | EAS Build |
| Backend API | Fastify 5.7.4 + TypeScript, vitest (168 tests passing) | Render.com |
| Database | Supabase PostgreSQL + Auth + RLS (6 migrations) | Supabase Cloud |
| Website | Next.js + TailwindCSS | Render.com |
| Payments | YooKassa (web), Apple/Google IAP (mobile) | — |
| LLM | OpenRouter (server-side proxy) | — |
| Keyboard | Custom Android IME (Kotlin), Custom iOS Keyboard (Swift) | Bundled |

---

## 2. Previously Applied Fixes (Verified ✅)

### Phase 1 — Security & Stability (9 fixes)
- **DB-01** ✅ SECURITY DEFINER functions now require `auth.uid()` check
- **MA-02** ✅ Token refresh race condition fixed (reset before onRefreshed)
- **CP-02** ✅ YooKassa webhook mandatory HMAC signature verification
- **BE-05** ✅ Rate limiter reads from config, not hardcoded
- **BE-01** ✅ Token cache keys hashed via SHA-256
- **BE-03** ✅ Removed hardcoded Supabase URL fallback
- **MA-07** ✅ Navigate immediately after account deletion
- **MA-09** ✅ Deep link auth guard
- **MA-10** ✅ UUID regex validation for deep link noteId

### Phase 2 — Payment APIs & Native Security (6 fixes)
- **CP-01** ✅ Google Play Developer API real verification (googleapis)
- **CP-03** ✅ Apple App Store Server API v2 (jose JWS, dual-path)
- **KB-01** ✅ iOS Keychain for auth tokens (Security framework)
- **KB-02** ✅ Android EncryptedSharedPreferences (AES256_GCM)
- **KB-04** ✅ Android SSL certificate pinning (network_security_config.xml)
- **MA-08** ✅ Subscription screen deduplication (SubscriptionContent.tsx shared component)

### Backend Tests: 168 passing (14 test files)

---

## 3. Current Critical Problems

### PROBLEM 1: Google Sign-In Returns to Login Page (HIGH)
**Symptom:** After successful Google OAuth, user is returned to sign-in page instead of success screen. Only pressing "Continue without sign-in" shows the success screen.

**Root Cause:** On Android production, `WebBrowser.openAuthSessionAsync()` with HTTPS redirect URL (`app-complete`) often returns `cancel`/`dismiss` instead of `success`. The Chrome Custom Tab loads the `app-complete` page, which fires a deep link (`rewordai://auth/callback#tokens`), causing the tab to close with `dismiss`. The 4-attempt polling loop (4 seconds total) may not find the session in time, AND the `app-complete` page on Render.com may have a cold-start delay of 30+ seconds.

**Fix Plan:**
- Extend polling to 10 attempts (15 seconds total)
- Check `hasNavigatedToSuccess.current` in each poll iteration
- Don't throw error on `success` result without hash tokens; fall through to polling
- The `isAuthenticated` watcher already exists as backup

### PROBLEM 2: Keyboard Shows Dark on Light System Theme (HIGH)
**Symptom:** Keyboard displays dark theme when system is in light mode. Previously fixed but regressed.

**Root Cause:** Generated `android/` directory is OUT OF SYNC with `keyboard-src/`:
- `KeyboardView.kt` — MISMATCHED (old version without `MODE_PRIVATE` fix)
- `RewordKeyboardService.kt` — MISMATCHED (missing theme recreation logic)
- `KeyboardIcons.kt` — COMPLETELY MISSING (icons rendered incorrectly)
- `SharedStorage.kt` — MISMATCHED (missing EncryptedSharedPreferences)

The `withAndroidKeyboard.js` plugin copies files during `expo prebuild`, but the last build appears to have used stale cached files. Additionally, `Appearance.setColorScheme()` in React Native may affect system-level resources on some Android devices/OEMs.

**Fix Plan:**
- Sync all files from `keyboard-src/` → `android/`
- Add `isForceDarkAllowed = false` to KeyboardView to prevent Android Force Dark
- Use `UiModeManager` as primary source for system dark mode detection
- Run `expo prebuild --clean` before building

### PROBLEM 3: Dark Theme Bottom Icons Invisible (MEDIUM)
**Symptom:** Globe and microphone icons in keyboard bottom bar are dark/invisible on dark theme background.

**Root Cause:** Same as Problem 2 — the `android/` directory is missing `KeyboardIcons.kt` entirely, so the monochrome vector icons with correct theming aren't being used. Also, Android Force Dark may invert icon colors.

**Fix Plan:**
- Fixed by syncing `KeyboardIcons.kt` to `android/`
- Adding `setForceDarkAllowed(false)` to prevent color inversion
- Setting explicit `imageTintList` on bottom bar ImageViews as extra safety

---

## 4. Work Plan (Priority Order)

| # | Task | Severity | Scope |
|---|------|----------|-------|
| 1 | Fix Google sign-in flow robustness | HIGH | `mobile/app/auth/sign-in.tsx` |
| 2 | Fix keyboard theme detection + sync `android/` | HIGH | `KeyboardView.kt`, prebuild |
| 3 | Fix dark theme bottom bar icons | MEDIUM | `KeyboardView.kt` |
| 4 | Verify light/dark keyboard variants | — | Manual verification |
| 5 | Commit + build APK | — | Git + EAS |

---

## 5. Database Structure

| Table | Purpose |
|-------|---------|
| `profiles` | User preferences, display info (auto-created on signup) |
| `subscriptions` | Plan status, store info, expiry (auto-created) |
| `usage_log` | Paraphrase/check usage analytics (no raw text — privacy) |
| `paraphrase_cache` | Deduplication cache (7-day TTL, service-role only) |
| `external_payments` | YooKassa payment tracking (service-role only) |

RLS enabled on all tables. 6 migrations applied.

---

## 6. Key File Locations

- **Auth flow:** `mobile/app/auth/sign-in.tsx`, `callback.tsx`, `success.tsx`
- **Root layout:** `mobile/app/_layout.tsx`
- **Keyboard source (truth):** `mobile/plugins/keyboard-src/java/ai/reword/keyboard/`
- **Keyboard plugin:** `mobile/plugins/withAndroidKeyboard.js`
- **Theme sync:** `mobile/src/stores/useSettingsStore.ts` → native SharedStorage
- **Theme detection:** `KeyboardView.kt::detectDarkTheme()`
- **Backend routes:** `backend/src/routes/v1/`
- **Supabase migrations:** `supabase/migrations/`
