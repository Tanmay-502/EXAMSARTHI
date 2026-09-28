'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useAccessibility } from '@/lib/accessibility/AccessibilityProvider';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Lang } from '@/lib/i18n/dictionaries';
import { LANGUAGE_REGISTRY } from '@/lib/i18n/registry';
import { createClient } from '@/lib/supabase/client';
import { updateLearningProfileConsent } from '@/app/exam/actions';
import { VoiceCore } from '@/components/voice/VoiceCore';
import { motion } from 'framer-motion';
import { usePreferredMode } from '@/lib/hooks/usePreferredMode';
import { say } from '@/lib/voice/say';
import { clearExamStorage } from '@/lib/store/clearExamStorage';
import { signOut } from '@/app/auth/actions';

export default function SettingsPage() {
  const { lang, setLang, t, tParams } = useI18n();
  const {
    announce,
    speechRate,
    voiceURI,
    highContrast,
    fontScale,
    updateAccessibilityPreferences,
  } = useAccessibility();
  const { speak } = useVoice();
  const { mode: interactionMode, setMode } = usePreferredMode();
  const router = useRouter();
  
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [consent, setConsent] = useState<boolean>(false);
  const [loadingConsent, setLoadingConsent] = useState<boolean>(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    headingRef.current?.focus();
    announce(t('settings_choose_language'));
    
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
  }, [announce]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    const timer = window.setTimeout(updateVoices, 0);
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);

    return () => {
      window.clearTimeout(timer);
      window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
    };
  }, []);

  const handleLanguageChange = (newLang: Lang) => {
    setLang(newLang);
    const selected = LANGUAGE_REGISTRY[newLang];
    const language = selected.nativeName;
    const message = selected.dictionary.language_changed.replace('{language}', language);
    say(message, interactionMode, speak, announce);
  };

  const handleContinue = () => {
    router.push('/dashboard');
  };

  const handleSignOut = async () => {
    await clearExamStorage();
    await signOut();
    router.refresh();
  };

  const handleConsentToggle = async (newConsent: boolean) => {
    const previousConsent = consent;
    setConsent(newConsent);
    announce(newConsent ? t('learning_profile_enabled') : t('learning_profile_disabled'));

    try {
      await updateLearningProfileConsent(newConsent);
    } catch (e) {
      console.error(e);
      setConsent(previousConsent);
      announce(t('learning_profile_save_error'), 'assertive');
    }
  };

  return (
    <main id="main-content" className="flex min-h-dvh flex-col w-full bg-black text-white px-6 py-12 md:px-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-5xl mx-auto"
      >
        <div className="mb-20 flex items-center justify-between border-b border-zinc-900 pb-8">
          <div className="flex flex-col">
            <span className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-2">{t('a11y_settings')}</span>
            <span className="text-xl font-light tracking-wide">{t('settings_page').toUpperCase()}</span>
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
              className={`flex-1 h-14 rounded-full border text-xs uppercase tracking-widest font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] ${lang === 'en-IN' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-400 hover:text-white hover:border-zinc-500 border-zinc-800'}`}
            >
              English
            </button>
            <button
              onClick={() => handleLanguageChange('hi-IN')}
              aria-pressed={lang === 'hi-IN'}
              className={`flex-1 h-14 rounded-full border text-xs uppercase tracking-widest font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] ${lang === 'hi-IN' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-400 hover:text-white hover:border-zinc-500 border-zinc-800'}`}
            >
              हिंदी
            </button>
            <button
              onClick={() => handleLanguageChange('te-IN')}
              aria-pressed={lang === 'te-IN'}
              className={`flex-1 h-14 rounded-full border text-xs uppercase tracking-widest font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] ${lang === 'te-IN' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-400 hover:text-white hover:border-zinc-500 border-zinc-800'}`}
            >
              తెలుగు
            </button>
          </div>
          </div>

          <div className="space-y-10 border-t border-zinc-900 pt-10">
            <h2 className="text-2xl md:text-3xl font-light tracking-tight">{t('voice_display')}</h2>

            <div className="space-y-4">
              <p className="block text-sm uppercase tracking-[0.2em] font-bold text-zinc-400">{t('interaction_mode')}</p>
              <p className="text-sm text-zinc-400">{t('interaction_mode_desc')}</p>
              <div className="grid grid-cols-2 gap-3">
                {(['standard', 'voice-first'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={interactionMode === mode}
                    onClick={() => setMode(mode)}
                    className={[
                      'min-h-14 rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]',
                      interactionMode === mode
                        ? 'border-[var(--brand-accent)] bg-zinc-900 text-[var(--brand-accent)]'
                        : 'border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white',
                    ].join(' ')}
                  >
                    {mode === 'standard' ? t('standard_mode') : t('voice_first_mode')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <label htmlFor="speech-rate" className="block text-sm uppercase tracking-[0.2em] font-bold text-zinc-400">
                  {t('speech_rate')}
                </label>
                <select
                  id="speech-rate"
                  value={speechRate}
                  onChange={(event) => {
                    const nextRate = Number(event.target.value);
                    updateAccessibilityPreferences({ speechRate: nextRate });
                    announce(tParams('speech_rate_set', { rate: nextRate }));
                  }}
                  className="h-14 w-full rounded-xl border border-zinc-800 bg-black px-4 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
                >
                  <option value="0.75">0.75×</option>
                  <option value="0.9">0.9×</option>
                  <option value="1">1×</option>
                  <option value="1.1">1.1×</option>
                  <option value="1.25">1.25×</option>
                  <option value="1.5">1.5×</option>
                </select>
              </div>

              <div className="space-y-4">
                <label htmlFor="voice-selection" className="block text-sm uppercase tracking-[0.2em] font-bold text-zinc-400">
                  {t('voice_selection')}
                </label>
                <select
                  id="voice-selection"
                  value={voiceURI}
                  onChange={(event) => {
                    updateAccessibilityPreferences({ voiceURI: event.target.value });
                    announce(event.target.value ? t('selected_voice_updated') : t('browser_default_voice'));
                  }}
                  className="h-14 w-full rounded-xl border border-zinc-800 bg-black px-4 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
                >
                  <option value="">{t('browser_default_voice')}</option>
                  {voices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
                <p className="text-sm text-zinc-400">
                  {t('voice_browser_note')}
                </p>
              </div>

              <label className="flex items-center justify-between gap-6 rounded-2xl border border-zinc-900 bg-black p-5">
                <span>
                  <span className="block text-lg font-light text-white">{t('high_contrast')}</span>
                  <span className="block mt-1 text-sm text-zinc-400">{t('high_contrast_desc')}</span>
                </span>
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(event) => {
                    updateAccessibilityPreferences({ highContrast: event.target.checked });
                    announce(event.target.checked ? t('high_contrast_enabled') : t('high_contrast_disabled'));
                  }}
                  className="h-5 w-5 rounded border-zinc-700 bg-black text-white focus:ring-[var(--brand-accent)]"
                  aria-label={t('high_contrast')}
                />
              </label>

              <div className="space-y-4">
                <label htmlFor="font-scale" className="block text-sm uppercase tracking-[0.2em] font-bold text-zinc-400">
                  {t('font_scaling')}
                </label>
                <select
                  id="font-scale"
                  value={fontScale}
                  onChange={(event) => {
                    const nextScale = Number(event.target.value);
                    updateAccessibilityPreferences({ fontScale: nextScale });
                    announce(tParams('font_scaling_set', { percent: Math.round(nextScale * 100) }));
                  }}
                  className="h-14 w-full rounded-xl border border-zinc-800 bg-black px-4 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
                >
                  <option value="1">100%</option>
                  <option value="1.1">110%</option>
                  <option value="1.25">125%</option>
                  <option value="1.5">150%</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-8 border-t border-zinc-900 pt-10">
          <h2 className="text-2xl md:text-3xl font-light tracking-tight">{t('learning_profile_title')}</h2>
          <p className="text-zinc-400 text-lg font-light leading-relaxed max-w-2xl">
            {t('learning_profile_desc')}
          </p>
          {!loadingConsent && (
            <label className="flex items-center space-x-4 cursor-pointer p-5 border border-zinc-900 rounded-2xl bg-black hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-zinc-700 bg-black text-white focus:ring-[var(--brand-accent)]"
                checked={consent}
                onChange={(e) => handleConsentToggle(e.target.checked)}
                aria-label={t('enable_ai_insights')}
              />
              <span className="text-lg font-light">{t('enable_ai_insights')}</span>
            </label>
          )}
          </div>

        <div className="pt-2">
          <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => speak(t('test_voice_message'))}
            className="inline-flex min-h-14 items-center justify-center rounded-full border border-[var(--brand-accent)] px-8 text-xs font-bold uppercase tracking-widest text-[var(--brand-accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--brand-accent)_10%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
          >
            {t('test_voice')}
          </button>
          <button
            onClick={handleContinue}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full text-xs uppercase tracking-widest font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] bg-white text-black hover:bg-zinc-200 h-14 px-10"
          >
            {t('next')}
          </button>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-red-700/60 px-8 text-xs font-bold uppercase tracking-widest text-red-300 transition-colors hover:border-red-500 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
            >
              {t('logout')}
            </button>
          </div>
          </div>
          </div>
        </motion.div>
    </main>
  );
}
