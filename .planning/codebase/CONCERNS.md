# Codebase Concerns

**Analysis Date:** 2026-09-27

## Tech Debt

**Discrepancy in AI API Key Environment Variable Names:**

- Issue: Different API route handlers check different environment variable names for the Gemini generative AI integration.
- Files: `src/app/api/intent/route.ts` (checks `process.env.GOOGLE_GENERATIVE_AI_API_KEY`) vs `src/app/api/vision/route.ts` (checks `process.env.GEMINI_API_KEY`).
- Why: Implemented in separate development iterations.
- Impact: If an administrator configures only `GEMINI_API_KEY`, intent parsing silently falls back to `UNKNOWN`; if only `GOOGLE_GENERATIVE_AI_API_KEY` is configured, vision diagram descriptions fail with an unconfigured message.
- Fix approach: Normalize to support both keys in a unified helper function: `const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY`.

**Missing Test Script in package.json:**

- Issue: `package.json` defines `"dev"`, `"build"`, `"start"`, `"lint"`, and `"typecheck"`, but lacks a `"test"` script.
- Files: `package.json`
- Why: Playwright and Node native test runners were executed ad-hoc during development.
- Impact: CI pipelines and automated test tools cannot invoke standard `npm test`.
- Fix approach: Add `"test": "playwright test"` and `"test:unit": "node --test src/lib/voice/__tests__/commandParser.test.ts"` to `package.json`.

**Legacy or Overlapping Voice Logic:**

- Issue: `VoiceGateway.tsx` on the landing page contains self-contained speech loops that partially overlap with the global `GlobalVoiceAssistant.tsx` context wrapper.
- Files: `src/components/voice/VoiceGateway.tsx`, `src/components/voice/GlobalVoiceAssistant.tsx`
- Why: Voice Gateway was developed first as a standalone MVP landing interaction before the global assistant was introduced.
- Impact: Risk of conflicting speech recognition sessions or speech synthesis double-utterances if both components attempt to consume mic inputs.
- Fix approach: Refactor `VoiceGateway.tsx` to purely consume `useGlobalVoice()` or dispatch actions through `GlobalVoiceAssistant`.

## Known Bugs & Edge Cases

**Next.js Client-Side Router Redirect Loop in Auth Flow:**

- Symptoms: E2E tests for Magic Link login required a custom `window.fetch` interceptor to capture `x-action-redirect` headers.
- Trigger: Fast consecutive form submission or identical-path redirects in Next.js Server Actions.
- Files: `src/app/auth/actions.ts` (line 32-35), `e2e/accessibility.spec.ts` (line 22-37).
- Root cause: Next.js App Router client cache behavior when server actions issue URL redirects.
- Fix: Standardize action redirect pattern or use client-side router transitions following action execution.

## Security Considerations

**Client-Provided Context in Intent Classification:**

- Risk: `/api/intent` accepts `context` as a client-provided JSON parameter (`req.json()`).
- File: `src/app/api/intent/route.ts`
- Current mitigation: The prompt instructs Gemini to classify question-solving requests as `QUESTION_SOLVING`, and `SafeActionRegistry` restricts allowed actions.
- Recommendations: Validate server-side session status before trusting client-claimed context (e.g. check `exam_sessions` if the user is in an active exam).

**Server Role Key Exposure Prevention:**

- Risk: `SUPABASE_SECRET_KEY` grants full database bypass permissions.
- File: `src/lib/supabase/server.ts`
- Current mitigation: `createAdminClient()` is only called in server-side action files (`src/app/exam/actions.ts`) to evaluate answers.
- Recommendations: Ensure admin operations are strictly guarded by `user.id` verification before invoking the admin client.

## Performance Bottlenecks & Offline Resilience

**Offline Answer Synchronization Outbox:**

- Problem: `useExamStore` correctly saves candidate answers to IndexedDB immediately upon selection (`idb-keyval`), but network synchronization via Server Action `saveAnswer` is done live.
- File: `src/lib/store/examStore.ts`, `src/app/exam/actions.ts`
- Impact: If candidate's internet drops for 10 minutes and then reconnects, intermediate individual answers might not sync until the final `submitExamSession` is called.
- Improvement path: Implement a local background sync queue (outbox) in IndexedDB that replays pending unsynced answer mutations when online connectivity is restored.

## Fragile Areas

**Browser-Native Web Speech API Dependence:**

- File: `src/lib/voice/VoiceProvider.tsx`
- Why fragile: Native `SpeechRecognition` is vendor-prefixed (`webkitSpeechRecognition`), requires an active internet connection on Google Chrome (transcripts sent to Google servers by the browser), and is unsupported on Firefox and inconsistent on Safari.
- Safe modification: Abstract speech recognition behind a modular interface with pluggable providers, allowing future integration of server-side WebSockets STT (e.g. Whisper, Google Cloud Speech, or Gemini Live API).

## Dependencies at Risk

**Next.js 16 Canary (`16.3.6`):**

- Risk: Running pre-release Next.js 16 can lead to breaking changes in middleware, server actions, or cookie handling between canary builds.
- Impact: `src/proxy.ts` (the Next.js 16 middleware/proxy convention) and `@supabase/ssr` cookie synchronization could fail on minor updates.
- Mitigation: Pin dependencies tightly and verify `npm run build` and `npm run typecheck` before deployment.

---

*Concerns audit: 2026-09-27*
*Update as issues are fixed or new ones discovered*
