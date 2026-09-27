# Audit Resolution — 2026-09-27

This file supersedes the earlier pasted audit snapshot where its findings no longer match the current repository state.

## Resolved in this checkpoint

1. **Exam-session INSERT security**
   - Added migrations 00008_lock_exam_session_inserts.sql, 00009_active_session_constraints.sql, and 00010_practice_question_set.sql.
   - Client-side exam_sessions INSERT policy is removed.
   - startExamSession and startPracticeSession already create sessions through the privileged server client after verifying the signed-in candidate.
   - Submission remains server-side and only updates an owned in_progress session.

2. **Landing-page voice**
   - The current landing page already speaks the gateway welcome on mount and starts continuous listening.
   - No duplicate landing voice gateway was added.

3. **Editorial visual consistency**
   - Login, Results, History, Analysis, Settings, Dashboard, Practice, Exam, and onboarding routes now use the current black/editorial visual language.
   - Server/client motion-boundary fixes remain in place.

4. **Server-backed answer autosave**
   - Added saveAnswer server action with candidate/session/question validation.
   - Answers persist incrementally while a session is in_progress.
   - Persisted IndexedDB answers are replayed on mount and when connectivity returns.

5. **Results practice breakdown**
   - Results subject statistics use the session-answer join, including practice sessions where exam_id is null.

6. **History filters**
   - searchParams is awaited as a Promise-compatible Next.js 16 App Router prop.

7. **Development authentication**
   - Protected routes now enforce authentication in development as well as production.

8. **Submission race guard**
   - Final session update includes status = in_progress, preventing a second concurrent submit from changing an already-submitted session.

9. **Gemini key handling**
   - Intent and Vision routes now both use getGeminiKey() and pass the resolved key into createGoogleGenerativeAI.

10. **Voice feedback and safety**
    - Blocked navigation during an active exam now produces an explicit spoken boundary instead of silence.
    - ExamEngine no longer swallows cross-mode navigation requests.
    - Study-screen allowlists now include the practice actions needed by the voice flow.

11. **Question randomisation**
    - Exam questions are deterministically shuffled per candidate and exam so a refresh is stable while candidate sessions differ.

12. **Accessibility target**
    - Repository documentation and automated accessibility tests use WCAG 2.1 AA consistently.
    - Manual NVDA/VoiceOver verification remains required for a full conformance claim.

13. **PWA foundation**
    - Added public/manifest.json, public/icon.svg, and a production-only service worker.
    - The service worker intentionally avoids caching authenticated pages, /api/*, and /auth/*.
    - This is a safe install/static-asset PWA layer; it does not claim full offline rendering of authenticated server pages.

14. **Documentation accuracy**
    - Runtime status and architecture documents are being updated to reflect the actual Next.js 16.3.6 + Supabase + Web Speech implementation.
    - Historical verification claims that were not re-tested are no longer treated as current evidence.

15. **Voice/code-quality cleanup**
    - Added Telugu mode/analysis deterministic phrase coverage.
    - Removed the reported unused imports/props.
    - Added explicit Playwright and unit-test scripts.

## Still requires human/manual verification

- Supabase production email delivery for Magic Link authentication.
- Manual NVDA/VoiceOver walkthrough.
- Real venue/network test for auth and connectivity recovery.
- Supabase migration application/verification in the target project.
- Final voice-only rehearsal across landing → onboarding → practice → exam → results → analysis → history.

## Verification rule

Do not mark any manual item PASS merely because the code path exists. Record an explicit observed result and date.
