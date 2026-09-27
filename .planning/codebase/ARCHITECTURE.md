# Architecture

**Analysis Date:** 2026-09-27

## Pattern Overview

**Overall:** Accessible Full-Stack Next.js Application with Hybrid Voice Processing (Local Deterministic Regex + Remote LLM Intent), Client-Side Offline Persistence, and Server-Side Evaluation.

**Key Characteristics:**
- **Accessibility-First:** Built from the ground up for visually impaired and motor-impaired candidates with full screen reader support (Axe-clean, WCAG 2.1 AA), keyboard-friendly skip links, live ARIA announcements, and voice navigation.
- **Cheating-Resistant Security Architecture:** Question evaluation (`correct_answer_index`) is strictly isolated to server-side admin actions. Database RLS prevents client inspection. Voice action dispatcher enforces strict contextual action whitelists via `SafeActionRegistry`.
- **Hybrid Voice Engine:** Fast zero-latency deterministic parsing for core commands (navigation, selecting options, review) across multiple Indian languages (English, Hindi, Telugu) with an optional semantic Gemini 3.8 Flash fallback.
- **High-Resilience State Management:** Zustand store bound to IndexedDB via `idb-keyval` ensures zero exam progress loss in the event of browser refresh, accidental closure, or network drops.

## Layers

**1. Presentation & Provider Layer (`src/app/`, `src/components/`):**
- Purpose: Render accessible user interfaces and maintain global accessibility and voice loops.
- Contains:
  - `RootLayout` (`src/app/layout.tsx`): Establishes provider hierarchy (`I18nProvider` -> `AccessibilityProvider` -> `VoiceProvider` -> `GlobalVoiceAssistant`).
  - Page routes: Landing (`/`), Authentication (`/auth/login`), Candidate Dashboard (`/dashboard`), Exam Runner (`/exam`), Practice Runner (`/practice`), Performance History (`/history`), Results Breakdown (`/results`).
  - Specialized components: `ExamEngine.tsx`, `ScoreVisualizer.tsx`, `VoiceOverlay.tsx`, `VoiceStatusIndicator.tsx`.
- Depends on: Voice Layer, State Store, Server Actions.

**2. Voice & Intent Layer (`src/lib/voice/`, `src/components/voice/`):**
- Purpose: Manage the bidirectional voice assistant lifecycle, parse user speech, enforce contextual permission boundaries, and synthesize audio feedback.
- Contains:
  - `VoiceProvider.tsx`: Low-level wrapper around browser `SpeechRecognition` and `SpeechSynthesis`.
  - `commandParser.ts`: High-speed deterministic command parser matching utterances against localized phrase registries (`src/lib/i18n/registry.ts`).
  - `safeActionRegistry.ts`: Contextual whitelist restricting allowed voice actions depending on active screen (e.g. during an exam, navigation outside the test or cheat queries are forbidden).
  - `intentRouter.ts`: Fallback semantic classifier calling `/api/intent` for complex conversational phrasing.
  - `GlobalVoiceAssistant.tsx`: Context manager coordinating active page handlers and voice event dispatching.
- Depends on: I18n dictionary, `/api/intent` endpoint.

**3. State Management & Offline Persistence Layer (`src/lib/store/`):**
- Purpose: Maintain synchronous candidate exam state with asynchronous offline persistence.
- Contains:
  - `useExamStore` (`src/lib/store/examStore.ts`): Tracks `sessionId`, `examId`, `questions`, `answers`, `currentQuestionIndex`, `startTime`, and `status`.
  - Storage adapter: Asynchronous serialization to IndexedDB (`idb-keyval`).
- Used by: `ExamEngine.tsx`, `src/app/exam/page.tsx`, `src/app/practice/page.tsx`.

**4. Backend & Server Actions Layer (`src/app/exam/actions.ts`, `src/app/auth/actions.ts`, `src/app/api/`):**
- Purpose: Execute privileged database operations, manage sessions, grade exams securely, and serve AI endpoints.
- Contains:
  - Server Actions: `startExamSession`, `fetchExamQuestions`, `saveAnswer`, `submitExamSession`, `loginWithMagicLink`, `signOut`.
  - Route Handlers: `/api/intent` (Gemini intent classification), `/api/vision` (Gemini diagram description), `/auth/confirm` (session token exchange).
- Depends on: Supabase SSR client (`src/lib/supabase/server.ts`), Google GenAI SDK.

**5. Database & Security Layer (`supabase/`):**
- Purpose: Relational data persistence, Row Level Security, and audit logging.
- Contains: PostgreSQL tables (`profiles`, `exams`, `questions`, `exam_sessions`, `answers`, `audit_logs`).

## Data Flow

**Exam Session Lifecycle:**

1. **Initiation:** Candidate selects an exam on `/dashboard` or commands "start exam" via voice -> Server Action `startExamSession` provisions or retrieves user profile and creates an `in_progress` record in `exam_sessions`.
2. **Question Ingestion:** Client invokes `fetchExamQuestions` -> Server retrieves questions excluding `correct_answer_index` and applies candidate language translations (`content_translations`, `options_translations`).
3. **Local Store Initialization:** `useExamStore.initializeExam` populates questions in Zustand and persists state to IndexedDB (`exam-storage`).
4. **Answering & Navigation:** Candidate answers via keyboard, mouse, or voice ("option A", "विकल्प ए") -> `useExamStore.setAnswer` updates local state immediately; debounced background Server Action `saveAnswer` persists to Supabase `answers` table.
5. **Submission & Server-Side Grading:** Candidate submits exam -> `submitExamSession` executes server-side -> Admin client compares candidate answers with protected `correct_answer_index`, calculates total marks, logs submission timestamp, updates `exam_sessions` status to `submitted`, and returns final metrics.
6. **Results Announcement:** Candidate is redirected to `/results` where `ResultsAnnouncer.tsx` delivers synthesized voice feedback and `ScoreVisualizer.tsx` presents graphical performance charts.

## Key Abstractions

- `SafeActionRegistry` (`src/lib/voice/safeActionRegistry.ts`): Context-aware state machine ensuring candidates cannot execute unpermitted actions during high-stakes exams.
- `VoiceProvider` (`src/lib/voice/VoiceProvider.tsx`): Abstraction over browser Speech APIs supporting utterance queuing, cancellation, and audio feedback.
- `I18nProvider` (`src/lib/i18n/I18nProvider.tsx`): Dynamic multilingual context supporting `en-IN`, `hi-IN`, and `te-IN` with token parameter substitution (`tParams`).
- `AccessibilityProvider` (`src/lib/accessibility/AccessibilityProvider.tsx`): Polite and assertive live ARIA announcer wrapper.

## Entry Points

- **Web Application Client Entry:** `src/app/layout.tsx` -> renders root HTML structure with providers and `src/app/page.tsx` (landing page).
- **Session & Security Proxy:** `src/proxy.ts` -> runs on incoming Next.js requests to refresh Supabase cookies and guard protected routes.
- **Voice Loop Entry:** `src/components/voice/GlobalVoiceAssistant.tsx` -> listens to microphone results and dispatches actions to page-level handlers.

---

*Architecture analysis: 2026-09-27*
*Update after major structural changes*
