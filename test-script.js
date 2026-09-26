const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('response', resp => console.log('RESP:', resp.url(), resp.status(), resp.headers()['x-action-redirect']));
  
  await page.goto('http://localhost:3000/auth/login');
  
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  
  console.log('Clicked, waiting...');
  await page.waitForTimeout(3000);
  console.log('Final URL:', page.url());
  await browser.close();
})();
