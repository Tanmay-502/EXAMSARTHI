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
import { BrainCircuit, GraduationCap, History, BarChart2, Settings } from 'lucide-react';
import { fetchDashboardStats, type DashboardStats } from './actions';
import { usePreferredMode } from '@/lib/hooks/usePreferredMode';

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const { mode: interactionMode } = usePreferredMode();
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
    const fetchStats = async () => {
      try {
        const data = await fetchDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      }
    };
    const fetchInsight = async () => {
      try {
        const res = await fetch('/api/insights', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.insight) setInsight(data.insight);
        }
      } catch(e) {
        console.error('Failed to fetch insights', e);
      }
    };
    fetchUser();
    fetchStats();
    fetchInsight();
  }, []);

  useEffect(() => {
    if (hasSpokenRef.current || userName === null) return;
    hasSpokenRef.current = true;
    headingRef.current?.focus();
    
    const announceMsg = redirected ? t('already_signed_in') + ' Dashboard loaded.' : 'Dashboard loaded.';
    announce(announceMsg);
    
    if (interactionMode === 'voice-first') {
      if (!isContinuous) {
        startContinuousListening();
      }
      if (userName) {
        speak(`Hey ${userName}, how can I help you today?`);
      } else {
        speak("Hey, welcome back. How can I help you today?");
      }
    }
  }, [announce, t, speak, isContinuous, startContinuousListening, redirected, userName, interactionMode]);

  useVoiceAction((action) => {
    if (action === 'HELP') {
      speak("You are on the dashboard. You can ask me to start an exam, prepare a practice session, or check your history.");
      return true;
    }
    return false;
  });


  return (
    <div className="relative flex flex-col min-h-screen w-full max-w-7xl mx-auto pt-32 pb-24 px-6 md:px-12 bg-black text-white">
      <h1 tabIndex={-1} ref={headingRef} className="sr-only">Dashboard Command Center</h1>
      
      {/* Editorial Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-32"
      >
        <h2 className="text-[clamp(3rem,6vw,7rem)] leading-[0.9] font-light tracking-tighter mb-4 text-zinc-100">
          {userName ? `Good evening, ${userName.split(' ')[0]}.` : 'Good evening.'}
        </h2>
        <p className="text-2xl md:text-4xl font-light text-zinc-500">Continue your preparation.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
        
        {/* Dominant Visual Element - Current Preparation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:col-span-8 flex flex-col space-y-12"
        >
          <div className="group border-t border-zinc-900 pt-12 pb-12 cursor-pointer transition-colors hover:border-zinc-700" onClick={() => router.push('/practice')}>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div>
                <p className="text-zinc-500 tracking-[0.2em] text-sm uppercase mb-4">CURRENT FOCUS</p>
                <h3 className="text-6xl md:text-8xl font-light tracking-tighter">DBMS</h3>
              </div>
              <div className="text-right">
                <span className="text-5xl md:text-7xl font-light">72%</span>
                <p className="text-zinc-500 tracking-[0.2em] text-sm uppercase mt-2">PREPARED</p>
              </div>
            </div>
            
            <div className="flex items-center text-sm tracking-wide font-medium text-white transition-transform group-hover:translate-x-2">
              Continue preparation ↗
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-zinc-900 pt-12">
            <div>
              <p className="text-zinc-500 tracking-[0.2em] text-sm uppercase mb-4">Aggregate Progress</p>
              <div className="flex items-baseline gap-4 mb-2">
                <span className="text-4xl font-light">{stats ? stats.totalExams + stats.totalPractice : 0}</span>
                <span className="text-zinc-500">Sessions</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-light">{stats ? stats.avgPercentage : 0}%</span>
                <span className="text-zinc-500">Avg Score</span>
              </div>
            </div>
            {insight && (
              <div>
                <p className="text-zinc-500 tracking-[0.2em] text-sm uppercase mb-4">AI Insight</p>
                <p className="text-lg font-light text-zinc-300 leading-relaxed">{insight}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Minimal Activity Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="lg:col-span-4 flex flex-col space-y-12"
        >
          <div className="flex flex-col items-center justify-center p-8 border border-zinc-900 rounded-3xl mb-8 relative overflow-hidden">
            <p className="text-zinc-500 tracking-[0.2em] text-xs uppercase mb-6 relative z-10">Voice Assistant</p>
            <VoiceCore size="sm" />
            {transcript.length > 0 && interactionMode === 'voice-first' && (
              <div className="mt-8 text-center text-sm font-light text-zinc-400 relative z-10">
                &quot;{transcript[transcript.length - 1].text}&quot;
              </div>
            )}
          </div>

          <div>
            <p className="text-zinc-500 tracking-[0.2em] text-sm uppercase mb-8">RECENT ACTIVITY</p>
            
            <div className="flex flex-col">
              {stats?.recentSessions && stats.recentSessions.length > 0 ? (
                stats.recentSessions.slice(0, 4).map((session, i) => (
                  <div key={session.id} className={`flex justify-between items-center py-6 ${i !== 0 ? 'border-t border-zinc-900' : ''}`}>
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">{session.date}</div>
                      <div className="text-xl font-light">{session.title}</div>
                    </div>
                    <div className="text-2xl font-light">{session.percentage}%</div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-zinc-500 font-light">No recent activity found.</div>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-12">
            <p className="text-zinc-500 tracking-[0.2em] text-sm uppercase mb-8">NAVIGATION</p>
            <div className="flex flex-col space-y-4">
              <Link href="/practice" className="text-xl font-light hover:text-zinc-400 transition-colors">Practice ↗</Link>
              <Link href="/exam" className="text-xl font-light hover:text-zinc-400 transition-colors">Real Exam ↗</Link>
              <Link href="/history" className="text-xl font-light hover:text-zinc-400 transition-colors">History & Results ↗</Link>
              <Link href="/analysis" className="text-xl font-light hover:text-zinc-400 transition-colors">Analysis ↗</Link>
              <Link href="/settings" className="text-xl font-light hover:text-zinc-400 transition-colors">Settings ↗</Link>
            </div>
          </div>
        </motion.div>
      </div>
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
