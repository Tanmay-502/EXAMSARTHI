'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useEffect, useRef, Suspense } from 'react';
import { loginWithMagicLink } from '../actions';
import { useSearchParams } from 'next/navigation';

import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';

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
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t('login')}</h1>
        <p className="text-muted-foreground mt-2">{t('magic_link_desc')}</p>
      </div>

      {message && (
        <div data-testid="auth-message" aria-live="polite" className="p-4 bg-primary/10 text-primary border border-primary/20 rounded-md text-center">
          {message === 'unauthenticated' ? (lang === 'hi-IN' ? 'परीक्षा देने के लिए आपको पहले लॉगिन करना होगा।' : lang === 'te-IN' ? 'పరీక్ష రాయడానికి మీరు ముందుగా లాగిన్ అవ్వాలి.' : 'You need to login first to take an exam.') : message}
        </div>
      )}

      <form action={loginWithMagicLink} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('email')}
          </label>
          <input 
            ref={emailRef}
            id="email" 
            name="email"
            type="email" 
            required
            className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t('email')}
          />
        </div>

        <button 
          type="submit"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-12 px-8 w-full"
        >
          {t('send_magic_link')}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  const { t } = useI18n();
  return (
    <main id="main-content" className="flex flex-col items-center justify-center flex-1 p-6">
      <div className="w-full max-w-md p-8 space-y-8 bg-card text-card-foreground rounded-xl shadow-lg border">
        <Suspense fallback={<div>{t('loading')}</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
