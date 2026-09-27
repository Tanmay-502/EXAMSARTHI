'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useAccessibility } from '@/lib/accessibility/AccessibilityProvider';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Lang } from '@/lib/i18n/dictionaries';
import { createClient } from '@/lib/supabase/client';
import { updateLearningProfileConsent } from '@/app/exam/actions';
import { VoiceCore } from '@/components/voice/VoiceCore';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const { lang, setLang, t } = useI18n();
  const { announce } = useAccessibility();
  const { speak } = useVoice();
  const router = useRouter();
  
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [consent, setConsent] = useState<boolean>(false);
  const [loadingConsent, setLoadingConsent] = useState<boolean>(true);

  useEffect(() => {
    headingRef.current?.focus();
    announce('Settings page. Please choose your language.');
    
    // Fetch initial consent
    const fetchConsent = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('profiles').select('learning_profile_consent').eq('id', user.id).single();
          if (data) {
            setConsent(data.learning_profile_consent || false);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingConsent(false);
      }
    };
    fetchConsent();
  }, [announce, speak]);

  const handleLanguageChange = (newLang: Lang) => {
    setLang(newLang);
    let langName = 'English';
    if (newLang === 'hi-IN') langName = 'हिंदी';
    if (newLang === 'te-IN') langName = 'తెలుగు';
    
    announce(`Language changed to ${langName}`);
    
    // For TTS
    if (newLang === 'en-IN') speak('Language changed to English');
    else if (newLang === 'hi-IN') speak('भाषा हिंदी में बदल दी गई है');
    else if (newLang === 'te-IN') speak('భాష తెలుగుకు మార్చబడింది');
  };

  const handleContinue = () => {
    router.push('/dashboard');
  };

  const handleConsentToggle = async (newConsent: boolean) => {
    setConsent(newConsent);
    announce(newConsent ? 'Learning Profile enabled' : 'Learning Profile disabled');
    try {
      await updateLearningProfileConsent(newConsent);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main id="main-content" className="flex flex-col min-h-screen w-full bg-black text-white px-6 py-12 md:px-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-5xl mx-auto"
      >
        <div className="mb-20 flex items-center justify-between border-b border-zinc-900 pb-8">
          <div className="flex flex-col">
            <span className="text-zinc-500 tracking-[0.2em] text-xs uppercase mb-2">PREFERENCES</span>
            <span className="text-xl font-light tracking-wide">SETTINGS</span>
          </div>
          <VoiceCore size="sm" />
        </div>

        <div className="max-w-3xl space-y-16">
          <h1 tabIndex={-1} ref={headingRef} className="text-[clamp(3rem,6vw,7rem)] leading-[0.9] font-light tracking-tighter text-zinc-100 focus:outline-none">
            {t('a11y_settings')}
          </h1>

          <div className="space-y-8 border-t border-zinc-900 pt-10">
            <h2 className="text-2xl md:text-3xl font-light tracking-tight">{t('select_language')}</h2>
            <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => handleLanguageChange('en-IN')}
              aria-pressed={lang === 'en-IN'}
              className={`flex-1 h-14 rounded-full border text-xs uppercase tracking-widest font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${lang === 'en-IN' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-400 hover:text-white hover:border-zinc-500 border-zinc-800'}`}
            >
              English
            </button>
            <button
              onClick={() => handleLanguageChange('hi-IN')}
              aria-pressed={lang === 'hi-IN'}
              className={`flex-1 h-14 rounded-full border text-xs uppercase tracking-widest font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${lang === 'hi-IN' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-400 hover:text-white hover:border-zinc-500 border-zinc-800'}`}
            >
              हिंदी
            </button>
            <button
              onClick={() => handleLanguageChange('te-IN')}
              aria-pressed={lang === 'te-IN'}
              className={`flex-1 h-14 rounded-full border text-xs uppercase tracking-widest font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${lang === 'te-IN' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-400 hover:text-white hover:border-zinc-500 border-zinc-800'}`}
            >
              తెలుగు
            </button>
          </div>
          </div>

          <div className="space-y-8 border-t border-zinc-900 pt-10">
          <h2 className="text-2xl md:text-3xl font-light tracking-tight">Personal Learning Profile</h2>
          <p className="text-zinc-500 text-lg font-light leading-relaxed max-w-2xl">
            Allow ExamSaarthi to analyze your exam history to provide personalized recommendations. 
            This does not store raw audio, and is disabled during active exams.
          </p>
          {!loadingConsent && (
            <label className="flex items-center space-x-4 cursor-pointer p-5 border border-zinc-900 rounded-2xl bg-black hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-zinc-700 bg-black text-white focus:ring-white"
                checked={consent}
                onChange={(e) => handleConsentToggle(e.target.checked)}
                aria-label="Enable Personal Learning Profile"
              />
              <span className="text-lg font-light">Enable AI Insights</span>
            </label>
          )}
          </div>

        <div className="pt-2">
          <button
            onClick={handleContinue}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full text-xs uppercase tracking-widest font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white bg-white text-black hover:bg-zinc-200 h-14 px-10"
          >
            {t('next')}
          </button>
          </div>
          </div>
        </motion.div>
    </main>
  );
}
