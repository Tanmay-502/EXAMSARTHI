'use client'

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { Locale } from '@/lib/i18n/registry';
import { OptionalLLMIntentProvider } from '@/lib/voice/intentRouter';
import { SafeAction, SafeActionRegistry } from '@/lib/voice/safeActionRegistry';
import { createClient } from '@/lib/supabase/client';

type ConversationState = 'IDLE' | 'AWAITING_LANGUAGE' | 'AWAITING_INTENT' | 'COLLECTING_PARAMETERS' | 'CONFIRMING_ACTION' | 'EXECUTING_ACTION' | 'ERROR_RECOVERY';

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

  const handlersRef = React.useRef<VoiceActionHandler[]>([]);
  const conversationStateRef = React.useRef<ConversationState>('IDLE');
  const pendingIntentRef = React.useRef<SafeAction | null>(null);
  const collectedParamsRef = React.useRef<Record<string, unknown>>({});
  const intentProvider = React.useMemo(() => new OptionalLLMIntentProvider(), []);
  const registry = React.useMemo(() => new SafeActionRegistry(), []);

  const getContextName = React.useCallback(() => {
    if (pathname === '/') return 'landing';
    if (pathname.startsWith('/onboarding')) return 'onboarding';
    if (pathname.startsWith('/dashboard')) return 'dashboard';
    if (pathname.startsWith('/exam')) return 'exam';
    if (pathname.startsWith('/practice')) return 'practice';
    if (pathname.startsWith('/results')) return 'results';
    if (pathname.startsWith('/history')) return 'history';
    if (pathname.startsWith('/auth')) return 'auth';
    return 'unknown';
  }, [pathname]);

  const contextVersionRef = React.useRef(0);
  const isNavigatingRef = React.useRef(false);
  
  React.useEffect(() => {
    contextVersionRef.current += 1;
    isNavigatingRef.current = false;
    // Reset conversation state on navigation unless we're executing an action
    if (conversationStateRef.current !== 'EXECUTING_ACTION') {
      conversationStateRef.current = 'IDLE';
      pendingIntentRef.current = null;
      collectedParamsRef.current = {};
    }
  }, [pathname]);

  const dispatchAction = React.useCallback(async (action: SafeAction, payload?: Record<string, unknown> | null) => {
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
    if (action === 'SIGN_IN' || action === 'SIGN_UP') {
      try {
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[VOICE] Auth getSession error:', error);
        }
        
        if (session) {
          if (pathname !== '/dashboard') {
            speak(lang === 'hi-IN' ? 'मैं आपको डैशबोर्ड पर ले जा रहा हूँ।' : lang === 'te-IN' ? 'నేను మిమ్మల్ని డాష్బోర్డ్కి తీసుకెళ్తున్నాను.' : "Taking you to your dashboard.");
            isNavigatingRef.current = true;
            setTimeout(() => {
              router.push('/dashboard');
            }, 500);
          } else {
            if (action === 'SIGN_IN') {
              speak(lang === 'hi-IN' ? 'आप पहले से ही साइन इन हैं। मैं आपकी कैसे मदद कर सकता हूँ?' : lang === 'te-IN' ? 'మీరు ఇప్పటికే సైన్ ఇన్ చేసారు. నేను మీకు ఎలా సహాయం చేయగలను?' : "You're already signed in. How can I help you?");
            } else {
              speak(lang === 'hi-IN' ? 'आप पहले से ही साइन इन हैं। मैं आपको डैशबोर्ड पर ले जा सकता हूँ या अभ्यास शुरू करने में मदद कर सकता हूँ।' : lang === 'te-IN' ? 'మీరు ఇప్పటికే సైన్ ఇన్ చేసారు. నేను మిమ్మల్ని డాష్బోర్డ్కు తీసుకెళ్లగలను లేదా ప్రాక్టీస్ ప్రారంభించడంలో సహాయపడగలను.' : "You're already signed in. I can take you to your dashboard or help you start a practice session.");
            }
          }
        } else {
          const msg = action === 'SIGN_IN' 
            ? (lang === 'hi-IN' ? 'ठीक है। मैं आपको साइन इन करने में मदद करूँगा।' : lang === 'te-IN' ? 'సరే. సైన్ ఇన్ చేయడంలో నేను మీకు సహాయం చేస్తాను.' : "Sure. I'll help you sign in.")
            : (lang === 'hi-IN' ? 'ठीक है। मैं आपका अकाउंट बनाने में मदद करूँगा।' : lang === 'te-IN' ? 'సరే. మీ ఖాతాను సృష్టించడంలో నేను మీకు సహాయం చేస్తాను.' : "Sure. I'll help you create your account.");
          speak(msg);
          isNavigatingRef.current = true;
          setTimeout(() => {
            router.push('/onboarding/mode');
          }, 500);
        }
      } catch (err) {
        console.error('[VOICE] Critical failure in SIGN_IN handler:', err);
        speak("I encountered an error trying to sign you in. Please try again.");
      }
      return;
    }

    if (action === 'OPEN_PRACTICE' || action === 'START_PRACTICE') {
      const merged = { ...collectedParamsRef.current, ...(payload || {}) };
      if (!merged.subject) {
        pendingIntentRef.current = 'START_PRACTICE';
        collectedParamsRef.current = merged;
        conversationStateRef.current = 'COLLECTING_PARAMETERS';
        speak("What subject would you like to practice?");
        return;
      }
      if (!merged.count) {
        pendingIntentRef.current = 'START_PRACTICE';
        collectedParamsRef.current = merged;
        conversationStateRef.current = 'COLLECTING_PARAMETERS';
        speak("How many questions?");
        return;
      }
      if (!merged.difficulty) {
        pendingIntentRef.current = 'START_PRACTICE';
        collectedParamsRef.current = merged;
        conversationStateRef.current = 'COLLECTING_PARAMETERS';
        speak("What difficulty: easy, medium, or hard?");
        return;
      }
      
      if (conversationStateRef.current !== 'CONFIRMING_ACTION' && conversationStateRef.current !== 'EXECUTING_ACTION') {
        pendingIntentRef.current = 'START_PRACTICE';
        collectedParamsRef.current = merged;
        conversationStateRef.current = 'CONFIRMING_ACTION';
        speak(`Okay. I'll start a ${merged.count}-question ${merged.difficulty} ${merged.subject} practice session. Shall I start?`);
        return;
      }

      payload = merged;
      conversationStateRef.current = 'EXECUTING_ACTION';
      pendingIntentRef.current = null;
      collectedParamsRef.current = {};
    }

    if (action === 'CONFIRM' && pendingIntentRef.current) {
       action = pendingIntentRef.current;
       payload = collectedParamsRef.current;
       pendingIntentRef.current = null;
       collectedParamsRef.current = {};
       conversationStateRef.current = 'EXECUTING_ACTION';
    }

    if (['OPEN_DASHBOARD', 'OPEN_HISTORY', 'OPEN_SETTINGS', 'LOGOUT', 'READ_PROGRESS', 'READ_HISTORY', 'READ_RESULTS'].includes(action)) {
       conversationStateRef.current = 'IDLE';
       pendingIntentRef.current = null;
       collectedParamsRef.current = {};
    }

    if (action === 'CHANGE_LANGUAGE' && typeof payload?.lang === 'string') {
      setLang(payload.lang as Locale);
      const msg = payload.lang === 'hi-IN' ? 'हिंदी चुनी गई।' : payload.lang === 'te-IN' ? 'తెలుగు ఎంచుకోబడింది.' : 'English selected.';
      speak(msg);
      // Let it fall through so page-level handlers (like VoiceGateway) can react
    }
    
    if (action === 'OPEN_DASHBOARD') {
      isNavigatingRef.current = true;
      router.push('/dashboard');
    }
    if (action === 'OPEN_EXAM' || action === 'START_EXAM') {
      if (getContextName() !== 'exam' && getContextName() !== 'practice') {
        isNavigatingRef.current = true;
        const query = new URLSearchParams();
        if (payload?.exam_id) query.set('exam_id', payload.exam_id as string);
        router.push(`/exam?${query.toString()}`);
      }
    }
    if (action === 'OPEN_PRACTICE' || action === 'START_PRACTICE') {
      if (getContextName() !== 'practice') {
        isNavigatingRef.current = true;
        const query = new URLSearchParams();
        if (payload?.subject) query.set('subject', payload.subject as string);
        if (payload?.count) query.set('count', String(payload.count));
        if (payload?.difficulty) query.set('difficulty', payload.difficulty as string);
        router.push(`/practice?${query.toString()}`);
      }
    }
    if (action === 'OPEN_HISTORY' || action === 'READ_PROGRESS' || action === 'READ_HISTORY' || action === 'READ_RESULTS') {
      isNavigatingRef.current = true;
      router.push('/history');
    }
    if (action === 'OPEN_SETTINGS') {
      isNavigatingRef.current = true;
      router.push('/settings');
    }
    if (action === 'LOGOUT') {
      isNavigatingRef.current = true;
      router.push('/auth/login');
    }

    // 3. Notify page-level handlers (like ExamEngine)
    handlersRef.current.forEach(h => h(action, payload));
  }, [getContextName, registry, router, setLang, speak, lang, pathname]);

  useEffect(() => {
    setOnResult(async (transcript) => {
      if (isNavigatingRef.current) {
        console.log(`[VOICE] Dropping command "${transcript}" because a navigation is in progress.`);
        return;
      }
      const capturedVersion = contextVersionRef.current;
      
      const command = await intentProvider.parse(transcript, lang, { 
        context: getContextName(),
        conversationState: conversationStateRef.current,
        pendingIntent: pendingIntentRef.current,
        collectedParams: collectedParamsRef.current
      });
      
      if (capturedVersion !== contextVersionRef.current) {
        console.log(`[VOICE] Dropping stale command "${transcript}". Context changed during processing.`);
        return;
      }

      // 1. If we are in COLLECTING_PARAMETERS state, try deterministic resolution first
      if (conversationStateRef.current === 'COLLECTING_PARAMETERS' && pendingIntentRef.current === 'START_PRACTICE') {
         if (!collectedParamsRef.current.subject) {
             const subject = await (await import('@/lib/catalog/examCatalog')).resolveSubject(transcript);
             if (subject) {
                 collectedParamsRef.current.subject = subject;
                 dispatchAction('START_PRACTICE', collectedParamsRef.current);
                 return;
             }
         } else if (!collectedParamsRef.current.count) {
             const numMatch = transcript.match(/\d+/);
             if (numMatch) {
                 collectedParamsRef.current.count = numMatch[0];
                 dispatchAction('START_PRACTICE', collectedParamsRef.current);
                 return;
             }
         } else if (!collectedParamsRef.current.difficulty) {
             const t = transcript.toLowerCase();
             let diff = null;
             if (t.includes('easy')) diff = 'easy';
             if (t.includes('medium')) diff = 'medium';
             if (t.includes('hard')) diff = 'hard';
             if (diff) {
                 collectedParamsRef.current.difficulty = diff;
                 dispatchAction('START_PRACTICE', collectedParamsRef.current);
                 return;
             }
         }
      }
      
      if (conversationStateRef.current === 'COLLECTING_PARAMETERS' && pendingIntentRef.current === 'START_EXAM') {
          if (!collectedParamsRef.current.exam_id) {
             const exam = await (await import('@/lib/catalog/examCatalog')).resolveExam(transcript);
             if (exam) {
                 collectedParamsRef.current.exam_id = exam.id;
                 dispatchAction('START_EXAM', collectedParamsRef.current);
                 return;
             }
          }
      }

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
        action = command.intent as SafeAction;
        payload = command.payload || null;
      } else {
        action = registry.getActionMapping(command.type);
      }

      if (action) {
        console.log(`[VOICE]
raw transcript: ${transcript}
normalized transcript: ${transcript.trim().toLowerCase()}
current route: ${pathname}
current voice state: ${conversationStateRef.current}
current context: ${getContextName()}
deterministic intent: ${command.type}
LLM intent (if used): ${command.type === 'NATURAL_INTENT' ? command.intent : 'N/A'}
final intent: ${action}
authorization: ${registry.isActionAllowed(action, getContextName()) ? 'ALLOWED' : 'REJECTED'}`);
        dispatchAction(action, payload);
      } else if (command.type === 'UNKNOWN') {
        dispatchAction('UNKNOWN_COMMAND', { transcript });
      }
    });
  }, [lang, setOnResult, intentProvider, getContextName, registry, dispatchAction, pathname]);

  return (
    <GlobalVoiceContext.Provider value={{ 
      registerHandler: (h) => {
        if (!handlersRef.current.includes(h)) {
          handlersRef.current.push(h);
        }
      }, 
      unregisterHandler: (h) => {
        handlersRef.current = handlersRef.current.filter(x => x !== h);
      },
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
