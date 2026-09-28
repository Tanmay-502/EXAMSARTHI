# Architecture: EXAMSAARTHI V2

## Overview
EXAMSAARTHI V2 is a voice-first accessible examination and practice platform built with Next.js 16.3.6, React 19, Supabase, browser Web Speech APIs, Zustand/IndexedDB, and optional Gemini services.

## Request flow
1. `/` is a public, server-rendered gateway. It reads the current Supabase user and exposes keyboard/screen-reader-first Log in and Sign up actions.
2. `/auth/login` handles existing-account Magic Links with `shouldCreateUser: false`.
3. `/auth/signup` handles account-creation Magic Links with `shouldCreateUser: true` and stores `full_name` in auth metadata.
4. `/auth/callback` handles Google OAuth; `/auth/confirm` verifies Magic Link tokens.
5. Successful authentication lands on `/welcome`.
6. `/welcome` contains the voice-first description/demo and routes new users to `/onboarding/mode`. Users with saved mode+language preferences can continue directly to `/dashboard`.
7. `/onboarding/mode` and `/onboarding/language` persist preferences and finish at `/dashboard`.

## Core layers
1. **Accessibility** — semantic HTML, live-region announcements, focus management, keyboard support, reduced motion.
2. **Internationalisation** — English, Hindi, and Telugu dictionaries and speech locales.
3. **Voice** — browser STT/TTS through VoiceProvider, deterministic parser, Gemini fallback, global action dispatcher, contextual SafeActionRegistry.
4. **Exam & Practice** — shared ExamEngine with strict state transitions and voice confirmation.
5. **Persistence** — Zustand + IndexedDB for immediate local recovery; incremental server autosave through saveAnswer.
6. **Backend** — Next.js Server Actions + Supabase SSR/Admin clients.
7. **Vision** — Gemini vision route for objective diagram descriptions, with database alt-text preferred when present.
8. **Results & Analysis** — server-derived metrics, subject breakdown, history, and learning insights.
9. **PWA** — public manifest/service worker plus static-asset caching only.

## Security
Correct-answer data is isolated from the exam client. Client writes to exam_sessions and answers are restricted; privileged server actions validate candidate ownership and session/question boundaries before writing. Public authentication routes do not expose user-controlled message text through query strings; auth outcomes use a fixed allowlisted code set.

## Authentication
Supabase passwordless Magic Links are the implemented email authentication method. Google OAuth is also supported. Passkeys are not currently implemented. The email redirect target is exactly `/auth/confirm`; the Supabase email template supplies `token_hash` parameters.

## Route protection
The Next.js 16 `proxy.ts` treats `/`, `/auth/*`, PWA static assets, and framework/static assets as public. `/welcome`, `/onboarding/*`, `/dashboard`, exam/practice routes, and APIs require authentication. Unauthenticated API calls receive 401; protected page navigation redirects to `/auth/login?code=unauthenticated`.

## Verification standard
Automated accessibility checks target WCAG 2.1 AA. Full accessibility and production auth claims still require manual target-environment verification.