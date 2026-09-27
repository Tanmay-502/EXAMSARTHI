# Runtime Status

**Snapshot:** 2026-09-27
**Canonical audit:** docs/AUDIT_RESOLUTION_2026-09-27.md

## Current state

- Practice mode uses real Supabase questions.
- Exam sessions are created server-side after authentication.
- Correct answers are never sent to the exam client.
- Answers are saved locally immediately and persisted incrementally to the server.
- Reconnect logic replays persisted answers.
- Submission is server-side and guarded by ownership + status = in_progress.
- Results, history, analysis, and settings use the current editorial UI.
- English, Hindi, and Telugu are supported.
- Gemini intent and vision routes use the same resolved API-key source.
- PWA manifest and a production static-asset service worker are present.
- Automated accessibility target is WCAG 2.1 AA.

## Manual gates before final demo

These are not marked PASS until observed on the target environment:

1. Magic-link email delivery and callback.
2. NVDA/VoiceOver screen-reader walkthrough.
3. Real network drop/reconnect during an active session.
4. Supabase migration 00008 applied to the target project.
5. Full voice-only rehearsal across all major routes.
