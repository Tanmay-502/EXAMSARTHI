'use client'

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nProvider';

type VoiceState = 'IDLE' | 'REQUESTING_PERMISSION' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'PAUSED' | 'ERROR';

type VoiceContextType = {
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => void;
  startContinuousListening: (onResult?: (text: string) => void) => void;
  pauseListening: () => void;
  setOnResult: (onResult: (text: string) => void) => void;
  isListening: boolean;
  isContinuous: boolean;
  micError: string | null;
  voiceState: VoiceState;
};

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [isContinuous, setIsContinuous] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  
  const { lang, t } = useI18n();
  
  const langRef = useRef(lang);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isContinuousRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>('IDLE');
  const utteranceQueueRef = useRef<string[]>([]);
  const speechSessionIdRef = useRef<number>(0);
  const onResultRef = useRef<((text: string) => void) | null>(null);
  const micErrorRef = useRef<string | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateVoiceState = useCallback((state: VoiceState) => {
    setVoiceState(state);
    voiceStateRef.current = state;
  }, []);

  useEffect(() => {
    langRef.current = lang;
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
    }
  }, [lang]);

  useEffect(() => {
    micErrorRef.current = micError;
  }, [micError]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const reco = new SpeechRecognition();
        reco.continuous = false;
        reco.interimResults = false;
        recognitionRef.current = reco;
      }
    }
    
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playNextUtterance = useCallback(function playNext(sessionId: number) {
    if (speechSessionIdRef.current !== sessionId) return;

    if (utteranceQueueRef.current.length === 0) {
      if (voiceStateRef.current === 'SPEAKING') {
        updateVoiceState('IDLE');
      }
      
      if (isContinuousRef.current && onResultRef.current && micErrorRef.current !== 'denied' && micErrorRef.current !== 'not-supported') {
        // Small delay before restarting mic after speaking to avoid feedback
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          if (isContinuousRef.current && voiceStateRef.current !== 'SPEAKING') {
            try { 
              recognitionRef.current?.start(); 
            } catch { /* ignore AlreadyStarted */ }
          }
        }, 300);
      }
      return;
    }

    const sentence = utteranceQueueRef.current.shift()!;
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = langRef.current;
    
    utterance.onstart = () => {
      updateVoiceState('SPEAKING');
    };
    
    utterance.onend = () => {
      playNext(sessionId);
    };
    
    utterance.onerror = () => {
      if (speechSessionIdRef.current !== sessionId) return;
      utteranceQueueRef.current = [];
      updateVoiceState('IDLE');
      
      if (isContinuousRef.current && onResultRef.current && micErrorRef.current !== 'denied' && micErrorRef.current !== 'not-supported') {
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          try { recognitionRef.current?.start(); } catch { /* ignore */ }
        }, 300);
      }
    };
    
    window.speechSynthesis.speak(utterance);
  }, [updateVoiceState]);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    speechSessionIdRef.current += 1;
    const currentSession = speechSessionIdRef.current;
    
    window.speechSynthesis.cancel();
    
    updateVoiceState('SPEAKING');
    
    // Stop listening temporarily to prevent hearing itself
    const reco = recognitionRef.current;
    if (reco) {
      try { reco.stop(); } catch { /* ignore */ }
    }

    // Split text by punctuation to avoid TTS truncation bug in Chromium
    const parts = text.split(/([.,!?;।]+)/);
    const sentences: string[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      const sentence = (parts[i] || '').trim() + (parts[i + 1] || '');
      if (sentence.trim().length > 0) {
        sentences.push(sentence.trim());
      }
    }

    utteranceQueueRef.current = sentences;
    playNextUtterance(currentSession);
  }, [playNextUtterance, updateVoiceState]);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    speechSessionIdRef.current += 1;
    utteranceQueueRef.current = [];
    window.speechSynthesis.cancel();
    
    if (voiceStateRef.current === 'SPEAKING') {
      updateVoiceState('IDLE');
    }
    
    if (isContinuousRef.current && onResultRef.current && micErrorRef.current !== 'denied' && micErrorRef.current !== 'not-supported') {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = setTimeout(() => {
        try { recognitionRef.current?.start(); } catch { /* ignore */ }
      }, 300);
    }
  }, [updateVoiceState]);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setMicError('not-supported');
      micErrorRef.current = 'not-supported';
      updateVoiceState('ERROR');
      speak(t('mic_check_fail'));
      return;
    }
    setMicError(null);
    micErrorRef.current = null;
    
    recognition.lang = langRef.current;
    
    recognition.onstart = () => {
      if (voiceStateRef.current !== 'SPEAKING') {
        updateVoiceState('LISTENING');
      }
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      updateVoiceState('PROCESSING');
      if (onResultRef.current) onResultRef.current(transcript);
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setMicError('denied');
        micErrorRef.current = 'denied';
        isContinuousRef.current = false;
        setIsContinuous(false);
        updateVoiceState('ERROR');
        speak(t('mic_check_fail'));
      } else if (event.error === 'network' || event.error === 'no-speech' || event.error === 'audio-capture') {
        // Transient errors, attempt recovery if continuous
        if (event.error === 'network') {
          setMicError('network');
          micErrorRef.current = 'network';
        }
        if (voiceStateRef.current !== 'SPEAKING') {
          updateVoiceState('IDLE');
        }
      } else if (event.error !== 'aborted') {
        setMicError(event.error);
        micErrorRef.current = event.error;
        if (voiceStateRef.current !== 'SPEAKING') {
          updateVoiceState('ERROR');
        }
      } else {
         if (voiceStateRef.current !== 'SPEAKING') {
           updateVoiceState('IDLE');
         }
      }
    };
    
    recognition.onend = () => {
      if (voiceStateRef.current === 'LISTENING') {
        updateVoiceState('IDLE');
      }
      
      // Safely restart if continuous mode is active, not speaking, and no fatal error
      if (isContinuousRef.current && voiceStateRef.current !== 'SPEAKING' && micErrorRef.current !== 'denied' && micErrorRef.current !== 'not-supported') {
        // Add delay with backoff
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          if (isContinuousRef.current && voiceStateRef.current !== 'SPEAKING') {
            try { recognition.start(); } catch { /* ignore */ }
          }
        }, 500); // 500ms delay to prevent tight loop
      }
    };
    
    if (voiceStateRef.current !== 'SPEAKING') {
      try {
        updateVoiceState('REQUESTING_PERMISSION');
        recognition.start();
      } catch {
        // ignore AlreadyStarted error
        updateVoiceState('LISTENING');
      }
    }
  }, [speak, t, updateVoiceState]);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop();
      if (voiceStateRef.current === 'LISTENING') {
        updateVoiceState('IDLE');
      }
    }
  }, [updateVoiceState]);

  const startContinuousListening = useCallback((onResult?: (text: string) => void) => {
    isContinuousRef.current = true;
    setIsContinuous(true);
    if (onResult) {
      onResultRef.current = onResult;
    }
    startListening();
  }, [startListening]);

  const setOnResult = useCallback((onResult: (text: string) => void) => {
    onResultRef.current = onResult;
  }, []);

  const pauseListening = useCallback(() => {
    isContinuousRef.current = false;
    setIsContinuous(false);
    onResultRef.current = null;
    stopListening();
    updateVoiceState('PAUSED');
  }, [stopListening, updateVoiceState]);

  return (
    <VoiceContext.Provider value={{ 
      speak, stopSpeaking, isSpeaking: voiceState === 'SPEAKING', 
      startListening, stopListening, isListening: voiceState === 'LISTENING' || voiceState === 'REQUESTING_PERMISSION', 
      startContinuousListening, pauseListening, isContinuous,
      setOnResult,
      micError,
      voiceState 
    }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) throw new Error('useVoice must be used within VoiceProvider');
  return context;
}
