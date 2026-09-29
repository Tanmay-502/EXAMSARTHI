# ExamSaarthi V2

ExamSaarthi V2 is an accessible, voice-first, multilingual examination and practice platform designed primarily for visually impaired candidates.

## Current implementation
- Public gateway: `/` presents only Log in and Sign up actions; it has no automatic speech or 3D hero.
- Authentication: dedicated Supabase passwordless Magic Link login and signup pages, plus Google OAuth.
- Magic Link callback: `/auth/confirm` verifies the token and lands on `/welcome`.
- Welcome: the voice-first product description and demonstration experience lives at `/welcome`; it starts voice guidance there.
- Onboarding: authenticated users choose interaction mode at `/onboarding/mode`, language at `/onboarding/language`, then continue to `/dashboard`.
- Returning users with saved mode and language preferences see “Continue to dashboard” on `/welcome`.
- Voice: Browser Web Speech API, deterministic English/Hindi/Telugu commands, contextual SafeActionRegistry, optional Gemini intent fallback.
- Persistence: Zustand + IndexedDB plus incremental server-backed answer persistence and reconnect replay. Onboarding mode/language are persisted to both localStorage and the authenticated profile.
- Exam integrity: each newly created exam and practice session stores a server-defined question roster; grading uses that roster.
- Security: RLS, server-side grading, session-bound question rosters, and secret answer-key isolation remain unchanged.
- PWA: manifest and service worker are public static assets; authenticated pages and APIs are not cached.

## Getting started
1. Create `.env.local` and keep it out of Git.
2. Apply Supabase migrations `00000` through `00014` in order.
3. Start the app with `npm run dev`.

## Testing
Run the full gate:
```bash
npm ci
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm test
node --test src/lib/voice/__tests__/commandParser.test.ts
npx tsx --test src/lib/i18n/__tests__/registry.test.ts
npm run verify:data
```

## Content ingestion

Validate the checked-in question bank:
```bash
npm run verify:data
```

For a fresh local or staging Supabase project, remove the legacy demo content and ingest the canonical data files:
```bash
npm run ingest -- --purge-demo
npm run ingest -- data/exams/general_awareness_reasoning_mock.json --replace
npm run ingest -- data/exams/quantitative_aptitude_english_mock.json --replace
npm run ingest -- data/exams/practice_bank.json --replace
```

`--replace` is guarded against exams or practice rosters referenced by historical sessions.

Confirm the database contents with:
```sql
SELECT e.kind, e.title, COUNT(q.id) AS question_count
FROM public.exams AS e
LEFT JOIN public.questions AS q ON q.exam_id = e.id
GROUP BY e.kind, e.title
ORDER BY e.kind, e.title;

SELECT q.subject, q.difficulty, COUNT(*) AS question_count
FROM public.questions AS q
JOIN public.exams AS e ON e.id = q.exam_id
WHERE e.kind = 'practice_bank'
GROUP BY q.subject, q.difficulty
ORDER BY q.subject, q.difficulty;
```

Real Magic Link delivery, Google OAuth configuration, screen-reader behavior, target-environment PWA installation, and applying migrations through `00014_questions_roster_rls.sql` still require manual verification.
## Known production limits

The current API rate limiter uses in-memory state, so its window is scoped to an individual serverless function instance rather than shared globally across all instances. A distributed rate-limit store is required for strict cross-instance quotas.
