'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { loginWithVoiceCredentials } from '../actions'
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher'
import { VoiceCore } from '@/components/voice/VoiceCore'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useVoice } from '@/lib/voice/VoiceProvider'
import { normalizeVoicePassword, normalizeVoiceUserId } from '@/lib/auth/voiceCredentialNormalization'

type LoginStage = 'USER_ID' | 'CONFIRM_USER_ID' | 'PASSWORD' | 'AUTHENTICATING' | 'ERROR'

const YES_PATTERN = /\b(yes|yeah|yep|correct|right|confirm|okay|ok|haan|हां|हाँ|सही|ठीक|अवును|అవును|సరే)\b/i
const NO_PATTERN = /\b(no|nope|change|wrong|not|नहीं|गलत|बदलें|కాదు|తప్పు|మార్చు)\b/i
const RETRY_PATTERN = /\b(retry|again|restart|start over|फिर|दोबारा|మళ్లీ|మరొకసారి)\b/i
const SPEECH_STOPWORDS = new Set([
  'i', 'me', 'my', 'is', 'the', 'please', 'want', 'to', 'login', 'log', 'in',
  'sign', 'access', 'open', 'go', 'dashboard', 'practice', 'exam', 'help',
])

function looksLikeUserIdInput(raw: string, normalized: string) {
  if (!normalized) return false
  if (/\b(user\s*id|userid|username)\b/i.test(raw)) return true
  if (/^[a-z0-9._-]{3,32}$/i.test(raw.trim())) return true

  const tokens = raw.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (tokens.length < 1 || tokens.length > 6) return false
  if (tokens.some((token) => SPEECH_STOPWORDS.has(token))) return false
  return tokens.every((token) => /^[a-z0-9._-]+$/i.test(token) || /^(zero|one|two|three|four|five|six|seven|eight|nine|शून्य|एक|दो|तीन|चार|पाँच|पांच|छह|छः|सात|आठ|नौ|సున్నా|ఒకటి|రెండు|మూడు|నాలుగు|ఐదు|ఆరు|ఏడు|ఎనిమిది|తొమ్మిది)$/i.test(token))
}

