# Architecture: EXAMSAARTHI V2

## Overview
EXAMSAARTHI V2 is a voice-first accessible examination and practice platform built with Next.js 16.3.6, React 19, Supabase, browser Web Speech APIs, Zustand/IndexedDB, and optional Gemini services.

## Request flow
1. `/` is a public, voice-first gateway. The primary entry point starts voice access; keyboard and screen-reader controls remain available.
2. `/auth/login` provides stateful voice authentication using a user ID and numeric PIN/password. The ID is read back for confirmation before the private credential step.
3. `/auth/signup` is retired and redirects to `/auth/login`.
4. Protected routes use the Supabase Auth session created after successful voice authentication.
5. Saved interaction/language preferences can be reused to continue directly into the dashboard.
6. `/onboarding/mode` and `/onboarding/language` remain available for preference configuration where applicable.

## Core layers
1. **Accessibility** — semantic HTML, live-region announcements, focus management, keyboard fallback, reduced motion.
2. **Internationalisation** — English, Hindi, and Telugu dictionaries and matching speech locales.
3. **Voice** — browser STT/TTS through VoiceProvider; noise suppression, echo cancellation and automatic gain control; deterministic parser; low-confidence audio re-transcription; optional Gemini intent fallback; global action dispatcher; contextual SafeActionRegistry.
4. **Voice recovery** — explicit help, repeat, current-page orientation, listener ownership, and an accessible stop-speaking control.
5. **Exam & Practice** — shared ExamEngine with strict state transitions, answer confirmation and session roster protection.
6. **Persistence** — Zustand + IndexedDB for immediate local recovery; incremental server autosave and reconnect replay.
7. **Backend** — Next.js Server Actions + Supabase SSR/Admin clients.
8. **Vision** — Gemini vision route for diagram descriptions, with database alt text preferred when present.
9. **Results & Analysis** — server-derived metrics, subject breakdown, history and learning insights.
10. **PWA** — public manifest/service worker plus static-asset caching only.

## Voice pipeline
**Microphone → browser SpeechRecognition → confidence check → transient audio fallback (Gemini 3.5 Transcribe) → deterministic command parser → constrained intent model fallback → SafeActionRegistry → page handler/action.**

The audio fallback is deliberately not used for secure login speech. Secure login credentials stay outside the transcript and audio-recovery path.

## Security
Correct-answer data is isolated from the exam client. Client writes to exam_sessions and answers are restricted; privileged server actions validate candidate ownership and session/question boundaries before writing. Active exam/practice contexts remain restricted by SafeActionRegistry. Public voice transcription is rate-limited and validates MIME type, size and language.

## Authentication
The visible authentication UX is intentionally voice-first. Users authenticate with a configured ExamSaarthi voice user ID and numeric PIN/password. Supabase Auth remains the underlying session provider so existing RLS and server authorization boundaries stay intact.

## Route protection
The Next.js `proxy.ts` treats `/`, `/auth/*`, public PWA assets, and `/api/voice/transcribe` as public. Protected routes require a valid Supabase session. If Supabase configuration is missing, public routes remain reachable and protected routes fail closed with a controlled service-unavailable response rather than an opaque middleware crash.

## Verification standard
Automated accessibility checks target WCAG 2.1 AA. Real microphone behavior, screen-reader behavior and target Supabase/Vercel environment configuration still require target-machine verification.
