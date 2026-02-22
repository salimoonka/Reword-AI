App map — Russian AI Keyboard (MVP)

(detailed, developer-ready map of components, user flows, UI, tech, security, analytics, prompts and backlog — English, markdown)

1. Product summary

What: Mobile keyboard + companion app for Russian writing: fast on-device spell/morph checks + cloud AI paraphrasing.
Platforms: iOS + Android (native keyboard extensions) + React Native companion app.
Monetization: Freemium; PRO subscription 199 ₽ / month; limited free paraphrases.
Target users: students, content creators, mass audience in Russia.
Primary goal: rapidly acquire active keyboard users and reach ~3% subscription conversion.

2. High-level components

Mobile companion app (React Native)

Settings, onboarding, billing, notes editor, subscription management, usage dashboard.

Native keyboard extensions (iOS Swift, Android Kotlin)

Actual typing surface, floating panel (preview/diff), inline suggestions, quick actions.

Local engine (on-device)

Spellcheck (dictionary + edit distance), morphological analyzer, rule-based punctuation engine, word tokenization (preserve English tokens).

Backend API & services (hosted on Render / Railway / Fly.io)

Paraphrase service, check service, user management, billing, cache, PII masking/pseudonymization.

Database & Auth (Supabase)

Managed PostgreSQL with RLS, Supabase Auth for user management, quota tracking.

LLM/Inference layer

OpenRouter REST API as gateway to multiple LLM providers (DeepSeek, GPT-4o, Claude) — server-side only, no API keys on client.

Optional third-party grammar/check API (integration for fallback or tuning): LanguageTool, Orfogrammka.

Analytics & monitoring — events, latency metrics, errors, subscription funnel.

Security & privacy layer — TLS, at-rest encryption, PII masking, deletion API.

3. Core features (MVP)

Local, instantaneous checks (offline capable):

Spellcheck with red highlighting for incorrect tokens.

Morphological checks (agreement errors) and basic punctuation rules.

Inline suggestions (autocorrect/autocomplete) appearing with keyboard suggestions.

Floating preview / diff UI (over keyboard):

Diff rendering that shows removed/incorrect segments in red and inserted/suggested segments in green (exact visual behavior from your references).

Single paraphrase result shown by default; user confirms insertion with check button.

Cloud AI paraphrase (explicit user action):

Entire input field sent on pressing Paraphrase.

Modes: shorten, expand, formal, friendly, confident, professional, colloquial, empathetic.

Default: 1 paraphrase returned; user confirms to insert.

English words preserved unchanged in output.

Companion app:

Onboarding to enable keyboard and explain "Full Access".

Local notes editor to demo and test keyboard.

Settings: theme (auto/dark/light), local/online toggle, subscription view, free quota display.

Billing & quota:

Freemium: X free paraphrases per billing period; PRO removes/reduces limits.

Privacy controls:

"Local only" mode (no cloud requests).

Explicit privacy text in onboarding and App Store metadata.

PII masking before sending to LLM.

4. Primary user flows
A. Install + enable keyboard (first run)

Install app → open onboarding (RN).

Onboarding screen 1: value proposition + button Add Keyboard.

Onboarding screen 2: step-by-step OS instructions to add keyboard and enable “Full Access” (with explanation why and what is sent).

Default setting: local checks enabled; cloud features disabled until user grants permission or presses Paraphrase and accepts modal.

B. Typing + quick local check

User types in any app using keyboard.

Local engine checks tokens in real time; incorrect tokens highlighted red in preview/container; suggestions drawn into suggestion strip (inline).

User taps Проверить → preview popup opens with diff (red/green). User presses check to apply corrections.

C. Paraphrase flow (cloud)

User types a message and taps Перефразировать.

Keyboard sends full field text to backend only after explicit action (preserve privacy).

Backend masks PII, sends to LLM, receives paraphrase + diff.

Preview shows paraphrase with green/ red diff; user confirms to insert final text.

D. Subscription purchase

User reaches quota or taps Go PRO.

In-app purchase flow (App Store / Google Play).

On success, client unlocks PRO quotas and updates backend.

E. Notes editor (demo)

User opens app → Notes → types using our keyboard; all features (checks, paraphrase) are available in this controlled environment.

