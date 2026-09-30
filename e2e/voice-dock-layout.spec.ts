import { mkdirSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

type Viewport = { width: number; height: number }
type Route = { path: string; name: string; primary: { role: 'button' | 'textbox'; name: RegExp }[] }

const viewports: Viewport[] = [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 320, height: 568 }]
const publicRoutes: Route[] = [
  { path: '/', name: 'gateway', primary: [{ role: 'button', name: /voice/i }] },
  { path: '/auth/login', name: 'voice login', primary: [{ role: 'textbox', name: /user id/i }, { role: 'textbox', name: /password/i }] },
]
const protectedRoutes: Route[] = [
  { path: '/welcome', name: 'welcome', primary: [{ role: 'button', name: /Get started|Continue to dashboard/i }] },
  { path: '/onboarding/mode', name: 'mode', primary: [{ role: 'button', name: /Standard Mode/i }, { role: 'button', name: /Voice-first Mode/i }] },
  { path: '/onboarding/language', name: 'language', primary: [{ role: 'button', name: /Select English/i }, { role: 'button', name: /Select Hindi/i }, { role: 'button', name: /Select Telugu/i }] },
]

async function installSpeechStubs(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { hasBeenActive: false } })
    class MockSpeechRecognition {
      continuous = false; interimResults = true; maxAlternatives = 3; lang = 'en-IN'; onstart: (() => void) | null = null; onresult: ((event: unknown) => void) | null = null; onerror: ((event: { error: string }) => void) | null = null; onend: (() => void) | null = null;
      start() { queueMicrotask(() => this.onstart?.()) } stop() { queueMicrotask(() => this.onend?.()) } abort() { queueMicrotask(() => this.onend?.()) }
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: MockSpeechRecognition })
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: MockSpeechRecognition })
    if (window.speechSynthesis) { window.speechSynthesis.cancel = () => undefined; window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => { queueMicrotask(() => utterance.onstart?.({} as SpeechSynthesisEvent)); queueMicrotask(() => utterance.onend?.({} as SpeechSynthesisEvent)) } }
  })
}

async function runDockCoverage(page: Page, route: Route, viewport: Viewport) {
  mkdirSync('artifacts/voice-dock-screenshots', { recursive: true })
  await page.setViewportSize(viewport)
  await installSpeechStubs(page)
  await page.goto(route.path)
  await expect(page.getByTestId('voice-dock')).toBeVisible()
  const dock = page.getByTestId('voice-dock')
  const collapsedBox = await dock.boundingBox()
  expect(collapsedBox).not.toBeNull()
  expect(collapsedBox!.height).toBeLessThanOrEqual(Math.min(64, viewport.height * 0.12))
  const panel = page.locator('#voice-transcript-panel')
  await expect(panel).toBeHidden()
  if (viewport.width === 1280 && viewport.height === 720) for (const target of route.primary) await expect(page.getByRole(target.role, { name: target.name })).toBeVisible()
  if (route.path === '/') { await expect(page.getByRole('button', { name: /voice/i })).toBeFocused(); await expect(page.getByTestId('demo-guide')).toHaveCount(0) }
  await expect(page.getByRole('button', { name: /Transcript/i })).toHaveAttribute('aria-expanded', 'false')
  await new AxeBuilder({ page }).include('[data-testid="voice-dock"]').analyze().then((result) => expect(result.violations).toEqual([]))
  const toggle = page.getByRole('button', { name: /Transcript/i }); await toggle.focus(); await toggle.press('Enter'); await expect(toggle).toHaveAttribute('aria-expanded', 'true'); await expect(panel).toBeVisible()
  const expandedDockBox = await dock.boundingBox(); expect(expandedDockBox).not.toBeNull(); expect(expandedDockBox!.height).toBeLessThanOrEqual(viewport.height * 0.45 + 2)
  const heightBeforeFakeMessages = expandedDockBox!.height
  await panel.locator('[role="log"]').focus();
  await page.evaluate(() => { const log=document.querySelector('#voice-transcript-panel [role="log"]'); if (!log) throw new Error('voice transcript log not found'); for (let i=0;i<50;i+=1) { const el=document.createElement('div'); el.textContent='Fake transcript message '+(i+1); el.className='rounded-2xl border px-4 py-3 text-sm leading-relaxed'; log.appendChild(el) } })
  await page.waitForTimeout(50); const after=await dock.boundingBox(); expect(after).not.toBeNull(); expect(Math.abs(after!.height-heightBeforeFakeMessages)).toBeLessThanOrEqual(1)
  await page.keyboard.press('Escape'); await expect(toggle).toHaveAttribute('aria-expanded','false'); await expect(toggle).toBeFocused()
  await page.screenshot({ path: 'artifacts/voice-dock-screenshots/' + route.name + '-' + viewport.width + 'x' + viewport.height + '-collapsed.png', fullPage: false })
}

for (const viewport of viewports) for (const route of publicRoutes) test(route.name + ' ' + viewport.width + 'x' + viewport.height + ' dock layout', async ({ page }) => { await runDockCoverage(page, route, viewport) })

const authStatePath = process.env.PLAYWRIGHT_AUTH_STATE
test.describe('Authenticated dock routes', () => {
  test.use({ storageState: authStatePath || undefined })
  for (const viewport of viewports) for (const route of protectedRoutes) test(route.name + ' ' + viewport.width + 'x' + viewport.height + ' dock layout', async ({ page }) => {
    test.skip(!authStatePath, 'Set PLAYWRIGHT_AUTH_STATE for protected-route dock coverage.')
    await runDockCoverage(page, route, viewport)
  })
})