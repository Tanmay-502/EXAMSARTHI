import { test, expect } from '@playwright/test';

test.describe('Onboarding Voice Activation (Phase 6/7)', () => {

  test('Mode page exposes accessible spoken instruction and supports keyboard fallback', async ({ page }) => {
    await page.goto('/onboarding/mode');
    
    // 1. Check for on-page accessible text
    const heading = page.locator('h1', { hasText: 'Choose Your Experience' });
    await expect(heading).toBeVisible();
    
    const standardBtn = page.getByRole('button', { name: /Standard Mode/i });
    const voiceBtn = page.getByRole('button', { name: /Voice-first Mode/i });
    
    await expect(standardBtn).toBeVisible();
    await expect(voiceBtn).toBeVisible();
    
    // 2. Existing keyboard mode selection still works
    await standardBtn.focus();
    await page.keyboard.press('Enter');
    
    // Should navigate to language selection
    await expect(page).toHaveURL(/\/onboarding\/language/);
  });

  test('Language page exposes accessible spoken instruction and supports keyboard fallback', async ({ page }) => {
    await page.goto('/onboarding/language');
    
    // 1. Check for on-page accessible text
    const heading = page.locator('h1', { hasText: 'Select Language' });
    await expect(heading).toBeVisible();
    
    const englishBtn = page.getByRole('button', { name: /Select English/i });
    
    await expect(englishBtn).toBeVisible();
    
    // 2. Existing keyboard language selection still works
    await englishBtn.focus();
    await page.keyboard.press('Enter');
    
    // Should navigate to auth/login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

});
