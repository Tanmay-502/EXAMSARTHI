# EXAMSAARTHI V2 — Key Decisions

Snapshot: 2026-09-27

## Authentication
Use one passwordless Supabase Magic Link flow. A new email can create an account automatically; there is no separate password signup implementation.

## Exam integrity
Correct answers live in question_answers and are read only by privileged server-side grading. Client exam-session and answer writes are disabled; server actions validate candidate ownership and question/session boundaries.

## Practice integrity
Practice sessions store the exact question IDs shown to the candidate. Answer persistence and final grading are restricted to that roster.

## Persistence
Zustand + IndexedDB is the immediate local state layer. Server-backed saveAnswer is the durable synchronization path while a session is in progress, with replay when connectivity returns.

## Voice
VoiceProvider owns browser STT/TTS. GlobalVoiceAssistant owns contextual routing. Deterministic parsing handles common commands first; Gemini is a fallback for natural language. No separate competing voice engine should be added.

## Personalization
Learning Profile analysis is consent-based context generation, not per-user model retraining. During active exams, AI services must not receive answer keys or solve current questions.

## Accessibility
The automated target is WCAG 2.1 AA. Manual NVDA/VoiceOver verification remains a release gate.

## PWA
The service worker caches static assets only. Authenticated navigation, auth routes, API routes, and other user-specific HTML are intentionally not cached.
