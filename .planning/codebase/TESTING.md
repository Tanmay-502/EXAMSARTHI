# Testing Patterns

**Analysis Date:** 2026-09-27

## Test Framework

**End-to-End & Accessibility Runner:**
- Runner: Playwright (`@playwright/test` 1.63.0) configured in `playwright.config.ts`.
- Accessibility Auditor: Axe Core (`@axe-core/playwright` 4.13.0).
- Web Server Integration: Automatically launches `npm run start` at `http://localhost:3000` with environment flag `PLAYWRIGHT_TEST_MODE: 'true'`.

**Unit Test Runner:**
- Runner: Node.js native test runner (`node:test` and `node:assert`).
- Purpose: Lightning-fast unit testing of deterministic parsing algorithms and state transitions without browser overhead.

**Run Commands:**
```bash
# Run all end-to-end tests
npx playwright test

# Run accessibility tests specifically
npx playwright test e2e/accessibility.spec.ts

# Run voice security test suite
npx playwright test e2e/voice-security.spec.ts

# Run unit tests with node runner
node --test src/lib/voice/__tests__/commandParser.test.ts

# Run static type checking
npm run typecheck

# Run linter
npm run lint
```

## Test File Organization

**Location:**
- End-to-End & Integration Tests: Root directory `e2e/*.spec.ts`.
- Unit Tests: Co-located in `__tests__/` subdirectories under feature folders (e.g. `src/lib/voice/__tests__/*.test.ts`).

**Structure:**
```
exam-saarthi/
├── e2e/
│   ├── accessibility.spec.ts      # Automated Axe-core audits & keyboard navigation
│   ├── auth.spec.ts               # Magic link login & session redirection
│   ├── voice-engine.spec.ts       # SpeechRecognition lifecycle & TTS audio queues
│   └── voice-security.spec.ts     # SafeActionRegistry contextual permission bounds
└── src/lib/voice/
    ├── commandParser.ts
    └── __tests__/
        └── commandParser.test.ts  # Multilingual voice regex grammar tests
```

## Test Structure

**Unit Test Pattern (`node:test`):**
```typescript
import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { parseCommand } from '../commandParser';

describe('Voice Command Parser', () => {
  describe('Hindi (hi-IN)', () => {
    test('should parse SELECT_OPTION', () => {
      assert.deepStrictEqual(parseCommand('विकल्प ए', 'hi-IN'), { type: 'SELECT_OPTION', index: 0 });
    });

    test('should parse Navigation commands', () => {
      assert.deepStrictEqual(parseCommand('अगला प्रश्न', 'hi-IN'), { type: 'NEXT' });
    });
  });
});
```

**E2E Accessibility Pattern (`@axe-core/playwright`):**
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility & Keyboard Navigation', () => {
  test('landing page should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

## Mocking & Browser Emulation

**Web Speech API Mocking:**
- The native browser `SpeechRecognition` and `SpeechSynthesis` APIs are not natively available in headless Chromium.
- Tests inject synthetic mock prototypes into `window` using Playwright's `page.addInitScript()`:
  - Fakes `window.webkitSpeechRecognition` to simulate candidate voice input events (`onresult`, `onend`).
  - Fakes `window.speechSynthesis` to verify that feedback utterances are queued and synthesized.

**Auth & Server Action Interception:**
- Playwright intercepts network calls and responses (e.g. `x-action-redirect` headers) to simulate Magic Link email verification and session cookie handshakes without requiring live SMTP delivery during CI runs.

---

*Testing analysis: 2026-09-27*
*Update after adding new test suites or frameworks*
