'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useAccessibility } from '@/lib/accessibility/AccessibilityProvider';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Lang } from '@/lib/i18n/dictionaries';

export default function SettingsPage() {
  const { lang, setLang, t } = useI18n();
  const { announce } = useAccessibility();
  const { speak } = useVoice();
  const router = useRouter();
  
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    announce('Settings page. Please choose your language.');
    // speak('Welcome to Settings. Please select your language.');
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
