'use client'

import { ExamEngine } from '@/components/exam/ExamEngine';
import { useExamStore } from '@/lib/store/examStore';
import { useEffect, useState, Suspense, useRef } from 'react';
import { fetchExamQuestions, startExamSession, fetchAvailableExams, verifyActiveSession } from './actions';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePreferredMode, InteractionMode } from '@/lib/hooks/usePreferredMode';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { VoiceCore } from '@/components/voice/VoiceCore';
import { useAccessibility } from '@/lib/accessibility/AccessibilityProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { SafeAction } from '@/lib/voice/safeActionRegistry';
import { shouldEscapeToGlobal } from '@/lib/voice/navigationEscape';
import { say } from '@/lib/voice/say';
import { clearExamStorage } from '@/lib/store/clearExamStorage';
import { useVoiceAppContext } from '@/lib/store/voiceContextStore';

function DeviceCheck({ onComplete, interactionMode, setInteractionMode }: { onComplete: () => void, interactionMode: InteractionMode, setInteractionMode: (m: InteractionMode) => void }) {
  const [micStatus, setMicStatus] = useState<'pending' | 'success' | 'error' | 'not-required'>('pending');
  const [browserStatus, setBrowserStatus] = useState<'pending' | 'success' | 'error' | 'not-required'>('pending');
  const { announce } = useAccessibility();
  const { speak } = useVoice();
  const { t, tParams } = useI18n();
  const hasSpoken = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const checkDevices = async () => {
      // Standard mode does not need microphone or browser speech permission.
      if (interactionMode === 'standard') {
        setBrowserStatus('not-required');
        setMicStatus('not-required');
        return;
      }

      interface WindowWithSpeech extends Window {
        SpeechRecognition?: unknown;
        webkitSpeechRecognition?: unknown;
      }

      const win = window as unknown as WindowWithSpeech;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (isMounted) {
        setBrowserStatus(SpeechRecognition ? 'success' : 'error');
      }

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Microphone API unavailable');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isMounted) setMicStatus('success');
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error('Microphone access denied or error:', err);
        if (isMounted) setMicStatus('error');
      }
    };

    void checkDevices();
    return () => {
      isMounted = false;
    };
  }, [interactionMode]);

  useEffect(() => {
    if (micStatus === 'pending' || browserStatus === 'pending' || hasSpoken.current) return;
    hasSpoken.current = true;
    
    let msg = '';
    if (interactionMode === 'standard') {
      msg = t('exam_keyboard_ready');
    } else if (micStatus === 'success' && browserStatus === 'success') {
      msg = t('exam_voice_ready');
    } else if (browserStatus === 'error') {
      msg = t('exam_browser_no_speech');
    } else {
      msg = t('exam_mic_unavailable');
    }
    say(msg, interactionMode, speak, announce, 'assertive');
  }, [micStatus, browserStatus, announce, speak, interactionMode, setInteractionMode]);

  const allClear =
    (micStatus === 'success' && browserStatus === 'success') ||
    (micStatus === 'not-required' && browserStatus === 'not-required');

  return (
    <div className="flex flex-col min-h-0 w-full max-w-4xl mx-auto pt-32 pb-24 px-6 bg-black text-white">
      <div className="mb-24 border-b border-zinc-900 pb-8">
        <span className="text-zinc-400 tracking-[0.2em] text-xs uppercase">{t('system_check')}</span>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-16">
        <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-light tracking-tighter leading-tight mb-8">
          {t('exam_verifying_environment')}
        </h2>
        
        <div className="space-y-8 border-t border-zinc-900 pt-8">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-light text-zinc-400">{t('browser_speech_services')}</span>
            {browserStatus === 'pending' && <span className="text-zinc-400 uppercase tracking-widest text-sm animate-pulse">{t('checking')}</span>}
            {browserStatus === 'success' && <span className="text-white uppercase tracking-widest text-sm font-medium">{t('ready')}</span>}
            {browserStatus === 'not-required' && <span className="text-zinc-400 uppercase tracking-widest text-sm font-medium">{t('not_required')}</span>}
            {browserStatus === 'error' && <span className="text-red-500 uppercase tracking-widest text-sm font-medium">{t('unavailable')}</span>}
          </div>
          <div className="flex items-center justify-between border-t border-zinc-900 pt-8">
            <span className="text-2xl font-light text-zinc-400">{t('microphone_access')}</span>
            {micStatus === 'pending' && <span className="text-zinc-400 uppercase tracking-widest text-sm animate-pulse">{t('checking')}</span>}
            {micStatus === 'success' && <span className="text-white uppercase tracking-widest text-sm font-medium">{t('granted')}</span>}
            {micStatus === 'not-required' && <span className="text-zinc-400 uppercase tracking-widest text-sm font-medium">{t('not_required')}</span>}
            {micStatus === 'error' && <span className="text-red-500 uppercase tracking-widest text-sm font-medium">{t('unavailable')}</span>}
          </div>
        </div>
        
        {(browserStatus === 'error' || micStatus === 'error') && (
          <div
            className="rounded-2xl border border-amber-900/60 bg-amber-950/20 p-6 text-base text-zinc-200 md:text-lg"
            role="alert"
            aria-live="assertive"
          >
            <div className="font-semibold">{t('voice_not_fully_available')}</div>
            <p className="mt-2 max-w-3xl text-zinc-400">
              {browserStatus === 'error'
                ? t('exam_browser_no_speech')
                : t('exam_mic_unavailable')}{' '}
              {t('exam_keyboard_still_available')}
            </p>
          </div>
        )}
        {!allClear && (micStatus !== 'pending' && browserStatus !== 'pending') && (
          <div className="pt-2 text-zinc-400 font-light text-lg" aria-live="polite">
            {t('exam_voice_retry_hint')}
          </div>
        )}

        <div className="pt-16 border-t border-zinc-900 flex flex-wrap justify-end gap-4">
          {!allClear && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              disabled={micStatus === 'pending' || browserStatus === 'pending'}
              className="px-8 py-4 rounded-full border border-zinc-800 text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-50 transition-colors uppercase tracking-widest text-sm font-bold"
            >
              {t('retry')}
            </button>
          )}
          {!(micStatus === 'success' && browserStatus === 'success') && (
            <button
              type="button"
              onClick={() => setInteractionMode('standard')}
              className="px-8 py-4 rounded-full border border-zinc-800 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors uppercase tracking-widest text-sm font-bold"
            >
              {t('continue_keyboard')}
            </button>
          )}
          <button
            onClick={onComplete}
            disabled={micStatus === 'pending' || browserStatus === 'pending'}
            className="px-12 py-4 rounded-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors uppercase tracking-widest text-sm font-bold"
          >
            {t('start_exam')}
          </button>
        </div>
      </div>
    </div>
  );
}

