# Coding Conventions

**Analysis Date:** 2026-09-27

## Naming Patterns

**Files:**

- React Components: `PascalCase.tsx` (e.g. `src/components/voice/GlobalVoiceAssistant.tsx`, `src/components/exam/ExamEngine.tsx`).
- Next.js Route Files: Lowercase standard names (e.g. `page.tsx`, `layout.tsx`, `actions.ts`, `route.ts`, `loading.tsx`, `error.tsx`).
- Utility & Service Modules: `camelCase.ts` (e.g. `src/lib/voice/commandParser.ts`, `src/lib/voice/safeActionRegistry.ts`).
- React Custom Hooks: `camelCase.ts` with `use` prefix (e.g. `src/lib/voice/useVoice.ts`).
- Unit Tests: `*.test.ts` (e.g. `src/lib/voice/__tests__/commandParser.test.ts`).
- End-to-End Tests: `*.spec.ts` (e.g. `e2e/accessibility.spec.ts`, `e2e/voice-security.spec.ts`).

**Functions & Variables:**

- Functions: `camelCase` (e.g. `fetchExamQuestions`, `startExamSession`, `parseCommand`, `handleOptionSelect`).
- Variables: `camelCase` (e.g. `currentQuestionIndex`, `pendingIntentRef`, `supabaseUrl`).
- Constants: `UPPER_SNAKE_CASE` (e.g. `PLAYWRIGHT_TEST_MODE`, `VOICE_COMMAND_REGISTRY`).

**Types & Interfaces:**

- Types & Interfaces: `PascalCase` without hungarian prefixes (e.g. `Question`, `Answer`, `SafeAction`, `GlobalVoiceContextType`).
- Enums / String Unions: `UPPER_SNAKE_CASE` union types (e.g. `type SafeAction = 'OPEN_DASHBOARD' | 'START_EXAM' | ...`).

## Code Style

**Formatting & Syntax:**

- Language: Strict TypeScript (`strict: true` in `tsconfig.json`).
- Quotes: Single quotes (`'`) for TypeScript code and imports; double quotes (`"`) for JSX attributes.
- Semicolons: Semicolons required.
- Path Aliasing: Always prefer the configured `@/*` alias mapped to `./src/*` over deep relative traversal (e.g. `import { useVoice } from '@/lib/voice/VoiceProvider'`).

**Linting:**

- Tool: ESLint 9 with `eslint-config-next` in `eslint.config.mjs`.
- Run commands:
  - `npm run lint` — validates ESLint rules.
  - `npm run typecheck` — executes `tsc --noEmit`.

## Import Organization

**Order:**

1. React & Next.js built-ins (`react`, `next/server`, `next/navigation`).
2. External packages (`@supabase/ssr`, `ai`, `@ai-sdk/google`, `framer-motion`, `zustand`, `lucide-react`).
3. Internal alias modules (`@/lib/...`, `@/components/...`).
4. Relative imports (`./actions`, `../commandParser`).

**Example:**

```typescript
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/ssr';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { SafeAction } from '@/lib/voice/safeActionRegistry';
```

## React & Server Action Patterns

**Directive Isolation:**

- Client Components: Always declare `'use client'` as line 1 for components utilizing hooks, DOM APIs, or Web Speech APIs.
- Server Actions: Always declare `'use server'` as line 1 for files containing server-side database operations or admin actions (`src/app/exam/actions.ts`, `src/app/auth/actions.ts`).

**Accessibility Standards (A11y):**

- Every interactive element must be keyboard navigable and focusable.
- Dynamic status changes must communicate to assistive technologies via `<AccessibilityProvider>` (`announce(message, 'polite' | 'assertive')`) or semantic ARIA live regions (`role="status"`, `aria-live="polite"`).
- Motion effects must respect operating system reduced-motion preferences via Framer Motion's `<MotionConfig reducedMotion="user">`.
- Contrast ratios must comply with WCAG 2.1 AA standards; background colors use OKLCH color spaces.

## Error Handling Patterns

**Server Actions:**

- Throw explicit descriptive errors for unauthorized states:

  ```typescript
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  ```

- Catch database errors and log operational context while preventing sensitive SQL error leaks:

  ```typescript
  if (error) {
    throw new Error(`Failed to start session: ${error.message}`);
  }
  ```

**API Route Handlers:**

- Wrap execution in `try / catch` blocks and return appropriate HTTP status codes:

  ```typescript
  try {
    // processing logic
    return NextResponse.json(result);
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  ```

**Graceful Degradation:**

- AI services (`/api/intent`, `/api/vision`) degrade gracefully when API keys are unconfigured or remote services are unavailable, returning default fallback values (`{ intent: 'UNKNOWN' }` or accessibility explanation text) instead of crashing the exam session.

---

*Conventions analysis: 2026-09-27*
*Update after major coding pattern changes*
