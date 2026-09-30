'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useVoice } from '@/lib/voice/VoiceProvider'

export function GatewayActions() {
  const router = useRouter()
  const { t } = useI18n()
  const { speak, startContinuousListening } = useVoice()
  const startedRef = useRef(false)

  const startVoice = useCallback(() => {
    if (!startedRef.current) {
      startedRef.current = true
      startContinuousListening()
    }
    speak(t('gateway_voice_ready'))
  }, [speak, startContinuousListening, t])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) return
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return
      if (event.key.toLowerCase() === 'enter' || event.key === ' ') {
        event.preventDefault()
        startVoice()
        return
      }
      if (event.key.toLowerCase() === 'l') {
        event.preventDefault()
        router.push('/auth/login')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router, startVoice])

  return (
    <div className="w-full">
      <button
        autoFocus
        type="button"
        onClick={startVoice}
        className="min-h-20 w-full rounded-3xl border border-zinc-700 bg-white px-8 text-left text-lg font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-black"
      >
        <span className="block">{t('welcome_start_voice_prompt')}</span>
        <span className="mt-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{t('voice_login_opening')}</span>
      </button>
      <p className="mt-4 text-sm text-zinc-400">{t('gateway_voice_ready')}</p>
    </div>
  )
}
