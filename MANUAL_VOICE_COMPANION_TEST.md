# Voice Companion Manual Test Plan

Snapshot: 2026-09-27
Use this together with docs/AUDIT_RESOLUTION_2026-09-27.md. Do not mark a scenario PASS until it has been observed in the target browser/environment.

## Scenario 1 — Landing
1. Open `/`.
2. Verify the assistant speaks the gateway welcome automatically without a button click.
3. Say a supported command such as “I want to sign in”.
4. Verify navigation to the authentication flow.

## Scenario 2 — Dashboard
1. Sign in with a real Supabase session.
2. Verify dashboard orientation is spoken.
3. Say “I want to practice”.
4. Verify practice mode opens and asks for the subject.

## Scenario 3 — Practice setup
1. Say “DBMS”.
2. Say a supported question count.
3. Say “easy”, “medium”, or “hard”.
4. Verify real questions are fetched from Supabase.
5. Verify the first practice question is announced.

## Scenario 4 — Active exam safety
1. Start a real exam.
2. Say “go to dashboard”, “show history”, or “open analysis”.
3. Verify the assistant gives an explicit spoken boundary and does not navigate away.
4. Ask the assistant to solve the active question.
5. Verify the assistant refuses to answer or solve it.

## Scenario 5 — Answer confirmation
1. During an active question, say “option B”.
2. Verify the selected option is read back.
3. Say “confirm”.
4. Verify the answer is saved and the next-step prompt is spoken.
5. Verify the same answer is persisted server-side while the session is in progress.

## Scenario 6 — Navigation and submission
1. Use “next”, “back”, “time left”, and “mark for review”.
2. Say “submit”.
3. Verify the spoken warning includes unanswered and marked counts.
4. Say “yes”.
5. Verify server-side grading and navigation to `/results?session_id=...`.

## Scenario 7 — Results → analysis → practice
1. On results, say “give me my analysis”.
2. Verify `/analysis` opens and the analysis summary is spoken.
3. Say “I want to practice”.
4. Verify `/practice` opens rather than returning an unavailable-action message.

## Scenario 8 — History
1. Open `/history`.
2. Verify the All/Exams/Practice filters change the displayed query state.
3. Say “I want to practice”.
4. Verify practice navigation is accepted from the history context.

## Scenario 9 — Languages
1. On a non-exam screen, explicitly request Hindi or Telugu using the language command.
2. Verify the UI and voice locale changes only because of the explicit language-selection action.
3. Speaking Hindi or Telugu while answering or navigating must not by itself change the application language.

## Scenario 10 — Failure recovery
1. Deny microphone permission and verify a spoken or visible fallback.
2. Test unclear speech and verify a spoken retry prompt.
3. During an active session, disable network briefly and restore it.
4. Verify local state remains available and pending answers are replayed on reconnect.

## Scenario 11 — Accessibility
1. Run keyboard-only navigation.
2. Run NVDA and/or VoiceOver.
3. Verify focus order, headings, live announcements, labels, contrast, and reduced-motion behavior.
4. Record the observed result and browser/OS/date.

## Scenario 12 — PWA
1. Open the production deployment in a supported browser.
2. Verify the manifest is recognized and the app is installable where supported.
3. Verify static assets can be reused from cache after an offline transition.
4. Verify authenticated pages and API calls are not served from stale cache.