type AvailableExam = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  question_count: number;
}

function normalizeExamSpeech(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(gk|general knowledge)\b/g, 'general knowledge')
    .replace(/\breasoning\b/g, 'reasoning')
    .replace(/\b(jee|j e e)\b/g, 'jee')
    .replace(/\b(gate|g a t e)\b/g, 'gate')
    .replace(/\b(neet|n e e t)\b/g, 'neet')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findExamFromSpeech(exams: AvailableExam[], spoken: string): AvailableExam | null {
  const text = normalizeExamSpeech(spoken);
  if (!text) return null;

  const exact = exams.find(exam => normalizeExamSpeech(exam.title) === text);
  if (exact) return exact;

  const compact = exams.find(exam => {
    const title = normalizeExamSpeech(exam.title);
    return text.includes(title) || title.includes(text);
  });
  if (compact) return compact;

  const stopWords = new Set(['i','want','to','take','give','start','attempt','write','an','a','the','exam','test','paper','please','can','you','could','would','like','me']);
  const inputTokens = new Set(text.split(' ').filter(token => token && !stopWords.has(token)));
  if (inputTokens.size === 0) return null;

  let best: { exam: AvailableExam; score: number } | null = null;
  for (const exam of exams) {
    const titleTokens = normalizeExamSpeech(exam.title).split(' ').filter(Boolean);
    const matched = titleTokens.filter(token => inputTokens.has(token)).length;
    const score = matched / Math.max(inputTokens.size, titleTokens.length);
    if (matched > 0 && score >= 0.5 && (!best || score > best.score)) {
      best = { exam, score };
    }
  }
  return best?.exam || null;
}

