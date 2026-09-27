'use client'

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { motion, useScroll, useTransform } from 'framer-motion';
import dynamic from 'next/dynamic';

const HeroScene = dynamic(() => import('@/components/experience/HeroScene').then(mod => mod.HeroScene), { ssr: false });

export default function Home() {
  const router = useRouter();
  const { speak } = useVoice();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  return (
    <main id="main-content" className="bg-black text-zinc-100 min-h-[300vh]" ref={containerRef}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 mix-blend-difference">
        <div className="font-bold tracking-widest text-sm uppercase">EXAMSAARTHI</div>
        <button 
          onClick={() => { speak("Welcome to ExamSaarthi."); router.push('/onboarding/mode'); }}
          className="text-sm tracking-wide font-medium hover:opacity-70 transition-opacity"
        >
          Get Started ↗
        </button>
      </nav>

      {/* Hero Section */}
      <motion.section 
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="sticky top-0 h-screen w-full flex items-center px-6 md:px-12 overflow-hidden"
      >
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/2">
          <HeroScene />
        </div>
        
        <div className="relative z-10 w-full md:w-1/2 flex flex-col justify-center">
          <p className="text-zinc-400 tracking-[0.2em] text-xs md:text-sm uppercase mb-8">
            Accessible Intelligence for every exam
          </p>
          <h1 className="text-[clamp(4rem,9vw,10rem)] leading-[0.9] font-light tracking-tighter mb-8 text-white">
            Exams,<br />without<br />barriers.
          </h1>
          <p className="text-lg md:text-2xl font-light text-zinc-400 max-w-md mb-12 leading-relaxed">
            An intelligent examination platform designed around accessibility, voice interaction and independent learning.
          </p>
          <div className="flex items-center gap-8">
            <button
              onClick={() => { speak("Welcome. Let's get started."); router.push('/onboarding/mode'); }}
              className="group relative inline-flex items-center justify-center rounded-full text-base font-medium transition-all bg-white text-black h-14 px-8 hover:bg-zinc-200 active:scale-[0.98]"
            >
              Start your journey ↗
            </button>
            <span className="text-sm tracking-wide text-zinc-400 hidden md:block">
              How it works ↓
            </span>
          </div>
        </div>
      </motion.section>

      {/* How it works Section */}
      <section className="relative z-20 bg-black min-h-screen py-32 px-6 md:px-12 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-[clamp(3rem,6vw,7rem)] leading-[0.9] font-light tracking-tighter mb-32">
            Your goal.<br />
            Our guidance.<br />
            Your exam.
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
            <div className="sticky top-32 h-fit">
               <h3 className="text-zinc-400 tracking-[0.2em] text-sm uppercase mb-4">Process</h3>
               <p className="text-2xl font-light text-zinc-300">Tell ExamSaarthi what you&apos;re preparing for and let voice guide you.</p>
            </div>
            
            <div className="space-y-48 pb-32">
              <div className="space-y-8">
                <div className="text-8xl font-light text-zinc-500">01</div>
                <h4 className="text-4xl font-medium tracking-tight">CHOOSE</h4>
                <p className="text-xl text-zinc-400 font-light leading-relaxed">Select your exam, subject or preparation mode with simple voice commands or keyboard navigation.</p>
              </div>
              <div className="space-y-8">
                <div className="text-8xl font-light text-zinc-500">02</div>
                <h4 className="text-4xl font-medium tracking-tight">PREPARE</h4>
                <p className="text-xl text-zinc-400 font-light leading-relaxed">Practice using adaptive questions and voice interaction that listens to your needs.</p>
              </div>
              <div className="space-y-8">
                <div className="text-8xl font-light text-zinc-500">03</div>
                <h4 className="text-4xl font-medium tracking-tight">ATTEMPT</h4>
                <p className="text-xl text-zinc-400 font-light leading-relaxed">Take an accessible examination with real-time assistance and zero visual distractions.</p>
              </div>
              <div className="space-y-8">
                <div className="text-8xl font-light text-zinc-500">04</div>
                <h4 className="text-4xl font-medium tracking-tight">UNDERSTAND</h4>
                <p className="text-xl text-zinc-400 font-light leading-relaxed">Review your performance and learning insights through editorial, easy-to-read feedback.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Voice Experience Section */}
      <section className="relative z-20 min-h-screen py-32 flex flex-col items-center justify-center border-t border-zinc-900 bg-black">
        <h2 className="text-[clamp(4rem,9vw,10rem)] leading-[0.9] font-light tracking-tighter mb-4 text-center">Just speak.</h2>
        <p className="text-2xl md:text-3xl font-light text-zinc-400 mb-24">Your voice is enough.</p>
        
        <div className="relative w-64 h-64 flex items-center justify-center">
          <motion.div 
            className="absolute inset-0 border border-zinc-800 rounded-full"
            animate={{ scale: [1, 1.5], opacity: [1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div 
            className="absolute inset-4 border border-zinc-700 rounded-full"
            animate={{ scale: [1, 1.3], opacity: [1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
          />
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-black" />
          </div>
        </div>
        
        <div className="mt-24 text-center">
           <div className="text-xs font-bold tracking-[0.2em] text-zinc-400 uppercase mb-4">LISTENING</div>
           <div className="text-2xl font-light text-white">&quot;Say: Start a practice session.&quot;</div>
        </div>
      </section>
    </main>
  );
}
