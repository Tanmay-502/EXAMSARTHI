import { test, expect } from '@playwright/test'

const authStatePath = process.env.PLAYWRIGHT_AUTH_STATE

test.describe('Onboarding Voice Activation', () => {
  test.use({ storageState: authStatePath || undefined })

  test('Mode page exposes accessible spoken instruction, persists mode, and supports keyboard fallback', async ({ page }) => {
    test.skip(!authStatePath, 'Set PLAYWRIGHT_AUTH_STATE for protected onboarding tests.')
    await page.goto('/onboarding/mode')
    await expect(page.getByRole('heading', { name: 'Choose Your Experience' })).toBeVisible()
    const standardBtn = page.getByRole('button', { name: /Standard Mode/i })
    const voiceBtn = page.getByRole('button', { name: /Voice-first Mode/i })
    await expect(standardBtn).toBeVisible()
    await expect(voiceBtn).toBeVisible()
    await standardBtn.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/onboarding\/language/)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('examsarthi_mode'))).toBe('standard')
  })

  test('Language page persists mode and language locally and finishes at dashboard', async ({ page }) => {
    test.skip(!authStatePath, 'Set PLAYWRIGHT_AUTH_STATE for protected onboarding tests.')
    await page.goto('/onboarding/language')
    await expect(page.getByRole('heading', { name: 'Select Language' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('examsarthi_mode'))).toBe('standard')

    const englishBtn = page.getByRole('button', { name: /Select English/i })
    await expect(englishBtn).toBeVisible()
    await englishBtn.focus()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/dashboard/)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('examsarthi_mode'))).toBe('standard')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('examsarthi_lang'))).toBe('en-IN')
  })

  test('Welcome offers direct dashboard continuation when both preferences are saved', async ({ page }) => {
    test.skip(!authStatePath, 'Set PLAYWRIGHT_AUTH_STATE for protected onboarding tests.')
    await page.addInitScript(() => {
      localStorage.setItem('examsarthi_mode', 'voice-first')
      localStorage.setItem('examsarthi_lang', 'hi-IN')
    })
    await page.goto('/welcome')
    await expect(page.getByRole('button', { name: /Continue to dashboard/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Get started/i })).toHaveCount(0)
  })
})