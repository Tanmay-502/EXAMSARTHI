# Current Architecture Audit - ExamSaarthi V2

## Overview

The application is a Next.js web application utilizing Supabase for authentication and database management. It supports English, Hindi, and Telugu.
The app relies heavily on the Web Speech API (`SpeechRecognition` and `SpeechSynthesis`) for voice accessibility.

## Voice Components

- **VoiceProvider (`src/lib/voice/VoiceProvider.tsx`)**: Manages the global state of SpeechRecognition and SpeechSynthesis. It maintains a queue of utterances for text-to-speech (TTS) and controls the microphone lifecycle.
- **commandParser (`src/lib/voice/commandParser.ts`)**: A deterministic parser mapping speech transcripts to predefined `VoiceCommand` types using a static registry defined in `src/lib/i18n/registry.ts`.
- **VoiceGateway (`src/components/voice/VoiceGateway.tsx`)**: An independent voice loop found on the landing page that prompts users to select a language and navigates them to login.

## Routing and Navigation

- The dashboard (`src/app/dashboard/page.tsx`) uses a continuous listening loop that manually maps `VoiceCommand` to `router.push(...)`.
- The exam page relies on a central store `examStore.ts` and standard Supabase actions (`actions.ts`).

## Data Schema (Supabase)

- **profiles**: Extends `auth.users` to store user preferences.
- **exams**: Metadata about the exam (title, duration, etc).
- **questions**: Stores question content and options. Note: `correct_answer_index` is strictly kept on the server.
- **exam_sessions**: Tracks candidate exam progress, status (in_progress, submitted), score, and analytics metrics.
- **answers**: Tracks selected options and review marks for each question in a session.
- **audit_logs**: User actions during exams.
- **Security**: Row Level Security (RLS) is enabled across all tables, ensuring candidates can only modify their own sessions/answers and cannot fetch correct answers before submission.

## Duplicated/Conflicting Flows

- **Language Selection**: Currently, the landing page asks for language and handles routing, but the same might be asked again elsewhere or the state is not fully inherited across independent voice consumers.
- **Voice Loop Implementations**: The VoiceGateway and Dashboard implement overlapping logics to consume voice context. A global Voice Assistant needs to be refactored to unify these handlers.
- **Intent vs Action**: Currently, intent parsing is deterministic and safe, but there is no explicit Action Registry. Actions (like `router.push`) are scattered across page components.

## Tests & State

- Existing architecture utilizes IndexedDB/stores for resilience.
- Security relies on server-side validations during grading.
- Current tests include Playwright end-to-end tests and manual Voice Assistant test checklists.
