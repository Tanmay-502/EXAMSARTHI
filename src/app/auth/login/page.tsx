'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { loginWithVoiceCredentials } from '../actions'
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher'
import { VoiceCore } from '@/components/voice/VoiceCore'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useVoice } from '@/lib/voice/VoiceProvider'
import { normalizeVoicePassword, normalizeVoiceUserId } from '@/lib/auth/voiceCredentials'

type LoginStage = 'USER_ID' | 'PASSWORD' | 'AUTHENTICATING' | 'ERROR'

function LoginForm() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const router = useRouter()
  const nextPath = searchParams.get('next')
  const { speak, startSecureContinuousListening, pauseListening, micError } = useVoice()

  const [stage, setStage] = useState<LoginStage>('USER_ID')
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const stageRef = useRef<LoginStage>('USER_ID')
  const authBusyRef = useRef(false)
  const startedRef = useRef(false)
  const userIdRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    stageRef.current = stage
  }, [stage])

  const handleVoiceInput = useCallback(async (transcript: string) => {
    if (authBusyRef.current) return

    if (stageRef.current === 'USER_ID') {
      const normalized = normalizeVoiceUserId(transcript)
      if (!/^[a-z0-9._-]{3,32}$/.test(normalized)) {
        setMessage(t('voice_login_user_id_retry'))
        speak(t('voice_login_user_id_retry'))
        return
      }

      setUserId(normalized)
      stageRef.current = 'PASSWORD'
      setStage('PASSWORD')
      speak(t('voice_login_password_prompt'))
      return
    }

    if (stageRef.current === 'PASSWORD') {
      const normalized = normalizeVoicePassword(transcript)
      if (!normalized) {
        setMessage(t('voice_login_password_retry'))
        speak(t('voice_login_password_retry'))
        return
      }

      authBusyRef.current = true
      stageRef.current = 'AUTHENTICATING'
      setStage('AUTHENTICATING')
      setPassword(normalized)
      setMessage(t('voice_login_authenticating'))
      speak(t('voice_login_authenticating'))

      const result = await loginWithVoiceCredentials(userId, normalized, nextPath)
      if (result?.success === false) {
        authBusyRef.current = false
        stageRef.current = 'ERROR'
        setStage('ERROR')
        const key = result.code === 'rate_limited'
          ? 'voice_login_rate_limited'
          : result.code === 'invalid_credentials'
            ? 'voice_login_invalid_credentials'
            : 'voice_login_error'
        setMessage(t(key))
        speak(t(key))
      }
    }
  }, [nextPath, speak, t, userId])

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
        // Voice login can still proceed if the session probe is unavailable.
      }

      if (cancelled || startedRef.current) return
      startedRef.current = true
      await new Promise(resolve => window.setTimeout(resolve, 250))
      if (cancelled) return
      speak(t('voice_login_intro'))
      startSecureContinuousListening(handleVoiceInput)
      userIdRef.current?.focus()
    }

    void boot()
    return () => {
      cancelled = true
      pauseListening()
    }
  }, [handleVoiceInput, nextPath, pauseListening, router, speak, startSecureContinuousListening, t])

  const submitTyped = async () => {
    if (!userId || !password || authBusyRef.current) return
    authBusyRef.current = true
    stageRef.current = 'AUTHENTICATING'
    setStage('AUTHENTICATING')
    const result = await loginWithVoiceCredentials(userId, password, nextPath)
    if (result?.success === false) {
      authBusyRef.current = false
      stageRef.current = 'ERROR'
      setStage('ERROR')
      const key = result.code === 'rate_limited'
        ? 'voice_login_rate_limited'
        : result.code === 'invalid_credentials'
          ? 'voice_login_invalid_credentials'
          : 'voice_login_error'
      setMessage(t(key))
      speak(t(key))
    }
  }

  const retryVoice = () => {
    authBusyRef.current = false
    setMessage('')
    setPassword('')
    setUserId('')
    stageRef.current = 'USER_ID'
    setStage('USER_ID')
    speak(t('voice_login_user_id_prompt'))
    startSecureContinuousListening(handleVoiceInput)
  }

  const stageLabel = stage === 'PASSWORD'
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
                ref={userIdRef}
                id="voice-user-id"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                autoComplete="username"
                spellCheck={false}
                className="h-14 w-full rounded-2xl border border-zinc-800 bg-transparent px-4 text-xl text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="voice-password" className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{t('voice_login_password_label')}</label>
              <input
                id="voice-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="h-14 w-full rounded-2xl border border-zinc-800 bg-transparent px-4 text-xl text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={submitTyped} className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold uppercase tracking-widest text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]">{t('voice_login_submit')}</button>
              <button type="button" onClick={retryVoice} className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-bold uppercase tracking-widest text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]">{t('voice_login_restart')}</button>
            </div>

            <p className="text-sm text-zinc-400">{t('voice_login_note')}</p>
          </div>

          {micError ? <p className="text-sm text-zinc-300" role="status">{t('voice_login_mic_hint')}</p> : null}
        </section>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main id="main-content" className="min-h-dvh bg-black text-white"><div className="mx-auto max-w-3xl px-6 py-12">{'Loading...'}</div></main>}>
      <LoginForm />
    </Suspense>
  )
}
