# Codebase Structure

**Analysis Date:** 2026-09-27

## Directory Layout

```
exam-saarthi/
├── .planning/                  # Project memory, roadmap, and codebase maps
│   └── codebase/               # Codebase architecture & reference documents
├── data/                       # Static mock data and test fixtures
├── docs/                       # Architecture diagrams and specifications
├── e2e/                        # Playwright automated test suites
├── public/                     # Static web assets (icons, manifest.json)
├── scripts/                    # Database seeding and smoke test scripts
├── src/                        # Application source code
│   ├── app/                    # Next.js App Router (pages, actions, API routes)
│   ├── components/             # Reusable React components (exam, voice, ui)
│   ├── lib/                    # Shared libraries, providers, stores, and services
│   └── proxy.ts                # Next.js edge request interceptor and session guard
├── supabase/                   # Supabase configuration and PostgreSQL migrations
│   └── migrations/             # Sequential SQL migration files
├── package.json                # Project dependencies and npm scripts
├── playwright.config.ts        # Playwright E2E test runner configuration
├── tsconfig.json               # TypeScript compiler options and path aliases
└── next.config.ts              # Next.js application configuration
```

## Directory Purposes

**`src/app/` (Next.js App Router):**
- Purpose: Application routing, page layouts, Server Actions, and REST API handlers.
- Contains:
  - `page.tsx`: Landing page with language selector and introductory voice gateway.
  - `layout.tsx`: Root HTML structure, fonts, and global React context providers.
  - `globals.css`: Tailwind CSS v4 variables, OKLCH theme colors, and animations.
  - `api/intent/route.ts`: LLM semantic intent classification endpoint.
  - `api/vision/route.ts`: Diagram and image description service for visually impaired candidates.
  - `auth/`: Login form (`page.tsx`), magic link actions (`actions.ts`), and session confirmation route (`confirm/route.ts`).
  - `dashboard/`: Candidate dashboard displaying available exams, recent performance, and practice launcher.
  - `exam/`: Exam execution interface (`page.tsx`) and high-privilege server actions (`actions.ts`).
  - `practice/`: Ungraded practice test environment with instant feedback.
  - `history/`: Historical exam session review and score records.
  - `results/`: Exam completion summary, graphical score visualization, and voice announcer.
  - `settings/`: Accessibility, speech rate, and language preference controls.

**`src/components/` (React UI Components):**
- Purpose: Modular client and server components.
- Subdirectories:
  - `exam/`: `ExamEngine.tsx` (question renderer), `ScoreVisualizer.tsx` (result analytics), `ResultsAnnouncer.tsx` (TTS review).
  - `voice/`: `GlobalVoiceAssistant.tsx` (voice orchestrator), `VoiceOverlay.tsx` (live feedback modal), `VoiceStatusIndicator.tsx` (mic status icon), `VoiceTranscript.tsx` (captions).
  - `ui/`: Design system buttons, dialogs, and cards (`button.tsx`).

**`src/lib/` (Application Services & Core Logic):**
- Purpose: Cross-cutting utilities, state stores, and external client abstractions.
- Subdirectories:
  - `accessibility/`: `AccessibilityProvider.tsx` (live screen reader announcements, skip links).
  - `i18n/`: `I18nProvider.tsx` (multilingual context), `dictionaries.ts` (UI text strings), `registry.ts` (voice command phrases).
  - `store/`: `examStore.ts` (Zustand state store with IndexedDB persistence).
  - `supabase/`: `client.ts` (browser Supabase client), `server.ts` (server action & admin clients).
  - `voice/`: `VoiceProvider.tsx` (Web Speech API wrapper), `commandParser.ts` (deterministic regex matching), `safeActionRegistry.ts` (contextual permission whitelist), `intentRouter.ts` (LLM fallback), `useVoice.ts` (voice hook).

**`e2e/` (Automated Test Suite):**
- Purpose: Integration and end-to-end testing with Playwright and Axe-Core.
- Key files:
  - `accessibility.spec.ts`: Automated WCAG 2.1 AA audits and keyboard navigation verification.
  - `auth.spec.ts`: Magic link authentication flows and session persistence.
  - `voice-engine.spec.ts`: Voice recognition mocking and state transitions.
  - `voice-security.spec.ts`: Verification that forbidden actions during exams are rejected.

**`supabase/migrations/` (Database Migrations):**
- Purpose: PostgreSQL schema version control.
- Key files:
  - `00000_schema.sql`: Core schema (users, exams, questions, sessions, answers, RLS).
  - `00001_multilingual_questions.sql`: JSONB question translations.
  - `00003_secure_answers.sql`: Server-side answer hiding and grading policies.
  - `00005_vision_accessibility.sql`: Image alt-text and diagram support.

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root client hierarchy mounting `I18nProvider`, `AccessibilityProvider`, `VoiceProvider`, and `GlobalVoiceAssistant`.
- `src/proxy.ts`: Session management middleware checking auth cookies before route access.

**Configuration:**
- `package.json`: Project scripts and versions.
- `tsconfig.json`: TypeScript configuration with `@/*` mapped to `src/*`.
- `playwright.config.ts`: E2E test setup with local web server launch.
- `components.json`: shadcn component settings.

**Core Logic:**
- `src/lib/voice/commandParser.ts`: Deterministic voice grammar parser.
- `src/lib/voice/safeActionRegistry.ts`: Contextual security validator for voice commands.
- `src/lib/store/examStore.ts`: IndexedDB-backed candidate state store.
- `src/app/exam/actions.ts`: Secure exam generation, answer tracking, and server grading.

## Naming Conventions

**Files:**
- React Components: `PascalCase.tsx` (e.g. `ExamEngine.tsx`, `VoiceProvider.tsx`).
- Next.js Routing Files: Lowercase standard names (e.g. `page.tsx`, `layout.tsx`, `route.ts`, `actions.ts`, `loading.tsx`, `error.tsx`).
- Utility & Service Modules: `camelCase.ts` (e.g. `commandParser.ts`, `safeActionRegistry.ts`, `examStore.ts`).
- Unit Tests: `*.test.ts` (e.g. `src/lib/voice/__tests__/commandParser.test.ts`).
- E2E Tests: `*.spec.ts` (e.g. `e2e/accessibility.spec.ts`).
- Migrations: `[0-9]{5}_snake_case.sql` (e.g. `00000_schema.sql`).

**Directories:**
- Feature/Route directories: `kebab-case` or lowercase (e.g. `auth/login`, `src/lib/voice`).

---

*Structure analysis: 2026-09-27*
*Update after major structural changes*
