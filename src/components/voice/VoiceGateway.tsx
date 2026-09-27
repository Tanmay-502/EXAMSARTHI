'use client'

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { VoiceCore } from '@/components/voice/VoiceCore';
import { motion } from 'framer-motion';

const RobotVisual = () => (
  <motion.div
    initial={{ y: 0 }}
    animate={{ y: [-5, 5, -5] }}
    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
    className="inline-block mr-3 align-middle"
  >
    <svg 
      width="32" 
      height="32" 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ExamSaarthi voice assistant"
    >
      <rect x="25" y="35" width="50" height="35" rx="8" fill="#27272a" stroke="#e4e4e7" strokeWidth="4" />
      <circle cx="40" cy="52" r="5" fill="#a855f7" />
      <circle cx="60" cy="52" r="5" fill="#a855f7" />
      <path d="M45 65 Q 50 68 55 65" stroke="#e4e4e7" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="35" x2="50" y2="20" stroke="#e4e4e7" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="15" r="5" fill="#3b82f6" />
      <path d="M15 52 L 25 52" stroke="#e4e4e7" strokeWidth="4" strokeLinecap="round" />
      <path d="M75 52 L 85 52" stroke="#e4e4e7" strokeWidth="4" strokeLinecap="round" />
    </svg>
  </motion.div>
);

export function VoiceGateway() {
  const router = useRouter();

  const { speak } = useVoice();
  const { useVoiceAction } = useGlobalVoice();
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  useVoiceAction((action) => {
    if (action === 'HELP') {
      speak("Welcome to ExamSaarthi. Let's get started.");
    }
  });

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
          <h2 className="text-sm md:text-base font-medium tracking-[0.2em] text-zinc-500 mb-6 uppercase flex items-center justify-center">
            <RobotVisual />
            ExamSaarthi
          </h2>
          <h1 className="text-4xl md:text-7xl font-light tracking-tight mb-6 text-zinc-100 drop-shadow-sm">
            Intelligent.<br className="hidden md:block" /> Accessible.<br className="hidden md:block" /> Independent.
          </h1>
          <p className="text-base md:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed" aria-live="polite">
            A voice-driven examination companion built for accessibility and focus.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col md:flex-row gap-6 w-full max-w-2xl justify-center"
        >
          <button
            ref={primaryButtonRef}
            onClick={() => {
              speak("Welcome to ExamSaarthi. Let's get started.");
              router.push('/onboarding/mode');
            }}
            className="group relative inline-flex items-center justify-center rounded-full text-base font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 overflow-hidden bg-white text-black h-14 px-10 hover:bg-zinc-200 active:scale-[0.98] shadow-sm"
            aria-label="Get Started with ExamSaarthi"
          >
            Get Started
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 -mr-1 transition-transform group-hover:translate-x-1"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
