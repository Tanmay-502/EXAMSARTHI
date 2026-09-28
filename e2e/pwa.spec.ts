import { test, expect } from '@playwright/test';

test.describe('PWA shell', () => {
  test('serves a valid web manifest', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest.name).toBe('ExamSaarthi V2');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons?.length).toBeGreaterThan(0);
  });

  test('serves the service worker without authentication', async ({ request }) => {
    const response = await request.get('/sw.js')
    expect(response.ok()).toBe(true)
    expect(await response.text()).toContain("self.addEventListener('fetch'")
  })

  test('registers the production service worker', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const registration = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      try {
        const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      return Boolean(ready && ready.active);
      } catch {
        return false;
      }
    });

    expect(registration).toBe(true);
  });
});
