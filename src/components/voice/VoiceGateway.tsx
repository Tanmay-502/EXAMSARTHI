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
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden bg-black text-white">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[100px] mix-blend-screen animate-pulse" />
      </div>

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
          <h2 className="text-xl md:text-3xl font-medium tracking-widest text-blue-400/80 mb-2 uppercase">EXAMSAARTHI</h2>
          <h1 className="text-5xl md:text-8xl font-extrabold tracking-tighter mb-4 bg-clip-text text-transparent bg-linear-to-br from-white via-white/90 to-white/30 drop-shadow-sm">
            Your Voice.<br className="hidden md:block" /> Your Exam.<br className="hidden md:block" /> Your Independence.
          </h1>
          <p className="text-lg md:text-2xl text-white/60 mb-12 max-w-3xl mx-auto font-light leading-relaxed" aria-live="polite">
            An AI-powered accessible examination companion designed for independent learning and examinations.
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
              className="group relative inline-flex items-center justify-center rounded-full text-lg font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50 overflow-hidden bg-white text-black h-16 px-12 hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)]"
              aria-label="Enable Voice Companion"
            >
              <div className="absolute inset-0 bg-linear-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
              Enable Voice Companion
            </button>
            
            <button
              onClick={handleContinueKeyboard}
              className="inline-flex items-center justify-center rounded-full text-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20 bg-white/5 backdrop-blur-md text-white border border-white/10 hover:bg-white/10 h-16 px-12 hover:scale-105 active:scale-95"
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
            <div className="px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-sm md:text-base font-medium text-white/80 tracking-wide">
                Listening for <span className="text-white font-bold">&quot;Sign In&quot;</span> or <span className="text-white font-bold">&quot;Sign Up&quot;</span>
              </p>
            </div>
            <button
              onClick={handleContinueKeyboard}
              className="text-sm underline text-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded px-3 py-2 transition-colors"
            >
              Skip and continue with keyboard
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
