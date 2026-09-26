'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useAccessibility } from '@/lib/accessibility/AccessibilityProvider';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { VoiceCore } from '@/components/voice/VoiceCore';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { BrainCircuit, GraduationCap, History } from 'lucide-react';

function DashboardContent() {
  const { t } = useI18n();
  const { announce } = useAccessibility();
  const { speak, isContinuous, startContinuousListening, transcript } = useVoice();
  const { useVoiceAction } = useGlobalVoice();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirected = searchParams.get('redirected');
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasSpokenRef = useRef(false);
  const [userName, setUserName] = useState<string | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserName('');
        return;
      }
      
      let name = user.user_metadata?.full_name || user.user_metadata?.name;
      if (!name) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (data?.full_name) {
          name = data.full_name;
        }
      }

      // If the name is just the email or the local part of the email, reject it
      if (name && user.email) {
        const emailLocalPart = user.email.split('@')[0];
        if (name.toLowerCase() === user.email.toLowerCase() || name.toLowerCase() === emailLocalPart.toLowerCase()) {
          name = null;
        }
      }
      
      setUserName(name || '');
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (hasSpokenRef.current || userName === null) return;
    hasSpokenRef.current = true;
    headingRef.current?.focus();
    
    const announceMsg = redirected ? t('already_signed_in') + ' Dashboard loaded.' : 'Dashboard loaded.';
    announce(announceMsg);
    
    // Auto-start continuous listening on dashboard if not already listening
    if (!isContinuous) {
      startContinuousListening();
    }
    
    if (userName) {
      speak(`Hey ${userName}, how can I help you today?`);
    } else {
      speak("Hey, welcome back. How can I help you today?");
    }
  }, [announce, t, speak, isContinuous, startContinuousListening, redirected, userName]);

  useVoiceAction((action) => {
    if (action === 'OPEN_EXAM' || action === 'START_EXAM') {
      speak("Starting exam setup.");
      router.push('/exam');
    } else if (action === 'OPEN_PRACTICE' || action === 'START_PRACTICE') {
      speak("Starting practice setup.");
      router.push('/practice');
    } else if (action === 'OPEN_HISTORY' || action === 'READ_HISTORY') {
      speak("Opening your history.");
      router.push('/history');
    } else if (action === 'LOGOUT') {
      speak("Logging out.");
      router.push('/auth/login');
    } else if (action === 'HELP') {
      speak("You are on the dashboard. You can ask me to start an exam, prepare a practice session, or check your history.");
    }
  });

  const cards = [
    {
      title: 'Practice Mode',
      desc: 'Hone your skills in a relaxed, untimed environment with immediate feedback.',
      icon: BrainCircuit,
      href: '/practice',
      color: 'from-blue-500/20 to-cyan-500/5',
      borderColor: 'group-hover:border-blue-500/50',
      iconColor: 'text-blue-400'
    },
    {
      title: 'Real Exam',
      desc: 'Take a secure, timed assessment simulating real examination conditions.',
      icon: GraduationCap,
      href: '/exam',
      color: 'from-purple-500/20 to-pink-500/5',
      borderColor: 'group-hover:border-purple-500/50',
      iconColor: 'text-purple-400'
    },
    {
      title: 'History & Results',
      desc: 'Review your past performance, analyze weaknesses, and track your progress.',
      icon: History,
      href: '/history',
      color: 'from-emerald-500/20 to-teal-500/5',
      borderColor: 'group-hover:border-emerald-500/50',
      iconColor: 'text-emerald-400'
    }
  ];

  return (
    <div className="relative flex flex-col items-center min-h-[calc(100vh-4rem)] w-full max-w-6xl mx-auto pt-12 pb-24 px-6">
      <div className="flex flex-col items-center mb-16">
        <h1 tabIndex={-1} ref={headingRef} className="sr-only">
          Dashboard Command Center
        </h1>
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-2">
            {userName ? `Hey ${userName}.` : 'Welcome back.'}
          </h2>
          <p className="text-xl text-white/60">How can I help you today?</p>
        </motion.div>

        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="mt-12"
        >
          <VoiceCore size="lg" />
        </motion.div>
      </div>

      <div className="w-full max-w-4xl mx-auto mb-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0" />
          
          <div className="flex flex-col space-y-4 max-h-48 overflow-y-auto no-scrollbar scroll-smooth p-2">
            {transcript.length === 0 ? (
              <div className="text-center text-white/40 italic py-8">
                Say &quot;Start Practice&quot; or &quot;Start Exam&quot; to begin...
              </div>
            ) : (
              transcript.slice(-6).map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      msg.sender === 'user' 
                        ? 'bg-blue-500/20 text-white border border-blue-500/30 rounded-br-sm' 
                        : 'bg-white/10 text-white/90 border border-white/10 rounded-bl-sm'
                    }`}
                  >
                    <div className="text-xs text-white/40 mb-1 font-medium tracking-wide">
                      {msg.sender === 'user' ? 'YOU' : 'EXAMSAARTHI'}
                    </div>
                    <div className="text-sm md:text-base leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </motion.div>
      </div>

      {/* Visual Learning Journey */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="w-full max-w-4xl mx-auto mb-12 hidden items-center justify-between text-white/40 text-sm font-semibold tracking-widest uppercase md:flex px-12"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
          <span>Practice</span>
        </div>
        <div className="flex-1 h-px bg-linear-to-r from-blue-500/50 via-white/10 to-purple-500/50 mx-4" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
          <span>Exam</span>
        </div>
        <div className="flex-1 h-px bg-linear-to-r from-purple-500/50 via-white/10 to-amber-500/50 mx-4" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
          <span>Review</span>
        </div>
        <div className="flex-1 h-px bg-linear-to-r from-amber-500/50 via-white/10 to-emerald-500/50 mx-4" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
          <span>Results</span>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto"
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link 
              key={card.title} 
              href={card.href}
              className={`group relative flex flex-col p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 ${card.borderColor} outline-none focus-visible:ring-4 focus-visible:ring-white/30`}
              aria-label={`Start ${card.title}`}
            >
              <div className={`absolute inset-0 bg-linear-to-br ${card.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="p-4 bg-black/40 rounded-2xl w-fit mb-6 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                  <Icon className={`w-8 h-8 ${card.iconColor}`} />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3 tracking-wide">{card.title}</h3>
                <p className="text-white/60 leading-relaxed flex-1">
                  {card.desc}
                </p>
                
                <div className="mt-8 flex items-center text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
                  Select Module
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  return (
    <main id="main-content" className="flex-1 w-full bg-black min-h-screen">
      <Suspense fallback={<div className="p-12 text-center text-white/50">{t('loading')}</div>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
