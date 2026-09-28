'use client'

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { usePreferredMode, InteractionMode } from '@/lib/hooks/usePreferredMode';
import { motion } from 'framer-motion';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';

export default function ModeSelectionPage() {
  const router = useRouter();
  const { setMode } = usePreferredMode();
  const { t } = useI18n();
  const standardButtonRef = useRef<HTMLButtonElement>(null);
  const spokenRef = useRef(false);
  
  const { speak, startContinuousListening, pauseListening } = useVoice();
  const { useVoiceAction } = useGlobalVoice();

  useEffect(() => {
    // Focus the first option on mount for accessibility
    if (standardButtonRef.current) {
      standardButtonRef.current.focus();
    }
    
    if (!spokenRef.current) {
      spokenRef.current = true;
      speak(t('mode_selection_voice_prompt'));
      startContinuousListening();
    }
  }, [speak, startContinuousListening, t]);

  const handleSelectMode = (mode: InteractionMode) => {
    setMode(mode);

    if (mode === 'standard') {
      pauseListening();
    } else {
      startContinuousListening();
    }

    router.push('/onboarding/language');
  };

  useVoiceAction((action) => {
    if (action === 'SELECT_MODE_STANDARD') {
      speak(t('mode_standard_selected'));
      handleSelectMode('standard');
      return true;
    } else if (action === 'SELECT_MODE_VOICE') {
      speak(t('mode_voice_first_selected'));
      handleSelectMode('voice-first');
      return true;
    }
    return false;
  });

  return (
    <main 
      id="main-content" 
      className="flex flex-col items-center justify-center min-h-dvh w-full bg-zinc-950 text-zinc-100 px-4"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950" />
      
      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-5xl font-light tracking-tight mb-4 text-zinc-100">
            {t('choose_your_experience')}
          </h1>
          <p className="text-zinc-400 text-lg max-w-lg mx-auto" aria-live="polite">
            {t('choose_experience_desc')}
          </p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full"
        >
          <button
            ref={standardButtonRef}
            onClick={() => handleSelectMode('standard')}
            className="group flex flex-col items-start p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-500 hover:bg-zinc-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] text-left"
            aria-label={t('mode_standard_aria')}
          >
            <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-6 group-hover:bg-zinc-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <h2 className="text-2xl font-medium text-white mb-2">{t('standard_mode')}</h2>
            <p className="text-zinc-400 text-sm">
              {t('mode_standard_desc')}
            </p>
          </button>

          <button
            onClick={() => handleSelectMode('voice-first')}
            className="group flex flex-col items-start p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-[var(--brand-accent)] hover:bg-zinc-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] text-left"
            aria-label={t('mode_voice_first_aria')}
          >
            <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-6 group-hover:bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--brand-accent)]">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </div>
            <h2 className="text-2xl font-medium text-white mb-2">{t('voice_first_mode')}</h2>
            <p className="text-zinc-400 text-sm">
              {t('mode_voice_first_desc')}
            </p>
          </button>
        </motion.div>
      </div>
    </main>
  );
}
