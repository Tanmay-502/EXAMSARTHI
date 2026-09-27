# Runtime Status

Snapshot: 2026-09-27

## Code-backed implementation

- Supabase passwordless Magic Link authentication with protected application routes.
- Global voice control with deterministic English/Hindi/Telugu commands and optional Gemini fallback.
- Real DB-backed exam selection and practice selection.
- Newly created exam and practice sessions store a server-defined question roster.
- Exam answers can only be written while the server-side exam window is active.
- Final grading uses the frozen session roster and cannot mark a failed submission as locally submitted.
- Local IndexedDB persistence is synchronized to the server and replayed on reconnect.
- Results and learning analytics include unanswered questions in subject denominators for roster-backed sessions.
- Voice auth captures spoken email, reads it back, and requires explicit confirmation before sending the Magic Link.
- Baseline browser security headers are enabled.
- PWA manifest and production static-asset service worker are implemented.

## Manual release gates

These require target-environment evidence:

1. Magic Link email delivery and callback.
2. NVDA/VoiceOver walkthrough.
3. Network interruption/reconnect during an active session.
4. Applying migrations through 00009_practice_question_roster.sql.
5. PWA installation/update behavior.
6. Full voice-only rehearsal across landing → onboarding → auth → dashboard → practice/exam → results → analysis/history/settings.

Automated build/test results and manual observations must be recorded separately.
