'use client'

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';

export function VoiceGateway() {
  const router = useRouter();
  const { t } = useI18n();
  const { speak, startContinuousListening } = useVoice();
  const { useVoiceAction } = useGlobalVoice();
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    // Autofocus the primary button on mount for accessibility
    if (primaryButtonRef.current) {
      primaryButtonRef.current.focus();
    }
  }, []);

  useVoiceAction((action) => {
    if (!bootstrapped) return;
    
    if (action === 'CHANGE_LANGUAGE') {
      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
    } else if (action === 'HELP') {
      speak(t('gateway_welcome'));
    }
  });

  const handleEnableVoice = () => {
    // Crucial: This click is the user gesture that unlocks Web Speech API
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Dummy speak to unlock audio context on mobile/safari
      const utterance = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(utterance);
    }
    
    setBootstrapped(true);
    speak(t('gateway_welcome'));
    startContinuousListening();
  };

  const handleContinueKeyboard = () => {
    router.push('/auth/login');
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 md:p-24 text-center">
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
        EXAMSAARTHI V2
      </h1>
      <p className="text-xl text-muted-foreground mb-12 max-w-2xl" aria-live="polite">
        {bootstrapped ? t('gateway_welcome') : t('welcome')}
      </p>
      
      {!bootstrapped && (
        <div className="flex flex-col gap-4 w-full max-w-md">
          <button
            ref={primaryButtonRef}
            onClick={handleEnableVoice}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus:bg-primary/90 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-16 px-8 py-4 w-full"
            aria-label="Enable Voice Assistance"
          >
            Enable Voice Assistance
          </button>
          
          <button
            onClick={handleContinueKeyboard}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-14 px-8 py-4 w-full"
            aria-label="Continue with Keyboard"
          >
            Continue with Keyboard
          </button>
        </div>
      )}
      
      {bootstrapped && (
        <div className="flex flex-col items-center justify-center gap-4 mt-8">
          <div className="animate-pulse flex items-center justify-center w-16 h-16 rounded-full bg-primary/20">
            <div className="w-8 h-8 rounded-full bg-primary"></div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Listening for language (e.g. &quot;English&quot;) or &quot;help&quot;...</p>
          <button
            onClick={handleContinueKeyboard}
            className="mt-8 text-sm underline text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1"
          >
            Skip and go to login
          </button>
        </div>
      )}
    </div>
  );
}
