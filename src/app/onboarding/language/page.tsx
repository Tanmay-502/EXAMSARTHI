'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { updatePreferences } from '@/app/exam/actions'
import { useVoice } from '@/lib/voice/VoiceProvider'
import { usePreferredMode } from '@/lib/hooks/usePreferredMode'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant'

type LanguageCode = 'en-IN' | 'hi-IN' | 'te-IN'

export default function LanguageSelectionPage() {
  const router = useRouter()
  const firstButtonRef = useRef<HTMLButtonElement>(null)
  const spokenRef = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const { speak, startContinuousListening, pauseListening, isContinuous } = useVoice()
  const { mode: preferredMode, isLoaded: modeLoaded } = usePreferredMode()
  const { setLang } = useI18n()
  const { useVoiceAction } = useGlobalVoice()

  useEffect(() => {
    firstButtonRef.current?.focus()
    if (!modeLoaded || spokenRef.current) return
    spokenRef.current = true
    speak('Choose your language. Say English, Hindi, or Telugu.')
    if (preferredMode === 'voice-first') {
      if (!isContinuous) startContinuousListening()
    } else {
      pauseListening()
    }
  }, [isContinuous, modeLoaded, pauseListening, preferredMode, speak, startContinuousListening])

  const saveAndContinue = async (langCode: LanguageCode) => {
    if (isSaving || !modeLoaded) return
    setIsSaving(true)
    setSaveError('')
    try {
      await updatePreferences({ preferred_mode: preferredMode, preferred_lang: langCode })
      setLang(langCode)
      if (preferredMode === 'voice-first') pauseListening()
      const confirmation = langCode === 'hi-IN' ? 'हिंदी चुनी गई। आपकी प्राथमिकताएँ सहेज दी गई हैं। अब डैशबोर्ड पर जा रहे हैं.' : langCode === 'te-IN' ? 'తెలుగు ఎంచుకోబడింది. మీ ప్రాధాన్యతలు సేవ్ అయ్యాయి. ఇప్పుడు డాష్‌బోర్డ్‌కు వెళ్తున్నాము.' : 'English selected. Your preferences are saved. Taking you to the dashboard.'
      speak(confirmation)
      window.setTimeout(() => router.push('/dashboard'), preferredMode === 'voice-first' ? 450 : 0)
    } catch (error) {
      console.error('Preference save failed:', error)
      const message = langCode === 'hi-IN' ? 'प्राथमिकताएँ सहेजी नहीं जा सकीं। कृपया फिर से कोशिश करें।' : langCode === 'te-IN' ? 'ప్రాధాన్యతలను సేవ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.' : 'Your preferences could not be saved. Please try again.'
      setSaveError(message)
      setIsSaving(false)
      speak(message)
    }
  }

  useVoiceAction((action, payload) => {
    if (action === 'CHANGE_LANGUAGE' && payload?.lang) {
      void saveAndContinue(payload.lang as LanguageCode)
      return true
    }
    return false
  })

  const languages = [
    { code: 'en-IN' as LanguageCode, label: 'English', native: 'English' },
    { code: 'hi-IN' as LanguageCode, label: 'Hindi', native: 'हिंदी' },
    { code: 'te-IN' as LanguageCode, label: 'Telugu', native: 'తెలుగు' },
  ]

  return (
    <main id="main-content" className="flex min-h-screen w-full flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950" />
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="mb-10 text-center">
          <h1 className="mb-4 text-3xl font-light tracking-tight text-zinc-100 md:text-5xl">Select Language</h1>
          <p className="text-lg text-zinc-400" aria-live="polite">Choose your preferred language for the interface and voice assistant.</p>
        </motion.div>
        {saveError ? <p role="alert" className="mb-6 w-full border border-zinc-800 px-4 py-3 text-sm text-zinc-300">{saveError}</p> : null}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex w-full flex-col gap-4">
          {languages.map((language, index) => (
            <button key={language.code} ref={index === 0 ? firstButtonRef : null} onClick={() => void saveAndContinue(language.code)} disabled={isSaving || !modeLoaded} className="group flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-left transition-all hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] disabled:opacity-50" aria-label={'Select ' + language.label}>
              <span className="flex flex-col items-start"><span className="mb-1 text-2xl font-medium text-white">{language.native}</span><span className="text-sm text-zinc-400">{language.label}</span></span>
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-transparent transition-colors group-hover:border-zinc-400 group-hover:text-zinc-400">✓</span>
            </button>
          ))}
        </motion.div>
      </div>
    </main>
  )
}