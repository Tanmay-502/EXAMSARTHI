'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loginWithMagicLink } from '../actions'
import { getAuthMessage } from '../messages'
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher'
import { VoiceCore } from '@/components/voice/VoiceCore'
import { useVoiceEmailCapture } from '@/lib/hooks/useVoiceEmailCapture'
import { usePreferredMode } from '@/lib/hooks/usePreferredMode'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useVoice } from '@/lib/voice/VoiceProvider'
import { createClient as createSupabaseBrowserClient } from '@/lib/supabase/client'

function LoginForm() {
  const { t, lang } = useI18n()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const { mode: preferredMode, isLoaded: modeLoaded } = usePreferredMode()
  const { speak } = useVoice()
  const emailRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const { voiceEmail, setVoiceEmail, voiceStatus, setVoiceStep, setVoiceStatus } = useVoiceEmailCapture({
    enabled: modeLoaded && preferredMode === 'voice-first',
    emailRef,
    formRef,
  })

  useEffect(() => {
    emailRef.current?.focus()
    if (!modeLoaded || preferredMode !== 'voice-first') return
    const orientation = code === 'unauthenticated'
      ? (lang === 'hi-IN' ? 'आगे बढ़ने से पहले आपको साइन इन करना होगा। अपना ईमेल बताएं।' : lang === 'te-IN' ? 'కొనసాగడానికి ముందు మీరు సైన్ ఇన్ చేయాలి. మీ ఈమెయిల్ చెప్పండి.' : 'You need to sign in before continuing. Tell me your email address.')
      : (lang === 'hi-IN' ? 'साइन इन करने के लिए अपना ईमेल पता बताएं। मैं उसे पढ़कर पुष्टि करूँगा और फिर मैजिक लिंक भेजूँगा।' : lang === 'te-IN' ? 'సైన్ ఇన్ చేయడానికి మీ ఈమెయిల్ చిరునామా చెప్పండి. నేను దాన్ని చదివి నిర్ధారించుకుని, తర్వాత మ్యాజిక్ లింక్ పంపుతాను.' : 'Tell me your email address. I will read it back for confirmation before sending the Magic Link.')
    speak(orientation)
  }, [code, lang, modeLoaded, preferredMode, speak])

  const signInWithGoogle = async () => {
    setGoogleLoading(true)
    setGoogleError('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          scopes: 'openid profile email',
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Google sign-in error:', error)
      setGoogleError(lang === 'hi-IN' ? 'Google से साइन इन शुरू नहीं हो सका।' : lang === 'te-IN' ? 'Google సైన్-ఇన్ ప్రారంభం కాలేదు.' : 'Google sign-in could not be started. Please try again.')
      setGoogleLoading(false)
    }
  }

  const authMessage = getAuthMessage(code, lang)

  return (
    <main id="main-content" className="min-h-dvh w-full bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 pb-24 pt-10 md:px-12 md:pt-12">
        <header className="mb-16 flex items-center justify-between border-b border-zinc-900 pb-8">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">EXAMSAARTHI</p>
            <h1 className="text-5xl font-light tracking-tighter md:text-7xl">Log in</h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {modeLoaded && preferredMode === 'voice-first' ? <VoiceCore size="sm" /> : null}
          </div>
        </header>

        <div className="space-y-10">
          <p className="max-w-xl text-2xl font-light text-zinc-400 md:text-3xl">Sign in to continue to ExamSaarthi.</p>

          {authMessage ? <div data-testid="auth-message" role="status" aria-live="polite" className="border-y border-zinc-900 py-5 text-zinc-300">{authMessage}</div> : null}
          {code === 'no_account' ? <p className="text-sm text-zinc-400">{lang === 'hi-IN' ? 'नया अकाउंट बनाने के लिए ' : lang === 'te-IN' ? 'కొత్త ఖాతా కోసం ' : 'New to ExamSaarthi? '}<Link href="/auth/signup" className="inline-flex min-h-11 items-center font-semibold text-white underline underline-offset-4">{t('signup')}</Link></p> : null}

          <section aria-labelledby="google-login-title" className="space-y-3">
            <h2 id="google-login-title" className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-200">Fast sign in</h2>
            <button data-testid="google-auth-button" type="button" onClick={signInWithGoogle} disabled={googleLoading} className="inline-flex h-16 w-full items-center justify-center gap-3 rounded-full border border-zinc-600 bg-white px-8 text-sm font-bold text-black shadow-[0_10px_30px_rgba(255,255,255,0.08)] transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-accent)] disabled:opacity-60">
              <span aria-hidden="true" className="text-xl font-semibold">G</span>
              <span>{googleLoading ? 'Opening Google...' : 'Continue with Google'}</span>
            </button>
            <p className="text-sm text-zinc-400">Choose your Google account to continue without waiting for a Magic Link email.</p>
            {googleError ? <p role="alert" className="text-sm text-zinc-300">{googleError}</p> : null}
          </section>

          <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-zinc-400" aria-hidden="true"><span className="h-px flex-1 bg-zinc-900" /><span>or use email</span><span className="h-px flex-1 bg-zinc-900" /></div>

          <section aria-labelledby="magic-link-title" className="space-y-4">
            <h2 id="magic-link-title" className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-200">Magic Link</h2>
            <form ref={formRef} action={loginWithMagicLink} onSubmit={() => { setVoiceStep('sending'); setVoiceStatus('Sending Magic Link...') }} className="space-y-8">
              <div className="space-y-3">
                <label htmlFor="email" className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">{t('email')}</label>
                <input ref={emailRef} id="email" name="email" type="email" inputMode="email" autoComplete="email" required value={voiceEmail} onChange={(event) => setVoiceEmail(event.target.value)} className="h-14 w-full border-b border-zinc-800 bg-transparent text-xl text-white focus-visible:outline-none focus-visible:border-zinc-400" aria-describedby="voice-status" />
              </div>
              <p id="voice-status" className="min-h-6 text-sm text-zinc-400" aria-live="polite">{voiceStatus}</p>
              <button type="submit" className="inline-flex h-14 w-full items-center justify-center rounded-full bg-white px-8 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]">{t('send_magic_link')} ↗</button>
            </form>
          </section>

          <p className="text-sm text-zinc-400">{lang === 'hi-IN' ? 'अकाउंट नया है? ' : lang === 'te-IN' ? 'కొత్త ఖాతా కావాలా? ' : 'Need a new account? '}<Link href="/auth/signup" className="inline-flex min-h-11 items-center text-zinc-100 underline underline-offset-4">{t('signup')}</Link></p>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense fallback={<main id="main-content" className="min-h-dvh bg-black text-white"><div className="mx-auto max-w-3xl px-6 py-12">Loading...</div></main>}><LoginForm /></Suspense>
}
