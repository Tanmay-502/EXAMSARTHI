'use client'

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { useAccessibility } from '../accessibility/AccessibilityProvider';
import { extractFinalSpeechTranscript } from './extractFinalSpeechTranscript';
import { VoiceSessionOrchestrator } from './sessionOrchestrator';
import { canRecoverVoice, getVoiceRecoveryDelay } from './recovery';

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
  getRecognitionConfidence: () => number | null;
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
  const speechSessionIdRef = useRef(0);
  const onResultRef = useRef<((text: string) => void | Promise<void>) | null>(null);
  const processingRef = useRef(false);
  const micErrorRef = useRef<string | null>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const [speechWarning, setSpeechWarning] = useState<string | null>(null);
  const lastSpeechWarningLangRef = useRef('');
  const lastTranscriptRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const recognitionConfidenceRef = useRef<number | null>(null);
  const sensitiveInputRef = useRef(false);
  const pendingTranscriptRef = useRef('');
  const transcriptDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultOwnerRef = useRef<'global' | 'secure' | 'none'>('none');
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioReadyRef = useRef<Promise<Blob | null>>(Promise.resolve(null));
  const audioReadyResolveRef = useRef<((blob: Blob | null) => void) | null>(null);
  const lastAudioBlobRef = useRef<{ blob: Blob; at: number } | null>(null);
  const lastAudioSensitiveRef = useRef(false);
  const audioMimeTypeRef = useRef('audio/webm');
  const recordingRequestIdRef = useRef(0);
  const voiceSessionRef = useRef(new VoiceSessionOrchestrator());
  const activeCommandIdRef = useRef<string | null>(null);
  const recoveryAttemptRef = useRef(0);

  const updateVoiceState = useCallback((state: VoiceState) => {
    setVoiceState(state);
    voiceStateRef.current = state;
    if (state === 'SPEAKING') voiceSessionRef.current.setState('SPEAKING');
    else if (state === 'PROCESSING') voiceSessionRef.current.setState('PROCESSING');
    else if (state === 'LISTENING') voiceSessionRef.current.setState('LISTENING');
    else if (state === 'REQUESTING_PERMISSION') voiceSessionRef.current.setState('REQUESTING_PERMISSION');
    else if (state === 'PAUSED') voiceSessionRef.current.setState('PAUSED');
    else if (state === 'ERROR') voiceSessionRef.current.setState('ERROR');
    else voiceSessionRef.current.setState('READY');
  }, []);

  const restartRecognition = useCallback(() => {
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    if (!isContinuousRef.current || processingRef.current) return;

    if (!canRecoverVoice(recoveryAttemptRef.current)) {
      updateVoiceState('ERROR');
      announce(t('voice_recovery_failed'), 'assertive');
      return;
    }

    const delay = getVoiceRecoveryDelay(recoveryAttemptRef.current);
    recoveryAttemptRef.current += 1;
    voiceSessionRef.current.setState('RECOVERING');
    restartTimeoutRef.current = setTimeout(() => {
      if (!isContinuousRef.current || processingRef.current || voiceStateRef.current === 'SPEAKING') return;
      try {
        recognitionRef.current?.start();
      } catch {
        restartRecognition();
      }
    }, delay);
  }, [announce, t, updateVoiceState]);

  useEffect(() => {
    langRef.current = lang;
    if (recognitionRef.current) recognitionRef.current.lang = lang;
  }, [lang]);

  useEffect(() => {
    micErrorRef.current = micError;
  }, [micError]);

  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (transcriptDebounceRef.current) clearTimeout(transcriptDebounceRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      resultOwnerRef.current = 'none';
      voiceSessionRef.current.reset();
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const playNextUtterance = useCallback(function playNext(sessionId: number) {
    if (speechSessionIdRef.current !== sessionId) return;

    if (utteranceQueueRef.current.length === 0) {
      if (voiceStateRef.current === 'SPEAKING') updateVoiceState('IDLE');
      if (isContinuousRef.current && onResultRef.current && micErrorRef.current !== 'denied' && micErrorRef.current !== 'not-supported') {
        restartRecognition();
      }
      return;
    }

    const sentence = utteranceQueueRef.current.shift()!;
    const utterance = new SpeechSynthesisUtterance(sentence);
    const locale = langRef.current.toLowerCase();
    utterance.lang = langRef.current;
    utterance.rate = speechRate;

    const installedVoices = typeof window !== 'undefined' ? window.speechSynthesis.getVoices() : [];
    const selectedVoice = voiceURI ? installedVoices.find((voice) => voice.voiceURI === voiceURI) : undefined;
    const localePrefix = locale.split('-')[0];
    const localeVoice = installedVoices.find((voice) => voice.lang.toLowerCase() === locale)
      ?? installedVoices.find((voice) => voice.lang.toLowerCase().startsWith(localePrefix + '-'));
    const selectedVoiceMatchesLocale = selectedVoice
      ? selectedVoice.lang.toLowerCase() === locale || selectedVoice.lang.toLowerCase().startsWith(localePrefix + '-')
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

    utterance.onstart = () => updateVoiceState('SPEAKING');
    utterance.onend = () => playNext(sessionId);
    utterance.onerror = () => {
      if (speechSessionIdRef.current !== sessionId) return;
      utteranceQueueRef.current = [];
      updateVoiceState('IDLE');
      restartRecognition();
    };

    window.speechSynthesis.speak(utterance);
  }, [announce, restartRecognition, speechRate, updateVoiceState, voiceURI]);

  const speak = useCallback((text: string, options?: { dedupe?: boolean }) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const normalizedText = text.trim().replace(/\s+/g, ' ');
    if (!normalizedText) return;

    const dedupe = options?.dedupe !== false;
    const now = Date.now();
    if (dedupe && lastSpokenRef.current.text === normalizedText && now - lastSpokenRef.current.at < 1500) return;
    if (dedupe) lastSpokenRef.current = { text: normalizedText, at: now };

    speechSessionIdRef.current += 1;
    const currentSession = speechSessionIdRef.current;
    window.speechSynthesis.cancel();
    updateVoiceState('SPEAKING');

    setTranscript((prev) => [...prev, {
      id: crypto.randomUUID(),
      sender: 'assistant',
      text,
      timestamp: new Date(),
    }]);

    try { recognitionRef.current?.stop(); } catch {}

    const sentences = normalizedText.split(/(?<=[.!?।])\s+/).flatMap((sentence) => {
      if (sentence.length <= 180) return [sentence];
      return Array.from({ length: Math.ceil(sentence.length / 180) }, (_, i) => sentence.slice(i * 180, (i + 1) * 180).trim()).filter(Boolean);
    });

    utteranceQueueRef.current = sentences;
    playNextUtterance(currentSession);
  }, [playNextUtterance, updateVoiceState]);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    speechSessionIdRef.current += 1;
    utteranceQueueRef.current = [];
    window.speechSynthesis.cancel();
    updateVoiceState('IDLE');
    restartRecognition();
  }, [restartRecognition, updateVoiceState]);

  const getAudioMimeType = useCallback(() => {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return null;
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg'];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
  }, []);

  const startUtteranceRecording = useCallback(async () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return;

    const requestId = ++recordingRequestIdRef.current;
    const recordingSensitive = sensitiveInputRef.current;

    try {
      const existingStream = mediaStreamRef.current;
      const hasLiveTrack = existingStream?.getTracks().some((track) => track.readyState === 'live');
      if (!hasLiveTrack) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        if (requestId !== recordingRequestIdRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        mediaStreamRef.current = stream;
      }

      const mimeType = getAudioMimeType();
      if (requestId !== recordingRequestIdRef.current || !mimeType || !mediaStreamRef.current) return;

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }

      audioChunksRef.current = [];
      audioMimeTypeRef.current = mimeType.split(';')[0];
      audioReadyRef.current = new Promise((resolve) => { audioReadyResolveRef.current = resolve; });

      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType, audioBitsPerSecond: 64_000 });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = audioChunksRef.current.length > 0 ? new Blob(audioChunksRef.current, { type: audioMimeTypeRef.current }) : null;
        if (blob && blob.size > 0) {
          lastAudioBlobRef.current = { blob, at: Date.now() };
          lastAudioSensitiveRef.current = recordingSensitive;
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
    } catch {}
  }, [getAudioMimeType]);

  const stopUtteranceRecording = useCallback(() => {
    recordingRequestIdRef.current += 1;
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    try { recorder.stop(); } catch {}
  }, []);

  const retranscribeLastUtterance = useCallback(async () => {
    if (typeof window === 'undefined' || lastAudioSensitiveRef.current) return null;

    const readyBlob = await audioReadyRef.current;
    const candidate = readyBlob ?? (lastAudioBlobRef.current && Date.now() - lastAudioBlobRef.current.at < 15_000
      ? lastAudioBlobRef.current.blob : null);
    if (!candidate || candidate.size === 0 || candidate.size > 1_500_000) return null;

    const formData = new FormData();
    formData.append('audio', candidate, 'utterance.webm');
    formData.append('lang', langRef.current);

    try {
      const response = await fetch('/api/voice/transcribe', { method: 'POST', body: formData, cache: 'no-store' });
      if (!response.ok) return null;
      const data = await response.json() as { transcript?: unknown };
      return typeof data.transcript === 'string' ? data.transcript.trim() || null : null;
    } catch {
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
      } catch {
        setMicError('unavailable');
        micErrorRef.current = 'unavailable';
        isContinuousRef.current = false;
        setIsContinuous(false);
        updateVoiceState('ERROR');
        speak(t('mic_check_fail'));
        return;
      }
    }

    if (!recognition) return;

    setMicError(null);
    micErrorRef.current = null;
    recoveryAttemptRef.current = 0;
    recognition.lang = langRef.current;
    recognition.continuous = isContinuousRef.current;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      recoveryAttemptRef.current = 0;
      voiceSessionRef.current.setState('LISTENING');
      void startUtteranceRecording();
      pendingTranscriptRef.current = '';
      recognitionConfidenceRef.current = null;
      if (transcriptDebounceRef.current) clearTimeout(transcriptDebounceRef.current);
      if (voiceStateRef.current !== 'SPEAKING') updateVoiceState('LISTENING');
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const { text: finalText, confidence } = extractFinalSpeechTranscript(event);
      if (confidence !== null) recognitionConfidenceRef.current = confidence;
      if (!finalText) return;

      const processTranscript = (text: string) => {
        const resultTranscript = text.trim();
        if (!resultTranscript) return;

        const normalizedTranscript = resultTranscript.toLowerCase().replace(/\s+/g, ' ');
        const now = Date.now();
        if (lastTranscriptRef.current.text === normalizedTranscript && now - lastTranscriptRef.current.at < 1200) return;
        lastTranscriptRef.current = { text: normalizedTranscript, at: now };

        const owner = resultOwnerRef.current === 'secure' ? 'AUTH_SECURE' : resultOwnerRef.current === 'global' ? 'GLOBAL' : 'NONE';
        const command = voiceSessionRef.current.beginCommand({
          owner,
          route: typeof window !== 'undefined' ? window.location.pathname : '',
          context: typeof document !== 'undefined' ? (document.documentElement.dataset.voiceContext ?? 'unknown') : 'unknown',
          transcript: sensitiveInputRef.current ? '' : resultTranscript,
          confidence: recognitionConfidenceRef.current,
        });
        activeCommandIdRef.current = command.id;

        voiceSessionRef.current.setState(sensitiveInputRef.current ? 'SECURE_INPUT' : 'PROCESSING');
        updateVoiceState('PROCESSING');
        processingRef.current = true;

        if (!sensitiveInputRef.current) {
          setTranscript((prev) => [...prev, {
            id: crypto.randomUUID(),
            sender: 'user',
            text: resultTranscript,
            timestamp: new Date(),
          }]);
        }

        const callback = onResultRef.current;
        if (callback && voiceSessionRef.current.executeOnce(command)) {
          Promise.resolve(callback(resultTranscript))
            .catch(() => {
              speak(langRef.current === 'hi-IN'
                ? 'कमांड को संसाधित नहीं किया जा सका। कृपया फिर से बोलें।'
                : langRef.current === 'te-IN'
                  ? 'వాయిస్ కమాండ్‌ను ప్రాసెస్ చేయలేకపోయాను. దయచేసి మళ్లీ చెప్పండి.'
                  : 'I could not process that command. Please try again.');
            })
            .finally(() => {
              if (activeCommandIdRef.current === command.id) activeCommandIdRef.current = null;
              processingRef.current = false;
              if (isContinuousRef.current && voiceStateRef.current === 'PROCESSING' && micErrorRef.current !== 'denied' && micErrorRef.current !== 'not-supported') {
                updateVoiceState('IDLE');
                restartRecognition();
              }
            });
        } else {
          activeCommandIdRef.current = null;
          processingRef.current = false;
        }
      };

      if (!isContinuousRef.current) {
        processTranscript(finalText);
        return;
      }

      pendingTranscriptRef.current = [pendingTranscriptRef.current, finalText].filter(Boolean).join(' ').trim();
      if (transcriptDebounceRef.current) clearTimeout(transcriptDebounceRef.current);
      transcriptDebounceRef.current = setTimeout(() => {
        const pending = pendingTranscriptRef.current.trim();
        pendingTranscriptRef.current = '';
        transcriptDebounceRef.current = null;
        if (pending) processTranscript(pending);
      }, 420);
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
        return;
      }
      if (event.error === 'aborted') {
        if (voiceStateRef.current !== 'SPEAKING') updateVoiceState('IDLE');
        return;
      }
      if (event.error === 'network' || event.error === 'no-speech' || event.error === 'audio-capture') {
        if (event.error !== 'no-speech') {
          setMicError(event.error);
          micErrorRef.current = event.error;
        }
        if (voiceStateRef.current !== 'SPEAKING') updateVoiceState('IDLE');
        restartRecognition();
        return;
      }
      setMicError(event.error);
      micErrorRef.current = event.error;
      updateVoiceState('ERROR');
      speak(t('voice_recovery_failed'));
    };

    recognition.onend = () => {
      stopUtteranceRecording();
      if (voiceStateRef.current === 'LISTENING') updateVoiceState('IDLE');
      if (!processingRef.current && isContinuousRef.current && voiceStateRef.current !== 'SPEAKING' && micErrorRef.current !== 'denied' && micErrorRef.current !== 'not-supported') {
        restartRecognition();
      }
    };

    if (voiceStateRef.current !== 'SPEAKING' && !processingRef.current) {
      try {
        voiceSessionRef.current.setState('REQUESTING_PERMISSION');
        updateVoiceState('REQUESTING_PERMISSION');
        recognition.start();
      } catch {
        updateVoiceState('LISTENING');
      }
    }
  }, [announce, restartRecognition, speak, startUtteranceRecording, stopUtteranceRecording, t, updateVoiceState]);

  const getRecognitionConfidence = useCallback(() => recognitionConfidenceRef.current, []);

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    try { recognitionRef.current?.stop(); } catch {}
    if (voiceStateRef.current === 'LISTENING') updateVoiceState('IDLE');
  }, [updateVoiceState]);

  const startContinuousListening = useCallback((onResult?: (text: string) => void | Promise<void>) => {
    if (resultOwnerRef.current === 'secure') return;
    sensitiveInputRef.current = false;
    lastAudioSensitiveRef.current = false;
    resultOwnerRef.current = 'global';
    voiceSessionRef.current.claim('GLOBAL');
    isContinuousRef.current = true;
    setIsContinuous(true);
    if (onResult) onResultRef.current = onResult;
    recoveryAttemptRef.current = 0;
    startListening();
  }, [startListening]);

  const startSecureContinuousListening = useCallback((onResult: (text: string) => void | Promise<void>) => {
    sensitiveInputRef.current = true;
    lastAudioSensitiveRef.current = true;
    resultOwnerRef.current = 'secure';
    voiceSessionRef.current.claim('AUTH_SECURE');
    isContinuousRef.current = true;
    setIsContinuous(true);
    onResultRef.current = onResult;
    recoveryAttemptRef.current = 0;
    voiceSessionRef.current.setState('SECURE_INPUT');
    startListening();
  }, [startListening]);

  const setOnResult = useCallback((onResult: (text: string) => void | Promise<void>) => {
    if (resultOwnerRef.current === 'secure') return;
    resultOwnerRef.current = 'global';
    voiceSessionRef.current.claim('GLOBAL');
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
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    setIsContinuous(false);
    const owner = resultOwnerRef.current === 'secure' ? 'AUTH_SECURE' : 'GLOBAL';
    resultOwnerRef.current = 'none';
    onResultRef.current = null;
    voiceSessionRef.current.release(owner);
    activeCommandIdRef.current = null;
    recoveryAttemptRef.current = 0;
    stopListening();
    updateVoiceState('PAUSED');
  }, [stopListening, updateVoiceState]);

  return (
    <VoiceContext.Provider value={{
      speak, stopSpeaking, isSpeaking: voiceState === 'SPEAKING',
      startListening, stopListening, isListening: voiceState === 'LISTENING' || voiceState === 'REQUESTING_PERMISSION',
      startContinuousListening, startSecureContinuousListening, pauseListening, isContinuous,
      setOnResult, micError, voiceState, transcript, speechWarning,
      retranscribeLastUtterance, getRecognitionConfidence,
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