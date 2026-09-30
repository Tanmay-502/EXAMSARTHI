# EXAMSAARTHI V2 — Status

Snapshot: 2026-09-30

## Implemented

- Next.js 16.3.6 App Router with protected application routes.
- Supabase passwordless Magic Link authentication.
- Server-side exam-session creation, grading, answer persistence, and submission locking.
- Correct-answer isolation in question_answers.
- Practice sessions bound to their exact question roster.
- Zustand + IndexedDB local exam persistence with server replay on reconnect.
- Global browser voice control using Web Speech API with deterministic parsing and optional Gemini fallback.
- English, Hindi, and Telugu voice/UI support.
- Voice-first auth email capture with read-back confirmation.
- PWA manifest and static-asset service worker.
- Automated Playwright + axe coverage.
- Practice confirmation supports server-enforced correctness and explanation feedback.

## Not yet a verified PASS

These require real target-environment evidence:

- Magic Link email delivery/callback.
- NVDA/VoiceOver screen-reader walkthrough.
- Network interruption/reconnect during an active session.
- Supabase migrations through 00014_questions_roster_rls.sql applied to the target project.
- PWA installation/update behavior on the target deployment.
- Full voice-only rehearsal across all major routes.

## Evidence rule

Build output, automated tests, code inspection, and manual browser tests are separate evidence classes. A code path is not marked PASS until its required test has been observed.
