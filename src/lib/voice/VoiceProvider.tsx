'use client'

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { useAccessibility } from '../accessibility/AccessibilityProvider';

type VoiceState = 'IDLE' | 'REQUESTING_PERMISSION' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'PAUSED' | 'ERROR';

type TranscriptMessage = {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
};

type VoiceContextType = {
  speak: (text: string, options?: { dedupe?: boolean }) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => void;
  startContinuousListening: (onResult?: (text: string) => void | Promise<void>) => void;
  startSecureContinuousListening: (onResult: (text: string) => void | Promise<void>) => void;
  pauseListening: () => void;
  setOnResult: (onResult: (text: string) => void | Promise<void>) => void;
  isListening: boolean;
  isContinuous: boolean;
  micError: string | null;
  voiceState: VoiceState;
  transcript: TranscriptMessage[];
  speechWarning: string | null;
  retranscribeLastUtterance: () => Promise<string | null>;
};

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [isContinuous, setIsContinuous] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  
  const { lang, t } = useI18n();
  const { speechRate, voiceURI, announce } = useAccessibility();
  
  const langRef = useRef(lang);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isContinuousRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>('IDLE');
  const utteranceQueueRef = useRef<string[]>([]);
  const speechSessionIdRef = useRef<number>(0);
  const onResultRef = useRef<((text: string) => void | Promise<void>) | null>(null);
  const processingRef = useRef(false);
  const micErrorRef = useRef<string | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpokenRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const [speechWarning, setSpeechWarning] = useState<string | null>(null);
  const lastSpeechWarningLangRef = useRef<string>('');
  const lastTranscriptRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const sensitiveInputRef = useRef(false);
  const finalResultCursorRef = useRef(0);
  const pendingTranscriptRef = useRef('');
  const transcriptDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioReadyRef = useRef<Promise<Blob | null>>(Promise.resolve(null));
  const audioReadyResolveRef = useRef<((blob: Blob | null) => void) | null>(null);
  const lastAudioBlobRef = useRef<{ blob: Blob; at: number } | null>(null);
  const lastAudioSensitiveRef = useRef(false);
  const audioMimeTypeRef = useRef<string>('audio/webm');

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
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (transcriptDebounceRef.current) {
        clearTimeout(transcriptDebounceRef.current);
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
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
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          if (isContinuousRef.current && voiceStateRef.current === 'IDLE') {
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
    const locale = langRef.current.toLowerCase();
    utterance.lang = langRef.current;
    utterance.rate = speechRate;

    const installedVoices = typeof window !== 'undefined' ? window.speechSynthesis.getVoices() : [];
    const selectedVoice = voiceURI
      ? installedVoices.find((voice) => voice.voiceURI === voiceURI)
      : undefined;
    const localePrefix = locale.split('-')[0];
    const localeVoice = installedVoices.find((voice) => voice.lang.toLowerCase() === locale)
      ?? installedVoices.find((voice) => voice.lang.toLowerCase().startsWith(localePrefix + '-'));
    const selectedVoiceMatchesLocale = selectedVoice
      ? selectedVoice.lang.toLowerCase() === locale ||
        selectedVoice.lang.toLowerCase().startsWith(localePrefix + '-')
      : false;

    if (selectedVoice && selectedVoiceMatchesLocale) {
      utterance.voice = selectedVoice;
    } else if (localeVoice) {
      utterance.voice = localeVoice;
      setSpeechWarning(null);
    } else {
      const languageName = locale === 'hi-in' ? 'Hindi' : locale === 'te-in' ? 'Telugu' : 'English';
      const warning = `No ${languageName} voice installed. Using the browser default voice.`;
      setSpeechWarning(warning);
      if (lastSpeechWarningLangRef.current !== locale) {
        lastSpeechWarningLangRef.current = locale;
        announce(warning, 'assertive');
      }
    }
    
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
          if (voiceStateRef.current !== 'IDLE') return;
          try { recognitionRef.current?.start(); } catch { /* ignore */ }
        }, 300);
      }
    };
    
    window.speechSynthesis.speak(utterance);
  }, [speechRate, updateVoiceState, voiceURI]);

  const speak = useCallback((text: string, options?: { dedupe?: boolean }) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const normalizedText = text.trim().replace(/\s+/g, ' ');
    if (!normalizedText) return;

    const dedupe = options?.dedupe !== false;
    const now = Date.now();
    if (
      dedupe &&
      lastSpokenRef.current.text === normalizedText &&
      now - lastSpokenRef.current.at < 1500
    ) {
      return;
    }
    if (dedupe) lastSpokenRef.current = { text: normalizedText, at: now };
    
    speechSessionIdRef.current += 1;
    const currentSession = speechSessionIdRef.current;
    
    window.speechSynthesis.cancel();
    updateVoiceState('SPEAKING');
    
    setTranscript(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      sender: 'assistant',
      text,
      timestamp: new Date()
    }]);
    
    const reco = recognitionRef.current;
    if (reco) {
      try { reco.stop(); } catch { /* ignore */ }
    }

    const rawSentences = normalizedText.split(/(?<=[.!?।])\s+/);
    const sentences: string[] = [];
    for (const sentence of rawSentences) {
      if (sentence.length <= 180) {
        sentences.push(sentence);
        continue;
      }
      for (let start = 0; start < sentence.length; start += 180) {
        sentences.push(sentence.slice(start, start + 180).trim());
      }
    }

    utteranceQueueRef.current = sentences.filter(Boolean);
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

  const getAudioMimeType = useCallback(() => {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return null;
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg'];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
  }, []);

  const startUtteranceRecording = useCallback(async () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return;

    try {
      const existingStream = mediaStreamRef.current;
      const hasLiveTrack = existingStream?.getTracks().some((track) => track.readyState === 'live');
      if (!hasLiveTrack) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      const mimeType = getAudioMimeType();
      if (!mimeType || !mediaStreamRef.current) return;

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }

      audioChunksRef.current = [];
      audioMimeTypeRef.current = mimeType.split(';')[0];
      audioReadyRef.current = new Promise((resolve) => {
        audioReadyResolveRef.current = resolve;
      });

      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType, audioBitsPerSecond: 64_000 });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = audioChunksRef.current.length > 0
          ? new Blob(audioChunksRef.current, { type: audioMimeTypeRef.current })
          : null;
        if (blob && blob.size > 0) {
          lastAudioBlobRef.current = { blob, at: Date.now() };
          lastAudioSensitiveRef.current = sensitiveInputRef.current;
        }
        audioReadyResolveRef.current?.(blob);
        audioReadyResolveRef.current = null;
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
      };
      recorder.onerror = () => {
        audioReadyResolveRef.current?.(null);
        audioReadyResolveRef.current = null;
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
      };
      recorder.start(250);
    } catch (error) {
      console.warn('[VOICE] Enhanced audio capture unavailable:', error);
    }
  }, [getAudioMimeType]);

  const stopUtteranceRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    try {
      recorder.stop();
    } catch {
      // Recorder can already be stopping.
    }
  }, []);

  const retranscribeLastUtterance = useCallback(async () => {
    if (typeof window === 'undefined' || lastAudioSensitiveRef.current) return null;

    const readyBlob = await audioReadyRef.current;
    const candidate = readyBlob ?? (lastAudioBlobRef.current && Date.now() - lastAudioBlobRef.current.at < 15_000
      ? lastAudioBlobRef.current.blob
      : null);
    if (!candidate || candidate.size === 0 || candidate.size > 1_500_000) return null;

    const formData = new FormData();
    formData.append('audio', candidate, 'utterance.webm');
    formData.append('lang', langRef.current);

    try {
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
        cache: 'no-store',
      });
      if (!response.ok) return null;
      const data = await response.json() as { transcript?: unknown };
      return typeof data.transcript === 'string' ? data.transcript.trim() || null : null;
    } catch (error) {
      console.warn('[VOICE] Enhanced transcription fallback failed:', error);
      return null;
    }
  }, []);

  const startListening = useCallback(() => {
    let recognition = recognitionRef.current;

    if (!recognition && typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setMicError('not-supported');
        micErrorRef.current = 'not-supported';
        isContinuousRef.current = false;
        setIsContinuous(false);
        updateVoiceState('ERROR');
        speak(t('mic_check_fail'));
        return;
      }

      try {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognitionRef.current = recognition;
      } catch (error) {
        console.error('[VOICE] SpeechRecognition initialization failed:', error);
        setMicError('unavailable');
        micErrorRef.current = 'unavailable';
        isContinuousRef.current = false;
        setIsContinuous(false);
        updateVoiceState('ERROR');
        speak(t('mic_check_fail'));
        return;
      }
    }

    if (!recognition) {
      return;
    }

    setMicError(null);
    micErrorRef.current = null;
    
    recognition.lang = langRef.current;
    recognition.continuous = isContinuousRef.current;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    
    recognition.onstart = () => {
      void startUtteranceRecording();
      finalResultCursorRef.current = 0;
      pendingTranscriptRef.current = '';
      if (transcriptDebounceRef.current) {
        clearTimeout(transcriptDebounceRef.current);
        transcriptDebounceRef.current = null;
      }
      if (voiceStateRef.current !== 'SPEAKING') {
        updateVoiceState('LISTENING');
      }
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalText = '';
      const startIndex = Math.max(Number(event.resultIndex ?? 0), finalResultCursorRef.current);
      for (let i = startIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result?.isFinal) {
          finalText += String(result[0]?.transcript || '');
        }
      }
      finalResultCursorRef.current = event.results.length;
      if (!finalText.trim()) return;

      const processTranscript = (text: string) => {
        const resultTranscript = text.trim();
        if (!resultTranscript) return;

        const normalizedTranscript = resultTranscript.toLowerCase().replace(/\s+/g, ' ');
        const now = Date.now();
        if (
          lastTranscriptRef.current.text === normalizedTranscript &&
          now - lastTranscriptRef.current.at < 1200
        ) {
          return;
        }
        lastTranscriptRef.current = { text: normalizedTranscript, at: now };

        updateVoiceState('PROCESSING');
        processingRef.current = true;

        if (!sensitiveInputRef.current) {
          setTranscript(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            sender: 'user',
            text: resultTranscript,
            timestamp: new Date()
          }]);
        }

        const callback = onResultRef.current;
        if (callback) {
          Promise.resolve(callback(resultTranscript))
            .catch((error) => {
              console.error('Voice command processing failed:', error);
              speak(
                langRef.current === 'hi-IN'
                  ? 'कमांड को संसाधित नहीं किया जा सका। कृपया फिर से बोलें।'
                  : langRef.current === 'te-IN'
                    ? 'వాయిస్ కమాండ్‌ను ప్రాసెస్ చేయలేకపోయాను. దయచేసి మళ్లీ చెప్పండి.'
                    : 'I could not process that command. Please try again.'
              );
            })
            .finally(() => {
              processingRef.current = false;
              if (
                isContinuousRef.current &&
                voiceStateRef.current === 'PROCESSING' &&
                micErrorRef.current !== 'denied' &&
                micErrorRef.current !== 'not-supported'
              ) {
                updateVoiceState('IDLE');
                if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
                restartTimeoutRef.current = setTimeout(() => {
                  if (
                    isContinuousRef.current &&
                    !processingRef.current &&
                    voiceStateRef.current !== 'SPEAKING'
                  ) {
                    try { recognition.start(); } catch { /* ignore already-started race */ }
                  }
                }, 250);
              }
            });
        } else {
          processingRef.current = false;
        }
      };

      if (!isContinuousRef.current) {
        processTranscript(finalText);
        return;
      }

      pendingTranscriptRef.current = [pendingTranscriptRef.current, finalText]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (transcriptDebounceRef.current) clearTimeout(transcriptDebounceRef.current);
      transcriptDebounceRef.current = setTimeout(() => {
        const pending = pendingTranscriptRef.current.trim();
        pendingTranscriptRef.current = '';
        transcriptDebounceRef.current = null;
        if (pending) processTranscript(pending);
      }, 420);
    }
    
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
      stopUtteranceRecording();
      if (voiceStateRef.current === 'LISTENING') {
        updateVoiceState('IDLE');
      }
      
      if (
        !processingRef.current &&
        isContinuousRef.current &&
        voiceStateRef.current !== 'SPEAKING' &&
        micErrorRef.current !== 'denied' &&
        micErrorRef.current !== 'not-supported'
      ) {
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          if (
            isContinuousRef.current &&
            !processingRef.current &&
            voiceStateRef.current !== 'SPEAKING'
          ) {
            try { recognition.start(); } catch { /* ignore */ }
          }
        }, 350);
      }
    };
    
    if (voiceStateRef.current !== 'SPEAKING') {
      try {
        updateVoiceState('REQUESTING_PERMISSION');
        recognition.start();
      } catch {
        updateVoiceState('LISTENING');
      }
    }
  }, [speak, startUtteranceRecording, stopUtteranceRecording, t, updateVoiceState]);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Recognition may already be stopped.
      }
      if (voiceStateRef.current === 'LISTENING') {
        updateVoiceState('IDLE');
      }
    }
  }, [updateVoiceState]);

  const startContinuousListening = useCallback((onResult?: (text: string) => void | Promise<void>) => {
    sensitiveInputRef.current = false;
    lastAudioSensitiveRef.current = false;
    isContinuousRef.current = true;
    setIsContinuous(true);
    if (onResult) onResultRef.current = onResult;
    startListening();
  }, [startListening]);

  const startSecureContinuousListening = useCallback((onResult: (text: string) => void | Promise<void>) => {
    sensitiveInputRef.current = true;
    lastAudioSensitiveRef.current = true;
    isContinuousRef.current = true;
    setIsContinuous(true);
    onResultRef.current = onResult;
    startListening();
  }, [startListening]);

  const setOnResult = useCallback((onResult: (text: string) => void | Promise<void>) => {
    onResultRef.current = onResult;
  }, []);

  const pauseListening = useCallback(() => {
    isContinuousRef.current = false;
    processingRef.current = false;
    sensitiveInputRef.current = false;
    lastAudioSensitiveRef.current = false;
    lastAudioBlobRef.current = null;
    pendingTranscriptRef.current = '';
    if (transcriptDebounceRef.current) {
      clearTimeout(transcriptDebounceRef.current);
      transcriptDebounceRef.current = null;
    }
    setIsContinuous(false);
    onResultRef.current = null;
    stopListening();
    updateVoiceState('PAUSED');
  }, [stopListening, updateVoiceState]);

  return (
    <VoiceContext.Provider value={{ 
      speak, stopSpeaking, isSpeaking: voiceState === 'SPEAKING', 
      startListening, stopListening, isListening: voiceState === 'LISTENING' || voiceState === 'REQUESTING_PERMISSION', 
      startContinuousListening, startSecureContinuousListening, pauseListening, isContinuous,
      setOnResult,
      micError,
      voiceState,
      transcript,
      speechWarning,
      retranscribeLastUtterance
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
