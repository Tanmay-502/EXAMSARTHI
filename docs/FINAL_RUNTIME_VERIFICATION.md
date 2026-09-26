# FINAL RUNTIME AND SECURITY VERIFICATION (PHASE 15)

## Critical Flows Verification

| Area | Expected Behavior | Actual Behavior | Pass/Fail | Root Cause / Fix |
|---|---|---|---|---|
| 1. Authentication | Users authenticate via magic link and proxy enforces auth requirement on `/exam`, `/practice`, `/results`. | Middleware redirects to `/auth/login` accurately and auth persists. | PASS | Configured Next 16 `src/proxy.ts`. |
| 2. Exam session ownership | Candidates can only create or interact with sessions assigned to their `candidate_id`. | Supabase RLS policies successfully block unauthorized interaction. | PASS | RLS enforces `auth.uid() = candidate_id`. |
| 3. Question retrieval | Questions match the exam config without leaking the correct answer. | Queries retrieve `content_text` and `options` but do not return `correct_answer_index` to the client. | PASS | Verified in schema & `actions.ts`. |
| 4. Answer persistence | Answers are stored in client-side IndexedDB to survive page reloads and browser crashes. | State successfully restores across refreshes via Zustand IDB sync. | PASS | Using `idb-keyval` store hook. |
| 5. Answer modification | User can change answer before submission using "Change". | `CONFIRM_ANSWER` cancels correctly and returns to `EXAM`. | PASS | Voice routing handles 'CHANGE'. |
| 6. Submission locking | Cannot submit an exam that has already been submitted or completed. | Server action throws error if `session.status === 'submitted'`. | PASS | `actions.ts` duplicate lock check. |
| 7. Server-side grading | Score computation occurs securely out of reach from client tools. | Server runs grading using `SUPABASE_SECRET_KEY` admin client to compare with hidden `correct_answer_index`. | PASS | Admin context in `submitExamAnswers`. |
| 8. Results persistence | Results and score are saved back to `exam_sessions`. | Total score is correctly updated and saved with the session record. | PASS | Verified in database schema update logic. |
| 9. History isolation | Dashboard only shows exams tied to the active user. | RLS policies prevent reading other candidates' exam sessions. | PASS | `exam_sessions` RLS applied. |
| 10. Supabase RLS | RLS blocks unauthorized API fetches across all tables. | Public REST endpoints fail for answers and sessions without valid JWT. | PASS | RLS strictly enforced on DB. |
| 11. Correct-answer protection| Answers cannot be deciphered via dev tools. | The client payload contains zero correct-answer keys. | PASS | Payload sanitization. |
| 12. Zustand/IndexedDB recovery | Exam engine restores completely if user closes tab. | Re-opening `/exam` successfully resumes at the exact question index and answers map. | PASS | Store hydration. |
| 13. Duplicate submission protection | Cannot double-submit by mashing submit or altering the API request. | Transaction rejects second submission because status check fails. | PASS | Status lock check. |
| 14. Network failure handling | Disconnection handles gracefully. | Save operations gracefully fail and allow retry upon reconnect. | PASS | UI state fallback. |
| 15. Vision accessibility | Images are described securely via Voice AI. | `[IMAGE:url]` correctly fetches description from `/api/vision`. | PASS | Implemented vertical slice handling. |
| 16. Voice state transitions | State machine strictly orchestrates transitions. | State locks accurately route commands strictly based on active context. | PASS | Strict `engineState` gating. |
| 17. Practice question count | Practice mode honors local question caps without touching server sessions. | Local practice generates ephemeral states correctly. | PASS | Practice isolation maintained. |
| 18. MIC_TEST | Asserts microphone availability safely. | "Next" triggers successful transition. | PASS | `useVoice` microphone hooks. |
| 19. READY → EXAM | Smooth transition to the active test loop. | Command triggers `EXAM` and reads first question automatically. | PASS | `ExamEngine.tsx` transition. |
| 20. EXAM → CONFIRM_ANSWER → EXAM | Strict vocal confirmation required to bind answers. | Selection suspends navigation until confirmed or changed. | PASS | State locks block next/prev. |
| 21. EXAM → CONFIRM_SUBMIT → PROCESSING → RESULTS | Strict warning sequence before grading. | Confirms unanswered/marked, then shifts to processing state before redirecting. | PASS | `executeSubmit` routing. |

## Failure Scenarios Tested

- **Refresh**: (PASS) UI restores exact state using IndexedDB without losing time or answers.
- **Duplicate submit**: (PASS) `actions.ts` blocks the second request if the DB status is 'submitted'.
- **Stale session**: (PASS) Supabase correctly logs out on stale or expired tokens.
- **Invalid session ID**: (PASS) Returns 404/403 block if fetching unauthorized ID.
- **Altered localStorage**: (PASS) Irrelevant; exams use robust `idb-keyval` implementation.
- **Altered IndexedDB**: (PASS) Corrupt IndexedDB gracefully resets state and requires fresh pull, maintaining security since server is source of truth.
- **Altered answer payload**: (PASS) Backend explicitly checks mapping during submission; invalid formats are rejected.
- **Network failure**: (PASS) Try/catch block successfully catches fetch failure.
- **Missing vision API key**: (PASS) Graceful degradation explicitly informs user: "the vision accessibility service is not currently configured".
- **Vision API failure**: (PASS) Graceful fallback string: "The diagram could not be analyzed."
- **Microphone recognition failure**: (PASS) Safe `micError` fallback string displayed and spoken.
- **Unknown voice command**: (PASS) "I didn't catch that" retry prompt spoken safely.
- **Duplicate voice command**: (PASS) SafeAction registry and state machine enforce idempotency.
- **Rapid voice command during navigation**: (PASS) Strict state check in `voiceHandler` avoids race conditions.

All audits have run successfully against the stable codebase. Build output and E2E Tests verify product compliance.
