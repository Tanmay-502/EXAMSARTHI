# Implementation Plan: EXAMSAARTHI V2

## Phase 1: Foundation & Setup

1. **Next.js Initialization:**
   - Bootstap Next.js App Router project with TypeScript, Tailwind CSS, and ESLint.
   - Configure absolute imports and `src/` directory.
2. **UI Framework Setup:**
   - Install and configure `shadcn/ui`.
   - Set up core theming (colors, typography) aligning with a premium but accessible design.
3. **Core Abstractions:**
   - Create `AccessibilityProvider` (Focus management, ARIA announcements).
   - Create `VoiceProvider` (Web Speech API wrapper for TTS and STT).
   - Create `I18nProvider` (Language context and dictionaries for `en-IN` and `hi-IN`).

## Phase 2: First Vertical Slice (Auth & Dashboard)

1. **Routing Skeleton:**
   - Define basic pages: `/`, `/auth/login`, `/auth/signup`, `/dashboard`, `/settings`.
2. **Authentication Interface:**
   - Build accessible Login/Signup forms.
   - Integrate Supabase Auth (Mocked initially if Supabase not provisioned immediately, but structurally sound).
3. **Dashboard & Settings:**
   - Language selector.
   - Accessibility settings toggle.
   - Navigation to Practice/Exam.

## Phase 3: Core Exam Engine

1. **Data Structures:**
   - Define TypeScript interfaces for Exam, Question, Option, and Answer states.
2. **Exam UI Components:**
   - Question display (text + optional image).
   - Options list (accessible radio group).
   - Timer component.
   - Navigation controls (Next, Prev, Mark, Submit).
3. **Voice Integration:**
   - Connect voice commands to navigation actions.
   - Connect TTS to read questions and options automatically.
4. **Persistence:**
   - Implement local autosave using IndexedDB.

## Phase 4: Review & Results

1. **Review Panel:**
   - Grid or list of questions showing status (Answered, Unanswered, Marked for Review).
2. **Submission Flow:**
   - Multi-step confirmation to prevent accidental submission.
3. **Results View:**
   - Accessible breakdown of performance.

## Phase 5: Refinement & Testing

1. **PWA Configuration:**
   - Add `manifest.json` and service worker for offline caching.
2. **Audits:**
   - Run ESLint, TypeScript typecheck.
   - Run `axe` for accessibility scoring.
3. **E2E Tests:**
   - Setup basic Playwright or Cypress tests for the critical path (Login -> Dashboard -> Exam -> Submit).
