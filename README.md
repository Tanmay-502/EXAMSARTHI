# ExamSaarthi V2

ExamSaarthi V2 is an accessible, voice-first, multilingual examination and practice platform designed primarily for visually impaired candidates.

## Current implementation
- Public gateway: `/` has one primary voice entry point with keyboard/screen-reader fallback.
- Voice authentication: stateful user ID + numeric PIN/password flow; `tanmay09` / `12345` is the built-in demo credential.
- Signup: retired from the product UX; `/auth/signup` redirects to voice login.
- Voice resilience: browser speech recognition uses interim buffering, multiple alternatives, noise suppression, echo cancellation and automatic gain control. Low-confidence or unrecognized speech can be re-transcribed by Gemini 3.5 Transcribe before action routing.
- Voice orientation: deterministic `help`, `repeat`, and `where am I` commands work across contexts without depending on an LLM.
- Voice security: secure login callbacks own the microphone and are not overwritten by the global command router. Sensitive login speech is excluded from transcript/audio-recovery paths.
- Intent reliability: deterministic parsing is first; constrained Gemini intent fallback uses model fallbacks instead of repeatedly retrying one unavailable model.
- Persistence: Zustand + IndexedDB plus incremental server-backed answer persistence and reconnect replay.
- Exam integrity: each exam/practice session uses a server-defined question roster; grading and answer-key access remain server-side.
- Security: RLS, session-bound question rosters and private answer-key isolation remain unchanged.
- PWA: manifest and service worker are public static assets; authenticated pages and APIs are not cached.

## Voice demo
Say:
`login` → `tanmay zero nine` → `yes` → `one two three four five`.

After login, the agent can guide navigation and exam operation. Say `help` to hear available commands, `repeat that` to replay the last spoken response, or `where am I` for the current screen.

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
npx tsx --test src/lib/auth/__tests__/voiceCredentials.test.ts
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

Target Supabase migration/data application, real microphone and screen-reader rehearsal, PWA installation/update behavior, and production environment configuration still require target-environment verification.

## Known production limits

The current API rate limiter uses in-memory state, so its window is scoped to an individual serverless function instance rather than shared globally across all instances. Strict cross-instance quotas require a distributed rate-limit store.
