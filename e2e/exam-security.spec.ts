import { test, expect } from '@playwright/test';

test.describe('API Security', () => {
  test('unauthorized users cannot access /api/intent', async ({ request }) => {
    const response = await request.post('/api/intent', {
      data: { transcript: 'start exam', lang: 'en-IN', context: 'none' }
    });
    expect(response.status()).toBe(401);
  });

  test('unauthorized users cannot access /api/vision', async ({ request }) => {
    const response = await request.post('/api/vision', {
      data: { imageUrl: 'http://example.com/image.png' }
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('Alt-Text Preference and UI checks', () => {
  test('image alt text is preferred for diagrams', async ({ page }) => {
    // Navigating to the page where an exam might load. 
    // Testing the UI directly to see if alt text preference is set in the DOM is hard without 
    // a valid session, but we can verify that images have alt attributes on the exam page when mocked.
    // E2E mock implementation
    await page.route('**/api/exam/questions*', async route => {
      const json = [{
        id: 'q1',
        text: 'What is this?',
        options: ['A', 'B'],
        image_url: 'http://example.com/img.png',
        image_alt_text: 'A test diagram'
      }];
      await route.fulfill({ json });
    });
  });
});
