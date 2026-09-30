'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useVoice } from '@/lib/voice/VoiceProvider'
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant'
import { formatEmailForSpeech, normalizeSpokenEmail } from '@/lib/voice/emailParser'

type VoiceEmailStep = 'idle' | 'awaiting_email' | 'confirming_email' | 'sending'

type UseVoiceEmailCaptureOptions = {
  enabled: boolean
  emailRef: RefObject<HTMLInputElement | null>
  formRef: RefObject<HTMLFormElement | null>
}

export function useVoiceEmailCapture({ enabled, emailRef, formRef }: UseVoiceEmailCaptureOptions) {
  const { lang } = useI18n()
  const { speak, isContinuous, startContinuousListening } = useVoice()
  const { useVoiceAction } = useGlobalVoice()
  const [voiceStep, setVoiceStep] = useState<VoiceEmailStep>('awaiting_email')
  const [voiceEmail, setVoiceEmailState] = useState('')
  const [voiceStatus, setVoiceStatus] = useState('')
  const lastVoiceEmailRef = useRef('')

  useEffect(() => {
    if (!enabled || isContinuous) return
    startContinuousListening()
  }, [enabled, isContinuous, startContinuousListening])

  useVoiceAction((action, _payload, transcript) => {
    if (!enabled) return false
    const raw = transcript?.trim() || ''
    const normalized = raw.toLowerCase()

    if ((action as string) === 'RAW_TRANSCRIPT' && raw) {
      if (/\b(help|sign in|login|log in|sign up|signup|register|create an account)\b/.test(normalized)) return false

      if (voiceStep === 'confirming_email') {
        const yes = /\b(yes|yeah|yep|confirm|send|send it|okay|ok|haan|हाँ|అవును)\b/.test(normalized)
        const no = /\b(no|nope|change|wrong|different|नहीं|नही|కాదు|మార్చు)\b/.test(normalized)
        if (yes && lastVoiceEmailRef.current) {
          setVoiceStep('sending')
          setVoiceStatus(lang === 'hi-IN' ? 'मैजिक लिंक भेजा जा रहा है।' : lang === 'te-IN' ? 'మ్యాజిక్ లింక్ పంపుతోంది.' : 'Sending Magic Link...')
          window.requestAnimationFrame(() => formRef.current?.requestSubmit())
          return true
        }
        if (no) {
          setVoiceStep('awaiting_email')
          setVoiceEmailState('')
          lastVoiceEmailRef.current = ''
          setVoiceStatus('')
          speak(lang === 'hi-IN' ? 'ठीक है। अपना ईमेल पता फिर से बताएं।' : lang === 'te-IN' ? 'సరే. మీ ఇమెయిల్ చిరునామాను మళ్లీ చెప్పండి.' : 'Okay. Please say your email address again.')
          emailRef.current?.focus()
          return true
        }
      }

      const parsedEmail = normalizeSpokenEmail(raw)
      if (parsedEmail && voiceStep !== 'sending') {
        lastVoiceEmailRef.current = parsedEmail
        setVoiceEmailState(parsedEmail)
        setVoiceStep('confirming_email')
        setVoiceStatus(lang === 'hi-IN' ? 'मैंने ' + formatEmailForSpeech(parsedEmail) + ' सुना। भेजने के लिए हाँ कहें, बदलने के लिए नहीं कहें।' : lang === 'te-IN' ? formatEmailForSpeech(parsedEmail) + ' అని విన్నాను. పంపడానికి అవును, మార్చడానికి కాదు అని చెప్పండి.' : 'I heard ' + formatEmailForSpeech(parsedEmail) + '. Say yes to send the Magic Link, or say no to change it.')
        speak(lang === 'hi-IN' ? 'मैंने ' + parsedEmail + ' सुना। सही है तो हाँ कहें, बदलना है तो नहीं कहें।' : lang === 'te-IN' ? parsedEmail + ' అని విన్నాను. సరైతే అవును అని, మార్చాలంటే కాదు అని చెప్పండి.' : 'I heard ' + parsedEmail + '. Say yes to confirm, or say no to change it.')
        emailRef.current?.focus()
        return true
      }

      if (voiceStep === 'awaiting_email') {
        speak(lang === 'hi-IN' ? 'कृपया ईमेल पता बताएं। उदाहरण: tanmay at gmail dot com.' : lang === 'te-IN' ? 'దయచేసి ఈమెయిల్ చిరునామా చెప్పండి. ఉదాహరణకు tanmay at gmail dot com.' : 'Please say your email address. For example: tanmay at gmail dot com.')
        return true
      }
    }

    if (action === 'HELP') {
      speak(lang === 'hi-IN' ? 'ईमेल बताएं। मैं उसे भरकर पहले आपसे पुष्टि करूँगा, फिर मैजिक लिंक भेजूँगा।' : lang === 'te-IN' ? 'మీ ఇమెయిల్ చెప్పండి. నేను దాన్ని నింపి, ముందుగా మీకు చదివి నిర్ధారించుకుని, తరువాత మ్యాజిక్ లింక్ పంపుతాను.' : 'Tell me your email. I will fill it in, read it back for confirmation, and then send the Magic Link.')
      setVoiceStep('awaiting_email')
      return true
    }

    if (action === 'SIGN_IN') {
      setVoiceStep('awaiting_email')
      speak(lang === 'hi-IN'
        ? 'साइन इन चुना गया। अपना ईमेल पता बताएं।'
        : lang === 'te-IN'
          ? 'సైన్ ఇన్ ఎంచుకోబడింది. మీ ఈమెయిల్ చిరునామా చెప్పండి.'
          : 'Sign in selected. Please say your email address.')
      emailRef.current?.focus()
      return true
    }

    if (voiceStep === 'confirming_email') {
      const yes = /\b(yes|yeah|yep|confirm|send|send it|okay|ok|haan|हाँ|అవును)\b/.test(normalized) || action === 'CONFIRM'
      const no = /\b(no|nope|change|wrong|different|नहीं|नही|కాదు|మార్చు)\b/.test(normalized) || action === 'CHANGE'
      if (yes && lastVoiceEmailRef.current) {
        setVoiceStep('sending')
        setVoiceStatus('Sending Magic Link...')
        window.requestAnimationFrame(() => formRef.current?.requestSubmit())
        return true
      }
      if (no) {
        setVoiceStep('awaiting_email')
        setVoiceEmailState('')
        lastVoiceEmailRef.current = ''
        setVoiceStatus('')
        speak('Okay. Please say your email address again.')
        emailRef.current?.focus()
        return true
      }
    }
    return false
  })

  return {
    voiceStep,
    setVoiceStep,
    voiceEmail,
    setVoiceEmail: (email: string) => { setVoiceEmailState(email); lastVoiceEmailRef.current = email },
    voiceStatus,
    setVoiceStatus,
  }
}