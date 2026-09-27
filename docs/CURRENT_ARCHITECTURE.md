# CURRENT_ARCHITECTURE

## Existing Architecture
ExamSaarthi V2 is built with Next.js 16.3.6 App Router, utilizing React Server Components and Server Actions. It uses Supabase for authentication (Magic Link) and PostgreSQL for data storage. The application is bilingual (English, Hindi, Telugu) via a custom `I18nProvider`. State is managed via Zustand (`useExamStore`) with `idb-keyval` for persistent client-side storage of active exam sessions.

## Current Voice Architecture
The application currently uses a `VoiceProvider` wrapping the standard Web Speech API (SpeechRecognition and SpeechSynthesis). 
- `GlobalVoiceAssistant` wraps the application and dispatches commands based on deterministic parsing (`commandParser.ts`) or an optional LLM fallback (`intentRouter.ts`).
- Pages like `ExamEngine` and `DashboardContent` use `useVoiceAction` to listen for global intents.
- TTS (Text-to-Speech) is managed through `utteranceQueueRef`, trying to handle Chromium truncation bugs.
- Microphone is requested on the landing page, and continuous listening is enabled.

## Intended Global Voice Architecture
1. **Single Global Assistant Lifecycle**: VoiceProvider owns the microphone lifecycle and GlobalVoiceAssistant dispatches transcripts across routes. Page handlers subscribe through useVoiceAction.
2. **Deterministic + Optional LLM**: Commands like "next", "confirm", "option 1" must be resolved purely client-side without API calls to guarantee speed and free-tier operation. Complex intents ("I want to practice DBMS") optionally use the LLM to route, emitting strongly-typed `SafeAction` events.
3. **Conversational vs. Monologue**: The assistant won't blindly read text off the screen; it provides conversational guidance tailored to the context (e.g. telling the user their options in the dashboard, or guiding them through the exam orientation).

## Security Boundary
- Authentication happens via Supabase Magic Links.
- RLS (Row Level Security) prevents unauthorized row reads.
- **Crucial Boundary**: `question_answers` (containing correct answers) is locked down via RLS and is ONLY readable by the server (via `createAdminClient`). Correct answers are NEVER sent to the client during an active exam.
- The Voice LLM parser is only used for intent mapping (`/api/intent`). It is never passed the correct answers and cannot be used to "solve" active questions.

## Exam State Machine
1. **READY**: Orientation is read.
2. **EXAM**: Question and options are read. Assistant waits for selection.
3. **CONFIRM_ANSWER**: User selects an option by voice ("Option 1") or keyboard. Assistant asks for confirmation.
4. **CONFIRM_SUBMIT**: User asks to submit. Assistant reads unresolved/marked questions and asks for confirmation.
5. **PROCESSING/COMPLETED**: Exam is submitted to the server for grading, and results are computed.

## Results & History Flow
- **Results**: Fetches the graded session, calculates total, correct, incorrect, skipped, and lowest-performing subject ("weakest area"). The assistant reads a concise summary aloud.
- **History**: Fetches past `exam_sessions` for the authenticated candidate.

## Persistence and PWA

- IndexedDB stores the active exam state locally.
- saveAnswer persists answers and review state server-side while a session is in progress, with replay when the browser reconnects.
- The web manifest and production static-asset service worker are implemented; authenticated HTML and API responses are not cached.

## Dataset Provenance
- Verified exam data vs. Generated practice data. 
- The ingestion system (`scripts/ingest_exam.ts`) enforces strict validation schemas to ensure questions have exactly matching options, valid correct answers, and provenance metadata (exam year, subject, source, etc.).
