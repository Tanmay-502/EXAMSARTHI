import { mkdirSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Viewport = {
  width: number;
  height: number;
};

const viewports: Viewport[] = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
];

const routes = [
  {
    path: '/',
    name: 'landing',
    primary: [
      { role: 'button' as const, name: /Get Started/ },
      { role: 'button' as const, name: /Start your journey/ },
    ],
  },
  {
    path: '/onboarding/mode',
    name: 'mode',
    primary: [
      { role: 'button' as const, name: /Standard Mode/ },
      { role: 'button' as const, name: /Voice-first Mode/ },
    ],
  },
  {
    path: '/onboarding/language',
    name: 'language',
    primary: [
      { role: 'button' as const, name: /Select English/ },
      { role: 'button' as const, name: /Select Hindi/ },
      { role: 'button' as const, name: /Select Telugu/ },
    ],
  },
  {
    path: '/auth/login',
    name: 'login',
    primary: [
      { role: 'textbox' as const, name: /email/i },
    ],
  },
];

async function installSpeechStubs(page: Page) {
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

async function expectLastContentAboveDock(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(50);

  const dock = page.getByTestId('voice-dock');
  const main = page.locator('#main-content');
  const lastContent = main.locator(':scope > *').last();

  const dockBox = await dock.boundingBox();
  const contentBox = await lastContent.boundingBox();

  expect(dockBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(contentBox!.y + contentBox!.height).toBeLessThanOrEqual(dockBox!.y + 1);
}

async function expectPrimaryElementsVisible(page: Page, route: (typeof routes)[number]) {
  const dock = page.getByTestId('voice-dock');
  const dockBox = await dock.boundingBox();
  expect(dockBox).not.toBeNull();

  for (const target of route.primary) {
    const locator = page.getByRole(target.role, { name: target.name });
    await expect(locator).toBeVisible();
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThanOrEqual(viewport.height + 1);
  }
}

async function expectNoAxeViolations(page: Page) {
  await page.waitForTimeout(700);
  const results = await new AxeBuilder({ page })
    .include('[data-testid="voice-dock"]')
    .analyze();
  expect(results.violations).toEqual([]);
}

for (const viewport of viewports) {
  for (const route of routes) {
    test(`${route.name} ${viewport.width}x${viewport.height} dock layout and accessibility`, async ({ page }) => {
      mkdirSync('artifacts/voice-dock-screenshots', { recursive: true });
      await page.setViewportSize(viewport);
      await installSpeechStubs(page);
      await page.goto(route.path);
      await expect(page.getByTestId('voice-dock')).toBeVisible();

      const dock = page.getByTestId('voice-dock');
      const dockBox = await dock.boundingBox();
      expect(dockBox).not.toBeNull();
      expect(dockBox!.height).toBeLessThanOrEqual(72);

      if (viewport.width === 1366 && viewport.height === 768) {
        await expectPrimaryElementsVisible(page, route);
      }

      if (route.path === '/') {
        await expect(page.getByTestId('demo-guide')).toHaveCount(0);
        await expect(page.getByText(/Press Space, Enter or click to start voice guidance/i)).toBeVisible();
        await expect(page.getByText(/Voice control is unavailable/i)).toHaveCount(0);
      }

      await expectNoAxeViolations(page);
      await expectLastContentAboveDock(page);

      await page.screenshot({
        path: `artifacts/voice-dock-screenshots/${route.name}-${viewport.width}x${viewport.height}-collapsed.png`,
        fullPage: false,
      });

      const toggle = page.getByRole('button', { name: 'Transcript' });
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#voice-transcript-panel')).toBeVisible();

      const expandedPanel = page.locator('#voice-transcript-panel');
      const expandedBox = await expandedPanel.boundingBox();
      expect(expandedBox).not.toBeNull();
      expect(expandedBox!.height).toBeLessThanOrEqual(viewport.height * 0.4 + 2);

      await expectNoAxeViolations(page);

      await page.screenshot({
        path: `artifacts/voice-dock-screenshots/${route.name}-${viewport.width}x${viewport.height}-expanded.png`,
        fullPage: false,
      });
    });
  }
}
