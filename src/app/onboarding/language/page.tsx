'use client'

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { usePreferredMode } from '@/lib/hooks/usePreferredMode';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';

type LanguageCode = 'en-IN' | 'hi-IN' | 'te-IN';

export default function LanguageSelectionPage() {
  const router = useRouter();
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const spokenRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { speak, startContinuousListening, pauseListening, isContinuous } = useVoice();
  const { mode: preferredMode, isLoaded: modeLoaded } = usePreferredMode();
  const { setLang } = useI18n();
  const { useVoiceAction } = useGlobalVoice();

  useEffect(() => {
    if (firstButtonRef.current) {
      firstButtonRef.current.focus();
    }
    
    if (!modeLoaded || spokenRef.current) return;

    spokenRef.current = true;
    const prompt = "Choose your language. Say English, Hindi, or Telugu.";
    speak(prompt);

    if (preferredMode === 'voice-first') {
      if (!isContinuous) startContinuousListening();
    } else {
      pauseListening();
    }
  }, [speak, startContinuousListening, pauseListening, isContinuous, preferredMode, modeLoaded]);

  const handleSelectLanguage = (langCode: LanguageCode) => {
    setIsSaving(true);
    setLang(langCode);
    router.push('/auth/login');
  };

  useVoiceAction((action, payload) => {
    if (action === 'CHANGE_LANGUAGE' && payload?.lang) {
      const nextLanguage = payload.lang as LanguageCode;
      setLang(nextLanguage);
      const confirmation =
        nextLanguage === 'hi-IN'
          ? 'हिंदी चुनी गई। अब लॉगिन पेज पर जा रहे हैं।'
          : nextLanguage === 'te-IN'
            ? 'తెలుగు ఎంచుకోబడింది. ఇప్పుడు సైన్ ఇన్ పేజీకి వెళ్తున్నాము.'
            : 'English selected. Taking you to the sign in page.';

      speak(confirmation);
      if (preferredMode !== 'voice-first') pauseListening();
      setIsSaving(true);
      setTimeout(() => router.push('/auth/login'), 450);
      return true;
    }
    return false;
  });

  const languages = [
    { code: 'en-IN' as LanguageCode, label: 'English', native: 'English' },
    { code: 'hi-IN' as LanguageCode, label: 'Hindi', native: 'हिंदी' },
    { code: 'te-IN' as LanguageCode, label: 'Telugu', native: 'తెలుగు' }
  ];

  return (
    <main 
      id="main-content" 
      className="flex flex-col items-center justify-center min-h-screen w-full bg-zinc-950 text-zinc-100 px-4"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950" />
      
      <div className="relative z-10 max-w-xl w-full flex flex-col items-center">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-5xl font-light tracking-tight mb-4 text-zinc-100">
            Select Language
          </h1>
          <p className="text-zinc-400 text-lg" aria-live="polite">
            Choose your preferred language for the interface and voice assistant.
          </p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full flex flex-col gap-4"
        >
          {languages.map((lang, index) => (
            <button
              key={lang.code}
              ref={index === 0 ? firstButtonRef : null}
              onClick={() => handleSelectLanguage(lang.code)}
              disabled={isSaving}
              className="group flex items-center justify-between p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-500 hover:bg-zinc-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
              aria-label={`Select ${lang.label}`}
            >
              <div className="flex flex-col items-start">
                <span className="text-2xl font-medium text-white mb-1">{lang.native}</span>
                <span className="text-zinc-400 text-sm">{lang.label}</span>
              </div>
              <div className="h-8 w-8 rounded-full border border-zinc-700 group-hover:border-zinc-400 flex items-center justify-center transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-transparent group-hover:text-zinc-400">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </button>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
