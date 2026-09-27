# External Integrations

**Analysis Date:** 2026-09-27

## APIs & External Services

**Google Gemini (GenAI):**
- Purpose: Multi-turn natural language intent parsing and image/diagram accessibility descriptions.
- SDK/Client: `@ai-sdk/google` (v4.0.82) and `ai` (v7.0.116).
- Model: `gemini-3.8-flash`.
- Auth: `src/lib/ai/getGeminiKey.ts` resolves `GOOGLE_GENERATIVE_AI_API_KEY` first and falls back to `GEMINI_API_KEY`; both `/api/intent` and `/api/vision` pass the resolved key into their Google provider.
- Endpoints:
  - `/api/intent` - Fallback semantic parser for complex voice utterances that fall outside deterministic regex patterns. Prevents test cheating by classifying question-solving requests as `QUESTION_SOLVING`.
  - `/api/vision` - Generates objective structural descriptions of diagram-based exam questions for visually impaired candidates.

**Web Speech API (Browser Native):**
- Purpose: Speech-to-Text (STT) and Text-to-Speech (TTS) voice interface enabling hands-free exam participation.
- Implementation: Managed globally via `src/lib/voice/VoiceProvider.tsx`.
- SpeechRecognition: Captures microphone audio, handles interim and final transcripts, auto-restarts upon disconnect, and routes inputs through `safeActionRegistry.ts`.
- SpeechSynthesis: Enqueues speech utterances, manages speech rate and pitch, and selects appropriate voices matching active language (`en-IN`, `hi-IN`, `te-IN`).

## Data Storage

**Databases:**
- PostgreSQL hosted on Supabase:
  - Connection: REST API / WebSocket via `@supabase/ssr` and `@supabase/supabase-js`.
  - Authentication: Client-side anon key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) and server-side privileged key (`SUPABASE_SECRET_KEY`).
  - Tables:
    - `profiles` - Candidate metadata, accessibility settings, and preferred language.
    - `exams` - Exam metadata (title, duration, instructions).
    - `questions` - Question text, options, marks, media URLs (`image_url`), and translations (`content_translations`, `options_translations`). Correct answers (`correct_answer_index`) are isolated in `question_answers` with no authenticated read policy.
    - `exam_sessions` - Session lifecycle (`in_progress`, `submitted`), time tracking, score, and analytics.
    - `answers` - Candidate selected options, review flags (`is_marked_for_review`), and response timing.
    - `audit_logs` - Action logging for exam integrity monitoring.
  - Migrations: Managed in `supabase/migrations/` (00000 through 00010).

**Local Client Cache:**
- IndexedDB via `idb-keyval` (v6.3.0) and `zustand/middleware` (`createJSONStorage`):
  - Purpose: High-resilience offline local storage for candidate answers and active exam session state (`useExamStore` in `src/lib/store/examStore.ts`).
  - Storage key: `exam-storage`.
  - Preserves the active client exam state locally; server answer persistence is replayed when connectivity returns.

## Authentication & Identity

**Auth Provider:**
- Supabase Auth:
  - Method: Passwordless Magic Link OTP (`supabase.auth.signInWithOtp` in `src/app/auth/actions.ts`).
  - Redirect handling: Route handler `src/app/auth/confirm/route.ts` exchanges auth code for session tokens.
  - Session Management: SSR cookie synchronization via `@supabase/ssr` in `src/proxy.ts` and `src/lib/supabase/server.ts`.
  - Route Protection: `src/proxy.ts` intercepts requests, redirecting unauthenticated users attempting to access protected routes (`/dashboard`, `/exam`, `/practice`, `/history`) to `/auth/login`.

---

*Integrations analysis: 2026-09-27*
*Update after major integration changes*
