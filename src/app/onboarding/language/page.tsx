'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { updatePreferences } from '@/app/exam/actions'
import { useVoice } from '@/lib/voice/VoiceProvider'
import { usePreferredMode } from '@/lib/hooks/usePreferredMode'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant'
import { LANGUAGE_REGISTRY } from '@/lib/i18n/registry'

type LanguageCode = 'en-IN' | 'hi-IN' | 'te-IN'

export default function LanguageSelectionPage() {
  const router = useRouter()
  const firstButtonRef = useRef<HTMLButtonElement>(null)
  const spokenRef = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const { speak, startContinuousListening, pauseListening, isContinuous } = useVoice()
  const { mode: preferredMode, isLoaded: modeLoaded } = usePreferredMode()
  const { setLang, t, tParams } = useI18n()
  const { useVoiceAction } = useGlobalVoice()

  useEffect(() => {
    firstButtonRef.current?.focus()
    if (!modeLoaded || spokenRef.current) return
    spokenRef.current = true
    speak(t('select_language_voice_prompt'))
    if (preferredMode === 'voice-first') {
      if (!isContinuous) startContinuousListening()
    } else {
      pauseListening()
    }
  }, [isContinuous, modeLoaded, pauseListening, preferredMode, speak, startContinuousListening, t]);

  const saveAndContinue = async (langCode: LanguageCode) => {
    if (isSaving || !modeLoaded) return
    setIsSaving(true)
    setSaveError('')
    try {
      await updatePreferences({ preferred_mode: preferredMode, preferred_lang: langCode })
      setLang(langCode)
      if (preferredMode === 'voice-first') pauseListening()
      const confirmation = LANGUAGE_REGISTRY[langCode].dictionary.language_selection_saved.replace('{language}', LANGUAGE_REGISTRY[langCode].nativeName)
      speak(confirmation)
      window.setTimeout(() => router.push('/dashboard'), preferredMode === 'voice-first' ? 450 : 0)
    } catch (error) {
      console.error('Preference save failed:', error)
      const message = t('preferences_save_error')
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
    { code: 'en-IN' as LanguageCode, label: t('language_english'), native: t('language_english') },
    { code: 'hi-IN' as LanguageCode, label: t('language_hindi'), native: t('language_hindi') },
    { code: 'te-IN' as LanguageCode, label: t('language_telugu'), native: t('language_telugu') },
  ]

  return (
    <main id="main-content" className="flex min-h-dvh w-full flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950" />
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="mb-10 text-center">
          <h1 className="mb-4 text-3xl font-light tracking-tight text-zinc-100 md:text-5xl">{t('select_language_title')}</h1>
          <p className="text-lg text-zinc-400" aria-live="polite">{t('select_language_desc')}</p>
        </motion.div>
        {saveError ? <p role="alert" className="mb-6 w-full border border-zinc-800 px-4 py-3 text-sm text-zinc-300">{saveError}</p> : null}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex w-full flex-col gap-4">
          {languages.map((language, index) => (
            <button key={language.code} ref={index === 0 ? firstButtonRef : null} onClick={() => void saveAndContinue(language.code)} disabled={isSaving || !modeLoaded} className="group flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-left transition-all hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] disabled:opacity-50" aria-label={tParams('select_language_option', { language: language.label })}>
              <span className="flex flex-col items-start"><span className="mb-1 text-2xl font-medium text-white">{language.native}</span><span className="text-sm text-zinc-400">{language.label}</span></span>
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-transparent transition-colors group-hover:border-zinc-400 group-hover:text-zinc-400">✓</span>
            </button>
          ))}
        </motion.div>
      </div>
    </main>
  )
}