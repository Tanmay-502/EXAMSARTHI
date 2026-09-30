'use client'

import React, { createContext, useContext, useEffect, ReactNode, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { Locale } from '@/lib/i18n/registry';
import { DeterministicIntentProvider, OptionalLLMIntentProvider } from '@/lib/voice/intentRouter';
import { SafeAction, SafeActionRegistry } from '@/lib/voice/safeActionRegistry';
import { createClient } from '@/lib/supabase/client';
import { useVoiceAppContext, type VoiceAppContext } from '@/lib/store/voiceContextStore';
import { naturalIntentEnvelopeSchema, validateNaturalIntentPayload } from '@/lib/voice/naturalIntentSchema';
import { clearExamStorage } from '@/lib/store/clearExamStorage';

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
  const { setOnResult, speak, retranscribeLastUtterance, getRecognitionConfidence } = useVoice();
  const { lang, setLang, t } = useI18n();
  const pathname = usePathname();
  const voiceContext = useVoiceAppContext((state) => state.context);
  const router = useRouter();

  const handlersRef = React.useRef<VoiceActionHandler[]>([]);
  const conversationStateRef = React.useRef<ConversationState>('IDLE');
  const pendingIntentRef = React.useRef<SafeAction | null>(null);
  const collectedParamsRef = React.useRef<Record<string, unknown>>({});
  const lastActionRef = React.useRef<{ action: SafeAction; at: number } | null>(null);
  const deterministicIntentProvider = React.useMemo(() => new DeterministicIntentProvider(), []);
  const intentProvider = React.useMemo(() => new OptionalLLMIntentProvider(), []);
  const registry = React.useMemo(() => new SafeActionRegistry(), []);

  const registerHandler = React.useCallback((handler: VoiceActionHandler) => {
    if (!handlersRef.current.includes(handler)) {
      handlersRef.current.push(handler);
    }
  }, []);

  const unregisterHandler = React.useCallback((handler: VoiceActionHandler) => {
    handlersRef.current = handlersRef.current.filter(x => x !== handler);
  }, []);

  const getContextName = useCallback((): VoiceAppContext => {
    if (pathname === '/' || pathname === '/welcome') return 'landing';
    if (pathname === '/onboarding/mode') return 'mode_selection';
    if (pathname === '/onboarding/language') return 'language_selection';
    if (pathname.startsWith('/onboarding')) return 'onboarding';
    if (pathname.startsWith('/dashboard')) return 'dashboard';
    if (pathname.startsWith('/exam')) return voiceContext === 'exam_active' ? 'exam_active' : 'exam_lobby';
    if (pathname.startsWith('/practice')) return voiceContext === 'practice_active' ? 'practice_active' : 'practice_setup';
    if (pathname.startsWith('/results')) return 'results';
    if (pathname.startsWith('/history')) return 'history';
    if (pathname.startsWith('/auth')) return 'auth';
    if (pathname.startsWith('/settings')) return 'settings';
    if (pathname.startsWith('/analysis')) return 'analysis';
    return 'unknown';
  }, [pathname, voiceContext]);

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
      if (context === 'exam_active' || context === 'practice_active') {
        const msg = lang === 'hi-IN'
          ? 'मैं परीक्षा संचालित करने में आपकी मदद कर सकता हूँ, लेकिन मैं किसी सक्रिय प्रश्न का उत्तर नहीं दे सकता या उसे हल नहीं कर सकता।'
          : lang === 'te-IN'
            ? 'పరీక్షను నిర్వహించడంలో నేను మీకు సహాయం చేయగలను, కానీ నేను యాక్టివ్ ప్రశ్నకు సమాధానం ఇవ్వలేను లేదా పరిష్కరించలేను.'
            : 'I can help you operate the exam, but I cannot answer or solve an active exam question.';
        speak(msg);
      }
      return;
    }

    if (!registry.isActionAllowed(action, context)) {
      console.warn(`Action ${action} is not allowed in context ${context}`);
      if ((context === 'exam_active' || context === 'practice_active') && [
        'OPEN_DASHBOARD', 'OPEN_HISTORY', 'OPEN_SETTINGS', 'OPEN_PRACTICE',
        'START_PRACTICE', 'OPEN_EXAM', 'START_EXAM', 'OPEN_ANALYSIS', 'LOGOUT'
      ].includes(action)) {
        speak(
          lang === 'hi-IN'
            ? 'मैं सक्रिय परीक्षा के दौरान बाहर नहीं जा सकता। पहले परीक्षा जमा करें।'
            : lang === 'te-IN'
              ? 'యాక్టివ్ పరీక్ష సమయంలో నేను బయటకు తీసుకెళ్లలేను. ముందుగా పరీక్షను సమర్పించండి.'
              : 'I cannot leave or restart an active exam. Please submit the exam before navigating away.'
        );
      } else if (action === 'UNKNOWN_COMMAND') {
        speak(
          lang === 'hi-IN'
            ? 'क्षमा करें, मुझे समझ नहीं आया। कृपया फिर से कोशिश करें।'
            : lang === 'te-IN'
              ? 'క్షమించండి, నాకు అర్థం కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.'
              : 'I could not understand that. Please try again.'
        );
      } else {
        speak(
          lang === 'hi-IN'
            ? 'यह कार्रवाई यहाँ उपलब्ध नहीं है।'
            : lang === 'te-IN'
              ? 'ఈ చర్య ఇక్కడ అందుబాటులో లేదు.'
              : "That action isn't available here."
        );
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

    if (handledLocally) {
      conversationStateRef.current = 'IDLE';
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

    if (action === 'SIGN_IN') {
      speak(t('voice_login_opening'));
      isNavigatingRef.current = true;
      router.push('/auth/login');
      return;
    }

    const authRequiredActions: SafeAction[] = [
      'OPEN_DASHBOARD', 'OPEN_HISTORY', 'OPEN_SETTINGS', 'OPEN_PRACTICE', 'OPEN_EXAM',
      'START_PRACTICE', 'START_EXAM', 'READ_PROGRESS', 'OPEN_ANALYSIS'
    ];

    if (context === 'landing' && authRequiredActions.includes(action)) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          const next = action === 'OPEN_HISTORY' ? '/history'
            : action === 'OPEN_SETTINGS' ? '/settings'
              : action === 'OPEN_PRACTICE' || action === 'START_PRACTICE' ? '/practice'
                : action === 'OPEN_EXAM' || action === 'START_EXAM' ? '/exam'
                  : action === 'OPEN_ANALYSIS' ? '/analysis'
                    : '/dashboard';
          speak(t('voice_login_required'));
          isNavigatingRef.current = true;
          router.push('/auth/login?next=' + encodeURIComponent(next));
          return;
        }
      } catch (error) {
        console.error('[VOICE] Auth gate check failed:', error);
      }
    }

    if (['OPEN_DASHBOARD', 'OPEN_HISTORY', 'OPEN_SETTINGS', 'LOGOUT', 'READ_PROGRESS', 'READ_HISTORY', 'READ_RESULTS', 'OPEN_ANALYSIS'].includes(action)) {
       conversationStateRef.current = 'IDLE';
       pendingIntentRef.current = null;
       collectedParamsRef.current = {};
    }

    if (action === 'CHANGE_LANGUAGE' && typeof payload?.lang === 'string') {
      setLang(payload.lang as Locale);
      const msg = payload.lang === 'hi-IN' ? 'हिंदी चुनी गई।' : payload.lang === 'te-IN' ? 'తెలుగు ఎంచుకోబడింది.' : 'Language changed successfully.';
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
      if (context === 'exam_active') {
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
      if (context === 'practice_setup' || context === 'practice_active') {
        return;
      }
      speak(lang === 'hi-IN' ? 'अभ्यास मोड खोल रहा हूँ।' : lang === 'te-IN' ? 'ప్రాక్టీస్ మోడ్ తెరుస్తున్నాను.' : 'Opening practice mode.');
      isNavigatingRef.current = true;
      const query = new URLSearchParams();
      if (payload?.subject) query.set('subject', payload.subject as string);
      if (payload?.count) query.set('count', String(payload.count));
      if (payload?.difficulty) query.set('difficulty', payload.difficulty as string);
      const queryString = query.toString();
      router.push(queryString ? `/practice?${queryString}` : '/practice');
    }
    if (action === 'OPEN_HISTORY' || action === 'READ_HISTORY' || action === 'READ_RESULTS') {
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
      speak(
        lang === 'hi-IN'
          ? 'लॉग आउट किया जा रहा है।'
          : lang === 'te-IN'
            ? 'లాగ్ అవుట్ చేస్తున్నాను.'
            : 'Logging you out.'
      );
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        await clearExamStorage();
        isNavigatingRef.current = true;
        router.push('/');
      } catch (error) {
        console.error('[VOICE] Sign-out failed:', error);
        isNavigatingRef.current = false;
        speak(
          lang === 'hi-IN'
            ? 'लॉग आउट नहीं हो सका। कृपया फिर से प्रयास करें।'
            : lang === 'te-IN'
              ? 'లాగ్ అవుట్ కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.'
              : 'I could not log you out. Please try again.'
        );
      }
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

      conversationStateRef.current = 'AWAITING_INTENT';
      const capturedVersion = contextVersionRef.current;
      const intentContext = {
        context: getContextName(),
        conversationState: conversationStateRef.current,
        pendingIntent: pendingIntentRef.current,
        collectedParams: collectedParamsRef.current,
        lastAction: lastActionRef.current?.action ?? null,
        lastActionAt: lastActionRef.current?.at ?? null,
      };

      let bestTranscript = transcript.trim();
      let command = await deterministicIntentProvider.parse(bestTranscript, lang, intentContext);

      // Browser speech is fast, but a noisy microphone can produce a low-confidence
      // or incorrect transcript that still looks like a valid phrase. Escalate low-
      // confidence and unrecognized speech to the cloud transcription fallback before
      // any action is authorized. The captured audio is transient and never persisted.
      const confidence = getRecognitionConfidence();
      const shouldRecoverAudio = command.type === 'UNKNOWN' || (confidence !== null && confidence < 0.72);
      if (shouldRecoverAudio) {
        const recoveredTranscript = await retranscribeLastUtterance();
        if (recoveredTranscript && recoveredTranscript.toLowerCase() !== bestTranscript.toLowerCase()) {
          bestTranscript = recoveredTranscript;
          command = await deterministicIntentProvider.parse(bestTranscript, lang, intentContext);
        }
      }

      if (command.type === 'UNKNOWN') {
        command = await intentProvider.parse(bestTranscript, lang, intentContext);
      }

      if (capturedVersion !== contextVersionRef.current) {
        console.log(`[VOICE] Dropping stale command "${bestTranscript}". Context changed during processing.`);
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
        const envelope = naturalIntentEnvelopeSchema.safeParse(command);
        if (!envelope.success) {
          console.warn('[VOICE] Invalid natural intent envelope rejected');
          action = 'UNKNOWN_COMMAND';
          payload = null;
        } else {
          const validatedPayload = validateNaturalIntentPayload(envelope.data.intent, envelope.data.payload);
          if (!validatedPayload.success) {
            console.warn('[VOICE] Invalid natural intent payload rejected', envelope.data.intent);
            action = 'UNKNOWN_COMMAND';
            payload = null;
          } else {
            action = envelope.data.intent as SafeAction;
            payload = (validatedPayload.data && typeof validatedPayload.data === 'object')
              ? validatedPayload.data as Record<string, unknown>
              : null;
          }
        }
      } else {
        action = registry.getActionMapping(command.type);
      }

      if (action) {
        conversationStateRef.current = 'EXECUTING_ACTION';
        lastActionRef.current = { action, at: Date.now() };
        console.log(`[VOICE]
raw transcript: ${transcript}
normalized transcript: ${bestTranscript.trim().toLowerCase()}
current route: ${pathname}
current voice state: ${conversationStateRef.current}
current context: ${getContextName()}
deterministic intent: ${command.type}
LLM intent (if used): ${command.type === 'NATURAL_INTENT' ? command.intent : 'N/A'}
final intent: ${action}
authorization: ${registry.isActionAllowed(action, getContextName()) ? 'ALLOWED' : 'REJECTED'}`);
        dispatchAction(action, payload, bestTranscript);
      } else if (command.type === 'UNKNOWN') {
        conversationStateRef.current = 'ERROR_RECOVERY';
        dispatchAction('UNKNOWN_COMMAND', { transcript: bestTranscript }, bestTranscript);
      }
    });
  }, [lang, setOnResult, deterministicIntentProvider, intentProvider, getContextName, registry, dispatchAction, pathname, retranscribeLastUtterance, getRecognitionConfidence]);

  return (
    <GlobalVoiceContext.Provider value={{
      registerHandler,
      unregisterHandler,
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

  const { registerHandler, unregisterHandler } = context;

  return {
    useVoiceAction: (handler: VoiceActionHandler) => {
      const handlerRef = React.useRef(handler);
      handlerRef.current = handler;
      const stableHandler = React.useCallback((...args: Parameters<VoiceActionHandler>) => {
        return handlerRef.current(...args);
      }, []);

      React.useEffect(() => {
        registerHandler(stableHandler);
        return () => unregisterHandler(stableHandler);
      }, [registerHandler, unregisterHandler, stableHandler]);
    },
    dispatchAction: context.dispatchAction,
    getContextName: context.getContextName
  };
}
