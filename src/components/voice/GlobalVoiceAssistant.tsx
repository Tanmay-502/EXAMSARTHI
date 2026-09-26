'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { Locale } from '@/lib/i18n/registry';
import { OptionalLLMIntentProvider } from '@/lib/voice/intentRouter';
import { SafeAction, SafeActionRegistry } from '@/lib/voice/safeActionRegistry';

type VoiceActionHandler = (action: SafeAction, payload?: Record<string, unknown> | null) => void;

interface GlobalVoiceContextType {
  registerHandler: (handler: VoiceActionHandler) => void;
  unregisterHandler: (handler: VoiceActionHandler) => void;
  dispatchAction: (action: SafeAction, payload?: Record<string, unknown> | null) => void;
  getContextName: () => string;
}

const GlobalVoiceContext = createContext<GlobalVoiceContextType | undefined>(undefined);

export function GlobalVoiceAssistant({ children }: { children: ReactNode }) {
  const { setOnResult, speak } = useVoice();
  const { lang, setLang } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const [handlers, setHandlers] = useState<VoiceActionHandler[]>([]);
  const intentProvider = React.useMemo(() => new OptionalLLMIntentProvider(), []);
  const registry = React.useMemo(() => new SafeActionRegistry(), []);

  const getContextName = React.useCallback(() => {
    if (pathname === '/') return 'landing';
    if (pathname.startsWith('/dashboard')) return 'dashboard';
    if (pathname.startsWith('/exam')) return 'exam';
    if (pathname.startsWith('/practice')) return 'practice';
    if (pathname.startsWith('/results')) return 'results';
    if (pathname.startsWith('/history')) return 'history';
    return 'unknown';
  }, [pathname]);

  const dispatchAction = React.useCallback((action: SafeAction, payload?: Record<string, unknown> | null) => {
    // 1. Check if action is allowed in current context
    const context = getContextName();
    if (action === 'QUESTION_SOLVING' as SafeAction) {
      if (context === 'exam' || context === 'practice') {
        const msg = lang === 'hi-IN' ? 'मैं परीक्षा संचालित करने में आपकी मदद कर सकता हूँ, लेकिन मैं किसी सक्रिय प्रश्न का उत्तर नहीं दे सकता या उसे हल नहीं कर सकता।' : lang === 'te-IN' ? 'పరీక్షను నిర్వహించడంలో నేను మీకు సహాయం చేయగలను, కానీ నేను యాక్టివ్ ప్రశ్నకు సమాధానం ఇవ్వలేను లేదా పరిష్కరించలేను.' : 'I can help you operate the exam, but I cannot answer or solve an active exam question.';
        speak(msg);
      }
      return;
    }

    if (!registry.isActionAllowed(action, context)) {
      console.warn(`Action ${action} is not allowed in context ${context}`);
      // Only speak refusal if it's an exam context (anti-cheating)
      if (context === 'exam' && ['OPEN_DASHBOARD', 'OPEN_HISTORY'].includes(action)) {
         speak("I cannot navigate away during an active exam.");
      }
      return;
    }

    // 2. Handle global actions directly
    if (action === 'CHANGE_LANGUAGE' && typeof payload?.lang === 'string') {
      setLang(payload.lang as Locale);
      const msg = payload.lang === 'hi-IN' ? 'हिंदी चुनी गई।' : payload.lang === 'te-IN' ? 'తెలుగు ఎంచుకోబడింది.' : 'English selected.';
      speak(msg);
      // Let it fall through so page-level handlers (like VoiceGateway) can react
    }
    
    if (action === 'OPEN_DASHBOARD') router.push('/dashboard');
    if (action === 'OPEN_EXAM' || action === 'START_EXAM') {
      const query = new URLSearchParams();
      if (payload?.subject) query.set('subject', payload.subject as string);
      router.push(`/exam?${query.toString()}`);
    }
    if (action === 'OPEN_PRACTICE' || action === 'START_PRACTICE') {
      const query = new URLSearchParams();
      if (payload?.subject) query.set('subject', payload.subject as string);
      if (payload?.count) query.set('count', String(payload.count));
      if (payload?.difficulty) query.set('difficulty', payload.difficulty as string);
      router.push(`/practice?${query.toString()}`);
    }
    if (action === 'OPEN_HISTORY') router.push('/history');
    if (action === 'OPEN_SETTINGS') router.push('/settings');
    if (action === 'LOGOUT') router.push('/auth/login');

    // 3. Notify page-level handlers (like ExamEngine)
    handlers.forEach(h => h(action, payload));
  }, [getContextName, registry, router, setLang, speak, handlers, lang]);

  useEffect(() => {
    setOnResult(async (transcript) => {
      const command = await intentProvider.parse(transcript, lang, { context: getContextName() });
      
      let action: SafeAction | null = null;
      let payload: Record<string, unknown> | null = null;

      if (command.type === 'SET_LANGUAGE_ENGLISH') {
        action = 'CHANGE_LANGUAGE';
        payload = { lang: 'en-IN' };
      } else if (command.type === 'SET_LANGUAGE_HINDI') {
        action = 'CHANGE_LANGUAGE';
        payload = { lang: 'hi-IN' };
      } else if (command.type === 'SET_LANGUAGE_TELUGU') {
        action = 'CHANGE_LANGUAGE';
        payload = { lang: 'te-IN' };
      } else if (command.type === 'SELECT_OPTION' || command.type === 'JUMP_TO_QUESTION') {
        action = registry.getActionMapping(command.type);
        payload = { index: command.index };
      } else if (command.type === 'NATURAL_INTENT') {
        // Assume LLM maps it safely if we enforce it
        action = command.intent as SafeAction;
        payload = command.payload || null;
      } else {
        action = registry.getActionMapping(command.type);
      }

      if (action) {
        dispatchAction(action, payload);
      } else if (command.type === 'UNKNOWN') {
         // Quiet retry or prompt if needed
         console.log('Unknown command');
      }
    });
  }, [lang, setOnResult, intentProvider, getContextName, registry, dispatchAction]);

  return (
    <GlobalVoiceContext.Provider value={{ 
      registerHandler: (h) => setHandlers(prev => [...prev, h]), 
      unregisterHandler: (h) => setHandlers(prev => prev.filter(x => x !== h)),
      dispatchAction,
      getContextName
    }}>
      {children}
    </GlobalVoiceContext.Provider>
  );
}

export function useGlobalVoice() {
  const context = useContext(GlobalVoiceContext);
  if (!context) throw new Error('useGlobalVoice must be used within GlobalVoiceAssistant');
  
  return {
    useVoiceAction: (handler: VoiceActionHandler) => {
      useEffect(() => {
        context.registerHandler(handler);
        return () => context.unregisterHandler(handler);
      }, [handler]);
    },
    dispatchAction: context.dispatchAction,
    getContextName: context.getContextName
  };
}
