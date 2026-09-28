'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useAccessibility } from '@/lib/accessibility/AccessibilityProvider';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { VoiceCore } from '@/components/voice/VoiceCore';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { fetchDashboardStats, type DashboardStats } from './actions';
import { usePreferredMode } from '@/lib/hooks/usePreferredMode';
import { say } from '@/lib/voice/say';

function DashboardContent() {
  const { t, tParams } = useI18n();
  const { announce } = useAccessibility();
  const { speak, isContinuous, startContinuousListening, transcript } = useVoice();
  const { useVoiceAction } = useGlobalVoice();
    const searchParams = useSearchParams();
  const redirected = searchParams.get('redirected');
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasSpokenRef = useRef(false);
  const currentHour = new Date().getHours();
  const timeOfDay: 'morning' | 'afternoon' | 'evening' = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';
  const [userName, setUserName] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const { mode: interactionMode, isLoaded: preferenceLoaded } = usePreferredMode();
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
        const { data } = await supabase
          .from('profiles')
          .select('full_name, learning_profile_consent')
          .eq('id', user.id)
          .single();
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
        setStatsError(true);
      }
    };
    const fetchInsight = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('learning_profile_consent')
          .eq('id', user.id)
          .single();

        if (!profile?.learning_profile_consent) return;


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

  const retryStats = () => {
    setStatsError(false);
    void fetchDashboardStats()
      .then((data) => setStats(data))
      .catch(() => setStatsError(true));
  };

  useEffect(() => {
    if (!preferenceLoaded || hasSpokenRef.current || userName === null) return;
    hasSpokenRef.current = true;
    headingRef.current?.focus();
    
    const announceMsg = redirected ? t('already_signed_in') + ' ' + t('dashboard') + ' loaded.' : t('dashboard') + ' loaded.';
    const greeting = userName
      ? `${tParams(timeOfDay === 'morning' ? 'good_morning' : timeOfDay === 'afternoon' ? 'good_afternoon' : 'good_evening', { name: userName.split(' ')[0] })}`
      : tParams(timeOfDay === 'morning' ? 'good_morning' : timeOfDay === 'afternoon' ? 'good_afternoon' : 'good_evening', { name: '' }).replace(' ,', '.');
    say(`${announceMsg} ${greeting}`, interactionMode, speak, announce);

    if (interactionMode === 'voice-first' && !isContinuous) {
      startContinuousListening();
    }
  }, [announce, t, speak, isContinuous, startContinuousListening, redirected, userName, interactionMode, preferenceLoaded]);

  useVoiceAction((action) => {
    if (action === 'HELP') {
      speak(t('dashboard_announce'));
      return true;
    }

    if (action === 'READ_PROGRESS') {
      if (!stats) {
        speak(t('loading'));
        return true;
      }

      const focusText = stats.focusSubject && stats.focusPercentage !== null
        ? tParams('focus_progress', { subject: stats.focusSubject, percentage: stats.focusPercentage })
        : '';
      speak(
        tParams('progress_summary', {
          sessions: stats.totalExams + stats.totalPractice,
          percentage: stats.avgPercentage,
          focus: focusText,
        })
      );
      return true;
    }

    return false;
  });


  return (
    <div className="relative flex flex-col min-h-0 w-full max-w-7xl mx-auto pt-32 pb-24 px-6 md:px-12 bg-black text-white">
      <h1 tabIndex={-1} ref={headingRef} className="sr-only">{t('command_center')}</h1>
      
      {/* Editorial Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-32"
      >
        <h2 className="text-[clamp(3rem,6vw,7rem)] leading-[0.9] font-light tracking-tighter mb-4 text-zinc-100">
          {userName
            ? tParams(timeOfDay === 'morning' ? 'good_morning' : timeOfDay === 'afternoon' ? 'good_afternoon' : 'good_evening', { name: userName.split(' ')[0] })
            : tParams(timeOfDay === 'morning' ? 'good_morning' : timeOfDay === 'afternoon' ? 'good_afternoon' : 'good_evening', { name: '' }).replace(/,\s*\./, '.')
          }
        </h2>
        <p className="text-2xl md:text-4xl font-light text-zinc-400">{t('continue_your_preparation')}</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
        
        {/* Dominant Visual Element - Current Preparation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:col-span-8 flex flex-col space-y-12"
        >

          {statsError ? (
            <div className="rounded-2xl border border-amber-900/60 bg-amber-950/20 p-8" role="alert">
              <h3 className="text-2xl font-light">{t('page_error_title')}</h3>
              <p className="mt-3 text-base text-zinc-400">{t('dashboard_error_desc')}</p>
              <button type="button" onClick={retryStats} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-white px-6 text-sm font-semibold text-black focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]">
                {t('retry')}
              </button>
            </div>
          ) : !stats ? (
            <div className="space-y-5 border-t border-zinc-900 pt-12" aria-busy="true">
              <div role="status" className="sr-only">{t('loading')}</div>
              <div className="h-5 w-32 animate-pulse rounded bg-zinc-800" />
              <div className="h-24 max-w-xl animate-pulse rounded bg-zinc-900" />
              <div className="h-5 w-48 animate-pulse rounded bg-zinc-900" />
            </div>
          ) : (
            <Link
              href={stats.focusSubject ? `/practice?subject=${encodeURIComponent(stats.focusSubject)}` : '/practice'}
              className="group block border-t border-zinc-900 pt-12 pb-12 transition-colors hover:border-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-black"
              aria-label={stats.focusSubject ? `${t('continue_preparation_arrow')} ${stats.focusSubject}` : t('choose_subject')}
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                <div>
                  <p className="text-zinc-400 tracking-[0.2em] text-sm uppercase mb-4">{t('current_focus')}</p>
                  <h3 className="text-5xl md:text-8xl font-light tracking-tighter">{stats.focusSubject || t('choose_subject')}</h3>
                </div>
                <div className="text-right">
                  {stats.focusPercentage !== null && stats.focusPercentage !== undefined ? (
                    <>
                      <span className="text-5xl md:text-7xl font-light">{stats.focusPercentage}%</span>
                      <p className="text-zinc-400 tracking-[0.2em] text-sm uppercase mt-2">{t('current_accuracy')}</p>
                    </>
                  ) : (
                    <p className="text-zinc-400 tracking-[0.2em] text-sm uppercase mt-2">{t('no_data_yet')}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center text-sm tracking-wide font-medium text-[var(--brand-accent)] transition-transform group-hover:translate-x-2">
                {t('continue_preparation_arrow')}
              </div>
            </Link>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-zinc-900 pt-12">
            {stats && stats.recentSessions.length > 1 && (
              <div className="border-t border-zinc-900 pt-12">
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-zinc-400 tracking-[0.2em] text-sm uppercase mb-2">{t('recent_performance').toUpperCase()}</p>
                    <p className="text-xl font-light text-zinc-200">{t('live_session_trend')}</p>
                  </div>
                  <Link href="/analysis" className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] rounded-sm">
                    {t('view_analysis_arrow')}
                  </Link>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-6">
                  <div className="flex h-36 items-end gap-3 md:h-44">
                    {stats.recentSessions.slice().reverse().map(session => (
                      <div key={session.id} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                        <span className="text-xs font-bold text-zinc-300">{session.percentage}%</span>
                        <div
                          className="w-full max-w-14 rounded-t-lg bg-[var(--brand-accent)] transition-all"
                          style={{ height: `${Math.max(12, session.percentage)}%` }}
                          role="img"
                          aria-label={`${session.title ?? t('session')}: ${session.percentage} percent`}
                        />
                        <span className="w-full truncate text-center text-xs text-zinc-400">{session.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div>
              <p className="text-zinc-400 tracking-[0.2em] text-sm uppercase mb-4">{t('aggregate_progress')}</p>
              <div className="flex items-baseline gap-4 mb-2">
                <span className="text-4xl font-light">{stats ? stats.totalExams + stats.totalPractice : 0}</span>
                <span className="text-zinc-400">{t('sessions')}</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-light">{stats ? stats.avgPercentage : 0}%</span>
                <span className="text-zinc-400">{t('avg_score')}</span>
              </div>
            </div>
            {insight && (
              <div>
                <p className="text-zinc-400 tracking-[0.2em] text-sm uppercase mb-4">{t('ai_insight')}</p>
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
            <p className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-6 relative z-10">{t('voice_assistant')}</p>
            <VoiceCore size="sm" />
            {transcript.length > 0 && interactionMode === 'voice-first' && (
              <div className="mt-8 text-center text-sm font-light text-zinc-400 relative z-10">
                &quot;{transcript[transcript.length - 1].text}&quot;
              </div>
            )}
          </div>

          <div>
            <p className="text-zinc-400 tracking-[0.2em] text-sm uppercase mb-8">{t('recent_activity').toUpperCase()}</p>
            
            <div className="flex flex-col">
              {stats?.recentSessions && stats.recentSessions.length > 0 ? (
                stats.recentSessions.slice(0, 4).map((session, i) => (
                  <div key={session.id} className={`flex justify-between items-center py-6 ${i !== 0 ? 'border-t border-zinc-900' : ''}`}>
                    <div>
                      <div className="text-xs text-zinc-400 mb-1">{session.date}</div>
                      <div className="text-xl font-light">{session.title}</div>
                    </div>
                    <div className="text-2xl font-light">{session.percentage}%</div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-zinc-400 font-light">{t('no_activity_yet')}</div>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-12">
            <p className="text-zinc-400 tracking-[0.2em] text-sm uppercase mb-8">{t('dashboard')}</p>
            <div className="flex flex-col space-y-4">
              <Link href="/practice" className="inline-flex min-h-11 items-center text-xl font-light hover:text-zinc-400 transition-colors">{t('practice')} ↗</Link>
              <Link href="/exam" className="inline-flex min-h-11 items-center text-xl font-light hover:text-zinc-400 transition-colors">{t('exam')} ↗</Link>
              <Link href="/history" className="inline-flex min-h-11 items-center text-xl font-light hover:text-zinc-400 transition-colors">{t('history')} &amp; {t('results')} ↗</Link>
              <Link href="/analysis" className="inline-flex min-h-11 items-center text-xl font-light hover:text-zinc-400 transition-colors">{t('analysis_page').replace('.', '')} ↗</Link>
              <Link href="/settings" className="inline-flex min-h-11 items-center text-xl font-light hover:text-zinc-400 transition-colors">{t('settings')} ↗</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t, tParams } = useI18n();
  return (
    <main id="main-content" className="flex min-h-dvh w-full flex-1 bg-black">
      <Suspense fallback={<div className="p-12 text-center text-white/50">{t('loading')}</div>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
