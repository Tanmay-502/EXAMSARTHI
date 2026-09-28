import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Authentication Flow & Gateway Routing', () => {
  test('gateway is minimal, accessible, and has keyboard shortcuts', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'ExamSaarthi' })).toBeVisible()
    const login = page.getByRole('button', { name: /^Log in/ })
    const signup = page.getByRole('button', { name: /^Sign up/ })
    await expect(login).toBeVisible()
    await expect(signup).toBeVisible()
    await expect(login).toBeFocused()
    await page.keyboard.press('s')
    await expect(page).toHaveURL(/\/auth\/signup$/)
    await page.goto('/')
    await expect(page.getByRole('button', { name: /^Log in/ })).toBeFocused()
    await page.keyboard.press('l')
    await expect(page).toHaveURL(/\/auth\/login$/)
  })

  test('Unauthenticated user can access login and signup pages', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page).toHaveURL(/.*\/auth\/login/)
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Send Magic Link/i })).toBeVisible()

    await page.goto('/auth/signup')
    await expect(page).toHaveURL(/.*\/auth\/signup/)
    await expect(page.getByRole('textbox', { name: /full name/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
  })

  test('Unauthenticated user is redirected to login when accessing protected routes', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*\/auth\/login\?code=unauthenticated/)
    await page.goto('/settings')
    await expect(page).toHaveURL(/.*\/auth\/login\?code=unauthenticated/)
  })

  test('login Magic Link uses existing-account mode and returns a safe code', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByRole('textbox', { name: /email/i }).fill('test-playwright@example.com')
    await page.getByRole('button', { name: /Send Magic Link/i }).click()
    await expect(page).toHaveURL(/.*\/auth\/login\?code=(sent|no_account|send_failed)$/)
    await expect(page.getByTestId('auth-message')).toBeVisible()
  })

  test('no-account login state links to signup', async ({ page }) => {
    await page.goto('/auth/login?code=no_account')
    await expect(page.getByTestId('auth-message')).toContainText('No account')
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
  })

  test('signup Magic Link uses account-creation mode and returns a safe code', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.getByRole('textbox', { name: /full name/i }).fill('Playwright Candidate')
    await page.getByRole('textbox', { name: /email/i }).fill('test-playwright-signup@example.com')
    await page.getByRole('button', { name: /Create account/i }).click()
    await expect(page).toHaveURL(/.*\/auth\/signup\?code=(sent|send_failed)$/)
    await expect(page.getByTestId('auth-message')).toBeVisible()
  })

  test('invalid confirm route token shows safe error code', async ({ page }) => {
    await page.goto('/auth/confirm?token_hash=invalid_token&type=email')
    await expect(page).toHaveURL(/.*\/auth\/login\?code=link_invalid$/)
    await expect(page.getByTestId('auth-message')).toContainText('authentication link')
  })
})

test.describe('Authentication Architecture Rules', () => {
  test('login uses shouldCreateUser false, signup uses true, and signUp is absent', () => {
    const actionsPath = path.join(process.cwd(), 'src/app/auth/actions.ts')
    const content = fs.readFileSync(actionsPath, 'utf-8')
    expect(content).toContain('shouldCreateUser: false')
    expect(content).toContain('shouldCreateUser: true')
    expect(content).toContain('emailRedirectTo:')
    expect(content).not.toContain('signUp(')
    expect(content).not.toContain('?message=')
  })

  test('auth pages do not consume free-form message query parameters', () => {
    const login = fs.readFileSync(path.join(process.cwd(), 'src/app/auth/login/page.tsx'), 'utf-8')
    const signup = fs.readFileSync(path.join(process.cwd(), 'src/app/auth/signup/page.tsx'), 'utf-8')
    expect(login).not.toContain('searchParams.get(\'message\')')
    expect(signup).not.toContain('searchParams.get(\'message\')')
  })

  test('auth callback defaults Magic Links to welcome and proxy leaves PWA assets public', () => {
    const confirm = fs.readFileSync(path.join(process.cwd(), 'src/app/auth/confirm/route.ts'), 'utf-8')
    const proxy = fs.readFileSync(path.join(process.cwd(), 'src/proxy.ts'), 'utf-8')
    expect(confirm).toContain("searchParams.get('next') ?? '/welcome'")
    expect(proxy).toContain("pathname === '/' || pathname === '/auth'")
    expect(proxy).toContain("'/manifest.json'")
    expect(proxy).toContain("'/sw.js'")
    expect(proxy).toContain('manifest\\.json')
    expect(proxy).toContain('sw\\.js')
  })
})