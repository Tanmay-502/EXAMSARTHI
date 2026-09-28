'use client'

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { motion, useScroll, useTransform } from 'framer-motion';
import dynamic from 'next/dynamic';

const HeroScene = dynamic(() => import('@/components/experience/HeroScene').then(mod => mod.HeroScene), { ssr: false });

export default function Home() {
  const router = useRouter();
  const { speak, startContinuousListening } = useVoice();
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const activationPromptRef = useRef<HTMLButtonElement>(null);
  const hasSpokenRef = useRef(false);
  const demoGuideTimerRef = useRef<number | null>(null);
  const [showVoicePrompt, setShowVoicePrompt] = useState(true);
  const { scrollYProgress } = useScroll({ target: containerRef });

  const activateVoice = useCallback(() => {
    if (hasSpokenRef.current) return;

    hasSpokenRef.current = true;
    setShowVoicePrompt(false);
    speak(t('gateway_welcome'));
    startContinuousListening();

    demoGuideTimerRef.current = window.setTimeout(() => {
      window.dispatchEvent(new Event('examsaarthi:voice-activated'));
    }, 1200);
  }, [speak, startContinuousListening, t]);

  useEffect(() => {
    if (hasSpokenRef.current) return;

    const hasUserActivation = typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive === true;
    if (hasUserActivation) {
      activateVoice();
      return;
    }

    activationPromptRef.current?.focus();
  }, [activateVoice]);

  useEffect(() => {
    return () => {
      if (demoGuideTimerRef.current) {
        window.clearTimeout(demoGuideTimerRef.current);
      }
    };
  }, []);

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const navigateFromHero = () => {
    activateVoice();
    router.push('/onboarding/mode');
  };

  return (
    <main id="main-content" className="min-h-[300vh] bg-black text-zinc-100" ref={containerRef}>
      <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-6 py-5 md:px-12 md:py-6 mix-blend-difference">
        <div className="text-sm font-bold uppercase tracking-widest">EXAMSAARTHI</div>
        <button
          onClick={navigateFromHero}
          className="rounded-full px-2 py-2 text-sm font-medium tracking-wide transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black"
        >
          Get Started ↗
        </button>
      </nav>

      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="sticky top-0 flex min-h-[calc(100svh-var(--voice-dock-h))] w-full items-center overflow-hidden px-6 pb-8 pt-20 md:px-12 md:pb-8 md:pt-20"
      >
        <div className="absolute bottom-0 right-0 top-0 w-full md:w-1/2">
          <HeroScene />
        </div>

        <div className="relative z-10 flex w-full flex-col justify-center md:w-1/2">
          <p className="mb-6 text-xs uppercase tracking-[0.2em] text-zinc-400 md:mb-8 md:text-sm">
            Accessible Intelligence for every exam
          </p>

          <h1 className="mb-7 text-[clamp(3rem,min(8vw,10svh),10rem)] font-light leading-[0.9] tracking-tighter text-white md:mb-8">
            Exams,<br />without<br />barriers.
          </h1>

          <p className="mb-8 max-w-md text-lg font-light leading-relaxed text-zinc-400 md:mb-10 md:text-2xl">
            An intelligent examination platform designed around accessibility, voice interaction and independent learning.
          </p>

          {showVoicePrompt && (
            <button
              ref={activationPromptRef}
              type="button"
              onClick={activateVoice}
              className="mb-5 inline-flex min-h-12 w-fit max-w-full items-center rounded-full border border-zinc-600 bg-zinc-950 px-5 py-3 text-left text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-400 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black md:text-base"
            >
              Press Space, Enter or click to start voice guidance
            </button>
          )}

          <div className="flex items-center gap-8">
            <button
              onClick={navigateFromHero}
              className="group relative inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-base font-medium text-black transition-all hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black active:scale-[0.98]"
            >
              Start your journey ↗
            </button>
            <span className="hidden text-sm tracking-wide text-zinc-400 md:block">
              How it works ↓
            </span>
          </div>
        </div>
      </motion.section>

      <section className="relative z-20 min-h-screen border-t border-zinc-900 bg-black px-6 py-32 md:px-12">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-32 text-[clamp(3rem,6vw,7rem)] font-light leading-[0.9] tracking-tighter">
            Your goal.<br />
            Our guidance.<br />
            Your exam.
          </h2>

          <div className="grid grid-cols-1 gap-24 md:grid-cols-2">
            <div className="sticky top-32 h-fit">
              <h3 className="mb-4 text-sm uppercase tracking-[0.2em] text-zinc-400">Process</h3>
              <p className="text-2xl font-light text-zinc-300">Tell ExamSaarthi what you&apos;re preparing for and let voice guide you.</p>
            </div>

            <div className="space-y-48 pb-32">
              <div className="space-y-8">
                <div className="text-8xl font-light text-zinc-400">01</div>
                <h4 className="text-4xl font-medium tracking-tight">CHOOSE</h4>
                <p className="text-xl font-light leading-relaxed text-zinc-400">Select your exam, subject or preparation mode with simple voice commands or keyboard navigation.</p>
              </div>
              <div className="space-y-8">
                <div className="text-8xl font-light text-zinc-400">02</div>
                <h4 className="text-4xl font-medium tracking-tight">PREPARE</h4>
                <p className="text-xl font-light leading-relaxed text-zinc-400">Practice using adaptive questions and voice interaction that listens to your needs.</p>
              </div>
              <div className="space-y-8">
                <div className="text-8xl font-light text-zinc-400">03</div>
                <h4 className="text-4xl font-medium tracking-tight">ATTEMPT</h4>
                <p className="text-xl font-light leading-relaxed text-zinc-400">Take an accessible examination with real-time assistance and zero visual distractions.</p>
              </div>
              <div className="space-y-8">
                <div className="text-8xl font-light text-zinc-400">04</div>
                <h4 className="text-4xl font-medium tracking-tight">UNDERSTAND</h4>
                <p className="text-xl font-light leading-relaxed text-zinc-400">Review your performance and learning insights through editorial, easy-to-read feedback.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 flex min-h-screen flex-col items-center justify-center border-t border-zinc-900 bg-black px-6 py-32">
        <h2 className="mb-4 text-center text-[clamp(4rem,9vw,10rem)] font-light leading-[0.9] tracking-tighter">Just speak.</h2>
        <p className="mb-24 text-2xl font-light text-zinc-400 md:text-3xl">Your voice is enough.</p>

        <div className="relative flex h-64 w-64 items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full border border-zinc-800"
            animate={{ scale: [1, 1.5], opacity: [1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-4 rounded-full border border-zinc-700"
            animate={{ scale: [1, 1.3], opacity: [1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
          />
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white">
            <div className="h-4 w-4 rounded-full bg-black" />
          </div>
        </div>

        <div className="mt-24 text-center">
          <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">LISTENING</div>
          <div className="text-2xl font-light text-white">&quot;Say: Start a practice session.&quot;</div>
        </div>
      </section>
    </main>
  );
}
