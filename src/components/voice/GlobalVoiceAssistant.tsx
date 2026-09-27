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

type VoiceActionHandler = (action: SafeAction, payload?: Record<string, unknown> | null, transcript?: string) => boolean | void;

interface GlobalVoiceContextType {
  registerHandler: (handler: VoiceActionHandler) => void;
  unregisterHandler: (handler: VoiceActionHandler) => void;
  dispatchAction: (action: SafeAction, payload?: Record<string, unknown> | null, transcript?: string) => void;
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
    if (pathname === '/onboarding/mode') return 'mode_selection';
    if (pathname === '/onboarding/language') return 'language_selection';
    if (pathname.startsWith('/onboarding')) return 'onboarding';
    if (pathname.startsWith('/dashboard')) return 'dashboard';
    if (pathname.startsWith('/exam')) return 'exam';
    if (pathname.startsWith('/practice')) return 'practice';
    if (pathname.startsWith('/results')) return 'results';
    if (pathname.startsWith('/history')) return 'history';
    if (pathname.startsWith('/auth')) return 'auth';
    if (pathname.startsWith('/analysis')) return 'analysis';
    if (pathname.startsWith('/settings')) return 'settings';
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

  const dispatchAction = React.useCallback(async (action: SafeAction, payload?: Record<string, unknown> | null, transcript?: string) => {
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
      // During an active exam, navigation/logout/restart requests must never
      // be swallowed silently. Give the candidate an explicit spoken boundary.
      if (context === 'exam' && [
        'OPEN_DASHBOARD',
        'OPEN_HISTORY',
        'OPEN_SETTINGS',
        'OPEN_PRACTICE',
        'START_PRACTICE',
        'OPEN_ANALYSIS',
        'LOGOUT'
      ].includes(action)) {
        speak(
          lang === 'hi-IN'
            ? 'मैं सक्रिय परीक्षा के दौरान बाहर नहीं जा सकता। पहले परीक्षा जमा करें।'
            : lang === 'te-IN'
            ? 'యాక్టివ్ పరీక్ష సమయంలో నేను బయటకు తీసుకెళ్లలేను. ముందుగా పరీక్షను సమర్పించండి.'
            : 'I cannot leave or restart an active exam. Please submit the exam before navigating away.'
        );
      } else if (action !== 'UNKNOWN_COMMAND') {
         // Speak for other valid commands that are not allowed here
         speak(lang === 'hi-IN' ? 'यह कार्रवाई यहाँ उपलब्ध नहीं है।' : lang === 'te-IN' ? 'ఈ చర్య ఇక్కడ అందుబాటులో లేదు.' : "That action isn't available here.");
      }
      
      // Fallback for unknown
      if (action === 'UNKNOWN_COMMAND') {
         if (context === 'dashboard') {
           speak(lang === 'hi-IN' ? 'मुझे समझ नहीं आया। आप अभ्यास, विश्लेषण, परिणाम या इतिहास कह सकते हैं।' : lang === 'te-IN' ? 'నాకు అర్థం కాలేదు. మీరు ప్రాక్టీస్, విశ్లేషణ, ఫలితాలు లేదా చరిత్ర అని చెప్పవచ్చు.' : "I didn't understand that. You can say practice, analysis, results, or history.");
         } else if (context === 'language_selection') {
           speak(lang === 'hi-IN' ? 'कृपया अंग्रेजी, हिंदी या तेलुगु कहें।' : lang === 'te-IN' ? 'దయచేసి ఇంగ్లీష్, హిందీ లేదా తెలుగు అని చెప్పండి.' : "Please say English, Hindi, or Telugu.");
         } else if (context === 'mode_selection') {
           speak(lang === 'hi-IN' ? 'कृपया वॉयस मोड या सामान्य मोड कहें।' : lang === 'te-IN' ? 'దయచేసి వాయిస్ మోడ్ లేదా సాధారణ మోడ్ అని చెప్పండి.' : "Please say voice mode or standard mode.");
         } else {
           speak(lang === 'hi-IN' ? 'क्षमा करें, मुझे समझ नहीं आया। कृपया फिर से कोशिश करें।' : lang === 'te-IN' ? 'క్షమించండి, నాకు అర్థం కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.' : "I couldn't hear that clearly. Please try again.");
         }
      }
      return;
    }

    // Fallback for unknown
    if (action === 'UNKNOWN_COMMAND') {
       if (context === 'dashboard') {
         speak(lang === 'hi-IN' ? 'मुझे समझ नहीं आया। आप अभ्यास, विश्लेषण, परिणाम या इतिहास कह सकते हैं।' : lang === 'te-IN' ? 'నాకు అర్థం కాలేదు. మీరు ప్రాక్టీస్, విశ్లేషణ, ఫలితాలు లేదా చరిత్ర అని చెప్పవచ్చు.' : "I didn't understand that. You can say practice, analysis, results, or history.");
       } else if (context === 'language_selection') {
         speak(lang === 'hi-IN' ? 'कृपया अंग्रेजी, हिंदी या तेलुगु कहें।' : lang === 'te-IN' ? 'దయచేసి ఇంగ్లీష్, హిందీ లేదా తెలుగు అని చెప్పండి.' : "Please say English, Hindi, or Telugu.");
       } else if (context === 'mode_selection') {
         speak(lang === 'hi-IN' ? 'कृपया वॉयस मोड या सामान्य मोड कहें।' : lang === 'te-IN' ? 'దయచేసి వాయిస్ మోడ్ లేదా సాధారణ మోడ్ అని చెప్పండి.' : "Please say voice mode or standard mode.");
       } else {
         speak(lang === 'hi-IN' ? 'क्षमा करें, मुझे समझ नहीं आया। कृपया फिर से कोशिश करें।' : lang === 'te-IN' ? 'క్షమించండి, నాకు అర్థం కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.' : "I couldn't hear that clearly. Please try again.");
       }
       return;
    }

    // 1. Notify page-level handlers first so they can intercept and override global behavior
    let handledLocally = false;
    for (let i = handlersRef.current.length - 1; i >= 0; i--) {
      const h = handlersRef.current[i];
      if (h(action, payload, transcript)) {
        handledLocally = true;
        break;
      }
    }

    if (handledLocally) return;

    // Authentication is an explicit step in the public flow.
    // Never silently skip the visible Sign In / Create Account screen just
    // because the browser already has an existing session.
    if (action === 'SIGN_IN' || action === 'SIGN_UP') {
      const message = action === 'SIGN_IN'
        ? (lang === 'hi-IN'
            ? 'साइन इन पेज खोल रहा हूँ।'
            : lang === 'te-IN'
              ? 'సైన్ ఇన్ పేజీని తెరుస్తున్నాను.'
              : 'Opening the sign in and account page.')
        : (lang === 'hi-IN'
            ? 'साइन इन और अकाउंट बनाने का पेज खोल रहा हूँ।'
            : lang === 'te-IN'
              ? 'సైన్ ఇన్ లేదా ఖాతా సృష్టించే పేజీని తెరుస్తున్నాను.'
              : 'Opening the sign in and create account page.');

      speak(message);
      isNavigatingRef.current = true;
      router.push('/auth/login?from=voice');
      return;
    }

    if (['OPEN_DASHBOARD', 'OPEN_HISTORY', 'OPEN_SETTINGS', 'LOGOUT', 'READ_PROGRESS', 'READ_HISTORY', 'READ_RESULTS', 'OPEN_ANALYSIS'].includes(action)) {
       conversationStateRef.current = 'IDLE';
       pendingIntentRef.current = null;
       collectedParamsRef.current = {};
    }

    if (action === 'CHANGE_LANGUAGE' && typeof payload?.lang === 'string') {
      const requestedLang = payload.lang;
      if (!['en-IN', 'hi-IN', 'te-IN'].includes(requestedLang)) {
        speak('Please choose English, Hindi, or Telugu.');
        return;
      }

      setLang(requestedLang as Locale);
      const msg = requestedLang === 'hi-IN'
        ? 'हिंदी चुनी गई।'
        : requestedLang === 'te-IN'
          ? 'తెలుగు ఎంచుకోబడింది.'
          : 'Language changed successfully.';
      speak(msg);
    }
    
    if (action === 'OPEN_ANALYSIS') {
      speak(lang === 'hi-IN' ? 'आपका प्रदर्शन विश्लेषण खोल रहा हूँ।' : lang === 'te-IN' ? 'మీ పనితీరు విశ్లేషణను తెరుస్తున్నాను.' : 'Sure. I\'ll open your performance analysis.');
      isNavigatingRef.current = true;
      router.push('/analysis');
    }
    
    if (action === 'OPEN_DASHBOARD') {
      speak(lang === 'hi-IN' ? 'डैशबोर्ड खोल रहा हूँ।' : lang === 'te-IN' ? 'డాష్బోర్డ్ తెరుస్తున్నాను.' : 'Opening your dashboard.');
      isNavigatingRef.current = true;
      router.push('/dashboard');
    }
    if (action === 'OPEN_EXAM' || action === 'START_EXAM') {
      if (getContextName() === 'exam') {
        speak(lang === 'hi-IN' ? 'आप पहले से ही परीक्षा मोड में हैं।' : lang === 'te-IN' ? 'మీరు ఇప్పటికే పరీక్ష మోడ్‌లో ఉన్నారు.' : 'You are already in exam mode.');
      } else {
        speak(lang === 'hi-IN' ? 'परीक्षा खोल रहा हूँ।' : lang === 'te-IN' ? 'పరీక్షను తెరుస్తున్నాను.' : 'Opening exam mode.');
        isNavigatingRef.current = true;
        const query = new URLSearchParams();
        if (payload?.exam_id) query.set('exam_id', payload.exam_id as string);
        router.push(query.toString() ? `/exam?${query.toString()}` : '/exam');
      }
    }
    if (action === 'OPEN_PRACTICE' || action === 'START_PRACTICE') {
      if (getContextName() !== 'practice') {
        speak(lang === 'hi-IN' ? 'अभ्यास मोड खोल रहा हूँ।' : lang === 'te-IN' ? 'ప్రాక్టీస్ మోడ్ తెరుస్తున్నాను.' : 'Opening practice mode.');
        isNavigatingRef.current = true;
        const query = new URLSearchParams();
        if (payload?.subject) query.set('subject', payload.subject as string);
        if (payload?.count) query.set('count', String(payload.count));
        if (payload?.difficulty) query.set('difficulty', payload.difficulty as string);
        router.push(`/practice?${query.toString()}`);
      } else {
        speak(lang === 'hi-IN' ? 'आप पहले से ही अभ्यास मोड में हैं।' : lang === 'te-IN' ? 'మీరు ఇప్పటికే ప్రాక్టీస్ మోడ్‌లో ఉన్నారు.' : 'You are already in practice mode.');
      }
    }
    if (action === 'OPEN_HISTORY' || action === 'READ_PROGRESS' || action === 'READ_HISTORY' || action === 'READ_RESULTS') {
      speak(lang === 'hi-IN' ? 'आपका इतिहास खोल रहा हूँ।' : lang === 'te-IN' ? 'మీ చరిత్రను తెరుస్తున్నాను.' : 'Opening your results and history.');
      isNavigatingRef.current = true;
      router.push('/history');
    }
    if (action === 'OPEN_SETTINGS') {
      speak(lang === 'hi-IN' ? 'सेटिंग्स खोल रहा हूँ।' : lang === 'te-IN' ? 'సెట్టింగ్‌లను తెరుస్తున్నాను.' : 'Opening settings.');
      isNavigatingRef.current = true;
      router.push('/settings');
    }
    if (action === 'LOGOUT') {
      speak(lang === 'hi-IN' ? 'लॉग आउट कर रहा हूँ।' : lang === 'te-IN' ? 'లాగ్ అవుట్ చేస్తున్నాను.' : 'Logging you out.');
      isNavigatingRef.current = true;

      const supabase = createClient();
      supabase.auth.signOut().finally(() => {
        router.push('/');
      });
    }

  }, [getContextName, registry, router, setLang, speak, lang, pathname]);

  useEffect(() => {
    setOnResult(async (transcript) => {
      if (isNavigatingRef.current) {
        console.log(`[VOICE] Dropping command "${transcript}" because a navigation is in progress.`);
        return;
      }

      // Try raw intercept first to bypass LLM delay during setup states
      let handledRaw = false;
      for (let i = handlersRef.current.length - 1; i >= 0; i--) {
        const h = handlersRef.current[i];
        if (h('RAW_TRANSCRIPT' as SafeAction, null, transcript)) {
          handledRaw = true;
          break;
        }
      }
      if (handledRaw) {
        console.log(`[VOICE] Transcript "${transcript}" handled locally without intent parsing.`);
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
        dispatchAction(action, payload, transcript);
      } else if (command.type === 'UNKNOWN') {
        dispatchAction('UNKNOWN_COMMAND', { transcript }, transcript);
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
