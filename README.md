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
2. Apply Supabase migrations `00000` through `00012` in order.
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
```

Real Magic Link delivery, Google OAuth configuration, screen-reader behavior, and target-environment PWA installation still require manual verification.