function ExamSelection({ 
  onSelect 
}: { 
  onSelect: (examId: string) => void 
}) {
  const [exams, setExams] = useState<AvailableExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedExam, setSelectedExam] = useState<AvailableExam | null>(null);
  const { speak, isContinuous, startContinuousListening } = useVoice();
  const { lang, t, tParams } = useI18n();
  const { mode: voiceMode } = usePreferredMode();
  const setVoiceContext = useVoiceAppContext(state => state.setContext);
  const { announce } = useAccessibility();
  const hasSpokenWelcome = useRef(false);
  const lastHandledTranscriptRef = useRef<string>('');
  const router = useRouter();
  const { useVoiceAction } = useGlobalVoice();

  useEffect(() => {
    setVoiceContext('exam_lobby');
    return () => setVoiceContext('unknown');
  }, [setVoiceContext]);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAvailableExams();
        setExams(data);
      } catch {
        setError(t('exam_load_error'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (loading || error || exams.length === 0) return;
    
    if (!hasSpokenWelcome.current && !selectedExam) {
      hasSpokenWelcome.current = true;
      const examNames = exams.map(e => e.title).join(', ');
      const msg = tParams('exam_available_prompt', { details: examNames });
      say(msg, voiceMode, speak, announce);
      
      if (!isContinuous) {
        startContinuousListening();
      }
    }
  }, [loading, error, exams, speak, announce, isContinuous, startContinuousListening, selectedExam]);

  useVoiceAction((action: SafeAction, _payload?: Record<string, unknown> | null, transcript?: string) => {
    const raw = transcript?.trim() || '';
    if (!raw) return false;

    const normalized = raw
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (lastHandledTranscriptRef.current === normalized) {
      return true;
    }

    if ((action as string) === 'RAW_TRANSCRIPT' && shouldEscapeToGlobal(raw, lang, 'exam_lobby')) {
      return false;
    }

    if (
      /\b(help|support|what can i say|sign in|login|log in|sign up|signup)\b/.test(normalized) &&
      action !== 'OPEN_DASHBOARD'
    ) {
      return false;
    }

    const isDashboardRequest =
      /\b(dashboard|home)\b/.test(normalized) &&
      /(back|return|take me|go to|open|show|bring me|send me)/.test(normalized);

    if (isDashboardRequest || action === 'OPEN_DASHBOARD') {
      lastHandledTranscriptRef.current = normalized;
      speak(t('return_dashboard'));
      router.push('/dashboard');
      return true;
    }

    if (selectedExam) {
      const confirmed = /\b(yes|yeah|yep|confirm|start|okay|ok|haan|हाँ|అవును)\b/.test(normalized);
      const rejected = /\b(no|nope|change|cancel|different|nah|नहीं|नही|కాదు|రద్దు)\b/.test(normalized);

      if (confirmed || action === 'CONFIRM') {
        lastHandledTranscriptRef.current = normalized;
        speak(t('exam_starting'));
        onSelect(selectedExam.id);
        return true;
      }

      if (rejected || action === 'CHANGE') {
        lastHandledTranscriptRef.current = normalized;
        hasSpokenWelcome.current = false;
        setSelectedExam(null);
        speak(t('exam_selecting'));
        return true;
      }

      // A new exam name while a selection is pending replaces the pending choice.
      const localMatch = findExamFromSpeech(exams, raw);
      if (localMatch) {
        setSelectedExam(localMatch);
        const wantsImmediateStart =
          /\b(start|begin|take|attempt|give|write)\b/.test(normalized) &&
          /\b(exam|test|paper)\b/.test(normalized);

        speak(
          wantsImmediateStart
            ? tParams('starting_exam_named', { title: localMatch.title })
            : tParams('exam_selected_details', {
                title: localMatch.title,
                count: localMatch.question_count,
                minutes: localMatch.duration_minutes,
              })
        );

        if (wantsImmediateStart) onSelect(localMatch.id);
        lastHandledTranscriptRef.current = normalized;
        return true;
      }
      lastHandledTranscriptRef.current = normalized;
      speak(t('exam_match_error'));
      return true;
    }

    if (!selectedExam && (action === 'START_EXAM' || action === 'OPEN_EXAM')) {
      lastHandledTranscriptRef.current = normalized;
      speak(t('exam_select_first'));
      return true;
    }

    if (
      /\b(list|available|show|what|which)\b/.test(normalized) &&
      /\b(exam|exams)\b/.test(normalized)
    ) {
      lastHandledTranscriptRef.current = normalized;
      const examNames = exams.map((exam, index) => `Exam ${index + 1}: ${exam.title}. ${exam.question_count} questions, ${exam.duration_minutes} minutes.`).join(' ');
      speak(tParams('exam_available_prompt', { details: examNames }));
      return true;
    }

    const numberMatch = normalized.match(/\b(first|1|one|second|2|two|third|3|three|fourth|4|four)\b/);
    const numericIndex = numberMatch
      ? ({ first: 0, one: 0, '1': 0, second: 1, two: 1, '2': 1, third: 2, three: 2, '3': 2, fourth: 3, four: 3, '4': 3 } as Record<string, number>)[numberMatch[1]]
      : undefined;

    const selectByIndex = typeof numericIndex === 'number' ? exams[numericIndex] : null;
    if (selectByIndex) {
      lastHandledTranscriptRef.current = normalized;
      setSelectedExam(selectByIndex);
      speak(
        selectByIndex.title +
        " selected. It has " +
        selectByIndex.question_count +
        " questions. Say yes to start or say change to choose another."
      );
      return true;
    }

    // Match the live exam catalog deterministically before using any
    // semantic fallback. This makes ordinary spoken exam names reliable.
    if (normalized.length >= 2) {
      const localMatch = findExamFromSpeech(exams, raw);
      if (localMatch) {
        lastHandledTranscriptRef.current = normalized;
        setSelectedExam(localMatch);

        const wantsImmediateStart =
          /\b(start|begin|take|attempt|give|write)\b/.test(normalized) &&
          /\b(exam|test|paper)\b/.test(normalized);

        speak(
          wantsImmediateStart
            ? "Starting " + localMatch.title + "."
            : localMatch.title +
              " selected. It has " +
              localMatch.question_count +
              " questions and " +
              localMatch.duration_minutes +
              " minutes. Say yes to start or say change to choose another."
        );

        if (wantsImmediateStart) onSelect(localMatch.id);
        return true;
      }

      lastHandledTranscriptRef.current = normalized;
      speak(t('exam_match_error'));
      return true;
    }

    return false;
  });



  if (loading) return <div className="flex flex-col items-center justify-center min-h-0 bg-black text-zinc-400 font-light text-xl">{t('loading')}</div>;
  if (error) return <div className="flex flex-col items-center justify-center min-h-0 bg-black text-red-500 font-light text-xl">{error}</div>;

  return (
    <div className="relative flex flex-col min-h-0 w-full max-w-7xl mx-auto pt-32 pb-24 px-6 md:px-12 bg-black text-white">
      <div className="mb-24 flex items-center justify-between border-b border-zinc-900 pb-8">
        <div className="flex flex-col">
          <span className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-2">{t('mode')}</span>
          <span className="text-xl font-light tracking-wide">{t('exam').toUpperCase()}</span>
        </div>
        <VoiceCore size="sm" />
      </div>

      <div className="flex-1 flex flex-col justify-center w-full max-w-4xl mx-auto">
        <div className="mb-16">
          <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-light tracking-tighter leading-tight mb-4">{t('choose_exam')}</h2>
          <p className="text-2xl text-zinc-400 font-light">&quot;{t('say_exam_name')}&quot;</p>
        </div>

        <div className="flex flex-col">
          {exams.map((exam, i) => (
            <button
              type="button"
              key={exam.id}
              onClick={() => {
                setSelectedExam(exam);
                speak(tParams('exam_selected_details', {
                  title: exam.title,
                  count: exam.question_count,
                  minutes: exam.duration_minutes,
                }));
              }}
              className={`group flex w-full text-left flex-col md:flex-row md:items-center justify-between py-8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-inset ${selectedExam?.id === exam.id ? 'text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
              aria-pressed={selectedExam?.id === exam.id}
              aria-label={tParams('exam_selected_details', { title: exam.title, count: exam.question_count, minutes: exam.duration_minutes })}
            >
              <div className="flex-1 pr-8">
                <h3 className="text-3xl md:text-4xl font-light tracking-tight mb-2">{exam.title}</h3>
                {exam.description && <p className="text-lg font-light opacity-60 line-clamp-2">{exam.description}</p>}
              </div>
              <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-2 mt-4 md:mt-0 opacity-80 uppercase tracking-widest text-xs">
                <span>{exam.question_count} {t('questions')}</span>
                <span className="hidden md:inline" aria-hidden="true">•</span>
                <span>{exam.duration_minutes} {t('minutes_short')}</span>
              </div>
            </button>
          ))}
        </div>
        
        {selectedExam && (
          <div className="mt-16 pt-8 border-t border-zinc-900 animate-in fade-in slide-in-from-bottom-4">
            <p className="text-2xl font-light text-zinc-300 mb-2">{tParams('you_selected_exam', { title: selectedExam.title })}</p>
            <p className="text-zinc-400 font-light">{t('confirm_exam_choice')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ExamPageContent() {
  const initializeExam = useExamStore(state => state.initializeExam);
  const hasHydrated = useExamStore(state => state.hasHydrated);
  const persistedUserId = useExamStore(state => state.userId);
  const persistedSessionId = useExamStore(state => state.sessionId);
  const persistedStatus = useExamStore(state => state.status);
  const persistedExamId = useExamStore(state => state.examId);
  const { lang, t, tParams } = useI18n();
  const router = useRouter();
  const setVoiceContext = useVoiceAppContext(state => state.setContext);

  useEffect(() => {
    setVoiceContext('exam_lobby');
    return () => setVoiceContext('unknown');
  }, [setVoiceContext]);
  const searchParams = useSearchParams();
  const examIdParam = searchParams.get('exam_id');
  const { mode: interactionMode, setMode, isLoaded: preferenceLoaded } = usePreferredMode();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [examId, setExamId] = useState<string | null>(examIdParam);
  const [examStarted, setExamStarted] = useState(false);
  const [deviceCheckComplete, setDeviceCheckComplete] = useState(false);
  const [examMeta, setExamMeta] = useState<{ title: string; duration_minutes: number } | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);

  useEffect(() => {
    if (!hasHydrated || resumeChecked) return;

    async function checkPersistedSession() {
      if (persistedStatus !== 'IN_PROGRESS' || !persistedSessionId || !persistedUserId || !persistedExamId) {
        setResumeChecked(true);
        return;
      }

      if (examIdParam && examIdParam !== persistedExamId) {
        await clearExamStorage();
        setResumeChecked(true);
        return;
      }

      try {
        const verification = await verifyActiveSession(persistedSessionId, false);
        if (!verification.valid || verification.userId !== persistedUserId || verification.session?.examId !== persistedExamId) {
          await clearExamStorage();
          setResumeChecked(true);
          return;
        }

        const exams = await fetchAvailableExams();
        const currentExam = exams.find(exam => exam.id === persistedExamId);
        if (!currentExam) {
          await clearExamStorage();
          setResumeChecked(true);
          return;
        }

        const questions = await fetchExamQuestions(
          persistedExamId,
          persistedSessionId,
          lang
        );
        if (questions.length === 0) {
          await clearExamStorage();
          setResumeChecked(true);
          return;
        }

        initializeExam(
          persistedSessionId,
          persistedExamId,
          questions,
          new Date(verification.session.startedAt).getTime(),
          verification.userId,
          verification.serverNow
        );
        setExamId(persistedExamId);
        setExamMeta({
          title: currentExam.title,
          duration_minutes: currentExam.duration_minutes,
        });
        setExamStarted(true);
      } catch (error) {
        console.error('Persisted exam resume validation failed:', error);
        await clearExamStorage();
      } finally {
        setResumeChecked(true);
      }
    }

    void checkPersistedSession();
  }, [hasHydrated, resumeChecked, persistedStatus, persistedSessionId, persistedUserId, persistedExamId, examIdParam, lang, initializeExam]);

  // First load only the selected exam metadata. Do not create an in-progress
  // server session until the candidate has passed the device check.
  useEffect(() => {
    if (!resumeChecked) return;
    if (!examId) {
      setVoiceContext('exam_lobby');
      return;
    }

    async function loadExamMeta() {
      setLoading(true);
      setError('');
      try {
        const exams = await fetchAvailableExams();
        const currentExam = exams.find(e => e.id === examId);

        if (!currentExam) {
          setError(t('exam_not_available'));
          return;
        }

        setExamMeta({
          title: currentExam.title,
          duration_minutes: currentExam.duration_minutes
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'Unauthorized') {
          router.push('/auth/login?code=unauthenticated');
          return;
        }

        setError(err instanceof Error ? err.message : t('exam_load_error'));
      } finally {
        setLoading(false);
      }
    }

    loadExamMeta();
  }, [examId, router, setVoiceContext, resumeChecked]);

  // Only create the server session after the device check is complete.
  useEffect(() => {
    if (!hasHydrated || !resumeChecked || !examId || !examMeta || !deviceCheckComplete || !preferenceLoaded || examStarted) {
      return;
    }
    const selectedExamId: string = examId;

    async function startSelectedExam() {
      setLoading(true);
      setError('');
      try {
        const session = await startExamSession(selectedExamId);
        const questions = await fetchExamQuestions(selectedExamId, session.id, lang);

        if (questions.length === 0) {
          throw new Error(t('exam_no_questions'));
        }

        initializeExam(
          session.id,
          selectedExamId,
          questions,
          new Date(session.startedAt).getTime(),
          session.userId,
          session.serverNow
        );
        setExamStarted(true);
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'Unauthorized') {
          router.push('/auth/login?code=unauthenticated');
          return;
        }

        setError(err instanceof Error ? err.message : t('exam_start_error'));
      } finally {
        setLoading(false);
      }
    }

    startSelectedExam();
  }, [hasHydrated, resumeChecked, examId, examMeta, deviceCheckComplete, preferenceLoaded, examStarted, initializeExam, lang, router]);

  if (!hasHydrated || !resumeChecked) {
    return <div className="flex flex-col items-center justify-center min-h-0 flex-1 p-6 text-xl">{t('exam_preparing')}</div>;
  }

  if (!examId) {
    return <ExamSelection onSelect={(id) => {
      // Use replace so back button works better, or push. 
      router.replace(`/exam?exam_id=${id}`);
      setExamId(id);
    }} />;
  }

  if (loading && !examMeta) {
    return <div className="flex flex-col items-center justify-center flex-1 p-6 text-xl text-zinc-400">{t('loading_exam')}</div>;
  }

  if (error) {
    return <div className="flex flex-col items-center justify-center flex-1 p-6 text-xl text-destructive">{error}</div>;
  }

  if (!preferenceLoaded) {
    return <div className="flex flex-col items-center justify-center flex-1 p-6 text-xl text-zinc-400">{t('loading_preferences')}</div>;
  }

  if (!deviceCheckComplete) {
    return <DeviceCheck 
      onComplete={() => setDeviceCheckComplete(true)} 
      interactionMode={interactionMode}
      setInteractionMode={setMode}
    />;
  }

  if (loading || !examStarted) {
    return <div className="flex flex-col items-center justify-center flex-1 p-6 text-xl text-zinc-400">{t('exam_starting')}</div>;
  }

  return (
    <div className="flex min-h-0 flex-col flex-1 p-6">
      <ExamEngine
        mode="exam" 
        examTitle={examMeta?.title} 
        durationMinutes={examMeta?.duration_minutes}
        interactionMode={interactionMode}
      />
    </div>
  );
}

export default function ExamPage() {
  const { t } = useI18n();
  return (
    <main id="main-content" className="flex min-h-dvh flex-col flex-1 bg-black">
      <h1 className="sr-only">{t('exam')}</h1>
      <Suspense fallback={<div className="flex min-h-0 flex-1 items-center justify-center p-12 text-zinc-400">{t('loading')}</div>}>
        <ExamPageContent />
      </Suspense>
    </main>
  );
}
