# Final Manual Runtime Test Plan

Snapshot: 2026-09-27
Purpose: target-environment validation after the 2026-09-27 code audit. This document records required observations; it does not claim PASS when a test has not been executed.

## Gate 1 — Clean browser startup
- Start the app and open `/`.
- Confirm the landing page loads.
- Confirm the gateway welcome is spoken automatically and continuous voice listening is available.

## Gate 2 — Real authentication
- Open `/auth/login`.
- Send a Magic Link using the target Supabase project.
- Verify the message is received and the callback establishes a real session.
- Verify authenticated routes redirect correctly when no session exists and load correctly when a session exists.

## Gate 3 — Dashboard → Practice
- From `/dashboard`, say “I want to practice”.
- Say a real subject from the database.
- Provide count and difficulty.
- Verify real questions load and the first question is spoken.

## Gate 4 — Active exam
- Start a real exam.
- Verify question text and options are spoken.
- Select an option by voice, confirm it, navigate, mark review, and query time left.

## Gate 5 — Exam security
- While an exam is active, attempt to open dashboard, history, analysis, settings, practice, or logout.
- Verify the assistant speaks an explicit boundary and does not navigate away.
- Ask it to solve the active question.
- Verify it refuses to provide the answer/solution.

## Gate 6 — Server persistence
- Answer at least two questions.
- Confirm an answer is persisted while the session is in_progress.
- Temporarily disconnect the browser network and reconnect.
- Verify local state survives and pending answers are replayed.

## Gate 7 — Submit → Results → Analysis
- Submit using the spoken confirmation flow.
- Verify server-side grading and `/results?session_id=...`.
- Verify subject breakdown is present for practice sessions when data supports it.
- Say “give me my analysis”.
- Verify `/analysis` loads and speaks its summary.
- Say “I want to practice” and verify navigation to `/practice`.

## Gate 8 — History
- Open `/history` directly.
- Test All, Exams, and Practice filters.
- Open a completed result.
- Say “I want to practice” and verify the voice action is accepted.

## Gate 9 — Language
- Explicitly select English, Hindi, and Telugu on non-exam screens.
- Verify UI, recognition, and TTS use the selected locale.
- Verify simply speaking Hindi or Telugu does not switch the application language unless a language-selection command is intended.

## Gate 10 — PWA
- Check `/manifest.json` and browser installability on the production deployment.
- Confirm the service worker registers in production.
- Confirm static assets can be served from cache.
- Confirm authenticated navigation, auth routes, and API requests are not cached.

## Gate 11 — Accessibility
- Keyboard-only navigation.
- NVDA and/or VoiceOver.
- Focus order, headings, labels, announcements, contrast, and reduced-motion behavior.

## Gate 12 — Evidence
For every gate, record: date/time, browser, OS, deployment URL, observed result, and any remaining issue. Separate automated test results from manual observations.
