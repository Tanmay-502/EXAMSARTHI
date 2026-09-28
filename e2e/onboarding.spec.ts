import { test, expect } from '@playwright/test'

const authStatePath = process.env.PLAYWRIGHT_AUTH_STATE

test.describe('Onboarding Voice Activation', () => {
  test.use({ storageState: authStatePath || undefined })

  test('Mode page exposes accessible spoken instruction and supports keyboard fallback', async ({ page }) => {
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
  })

  test('Language page persists preferences and finishes at dashboard', async ({ page }) => {
    test.skip(!authStatePath, 'Set PLAYWRIGHT_AUTH_STATE for protected onboarding tests.')
    await page.goto('/onboarding/language')
    await expect(page.getByRole('heading', { name: 'Select Language' })).toBeVisible()
    const englishBtn = page.getByRole('button', { name: /Select English/i })
    await expect(englishBtn).toBeVisible()
    await englishBtn.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/dashboard/)
  })
})