# ExamSaarthi V2

ExamSaarthi V2 is an accessible, voice-first, multilingual examination and practice platform designed primarily for visually impaired candidates. It supports independent exam operation through voice, keyboard, and screen-reader friendly interfaces.

## Current implementation

- Auth: Supabase passwordless Magic Link.
- Database: Supabase PostgreSQL with RLS and server-side grading.
- Voice: Browser Web Speech API, deterministic English/Hindi/Telugu commands, contextual SafeActionRegistry, optional Gemini intent fallback.
- Persistence: Zustand + IndexedDB plus incremental server-backed answer persistence and reconnect replay.
- Vision: Database-provided image descriptions with Gemini Vision fallback.
- Accessibility: Semantic HTML, live announcements, focus management, reduced motion, keyboard support, and WCAG 2.1 AA automated testing target.
- PWA: Web manifest and production static-asset service worker. Authenticated pages and APIs are not cached.

## Documentation

- docs/AUDIT_RESOLUTION_2026-09-27.md: current audit resolution and remaining release gates.
- MANUAL_VOICE_COMPANION_TEST.md: voice-first manual verification plan.
- docs/FINAL_MANUAL_RUNTIME_TEST.md: final browser/runtime verification gates.
- PRODUCTION_CHECKLIST.md: production deployment checklist.

## Getting Started

1. Create .env.local and keep it out of Git.
2. Apply Supabase migrations through 00010_lock_exam_session_inserts.sql.
3. Start the server:

```bash
npm run dev
```

## Testing

Run automated checks:

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

Real Magic Link delivery, screen-reader behavior, network recovery, Supabase migration state, and PWA installability still require target-environment verification.
