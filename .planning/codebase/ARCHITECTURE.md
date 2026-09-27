# Architecture

Snapshot: 2026-09-27

## Overview

ExamSaarthi V2 is an accessible voice-first examination and practice platform using Next.js 16.3.6, React 19, Supabase, Web Speech APIs, Zustand/IndexedDB, and optional Gemini services.

## Voice architecture

VoiceProvider owns browser SpeechRecognition/SpeechSynthesis.

GlobalVoiceAssistant:
- derives the route context
- parses deterministic voice commands first
- uses Gemini only when deterministic parsing cannot classify the utterance
- authorizes the resulting SafeAction before dispatching route-specific handlers
- handles global navigation/auth/language actions

Page-specific components subscribe through useVoiceAction.

## Application flow

Landing → Mode → Language → Login / Create Account → Dashboard → Practice / Exam → Results → Analysis / History / Settings.

## Exam flow

1. Candidate selects a real DB-backed exam.
2. Device check runs before creating an exam session.
3. startExamSession verifies authentication, exam existence, and reuses a valid active attempt when appropriate.
4. fetchExamQuestions verifies candidate/session ownership and never selects the answer key.
5. Zustand + IndexedDB maintain local exam state.
6. saveAnswer persists answer/review state server-side while the session is in progress.
7. submitExamAnswers reads protected correct answers server-side, calculates metrics, and atomically transitions the owned session to submitted.
8. Results are accessible only for submitted sessions belonging to the current candidate.

## Practice flow

Practice questions are fetched by subject, difficulty, and count. The selected question IDs are stored on the server-side session in exam_sessions.question_ids; answer persistence and grading are restricted to that server-bound set.

## Security boundary

- questions has no correct-answer column.
- question_answers has no authenticated read policy.
- exam_sessions has no authenticated INSERT/UPDATE policy.
- answers has no authenticated write policy.
- Server actions use the privileged client only after verifying the signed-in candidate and session/question ownership.
- Active exam voice navigation is restricted by SafeActionRegistry.
- Vision requests validate public HTTP(S) image URLs and reject common private/loopback destinations.

## Accessibility

The project targets WCAG 2.1 AA. Semantic HTML, keyboard access, focus management, live regions, reduced motion, and voice control are implemented. Screen-reader verification remains a manual release gate.

## PWA

The web manifest and production static-asset service worker cache static assets only; authenticated navigation, auth routes, and API responses are intentionally not cached.
