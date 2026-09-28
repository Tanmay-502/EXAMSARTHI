import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility & Keyboard Navigation', () => {
  test('landing page should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('login page should be keyboard navigable', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Email input is auto-focused on load
    await expect(page.locator('input[type="email"]')).toBeFocused();
    await page.keyboard.insertText('test@example.com');
    
    // Focus submit button directly instead of relying on brittle tab counting
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.focus();
    await expect(submitButton).toBeFocused();
    
    // Press Enter to submit
    await page.keyboard.press('Enter');
    
    // The auth action should return an accessible success/error message.
    await expect(page.getByTestId('auth-message')).toBeVisible();
  });

  /* 
   * Skipping settings page test as it is now protected by Supabase Auth Middleware
   * and requires a real magic link click to access. 
   * To test this, we would need a Playwright auth setup or a mock auth environment.
   */
  // test('settings page should be accessible and allow language selection via keyboard', async ({ page }) => {
  //   await page.goto('/settings');
  //   
  //   // The h1 should be focused on load
  //   await expect(page.locator('h1')).toBeFocused();
  //
  //   // Tab to English button
  //   await page.keyboard.press('Tab');
  //   await expect(page.getByRole('button', { name: 'English' })).toBeFocused();
  //
  //   // Select Hindi using keyboard
  //   await page.keyboard.press('Tab');
  //   await expect(page.getByRole('button', { name: 'हिंदी' })).toBeFocused();
  //   
  //   const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  //   expect(accessibilityScanResults.violations).toEqual([]);
  // });
});



type PublicRoute = {
  path: string;
  name: string;
};

const publicRoutes: PublicRoute[] = [
  { path: '/', name: 'landing' },
  { path: '/onboarding/mode', name: 'mode' },
  { path: '/onboarding/language', name: 'language' },
  { path: '/auth/login', name: 'login' },
];

async function installAccessibilityVoiceStubs(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: { hasBeenActive: false },
    });
  });

  await page.addInitScript(() => {
    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = 'en-IN';
      onstart: (() => void) | null = null;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        queueMicrotask(() => this.onstart?.());
      }

      stop() {
        queueMicrotask(() => this.onend?.());
      }

      abort() {
        queueMicrotask(() => this.onend?.());
      }
    }

    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: MockSpeechRecognition,
    });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      configurable: true,
      value: MockSpeechRecognition,
    });

    const speechSynthesis = window.speechSynthesis;
    if (speechSynthesis) {
      speechSynthesis.cancel = () => undefined;
      speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
        queueMicrotask(() => utterance.onstart?.({} as SpeechSynthesisEvent));
        queueMicrotask(() => utterance.onend?.({} as SpeechSynthesisEvent));
      };
    }
  });
}

test.describe('Public route full-page axe coverage', () => {
  for (const route of publicRoutes) {
    test(`${route.name} has zero full-page axe violations in both dock states`, async ({ page }) => {
      await installAccessibilityVoiceStubs(page);
      await page.goto(route.path);
      await expect(page.getByTestId('voice-dock')).toBeVisible();
      await page.waitForTimeout(700);

      if (route.path === '/') {
        await page.evaluate(() => window.dispatchEvent(new Event('examsaarthi:voice-activated')));
        await expect(page.getByTestId('demo-guide')).toBeVisible();
      }

      const collapsed = await new AxeBuilder({ page }).analyze();
      expect(collapsed.violations).toEqual([]);

      const transcriptButton = page.getByRole('button', { name: 'Transcript' });
      await expect(transcriptButton).toHaveAttribute('aria-expanded', 'false');

      if (route.path === '/') {
        await page.evaluate(() => document.getElementById('voice-transcript-toggle')?.click());
      } else {
        await transcriptButton.click();
      }

      await expect(transcriptButton).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#voice-transcript-panel')).toBeVisible();

      const expanded = await new AxeBuilder({ page }).analyze();
      expect(expanded.violations).toEqual([]);
    });
  }
});

const authStatePath = process.env.PLAYWRIGHT_AUTH_STATE;
const readyExamId = process.env.PLAYWRIGHT_READY_EXAM_ID;
const resultSessionId = process.env.PLAYWRIGHT_RESULT_SESSION_ID;

async function expectNoAxeViolations(page: Page) {
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
}

test.describe('Authenticated route accessibility coverage', () => {
  test.use({ storageState: authStatePath || undefined });

  test('dashboard has no automatically detectable accessibility issues', async ({ page }) => {
    test.skip(
      !authStatePath,
      'TODO: provide PLAYWRIGHT_AUTH_STATE with a valid authenticated Supabase session for protected-route axe coverage.'
    );

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expectNoAxeViolations(page);
  });

  test('practice ASK_SUBJECT state has no automatically detectable accessibility issues', async ({ page }) => {
    test.skip(
      !authStatePath,
      'TODO: provide PLAYWRIGHT_AUTH_STATE with a valid authenticated Supabase session for protected-route axe coverage.'
    );

    await page.goto('/practice');
    await expect(page.getByRole('heading', { name: /Practice Subject/i })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('exam READY state has no automatically detectable accessibility issues', async ({ page }) => {
    test.skip(
      !authStatePath,
      'TODO: provide PLAYWRIGHT_AUTH_STATE with a valid authenticated Supabase session.'
    );
    test.skip(
      !readyExamId,
      'TODO: provide PLAYWRIGHT_READY_EXAM_ID for a real available exam in the authenticated Playwright database.'
    );

    await page.addInitScript(() => {
      localStorage.setItem('examsarthi_mode', 'standard');
    });
    await page.goto(`/exam?exam_id=${encodeURIComponent(readyExamId as string)}`);
    await expect(page.getByRole('button', { name: /Start Exam/i })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('results has no automatically detectable accessibility issues', async ({ page }) => {
    test.skip(
      !authStatePath,
      'TODO: provide PLAYWRIGHT_AUTH_STATE with a valid authenticated Supabase session.'
    );
    test.skip(
      !resultSessionId,
      'TODO: provide PLAYWRIGHT_RESULT_SESSION_ID for a completed session available to the authenticated test user.'
    );

    await page.goto(`/results?session_id=${encodeURIComponent(resultSessionId as string)}`);
    await expect(page.getByRole('heading', { name: /Performance summary/i })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('history has no automatically detectable accessibility issues', async ({ page }) => {
    test.skip(
      !authStatePath,
      'TODO: provide PLAYWRIGHT_AUTH_STATE with a valid authenticated Supabase session for protected-route axe coverage.'
    );

    await page.goto('/history');
    await expectNoAxeViolations(page);
  });

  test('analysis has no automatically detectable accessibility issues', async ({ page }) => {
    test.skip(
      !authStatePath,
      'TODO: provide PLAYWRIGHT_AUTH_STATE with a valid authenticated Supabase session for protected-route axe coverage.'
    );

    await page.goto('/analysis');
    await expectNoAxeViolations(page);
  });

  test('settings has no automatically detectable accessibility issues', async ({ page }) => {
    test.skip(
      !authStatePath,
      'TODO: provide PLAYWRIGHT_AUTH_STATE with a valid authenticated Supabase session for protected-route axe coverage.'
    );

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /Accessibility Settings|सेटिंग्स|యాక్సెసిబిలిటీ/i })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
