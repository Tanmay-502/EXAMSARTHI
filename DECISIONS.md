# Decisions Log: EXAMSAARTHI V2

## 1. Framework

Decision: Next.js App Router.

Status: REAL — Next.js 16.3.6.

## 2. State management

Decision: React Context for global voice/i18n/accessibility concerns and Zustand for exam state.

Status: REAL — Zustand state is persisted through IndexedDB and supports hydration/resume.

## 3. Speech

Decision: Browser Web Speech API behind VoiceProvider.

Status: REAL — SpeechRecognition and SpeechSynthesis are wrapped centrally, with deterministic command parsing plus optional Gemini intent fallback.

## 4. Persistence

Decision: IndexedDB for local exam resilience with server-backed incremental answer persistence.

Status: REAL — answers are saved while a session is in progress and replayed after reconnect.

## 5. Authentication

Decision: Supabase passwordless Magic Link.

Status: REAL — the visible auth entry page is shared by sign-in and new-account creation.

## 6. i18n

Decision: Lightweight dictionary-based provider.

Status: REAL — English, Hindi, and Telugu UI/voice locales.

## 7. Exam security

Decision: Keep correct answers server-only and restrict session/answer writes to server actions.

Status: REAL — protected by RLS, server-side ownership checks, and secure grading.

## 8. Practice integrity

Decision: Bind each practice session to its server-selected question set.

Status: REAL — question IDs are stored on the session and used for persistence/grading.