5. UI/UX breakdown (components & behavior)

Keyboard surface

Standard RU layout, language switch globe icon, mic icon (if supported).

Suggestion strip: standard suggestions + inline rewrite buttons.

Floating panel (preview/diff) — KEY element (matches reference):

Header (mode label).

Large preview text area with diff highlights:

Red highlight for incorrect/removed segments.

Green highlight for new/inserted segments (final output).

Horizontal scrollable mode chips: Shorten ✂️, Friendly 🙂 (active chip highlighted).

Bottom quick actions: keyboard toggle, undo/redo, magic (paraphrase), copy, confirm (green check).

Alerts & modals

Allow Full Access system instructions modal with step images.

Quota alert: "X free paraphrases left".

Settings screen

Toggle: Local only / Allow cloud paraphrase.

Theme: Auto / Dark / Light.

Subscription: status + manage.

Privacy & Delete data action.

Colors & themes

Dark default; auto follow system theme.

Diff colors: red (#E35A5A) and green (#39C07C) for clarity.

6. Technical architecture (logical view)
[ Mobile App (RN) ]  <-->  [ Backend API (Render/Railway/Fly.io) ]  <-->  [OpenRouter] <--> [LLM providers]
        ↑                         ↑
        |                         └---> Supabase (PostgreSQL + Auth + RLS)
        |
[ Native Keyboard Extension (iOS/Android) ] 
   - local engine (spell/morph/punct) runs here
   - communicates with RN app or directly with backend (if Full Access granted)

Key services

Fastify API Gateway — authenticate via Supabase Auth, rate limit, Zod validation.

Paraphrase Service — handles prompt templates, PII masking, OpenRouter calls, circuit breaker (Opossum).

Check Service — server-side grammar checks (fallback/extra checks).

Cache (Upstash Redis) — cache recent paraphrases, avoid duplicate LLM calls (optional for MVP).

User service — billing status, quotas (stored in Supabase).

Logging & metrics — Pino logger, anonymized, no raw text.

7. Minimal API contract (examples)
POST /v1/paraphrase

Request:

{
  "user_id":"string",
  "session_id":"string",
  "text":"Исходный текст",
  "mode":"friendly",
  "preserve_english":true
}


Response:

{
  "request_id":"abc",
  "output_text":"Перефразированный текст",
  "diff":[
    {"type":"delete","start":5,"end":10,"text":"..."},
    {"type":"insert","pos":5,"text":"новый фрагмент"}
  ],
  "processing_time_ms":420
}

POST /v1/check

Request:

{
  "user_id":"string",
  "text":"Текст для проверки"
}


Response: list of issues (start/end, rule id, suggestion).

8. On-device processing details (how local checks work)

Tokenizer: split text preserving English tokens (ASCII sequences) and punctuation.

Spellcheck: compact trie or Hunspell dict for RU; Levenshtein search for suggestions.

Morphological analyzer: lightweight native library or precompiled lookup for common forms; used to validate agreement (adj+noun case/gender/number).

Rule engine: regex + context rules for punctuation (commas for subordinate clauses, participial phrases etc.).

Diff generation: compute minimal edit (diff) between input and suggested output to render red/green highlights.

Performance constraints: keyboard extension must be memory-light and fast (<10ms per token check ideally). Heavy work deferred to backend.

9. LLM prompts & templates (practical examples)

System prompt

You are a Russian paraphrasing assistant. Preserve meaning; do not add facts. Keep English tokens unchanged. Do not use emojis. Obey mode instructions below.


User prompt examples

Friendly

MODE: friendly
INPUT: <user_text>
INSTRUCTIONS: Make the text warm and friendly, keep meaning, remove slang but keep casual tone.


Formal

MODE: formal
INPUT: <user_text>
INSTRUCTIONS: Convert to a formal register. No emojis, no contractions.


Shorten

MODE: shorten
INPUT: <user_text>
INSTRUCTIONS: Shorten the text as much as possible while retaining core meaning.


LLM parameters

temperature: 0.0–0.3 (deterministic)

max_tokens: dynamic (based on input length)

top_p: 1.0

10. Privacy & security constraints (must haves)

Explicit send: Cloud calls only on explicit user action (Paraphrase).

PII masking: Before any outbound call, detect and mask phone numbers, emails, payment numbers. Provide option to disable masking if user consents.

No persistence policy (default): Do not store raw user texts; process in memory and discard. Store only anonymized metrics and hashes if needed.

Delete API: user-initiated full data purge endpoint.

Transport & at-rest encryption: TLS 1.2+ for APIs, AES-256 for any stored sensitive artifacts.

Local only mode: available, disables cloud features.

App Store & Play Store declarations: clear privacy texts about Full Access and cloud calls.

11. Analytics & telemetry (events to track)

install_app

onboard_completed

keyboard_enabled

session_start

local_check_performed

paraphrase_requested (mode, token_count)

paraphrase_latency_ms

paraphrase_result_inserted

quota_exhausted

subscription_started / subscription_cancelled

error_paraphrase_failed

Important: never log raw text. Send hashed identifiers or counts only.

12. Acceptance criteria (QA checkpoints)

Local spellcheck highlights incorrect tokens red in >95% common typo cases.

Floating preview shows diff with red (deleted/incorrect) and green (inserted) exactly as spec.

Paraphrase returns one high-quality variant preserving English tokens.

Onboarding correctly guides enabling keyboard and explains Full Access; local mode works without Full Access.

Subscription purchase unlocks quota and updates UI state.

PII masking is effective for phone numbers, emails and national IDs.

13. Backlog (epics + key tickets)
Epic: Keyboard core (native)

Implement RU key layout and suggestion strip.

Local spellcheck engine integration.

Morphology & rule engine.

Floating panel + diff UI + mode chips.

Insert/replace logic for target text field.

Preserve English tokens.

Epic: Companion app (RN)

Onboarding flow with enable keyboard instructions.

Notes editor.

Settings: theme, local/online, subscription UI.

Subscription integration (App Store / Play Billing).

Epic: Backend & AI

/v1/paraphrase and /v1/check endpoints.

PII masking module.

Cache & queue.

Integration with LLM provider (adapter layer).

Epic: Security & infra

Deploy on Render / Railway / Fly.io (Fastify API, Supabase PostgreSQL + Auth).

TLS & encryption at rest (Supabase handles DB encryption).

Delete user data endpoint (Supabase data deletion).

Server-side proxy architecture (no LLM API keys on client).

PII masking layer verification.

Epic: QA & Launch

Device testing matrix (iOS versions, Android versions).

Performance testing of keyboard extension.

App Store / Play Store metadata & privacy.

14. Risks & mitigations (top items)

iOS extension memory limits → implement lightweight native code; avoid RN bridge in extension.

Users refusing Full Access → provide full local functionality; clear onboarding to explain what Full Access enables.

High LLM cost / latency → cache results, rate-limit, freemium limits, batch requests where possible.

Poor paraphrase quality for Russian → iterate prompt engineering, create test corpora, tune modes with human review.

15. Helpful implementation notes & recommendations

Native + RN split: RN for companion; native for extension. Share settings via app group (iOS) or shared preferences / content provider (Android).

Local dictionaries: start with Hunspell RU + compact frequency list. Consider building a small binary trie for fast lookup on device.

Morphology: on device use a trimmed rule set for top error patterns; precompiled lookup tables or tiny Rust/Go library compiled to native code.

Preserve English logic: tokenization rule: sequences with ASCII letters/digits are treated as atomic tokens and passed through unchanged by paraphrase post-processing.

Diff rendering: compute edits server side (for paraphrase) and locally (for quick checks) with minimal edits to improve visual clarity.

16. Example texts for onboarding & privacy (short)

Onboarding headline: Write smarter in Russian — instant checks and one-tap paraphrasing.

Allow Full Access explanation (short):
To use cloud paraphrase features we need permission to access the text you type. We only send text when you explicitly tap "Paraphrase". You can use local checking without enabling Full Access. We do not store your raw text by default.

17. Next actionable artifacts I can produce for you (pick one)

Full PRD in markdown with embedded UI sketches (based on reference images).

CSV backlog (JIRA import) with tasks, acceptance criteria and priorities.

Prompt bank and paraphrase test corpus (mode examples + expected outputs).