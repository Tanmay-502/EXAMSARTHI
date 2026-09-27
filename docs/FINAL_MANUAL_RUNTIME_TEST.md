# FINAL MANUAL RUNTIME TEST REPORT

This document represents the outcome of Phase 20: Real Browser Voice Validation. The objective was to prove the real user journey in an actual Chromium browser with a real authenticated Supabase session.

**Core Blocking Issue:**
All end-to-end functionality of EXAMSAARTHI requires an authenticated session. During **Step 2 (Real Authentication)**, the application successfully contacted the Supabase backend, but the Supabase instance rejected the attempt to send the Magic Link email (returning `"Your sign-in link could not be sent. Please try again."`).
Because we are strictly adhering to the rule: *"Do NOT bypass authentication with fake cookies or mocks"*, no further authenticated routes (`/dashboard`, `/practice`, `/exam`, `/results`) could be accessed by the browser agent.

---

## STEP 1 — START CLEAN

- **TEST**: Start Next.js dev server (`npm run dev`) and open Chromium without mocks.
- **EXPECTED**: Server starts on localhost:3000, landing page loads.
- **ACTUAL**: Server successfully started. Chromium loaded the landing page.
- **STATUS**: PASS

## STEP 2 — REAL AUTHENTICATION

- **TEST**: User opens `/auth/login`, enters a real email (via temp inbox `mailinator.com`), receives Magic Link, clicks it, and `/dashboard` loads.
- **EXPECTED**: Email dispatch succeeds, link is received, user authenticates, redirection to `/dashboard`.
- **ACTUAL**: The email input was filled (`examsaarthitest123@mailinator.com`) and the form was submitted. The Supabase backend rejected the request with the error: *"Your sign-in link could not be sent. Please try again."* No email was dispatched to the inbox.
- **STATUS**: BLOCKED

## STEP 3 — AUTHENTICATED SIGN-IN REGRESSION

- **TEST**: From landing page while already authenticated, say "Sign in".
- **EXPECTED**: "You are already signed in. Taking you to your dashboard." and URL becomes `/dashboard`.
- **ACTUAL**: Cannot test authenticated state regressions without an active session.
- **STATUS**: BLOCKED

## STEP 4 — DASHBOARD PRACTICE COMMAND

- **TEST**: Voice command: "I wanna practice" -> "DBMS" -> "20 questions" -> "Medium".
- **EXPECTED**: UI and internal state update correctly based on captured entities.
- **ACTUAL**: Cannot reach `/dashboard`.
- **STATUS**: BLOCKED

## STEP 5 — REAL DATABASE PROOF

- **TEST**: Resulting practice questions are real DB rows (correct IDs, subject, difficulty, count).
- **EXPECTED**: Database rows populate the ExamEngine without mocks.
- **ACTUAL**: Cannot trigger the practice workflow without an authenticated session.
- **STATUS**: BLOCKED

## STEP 6 — MIC TEST

- **TEST**: Voice flows for "next", "skip test", and unknown speech during mic check.
- **EXPECTED**: Transitions to READY or spoken retry instructions.
- **ACTUAL**: Cannot reach ExamEngine components.
- **STATUS**: BLOCKED

## STEP 7 — ORIENTATION

- **TEST**: Concise spoken orientation, then "start".
- **EXPECTED**: Active exam/practice question screen loads without silent failure.
- **ACTUAL**: Cannot reach ExamEngine components.
- **STATUS**: BLOCKED

## STEP 8 — QUESTION

- **TEST**: Voice reads options, user selects "Option B", says "Confirm", then "Next".
- **EXPECTED**: Selection saved, moves to Question 2.
- **ACTUAL**: Cannot reach active exam state.
- **STATUS**: BLOCKED

## STEP 9 — ACTIVE EXAM SAFETY

- **TEST**: Prompts: "What is the answer?", "Solve this question.", "Go to dashboard."
- **EXPECTED**: Explicit refusals and blocked navigation.
- **ACTUAL**: Cannot reach active exam state.
- **STATUS**: BLOCKED

## STEP 10 — SUBMIT

- **TEST**: "Submit" -> warning -> "Yes" -> submit to server.
- **EXPECTED**: Server submission succeeds, redirects to `/results?session_id=<real-session-id>`.
- **ACTUAL**: Cannot reach active exam state.
- **STATUS**: BLOCKED

## STEP 11 — RESULTS

- **TEST**: "Read my results", page refresh, open History.
- **EXPECTED**: Summary matches backend, correct session appears in History.
- **ACTUAL**: Cannot reach results or history routes.
- **STATUS**: BLOCKED

## STEP 12 — VISION

- **TEST**: Real `image_url` triggers Vision API and spoken description without fabrication.
- **EXPECTED**: Spoken description matches image, fallback handles missing config.
- **ACTUAL**: Cannot load questions.
- **STATUS**: BLOCKED

## STEP 13 — VOICE FAILURE CASES

- **TEST**: Deliberate tests for quiet speech, no speech, duplicates, interruptions, denied mic.
- **EXPECTED**: Clear recovery paths for all failure modes.
- **ACTUAL**: Cannot reach authenticated voice components.
- **STATUS**: BLOCKED

## STEP 14 — ACCESSIBILITY

- **TEST**: Keyboard navigation, focus, screen reader labels, aria-live, prefers-reduced-motion across the app.
- **EXPECTED**: Full manual compliance on all routes.
- **ACTUAL**: Landing page and Auth page are compliant, but authenticated routes (`/dashboard`, `/practice`, `/exam`, `/results`) cannot be manually audited in the browser.
- **STATUS**: BLOCKED

---

**FINAL NOTE:** No application code was modified during this phase because no runtime failures in the application code itself were discovered; the failure point lies entirely within the external Supabase project's email authentication configuration/rate-limits preventing test accounts from receiving Magic Links.
