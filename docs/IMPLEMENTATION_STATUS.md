# EXAMSAARTHI V2 — Implementation Status

**Snapshot:** 2026-09-27
**Canonical audit:** docs/AUDIT_RESOLUTION_2026-09-27.md

This document records the current implementation state, not an unverified historical checklist.

## 1. Authentication

**Actual:** REAL passwordless Magic Link authentication via Supabase Auth. Passkeys and voice passwords are not implemented.

Protected application routes are enforced by src/proxy.ts in development and production.

## 2. Voice & Audio

**Actual:** REAL. VoiceProvider owns SpeechRecognition/SpeechSynthesis; GlobalVoiceAssistant owns intent dispatch and contextual action authorization; page handlers subscribe through useVoiceAction.

## 3. Accessibility

**Actual:** PARTIAL / MANUAL-VERIFICATION REQUIRED.

Keyboard navigation, focus management, live announcements, reduced motion, and voice interaction are implemented. Automated accessibility checks target WCAG 2.1 AA. NVDA/VoiceOver verification is still required before claiming complete conformance.

## 4. Practice Mode

**Actual:** REAL. Practice questions come from Supabase using subject, difficulty, and requested count. Practice sessions are real authenticated exam_sessions rows with is_practice = true.

## 5. Exam Engine

**Actual:** REAL. The shared ExamEngine handles spoken orientation, question reading, answer confirmation, navigation, review, timed submission, and server-side grading.

## 6. Language Support

**Actual:** REAL for English, Hindi, and Telugu. UI, speech recognition, speech synthesis, and deterministic core command parsing support the three locales.

## 7. Security & Persistence

**Actual:**

- Correct-answer protection: server-only grading data.
- Session creation: privileged server action only; client INSERT policy removed by migration 00008.
- Answer persistence: local IndexedDB plus incremental server-backed saveAnswer with replay on reconnect.
- Submission lock: update requires an owned in_progress session.
- Audit logs: application code records started, answer-saved, and submitted events.
- Fake security systems: none; biometric/speaker verification is intentionally not faked.

## 8. PWA

**Actual:** PWA manifest + production service worker are implemented. Authenticated HTML and API responses are deliberately not cached.
