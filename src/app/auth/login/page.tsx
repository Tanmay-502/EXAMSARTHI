'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useEffect, useRef, Suspense } from 'react';
import { loginWithMagicLink } from '../actions';
import { useSearchParams } from 'next/navigation';

import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { VoiceCore } from '@/components/voice/VoiceCore';
import { motion } from 'framer-motion';

function LoginForm() {
  const { t, lang } = useI18n();
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const { speak, isContinuous } = useVoice();
  const { useVoiceAction } = useGlobalVoice();
  
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
    
    // Only speak orientation if continuous voice is already active
    if (isContinuous) {
      if (message === 'unauthenticated') {
        const msg = lang === 'hi-IN' ? 'परीक्षा देने के लिए आपको पहले लॉगिन करना होगा।' : lang === 'te-IN' ? 'పరీక్ష రాయడానికి మీరు ముందుగా లాగిన్ అవ్వాలి.' : 'You need to login first to take an exam.';
        speak(msg);
      } else {
        speak(t('login_orientation'));
      }
    }
  }, [speak, t, isContinuous, message, lang]);

  useVoiceAction((action) => {
    if (!isContinuous) return false;

    if (action === 'HELP') {
      speak(t('login_orientation'));
      return true;
    }
    return false;
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="space-y-16"
      >
        <div className="flex items-center justify-between border-b border-zinc-900 pb-8">
          <div>
            <p className="text-zinc-500 tracking-[0.2em] text-xs uppercase mb-2">EXAMSAARTHI</p>
            <h1 className="text-[clamp(3rem,6vw,6rem)] leading-[0.9] font-light tracking-tighter text-zinc-100">{t('login')}</h1>
          </div>
          <VoiceCore size="sm" />
        </div>

        <p className="text-2xl md:text-3xl font-light text-zinc-500 max-w-xl">{t('magic_link_desc')}</p>

        {message && (
          <div data-testid="auth-message" aria-live="polite" className="border-t border-zinc-900 py-6 text-zinc-300">
            {message === 'unauthenticated' ? (lang === 'hi-IN' ? 'परीक्षा देने के लिए आपको पहले लॉगిన్ करना होगा।' : lang === 'te-IN' ? 'పరీక్ష రాయడానికి మీరు ముందుగా లాగిన్ అవ్వాలి.' : 'You need to login first to take an exam.') : message}
          </div>
        )}

        <form action={loginWithMagicLink} className="space-y-10">
          <div className="space-y-4 border-t border-zinc-900 pt-8">
            <label htmlFor="email" className="text-zinc-500 tracking-[0.2em] text-xs uppercase font-bold peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t('email')}
            </label>
            <input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              required
              className="flex h-14 w-full rounded-none border-0 border-b border-zinc-800 bg-transparent px-0 py-1 text-xl font-light text-white shadow-none transition-colors placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t('email')}
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-white text-black uppercase tracking-widest text-xs font-bold transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-50 h-14 px-8 w-full"
          >
            {t('send_magic_link')} ↗
          </button>
        </form>
      </motion.div>
    </>
  );
}

export default function LoginPage() {
  const { t } = useI18n();
  return (
    <main id="main-content" className="flex flex-col flex-1 min-h-screen w-full bg-black text-white">
      <div className="relative flex flex-col min-h-screen w-full max-w-3xl mx-auto pt-32 pb-24 px-6 md:px-12">
        <Suspense fallback={<div>{t('loading')}</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
