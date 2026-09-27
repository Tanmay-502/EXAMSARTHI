'use client'

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { VoiceCore } from '@/components/voice/VoiceCore';
import { motion } from 'framer-motion';

export function VoiceGateway() {
  const router = useRouter();
  const { speak, startContinuousListening } = useVoice();
  const { useVoiceAction } = useGlobalVoice();
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (primaryButtonRef.current) {
      primaryButtonRef.current.focus();
    }
  }, []);

  useVoiceAction((action) => {
    if (!bootstrapped) return;
    if (action === 'HELP') {
      speak("Welcome to ExamSaarthi. Would you like to sign in or create an account?");
    }
  });

  const handleEnableVoice = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(utterance);
    }
    
    setBootstrapped(true);
    const greeting = "Welcome to ExamSaarthi. I am your voice companion. Would you like to sign in or create an account?";
    speak(greeting);
    startContinuousListening();
  };

  const handleContinueKeyboard = () => {
    router.push('/auth/login');
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Subtle background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950" />

      <div className="relative z-10 flex flex-col items-center justify-center p-6 md:p-12 text-center max-w-5xl w-full">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-12 relative"
        >
          {/* subtle rotating energy ring around core */}
          <motion.div 
            className="absolute -inset-8 rounded-full border border-white/5 bg-white/5 blur-sm"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          />
          <VoiceCore size="hero" />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-6"
        >
          <h2 className="text-sm md:text-base font-medium tracking-[0.2em] text-zinc-500 mb-6 uppercase">ExamSaarthi</h2>
          <h1 className="text-4xl md:text-7xl font-light tracking-tight mb-6 text-zinc-100 drop-shadow-sm">
            Intelligent.<br className="hidden md:block" /> Accessible.<br className="hidden md:block" /> Independent.
          </h1>
          <p className="text-base md:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed" aria-live="polite">
            A voice-driven examination companion built for accessibility and focus.
          </p>
        </motion.div>
        
        {!bootstrapped && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col md:flex-row gap-6 w-full max-w-2xl justify-center"
          >
            <button
              ref={primaryButtonRef}
              onClick={handleEnableVoice}
              className="group relative inline-flex items-center justify-center rounded-full text-base font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 overflow-hidden bg-white text-black h-14 px-10 hover:bg-zinc-200 active:scale-[0.98] shadow-sm"
              aria-label="Enable Voice Companion"
            >
              Enable Voice Companion
            </button>
            
            <button
              onClick={handleContinueKeyboard}
              className="inline-flex items-center justify-center rounded-full text-base font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-white h-14 px-10 active:scale-[0.98]"
              aria-label="Continue with Keyboard"
            >
              Continue with Keyboard
            </button>
          </motion.div>
        )}
        
        {bootstrapped && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-6 mt-4"
          >
            <div className="px-6 py-3 rounded-full bg-zinc-900 border border-zinc-800 backdrop-blur-sm">
              <p className="text-sm md:text-base font-medium text-zinc-400 tracking-wide">
                Listening for <span className="text-zinc-100 font-bold">&quot;Sign In&quot;</span> or <span className="text-zinc-100 font-bold">&quot;Sign Up&quot;</span>
              </p>
            </div>
            <button
              onClick={handleContinueKeyboard}
              className="text-sm underline underline-offset-4 text-zinc-500 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 rounded px-3 py-2 transition-colors"
            >
              Skip and continue with keyboard
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
