# EXAMSAARTHI V2 — Current Status

Snapshot: 2026-09-27

## Implemented

- Next.js 16.3.6 App Router with protected routes.
- Supabase passwordless Magic Link authentication with visible Login / Create Account entry.
- Voice-first interaction using browser Web Speech APIs, deterministic parser, optional Gemini intent fallback, and contextual SafeActionRegistry.
- English, Hindi, and Telugu UI/voice support.
- Server-side grading with correct-answer data isolated in question_answers.
- Exam/practice session ownership checks and server-only writes for session state and answers.
- Incremental answer persistence plus IndexedDB recovery/replay.
- Results, history, and analysis routes restricted to submitted candidate-owned sessions.
- PWA manifest and production static-asset service worker.
- Automated typecheck, lint, build, Playwright, and axe coverage.

## Verification status

Automated baseline before the current full-audit branch: build passed and Playwright passed 18/18.
Current branch: additional security, persistence, accessibility, voice, and documentation fixes are staged for the next verification run.

## Manual release gates

- Real Supabase Magic Link delivery and callback.
- NVDA/VoiceOver screen-reader walkthrough.
- Browser network interruption/reconnect during an active session.
- Applying and verifying migrations through 00010 in the target Supabase project.
- Production PWA installability/update behavior.
- End-to-end voice-only rehearsal across landing, onboarding, auth, dashboard, practice, exam, results, analysis, and history.

Do not mark a manual gate PASS until it has been observed in the target environment.
