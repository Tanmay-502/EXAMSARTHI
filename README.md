# ExamSaarthi V2

ExamSaarthi V2 is an accessible, voice-first, multilingual examination and practice platform designed primarily for visually impaired candidates.

## Current implementation
- Auth: Supabase passwordless Magic Link.
- Database: Supabase PostgreSQL with RLS and server-side grading.
- Voice: Browser Web Speech API, deterministic English/Hindi/Telugu commands, contextual SafeActionRegistry, optional Gemini intent fallback.
- Persistence: Zustand + IndexedDB plus incremental server-backed answer persistence and reconnect replay.
- Exam integrity: each newly created exam and practice session stores a server-defined question roster; grading uses that roster.
- Vision: database-provided image descriptions with Gemini Vision fallback.
- Accessibility: semantic HTML, live announcements, focus management, reduced motion, keyboard support, and WCAG 2.1 AA automated testing target.
- PWA: web manifest and production static-asset service worker; authenticated pages and APIs are not cached.

## Getting started
1. Create `.env.local` and keep it out of Git.
2. Apply Supabase migrations through `00009_practice_question_roster.sql` in order.
3. Start the app with `npm run dev`.

## Testing
```bash
npm run typecheck
npm run lint
npm run build
npm test
```

Automated tests are not a substitute for target-environment verification of Magic Link delivery, screen readers, network recovery, Supabase migration state, and PWA installation.