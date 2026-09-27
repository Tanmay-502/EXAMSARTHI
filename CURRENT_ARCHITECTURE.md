# Current Architecture — ExamSaarthi V2

**Snapshot:** 2026-09-27

## Overview

ExamSaarthi V2 is a Next.js 16.3.6 application using Supabase for authentication/database, Web Speech API for voice interaction, Zustand + IndexedDB for local exam-state resilience, and Gemini through the AI SDK for optional semantic intent parsing and vision descriptions.

## Provider and voice flow

1. VoiceProvider owns browser speech recognition and synthesis.
2. GlobalVoiceAssistant maintains conversation/context state and receives speech transcripts.
3. Deterministic parsing runs first; semantic Gemini intent parsing is used as fallback.
4. SafeActionRegistry authorizes actions by active route/context.
5. Page-specific handlers consume approved actions through useVoiceAction.
6. Actions update application state or perform guarded navigation, then TTS confirms the result.

There is no active independent VoiceGateway loop on the landing page.

## Application flow

Landing → Mode → Language → Login → Dashboard → Practice/Exam → Results → Analysis/History/Settings.

The landing page speaks its gateway welcome on mount and starts continuous listening.

## Exam state and persistence

- useExamStore is the immediate client state.
- IndexedDB persists the exam state locally.
- saveAnswer writes each selected answer/review state to Supabase while the session is in progress.
- On mount and browser online events, persisted local answers are replayed to the server.
- submitExamAnswers performs final server-side grading and atomically transitions an owned session from in_progress to submitted.

## Security boundary

- Client question payloads omit correct_answer_index.
- exam_sessions client INSERT and UPDATE policies are removed/disabled; session creation and final updates are server-side.
- answers client write policy is removed; server actions use the privileged client after validating the signed-in candidate.
- Active exam voice navigation is restricted by SafeActionRegistry.
- Audit events are written for significant session actions.

## Accessibility

The project targets WCAG 2.1 AA, uses semantic HTML/focus management/live announcements, and respects user reduced-motion preferences. Manual screen-reader verification remains a release gate.

## PWA

The app includes a web manifest and a production service worker that caches static assets only. Authenticated pages, auth routes, and API responses are not cached.
