'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useEffect, useRef, useState, Suspense, type FormEvent } from 'react';
import { loginWithMagicLink } from '../actions';
import { useSearchParams } from 'next/navigation';

import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { VoiceCore } from '@/components/voice/VoiceCore';
import { motion } from 'framer-motion';
import { formatEmailForSpeech, normalizeSpokenEmail } from '@/lib/voice/emailParser';
import { usePreferredMode } from '@/lib/hooks/usePreferredMode';
import { createClient as createSupabaseBrowserClient } from '@/lib/supabase/client';

function LoginForm() {
  const { t, lang } = useI18n();
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const { speak, isContinuous, startContinuousListening } = useVoice();
  const { useVoiceAction } = useGlobalVoice();
  const { mode: preferredMode, isLoaded: modeLoaded } = usePreferredMode();
  const emailRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const lastVoiceEmailRef = useRef<string>('');
  const orientationSpokenRef = useRef(false);
  const [voiceStep, setVoiceStep] = useState<'idle' | 'awaiting_email' | 'confirming_email' | 'sending'>('awaiting_email');
  const [voiceEmail, setVoiceEmail] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  useEffect(() => {
    emailRef.current?.focus();

    if (!modeLoaded) return;

    if (preferredMode === 'voice-first' && !isContinuous) {
      startContinuousListening();
    }

    const msg = message === 'unauthenticated'
      ? (lang === 'hi-IN'
          ? 'परीक्षा देने के लिए आपको पहले लॉगिन करना होगा।'
          : lang === 'te-IN'
            ? 'పరీక్ష రాయడానికి మీరు ముందుగా లాగిన్ అవ్వాలి.'
            : 'You need to sign in before continuing.')
      : lang === 'hi-IN'
        ? 'साइन इन या नया अकाउंट बनाने के लिए अपना ईमेल बताएं। नया ईमेल होने पर अकाउंट अपने आप बन जाएगा।'
        : lang === 'te-IN'
          ? 'సైన్ ఇన్ లేదా కొత్త ఖాతా కోసం మీ ఇమెయిల్ చెప్పండి. కొత్త ఇమెయిల్ అయితే ఖాతా ఆటోమేటిక్‌గా సృష్టించబడుతుంది.'
          : 'This page handles both sign in and new account creation. Tell me your email address; a new email will automatically create an account.';

    if (!orientationSpokenRef.current) {
      orientationSpokenRef.current = true;
      speak(msg);
    }
  }, [message, lang, modeLoaded, preferredMode, isContinuous, startContinuousListening, speak]);

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    setGoogleError('');

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('Google sign-in error:', error);
        setGoogleError(
          lang === 'hi-IN'
            ? 'Google से साइन इन शुरू नहीं हो सका। कृपया फिर से कोशिश करें।'
            : lang === 'te-IN'
              ? 'Google సైన్-ఇన్ ప్రారంభం కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.'
              : 'Google sign-in could not be started. Please try again.'
        );
        setGoogleLoading(false);
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      setGoogleError(
        lang === 'hi-IN'
          ? 'Google से साइन इन शुरू नहीं हो सका। कृपया फिर से कोशिश करें।'
          : lang === 'te-IN'
            ? 'Google సైన్-ఇన్ ప్రారంభం కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.'
            : 'Google sign-in could not be started. Please try again.'
      );
      setGoogleLoading(false);
    }
  };

  useVoiceAction((action, _payload, transcript) => {
    const raw = transcript?.trim() || '';

    if ((action as string) === 'RAW_TRANSCRIPT' && raw) {
      const lowerRaw = raw.toLowerCase();

      // Let global commands reach the normal parser instead of treating them
      // as malformed email input.
      if (/\b(help|sign in|login|log in|sign up|signup|register|create an account)\b/.test(lowerRaw)) {
        return false;
      }

      const parsedEmail = normalizeSpokenEmail(raw);

      if (voiceStep === 'confirming_email') {
        const normalized = raw.toLowerCase();
        const yes = /\b(yes|yeah|yep|confirm|send|send it|okay|ok|haan|हाँ|అవును)\b/.test(normalized);
        const no = /\b(no|nope|change|wrong|different|नहीं|नही|కాదు|మార్చు)\b/.test(normalized);

        if (yes && lastVoiceEmailRef.current) {
          setVoiceStep('sending');
          setVoiceStatus(
            lang === 'hi-IN' ? 'मैजिक लिंक भेजा जा रहा है।' :
            lang === 'te-IN' ? 'మ్యాజిక్ లింక్ పంపుతోంది.' :
            'Sending Magic Link...'
          );
          requestAnimationFrame(() => formRef.current?.requestSubmit());
          return true;
        }

        if (no) {
          setVoiceStep('awaiting_email');
          setVoiceEmail('');
          lastVoiceEmailRef.current = '';
          setVoiceStatus('');
          speak(
            lang === 'hi-IN' ? 'ठीक है। अपना ईमेल पता फिर से बताएं।' :
            lang === 'te-IN' ? 'సరే. మీ ఇమెయిల్ చిరునామాను మళ్లీ చెప్పండి.' :
            'Okay. Please say your email address again.'
          );
          emailRef.current?.focus();
          return true;
        }
      }

      if (parsedEmail && voiceStep !== 'sending') {
        lastVoiceEmailRef.current = parsedEmail;
        setVoiceEmail(parsedEmail);
        setVoiceStep('confirming_email');
        setVoiceStatus(
          lang === 'hi-IN'
            ? `मैंने ${formatEmailForSpeech(parsedEmail)} सुना। भेजने के लिए हाँ कहें, बदलने के लिए नहीं कहें।`
            : lang === 'te-IN'
              ? `${formatEmailForSpeech(parsedEmail)} అని విన్నాను. పంపడానికి అవును, మార్చడానికి కాదు అని చెప్పండి.`
              : `I heard ${formatEmailForSpeech(parsedEmail)}. Say yes to send the Magic Link, or say no to change it.`
        );
        speak(
          lang === 'hi-IN'
            ? `मैंने ${parsedEmail} सुना। सही है तो हाँ कहें, बदलना है तो नहीं कहें।`
            : lang === 'te-IN'
              ? `${parsedEmail} అని విన్నాను. సరైతే అవును అని, మార్చాలంటే కాదు అని చెప్పండి.`
              : `I heard ${parsedEmail}. Say yes to confirm, or say no to change it.`
        );
        return true;
      }

      if (voiceStep === 'awaiting_email') {
        speak(
          lang === 'hi-IN'
            ? 'कृपया ईमेल पता बताएं। उदाहरण: tanmay at gmail dot com.'
            : lang === 'te-IN'
              ? 'దయచేసి ఇమెయిల్ చిరునామా చెప్పండి. ఉదాహరణకు tanmay at gmail dot com.'
              : 'Please say your email address. For example: tanmay at gmail dot com.'
        );
        return true;
      }
    }

    if (action === 'HELP') {
      speak(lang === 'hi-IN'
        ? 'ईमेल बताएं। मैं उसे भरकर पहले आपसे पुष्टि करूँगा, फिर मैजिक लिंक भेजूँगा।'
        : lang === 'te-IN'
          ? 'మీ ఇమెయిల్ చెప్పండి. నేను దాన్ని నింపి, ముందుగా మీకు చదివి నిర్ధారించుకుని, తరువాత మ్యాజిక్ లింక్ పంపుతాను.'
          : 'Tell me your email. I will fill it in, read it back for confirmation, and then send the Magic Link.');
      setVoiceStep('awaiting_email');
      return true;
    }

    if (action === 'SIGN_IN' || action === 'SIGN_UP') {
      setVoiceStep('awaiting_email');
      speak(action === 'SIGN_UP'
        ? 'Create Account selected. Please say your email address.'
        : 'Sign in selected. Please say your email address.');
      emailRef.current?.focus();
      return true;
    }

    const parsedEmail = raw ? normalizeSpokenEmail(raw) : null;

    if (parsedEmail && voiceStep !== 'sending') {
      lastVoiceEmailRef.current = parsedEmail;
      setVoiceEmail(parsedEmail);
      setVoiceStep('confirming_email');
      setVoiceStatus(
        lang === 'hi-IN'
          ? `मैंने ${parsedEmail} सुना। भेजने के लिए हाँ कहें, बदलने के लिए नहीं कहें।`
          : lang === 'te-IN'
            ? `${parsedEmail} అని నేను విన్నాను. పంపడానికి అవును, మార్చడానికి కాదు అని చెప్పండి.`
            : `I heard ${parsedEmail}. Say yes to send the Magic Link, or say no to change it.`
      );
      emailRef.current?.focus();
      speak(
        lang === 'hi-IN'
          ? `मैंने ${parsedEmail} सुना। सही है तो हाँ कहें, बदलना है तो नहीं कहें।`
          : lang === 'te-IN'
            ? `${parsedEmail} అని విన్నాను. సరైతే అవును అని, మార్చాలంటే కాదు అని చెప్పండి.`
            : `I heard ${parsedEmail}. Say yes to confirm, or say no to change it.`
      );
      return true;
    }

    if (voiceStep === 'confirming_email') {
      const normalized = raw.toLowerCase();
      const yes = /\b(yes|yeah|yep|confirm|send|send it|okay|ok|haan|हाँ|అవును)\b/.test(normalized) || action === 'CONFIRM';
      const no = /\b(no|nope|change|wrong|different|नहीं|नही|కాదు|మార్చు)\b/.test(normalized) || action === 'CHANGE';

      if (yes && lastVoiceEmailRef.current) {
        setVoiceStep('sending');
        setVoiceStatus('Sending Magic Link...');
        requestAnimationFrame(() => formRef.current?.requestSubmit());
        return true;
      }

      if (no) {
        setVoiceStep('awaiting_email');
        setVoiceEmail('');
        lastVoiceEmailRef.current = '';
        setVoiceStatus('');
        speak('Okay. Please say your email address again.');
        emailRef.current?.focus();
        return true;
      }

      if (raw) {
        speak('Please say yes to confirm the email, or no to change it.');
        return true;
      }
    }

    if (voiceStep === 'awaiting_email') {
      if (raw) {
        speak('Please say your email address. You can say it normally, or say at, dot, underscore, and gmail.');
        return true;
      }
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
            <p className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-2">EXAMSAARTHI</p>
            <h1 className="text-[clamp(3rem,6vw,6rem)] leading-[0.9] font-light tracking-tighter text-zinc-100">{t('login')}</h1>
          </div>
          <VoiceCore size="sm" />
        </div>

        <p className="text-2xl md:text-3xl font-light text-zinc-400 max-w-xl">{t('magic_link_desc')}</p>

        <p className="text-base md:text-lg text-zinc-400 max-w-xl" aria-live="polite">
          {voiceStatus || 'New email addresses can create an account automatically through the same Magic Link flow.'}
        </p>

        {message && (
          <div data-testid="auth-message" aria-live="polite" className="border-t border-zinc-900 py-6 text-zinc-300">
            {message === 'unauthenticated' ? (lang === 'hi-IN' ? 'परीक्षा देने के लिए आपको पहले लॉगిన్ करना होगा।' : lang === 'te-IN' ? 'పరీక్ష రాయడానికి మీరు ముందుగా లాగిన్ అవ్వాలి.' : 'You need to login first to take an exam.') : message}
          </div>
        )}

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={googleLoading}
          className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-full border border-zinc-700 bg-white px-8 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-60"
          aria-label={lang === 'hi-IN' ? 'Google से साइन इन करें' : lang === 'te-IN' ? 'Googleతో సైన్ ఇన్ చేయండి' : 'Continue with Google'}
        >
          <span aria-hidden="true" className="text-lg font-semibold normal-case tracking-normal">G</span>
          {googleLoading
            ? (lang === 'hi-IN' ? 'Google खोला जा रहा है...' : lang === 'te-IN' ? 'Google తెరుస్తోంది...' : 'Opening Google...')
            : (lang === 'hi-IN' ? 'Google से जारी रखें' : lang === 'te-IN' ? 'Googleతో కొనసాగించండి' : 'Continue with Google')}
        </button>

        {googleError && (
          <p className="border-t border-zinc-900 pt-6 text-sm text-zinc-300" role="alert">
            {googleError}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-zinc-600" aria-hidden="true">
          <span className="h-px flex-1 bg-zinc-900" />
          <span>or</span>
          <span className="h-px flex-1 bg-zinc-900" />
        </div>

        <form
          ref={formRef}
          action={loginWithMagicLink}
          className="space-y-10"
          onSubmit={(_event: FormEvent<HTMLFormElement>) => {
            setVoiceStep('sending');
            setVoiceStatus('Sending Magic Link...');
          }}
        >
          <div className="space-y-4 border-t border-zinc-900 pt-8">
            <label htmlFor="email" className="text-zinc-400 tracking-[0.2em] text-xs uppercase font-bold peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t('email')}
            </label>
            <input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              value={voiceEmail}
              onChange={(event) => {
                setVoiceEmail(event.target.value);
                lastVoiceEmailRef.current = event.target.value;
              }}
              required
              autoComplete="email"
              className="flex h-14 w-full rounded-none border-0 border-b border-zinc-800 bg-transparent px-0 py-1 text-xl font-light text-white shadow-none transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
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
