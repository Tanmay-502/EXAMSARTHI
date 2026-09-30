import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Voice Authentication Flow & Gateway Routing', () => {
  test('gateway is accessible and exposes one voice entry point', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'ExamSaarthi' })).toBeVisible()
    const voiceButton = page.getByRole('button', { name: /voice/i })
    await expect(voiceButton).toBeVisible()
    await expect(voiceButton).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/.*\/$/)
  })

  test('voice login exposes keyboard fallback without signup controls', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('#voice-user-id')).toBeVisible()
    await expect(page.locator('#voice-password')).toBeVisible()
    await expect(page.locator('#voice-password')).toHaveAttribute('type', 'password')
    await expect(page.getByRole('button', { name: /Log in/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Restart voice login/i })).toBeVisible()
    await expect(page.getByText(/Sign up|Create account|Magic Link|Google/i)).toHaveCount(0)

    await page.locator('#voice-user-id').fill('tanmay09')
    await page.locator('#voice-password').fill('12345')
    await expect(page.locator('#voice-password')).toHaveValue('12345')
  })

  test('legacy signup route redirects to voice login', async ({ page }) => {
    await page.goto('/auth/signup')
    await expect(page).toHaveURL(/.*\/auth\/login$/)
  })

  test('unauthenticated user is redirected to voice login with destination preserved', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*\/auth\/login\?code=unauthenticated&next=%2Fdashboard$/)

    await page.goto('/settings')
    await expect(page).toHaveURL(/.*\/auth\/login\?code=unauthenticated&next=%2Fsettings$/)
  })
})

test.describe('Voice Authentication Architecture Rules', () => {
  test('server action contains only voice credential authentication and no signup flow', () => {
    const actionsPath = path.join(process.cwd(), 'src/app/auth/actions.ts')
    const content = fs.readFileSync(actionsPath, 'utf-8')
    expect(content).toContain('loginWithVoiceCredentials')
    expect(content).toContain('verifyVoiceCredentials')
    expect(content).toContain('signInWithPassword')
    expect(content).not.toContain('loginWithMagicLink')
    expect(content).not.toContain('signUpWithMagicLink')
    expect(content).not.toContain('signUp(')
  })

  test('voice login does not expose password speech in transcript UX', () => {
    const login = fs.readFileSync(path.join(process.cwd(), 'src/app/auth/login/page.tsx'), 'utf-8')
    const provider = fs.readFileSync(path.join(process.cwd(), 'src/lib/voice/VoiceProvider.tsx'), 'utf-8')
    expect(login).toContain('startSecureContinuousListening')
    expect(login).toContain('CONFIRM_USER_ID')
    expect(login).toContain('normalizeVoicePassword')
    expect(provider).toContain('sensitiveInputRef')
    expect(provider).toContain('lastAudioSensitiveRef')
    expect(provider).toContain('!sensitiveInputRef.current')
    expect(provider).toContain('noiseSuppression: true')
    expect(provider).toContain('autoGainControl: true')
  })

  test('ambiguous voice commands have a cloud transcription fallback', () => {
    const provider = fs.readFileSync(path.join(process.cwd(), 'src/lib/voice/VoiceProvider.tsx'), 'utf-8')
    const globalAssistant = fs.readFileSync(path.join(process.cwd(), 'src/components/voice/GlobalVoiceAssistant.tsx'), 'utf-8')
    const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/voice/transcribe/route.ts'), 'utf-8')
    expect(provider).toContain('retranscribeLastUtterance')
    expect(globalAssistant).toContain('getRecognitionConfidence')
    expect(globalAssistant).toContain('confidence < 0.72')
    expect(globalAssistant).toContain('retranscribeLastUtterance')
    expect(route).toContain('gemini-3.5-transcribe')
    expect(route).toContain('customVocabulary')
    expect(route).toContain('cache: \'no-store\'')
  })

  test('signup action surface is absent from voice parser and safe registry', () => {
    const parser = fs.readFileSync(path.join(process.cwd(), 'src/lib/voice/commandParser.ts'), 'utf-8')
    const registry = fs.readFileSync(path.join(process.cwd(), 'src/lib/voice/safeActionRegistry.ts'), 'utf-8')
    const schema = fs.readFileSync(path.join(process.cwd(), 'src/lib/voice/naturalIntentSchema.ts'), 'utf-8')
    expect(parser).not.toContain('SIGN_UP')
    expect(registry).not.toContain('SIGN_UP')
    expect(schema).not.toContain('SIGN_UP')
  })
})