function LoginForm() {
  const { t, tParams } = useI18n()
  const searchParams = useSearchParams()
  const router = useRouter()
  const nextPath = searchParams.get('next')
  const { speak, startSecureContinuousListening, pauseListening, micError } = useVoice()

  const [stage, setStage] = useState<LoginStage>('USER_ID')
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const stageRef = useRef<LoginStage>('USER_ID')
  const userIdRef = useRef('')
  const authBusyRef = useRef(false)
  const startedRef = useRef(false)
  const userIdInputRef = useRef<HTMLInputElement>(null)

  const setStageSafe = useCallback((nextStage: LoginStage) => {
    stageRef.current = nextStage
    setStage(nextStage)
  }, [])

  const resetToUserId = useCallback((announcePrompt = true) => {
    authBusyRef.current = false
    userIdRef.current = ''
    setUserId('')
    setPassword('')
    setMessage('')
    setStageSafe('USER_ID')
    if (announcePrompt) speak(t('voice_login_user_id_prompt'))
  }, [setStageSafe, speak, t])

  const handleVoiceInput = useCallback(async (transcript: string) => {
    if (authBusyRef.current) return

    const trimmed = transcript.trim()
    if (!trimmed) return

    if (RETRY_PATTERN.test(trimmed) && stageRef.current !== 'AUTHENTICATING') {
      resetToUserId(true)
      return
    }

    if (stageRef.current === 'USER_ID') {
      const normalized = normalizeVoiceUserId(trimmed)
      if (!looksLikeUserIdInput(trimmed, normalized) || !/^[a-z0-9._-]{3,32}$/.test(normalized)) {
        setMessage(t('voice_login_user_id_retry'))
        speak(t('voice_login_user_id_retry'))
        return
      }

      userIdRef.current = normalized
      setUserId(normalized)
      setMessage(tParams('voice_login_user_id_heard', { userId: normalized }))
      setStageSafe('CONFIRM_USER_ID')
      speak(tParams('voice_login_user_id_confirm', { userId: normalized }))
      return
    }

    if (stageRef.current === 'CONFIRM_USER_ID') {
      if (YES_PATTERN.test(trimmed)) {
        setStageSafe('PASSWORD')
        setMessage(t('voice_login_password_masked'))
        speak(t('voice_login_password_prompt'))
        return
      }

      if (NO_PATTERN.test(trimmed)) {
        resetToUserId(true)
        return
      }

      speak(t('voice_login_confirm_yes_no'))
      return
    }

    if (stageRef.current === 'PASSWORD') {
      const normalized = normalizeVoicePassword(trimmed)
      if (!/^\d{4,12}$/.test(normalized)) {
        setMessage(t('voice_login_pin_retry'))
        speak(t('voice_login_pin_retry'))
        return
      }

      authBusyRef.current = true
      setStageSafe('AUTHENTICATING')
      setMessage(t('voice_login_authenticating'))
      speak(t('voice_login_authenticating'))

      const result = await loginWithVoiceCredentials(userIdRef.current, normalized, nextPath)
      if (result?.success === false) {
        if (result.code === 'rate_limited') {
          authBusyRef.current = false
          setStageSafe('ERROR')
          setMessage(t('voice_login_rate_limited'))
          speak(t('voice_login_rate_limited'))
          return
        }

        authBusyRef.current = false
        setStageSafe('ERROR')
        setMessage(result.code === 'invalid_credentials' ? t('voice_login_invalid_credentials') : t('voice_login_error'))
        speak(result.code === 'invalid_credentials' ? t('voice_login_invalid_credentials') : t('voice_login_error'))
        window.setTimeout(() => resetToUserId(true), 1200)
      }
      return
    }

    if (stageRef.current === 'ERROR') {
      resetToUserId(true)
    }
  }, [nextPath, resetToUserId, setStageSafe, speak, t])

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user && !cancelled) {
          router.replace(nextPath || '/dashboard')
          return
        }
      } catch {
        // Voice login remains available when the session probe is unavailable.
      }

      if (cancelled || startedRef.current) return
      startedRef.current = true
      userIdInputRef.current?.focus()
      await new Promise(resolve => window.setTimeout(resolve, 250))
      if (cancelled) return
      speak(t('voice_login_intro'))
      startSecureContinuousListening(handleVoiceInput)
    }

    void boot()
    return () => {
      cancelled = true
      pauseListening()
    }
  }, [handleVoiceInput, nextPath, pauseListening, router, speak, startSecureContinuousListening, t])

  const submitTyped = async () => {
    const normalizedUserId = normalizeVoiceUserId(userId)
    const normalizedPin = normalizeVoicePassword(password)
    if (!/^[a-z0-9._-]{3,32}$/.test(normalizedUserId) || !/^\d{4,12}$/.test(normalizedPin) || authBusyRef.current) return

    userIdRef.current = normalizedUserId
    authBusyRef.current = true
    setStageSafe('AUTHENTICATING')
    setMessage(t('voice_login_authenticating'))
    const result = await loginWithVoiceCredentials(normalizedUserId, normalizedPin, nextPath)
    if (result?.success === false) {
      authBusyRef.current = false
      setStageSafe('ERROR')
      const key = result.code === 'rate_limited'
        ? 'voice_login_rate_limited'
        : result.code === 'invalid_credentials'
          ? 'voice_login_invalid_credentials'
          : 'voice_login_error'
      setMessage(t(key))
      speak(t(key))
      window.setTimeout(() => resetToUserId(true), 1200)
    }
  }

  const restartVoice = () => {
    resetToUserId(false)
    speak(t('voice_login_user_id_prompt'))
    startSecureContinuousListening(handleVoiceInput)
  }

  const stageLabel = stage === 'CONFIRM_USER_ID'
    ? t('voice_login_confirm_stage')
    : stage === 'PASSWORD'
      ? t('voice_login_password_stage')
      : stage === 'AUTHENTICATING'
        ? t('voice_login_authenticating')
        : stage === 'ERROR'
          ? t('voice_login_error_stage')
          : t('voice_login_user_id_stage')

  return (
    <main id="main-content" className="min-h-dvh w-full bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 pb-24 pt-10 md:px-12 md:pt-12">
        <header className="mb-16 flex items-center justify-between border-b border-zinc-900 pb-8">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">{t('brand_name')}</p>
            <h1 className="text-5xl font-light tracking-tighter md:text-7xl">{t('voice_login_heading')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <VoiceCore size="sm" />
          </div>
        </header>

        <section aria-labelledby="voice-login-status" className="space-y-8">
          <h2 id="voice-login-status" className="sr-only">{t('voice_login_heading')}</h2>
          <p className="text-2xl font-light leading-relaxed text-zinc-200 md:text-3xl">{t('voice_login_intro')}</p>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-8" role="status" aria-live="polite" aria-atomic="true">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{stageLabel}</p>
            <p className="mt-3 text-xl font-medium text-white">
              {message || (stage === 'PASSWORD' ? t('voice_login_password_masked') : t('voice_login_ready'))}
            </p>
          </div>

          <div className="space-y-6 border-t border-zinc-900 pt-8">
            <div className="space-y-2">
              <label htmlFor="voice-user-id" className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{t('voice_login_user_id_label')}</label>
              <input
                ref={userIdInputRef}
                id="voice-user-id"
                value={userId}
                onChange={(event) => {
                  const value = event.target.value
                  setUserId(value)
                  userIdRef.current = value
                }}
                autoComplete="username"
                spellCheck={false}
                aria-describedby="voice-login-help"
                className="h-14 w-full rounded-2xl border border-zinc-800 bg-transparent px-4 text-xl text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="voice-password" className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{t('voice_login_pin_label')}</label>
              <input
                id="voice-password"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                aria-describedby="voice-login-help"
                className="h-14 w-full rounded-2xl border border-zinc-800 bg-transparent px-4 text-xl text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={submitTyped} className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold uppercase tracking-widest text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]">{t('voice_login_submit')}</button>
              <button type="button" onClick={restartVoice} className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-bold uppercase tracking-widest text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]">{t('voice_login_restart')}</button>
            </div>

            <p id="voice-login-help" className="text-sm leading-relaxed text-zinc-400">{t('voice_login_note')}</p>
          </div>

          {micError ? <p className="text-sm text-zinc-300" role="status">{t('voice_login_mic_hint')}</p> : null}
        </section>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main id="main-content" className="min-h-dvh bg-black text-white"><div className="mx-auto max-w-3xl px-6 py-12">Loading voice access...</div></main>}>
      <LoginForm />
    </Suspense>
  )
}
