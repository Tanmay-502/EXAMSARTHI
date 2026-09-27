'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useAccessibility } from '@/lib/accessibility/AccessibilityProvider';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Lang } from '@/lib/i18n/dictionaries';
import { createClient } from '@/lib/supabase/client';
import { updateLearningProfileConsent } from '@/app/exam/actions';

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
    <main id="main-content" className="flex flex-col items-center justify-center flex-1 p-6">
      <div className="w-full max-w-xl p-8 space-y-8 bg-card text-card-foreground rounded-xl shadow border">
        
        <h1 tabIndex={-1} ref={headingRef} className="text-3xl font-bold tracking-tight focus:outline-none">
          {t('a11y_settings')}
        </h1>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t('select_language')}</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => handleLanguageChange('en-IN')}
              aria-pressed={lang === 'en-IN'}
              className={`flex-1 h-14 rounded-md border-2 text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring ${lang === 'en-IN' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent hover:bg-accent hover:text-accent-foreground border-input'}`}
            >
              English
            </button>
            <button
              onClick={() => handleLanguageChange('hi-IN')}
              aria-pressed={lang === 'hi-IN'}
              className={`flex-1 h-14 rounded-md border-2 text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring ${lang === 'hi-IN' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent hover:bg-accent hover:text-accent-foreground border-input'}`}
            >
              हिंदी
            </button>
            <button
              onClick={() => handleLanguageChange('te-IN')}
              aria-pressed={lang === 'te-IN'}
              className={`flex-1 h-14 rounded-md border-2 text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring ${lang === 'te-IN' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent hover:bg-accent hover:text-accent-foreground border-input'}`}
            >
              తెలుగు
            </button>
          </div>
        </div>

        {/* More settings could be added here (e.g. voice speed, font size) */}
        <div className="space-y-4 pt-6 border-t border-border">
          <h2 className="text-xl font-semibold">Personal Learning Profile</h2>
          <p className="text-muted-foreground text-sm">
            Allow ExamSaarthi to analyze your exam history to provide personalized recommendations. 
            This does not store raw audio, and is disabled during active exams.
          </p>
          {!loadingConsent && (
            <label className="flex items-center space-x-3 cursor-pointer p-4 border rounded-lg bg-background hover:bg-accent transition-colors">
              <input
                type="checkbox"
                className="w-6 h-6 rounded border-gray-300 text-primary focus:ring-primary"
                checked={consent}
                onChange={(e) => handleConsentToggle(e.target.checked)}
                aria-label="Enable Personal Learning Profile"
              />
              <span className="text-lg font-medium">Enable AI Insights</span>
            </label>
          )}
        </div>

        <div className="pt-6">
          <button
            onClick={handleContinue}
            className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-14 px-8"
          >
            {t('next')}
          </button>
        </div>
      </div>
    </main>
  );
}
