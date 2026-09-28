# EXAMSAARTHI V2 — Key Decisions

Snapshot: 2026-09-28

## Authentication
Use two explicit passwordless email entry points:
- Login calls Supabase `signInWithOtp` with `shouldCreateUser: false`, so an unknown address is directed to Sign up instead of silently creating an account.
- Sign up calls the same OTP method with `shouldCreateUser: true` and `data.full_name`.
Google OAuth remains available from both auth pages.

Authentication redirects use the fixed `/auth/confirm` callback. Auth status is represented by short allowlisted query codes (`sent`, `invalid_email`, `no_account`, `send_failed`, `link_invalid`, `unauthenticated`) instead of free-form `message` parameters.

## Gateway and onboarding
`/` is intentionally minimal and silent: one heading, one tagline, Log in and Sign up actions, a language switcher, and the signed-in Continue/Sign out banner.
The existing voice-first landing experience moved to `/welcome`. Voice guidance and the DemoGuide are activated there rather than on `/`.
Authenticated onboarding is `/onboarding/mode` -> `/onboarding/language` -> `/dashboard`. Mode and language are written to both localStorage and the authenticated `profiles.accessibility_prefs`. The shared `hasSavedPreferences()` helper decides whether `/welcome` can offer Continue to dashboard.

## Exam integrity
Correct answers live in question_answers and are read only by privileged server-side grading. Client exam-session and answer writes are disabled; server actions validate candidate ownership and question/session boundaries.

## Practice integrity
Practice sessions store the exact question IDs shown to the candidate. Answer persistence and final grading are restricted to that roster.

## Persistence
Zustand + IndexedDB is the immediate local state layer. Server-backed saveAnswer is the durable synchronization path while a session is in progress, with replay when connectivity returns.

## Voice
VoiceProvider owns browser STT/TTS. GlobalVoiceAssistant owns contextual routing. Deterministic parsing handles common commands first; Gemini is a fallback for natural language. No separate competing voice engine should be added.
Voice email capture is implemented once in `useVoiceEmailCapture`. It only activates when the saved interaction mode is `voice-first`; first-time users therefore remain keyboard/screen-reader-first on authentication pages.

## Personalization
Learning Profile analysis is consent-based context generation, not per-user model retraining. During active exams, AI services must not receive answer keys or solve current questions.

## Accessibility
The automated target is WCAG 2.1 AA. Manual NVDA/VoiceOver verification remains a release gate.

## PWA
The service worker caches static assets only. Authenticated navigation, auth routes, API routes, and other user-specific HTML are intentionally not cached. `/manifest.json` and `/sw.js` remain publicly reachable to logged-out users.