# Technology Stack

**Analysis Date:** 2026-09-27

## Languages

**Primary:**
- TypeScript 5.x - All application code across `src/`, end-to-end tests in `e2e/`, and utility scripts in `scripts/`. Strict typechecking via `tsc --noEmit`.

**Secondary:**
- JavaScript (ES Modules) - Configuration scripts (`eslint.config.mjs`, `postcss.config.mjs`).
- SQL (PostgreSQL dialect) - Database migrations and schema definitions in `supabase/migrations/` and `db_schema.sql`.

## Runtime

**Environment:**
- Node.js 20.x+ (LTS) - Server runtime for Next.js App Router, Server Actions, and API route handlers.
- Browser Environment - Modern Chromium, Firefox, or Safari supporting Web Speech API (`SpeechRecognition`, `SpeechSynthesis`) and IndexedDB API (`idb-keyval`).

**Package Manager:**
- npm 10.x+
- Lockfile: `package-lock.json` present and versioned.

## Frameworks

**Core:**
- Next.js 16.3.6 - React application framework using App Router, React Server Components (RSC), Server Actions (`'use server'`), and edge/proxy middleware routing (`src/proxy.ts`).
- React 19.2.8 - Declarative component framework utilizing new React 19 concurrent features and hooks.

**Styling & UI:**
- Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/postcss`) - Utility-first styling with `@theme` variables configured in `src/app/globals.css`.
- shadcn UI / Base UI (`@base-ui/react`, `class-variance-authority`, `tailwind-merge`, `clsx`) - Accessible unstyled headless primitives.
- Framer Motion 13.4.4 (`framer-motion`) - Animation and UI gesture engine configured with user-reduced-motion compliance (`reducedMotion="user"`).

**Testing:**
- Playwright (`@playwright/test` 1.63.0) - End-to-end browser automation suite configured in `playwright.config.ts`.
- Axe Core (`@axe-core/playwright` 4.13.0) - Automated WCAG 2.1 AA accessibility compliance testing (`e2e/accessibility.spec.ts`).
- Node Test Runner (`node:test`, `node:assert`) - Native unit test runner for standalone parsing logic (`src/lib/voice/__tests__/commandParser.test.ts`).

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` (2.117.2) & `@supabase/ssr` (0.12.7) - PostgreSQL database interaction, Row Level Security (RLS) enforcement, cookie-based session management, and auth tokens.
- `ai` (7.0.116) & `@ai-sdk/google` (4.0.82) - Vercel AI SDK integrated with Google Gemini (`gemini-3.8-flash`) for natural language intent routing and vision diagram accessibility descriptions.
- `zustand` (5.0.15) - Lightweight client-side reactive state management powering the real-time exam session store (`src/lib/store/examStore.ts`).
- `idb-keyval` (6.3.0) & `idb` (8.0.3) - Asynchronous IndexedDB storage adapter providing local offline resilience for candidate responses.
- `zod` (4.6.5) - Schema validation and structured JSON decoding for API request validation and AI generation.
- `lucide-react` (1.48.0) - Clean SVG accessibility icons.

## Configuration

**Environment:**
- Configured via `.env.local` (local development) and platform environment variables (production).
- Required variables:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project endpoint.
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) - Client-safe Supabase API key.
  - `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) - Elevated server key for admin operations (e.g. server-side exam answer grading).
  - `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY` - API credentials for Gemini 3.8 Flash inference.

**Build:**
- `next.config.ts` - Next.js compilation settings.
- `tsconfig.json` - TypeScript path aliases (`@/*` pointing to `./src/*`) and ESNext target settings.
- `postcss.config.mjs` - PostCSS runner integrating `@tailwindcss/postcss`.
- `eslint.config.mjs` - ESLint 9 configuration extending `eslint-config-next`.
- `components.json` - shadcn component configuration.

## Platform Requirements

**Development:**
- Node.js 20+, npm, Git.
- Optional: Supabase CLI for local database migrations.

**Production:**
- Vercel or Node.js Docker container deployment.
- Hosted Supabase PostgreSQL instance with Row Level Security enabled.
- Network access to Google Gemini Generative AI endpoints.

---

*Stack analysis: 2026-09-27*
*Update after major dependency changes*
