# Production Readiness Audit

Snapshot: 2026-09-27

## Authentication

Supabase Auth uses passwordless Magic Links. Protected application routes are enforced by src/proxy.ts in development and production.

Manual gate: real Magic Link email delivery, callback exchange, session persistence, and authenticated-route behavior must be verified against the target Supabase project.

## Voice pipeline

The active path is:

SpeechRecognition -> VoiceProvider -> GlobalVoiceAssistant -> deterministic parser / optional Gemini intent fallback -> SafeActionRegistry -> page action handler -> state/navigation -> TTS confirmation.

Core English, Hindi, and Telugu command paths are implemented. The deterministic parser has explicit Telugu mode/analysis coverage.

## Exam integrity

- Correct-answer data remains server-side.
- Client exam-session INSERT and UPDATE writes are disabled; session creation/finalization use privileged server actions.
- Migration 00008_lock_exam_session_inserts.sql removes the client session INSERT policy.
- Final submission updates require an owned in_progress session.
- Answers are validated against the session/question boundary before server persistence.
- Active-exam voice navigation is restricted and blocked navigation now produces an explicit spoken boundary.
- Real biometric/speaker verification is intentionally not faked.

Manual gate: apply all migrations through 00008 to the target Supabase project and perform a real end-to-end exam.

## Persistence

Answers are stored in IndexedDB for immediate local recovery and are also incrementally persisted through saveAnswer while the session is in progress. Reconnection replays the locally persisted answers.

Manual gate: perform a real network interruption/recovery test.

## AI services

Both /api/intent and /api/vision use the shared getGeminiKey helper and pass the resolved key into the Google provider.

## Accessibility

The automated target is WCAG 2.1 AA. The application includes semantic structure, focus management, live announcements, keyboard support, reduced motion, voice control, and image descriptions.

Manual gate: NVDA/VoiceOver walkthrough across landing, onboarding, dashboard, practice, exam, results, analysis, history, and settings.

## PWA

A web manifest and production static-asset service worker are present. The service worker deliberately does not cache authenticated navigation, /auth/*, or /api/*.

Manual gate: verify browser installability and update behavior on the production deployment.

## Visual system

The current routes use the black/editorial visual language. Login, Results, History, Analysis, and Settings are on the same visual family as the redesigned landing/dashboard/practice/exam experience.

## Evidence policy

Build results, automated E2E results, static code inspection, and manual browser observations are separate evidence classes. A manual gate is not marked PASS until it has been observed in the target environment.
