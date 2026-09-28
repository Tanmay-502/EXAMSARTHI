import { mkdirSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Viewport = {
  width: number;
  height: number;
};

const viewports: Viewport[] = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
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

async function expectLastFocusableAboveDock(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(50);

  const dock = page.getByTestId('voice-dock');
  const main = page.locator('#main-content');
  const focusables = main.locator('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
  const lastFocusable = focusables.last();

  const dockBox = await dock.boundingBox();
  const focusableBox = await lastFocusable.boundingBox();

  expect(dockBox).not.toBeNull();
  expect(focusableBox).not.toBeNull();
  expect(focusableBox!.y + focusableBox!.height).toBeLessThanOrEqual(dockBox!.y + 1);
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
    expect(box!.y).toBeLessThanOrEqual((await page.evaluate(() => window.innerHeight)) + 1);
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
    test(route.name + ' ' + viewport.width + 'x' + viewport.height + ' dock layout and accessibility', async ({ page }) => {
      mkdirSync('artifacts/voice-dock-screenshots', { recursive: true });
      await page.setViewportSize(viewport);
      await installSpeechStubs(page);
      await page.goto(route.path);
      await expect(page.getByTestId('voice-dock')).toBeVisible();

      const dock = page.getByTestId('voice-dock');
      await page.waitForTimeout(50);

      const collapsedBox = await dock.boundingBox();
      expect(collapsedBox).not.toBeNull();
      expect(collapsedBox!.height).toBeLessThanOrEqual(64);
      expect(collapsedBox!.height).toBeLessThanOrEqual(viewport.height * 0.12);
      console.log('[VOICE DOCK MEASURE]', JSON.stringify({ viewport: viewport.width + 'x' + viewport.height, collapsed: collapsedBox!.height }));

      const panel = page.locator('#voice-transcript-panel');
      await expect(panel).toBeHidden();

      if (viewport.width === 1280 && viewport.height === 720) {
        await expectPrimaryElementsVisible(page, route);
      }

      if (route.path === '/') {
        await expect(page.getByTestId('demo-guide')).toHaveCount(0);
        await expect(page.getByText(/Press Space, Enter or click to start voice guidance/i)).toBeVisible();
        await expect(page.getByText(/Voice control is unavailable/i)).toHaveCount(0);
      }

      await expectNoAxeViolations(page);
      await expectLastFocusableAboveDock(page);

      await page.screenshot({
        path: 'artifacts/voice-dock-screenshots/' + route.name + '-' + viewport.width + 'x' + viewport.height + '-collapsed.png',
        fullPage: false,
      });

      const toggle = page.getByRole('button', { name: /Transcript/i });
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(toggle).toHaveAttribute('aria-controls', 'voice-transcript-panel');
      expect(await toggle.getAttribute('class')).toContain('focus-visible:ring-2');

      await toggle.focus();
      await toggle.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(panel).toBeVisible();

      const expandedPanelBox = await panel.boundingBox();
      const expandedDockBox = await dock.boundingBox();
      expect(expandedPanelBox).not.toBeNull();
      expect(expandedDockBox).not.toBeNull();
      expect(expandedPanelBox!.height).toBeLessThanOrEqual(viewport.height * 0.4 + 2);
      expect(expandedDockBox!.height).toBeLessThanOrEqual(viewport.height * 0.45 + 2);
      console.log('[VOICE DOCK MEASURE]', JSON.stringify({ viewport: viewport.width + 'x' + viewport.height, expandedPanel: expandedPanelBox!.height, expandedDock: expandedDockBox!.height }));

      await expectNoAxeViolations(page);

      const heightBeforeFakeMessages = expandedDockBox!.height;

      await panel.locator('[role="log"]').focus();
      await page.evaluate(() => {
        const log = document.querySelector('#voice-transcript-panel [role="log"]');
        if (!log) throw new Error('voice transcript log not found');
        for (let index = 0; index < 50; index += 1) {
          const message = document.createElement('div');
          message.textContent = 'Fake transcript message ' + (index + 1);
          message.className = 'rounded-2xl border px-4 py-3 text-sm leading-relaxed';
          log.appendChild(message);
        }
      });
      await page.waitForTimeout(50);

      const afterFakeMessagesBox = await dock.boundingBox();
      expect(afterFakeMessagesBox).not.toBeNull();
      expect(Math.abs(afterFakeMessagesBox!.height - heightBeforeFakeMessages)).toBeLessThanOrEqual(1);

      await expectLastFocusableAboveDock(page);

      await page.keyboard.press('Escape');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(panel).toBeHidden();
      await expect(toggle).toBeFocused();

      await page.screenshot({
        path: 'artifacts/voice-dock-screenshots/' + route.name + '-' + viewport.width + 'x' + viewport.height + '-expanded.png',
        fullPage: false,
      });
    });
  }
}
