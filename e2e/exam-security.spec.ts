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

