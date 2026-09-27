'use client'

import { ExamEngine } from '@/components/exam/ExamEngine';
import { useExamStore } from '@/lib/store/examStore';
import { useEffect, useState, Suspense, useRef } from 'react';
import { fetchExamQuestions, startExamSession, fetchAvailableExams } from './actions';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePreferredMode, InteractionMode } from '@/lib/hooks/usePreferredMode';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { VoiceCore } from '@/components/voice/VoiceCore';
import { useAccessibility } from '@/lib/accessibility/AccessibilityProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { SafeAction } from '@/lib/voice/safeActionRegistry';
import { resolveExam } from '@/lib/catalog/examCatalog';

function DeviceCheck({ onComplete, interactionMode, setInteractionMode }: { onComplete: () => void, interactionMode: InteractionMode, setInteractionMode: (m: InteractionMode) => void }) {
  const [micStatus, setMicStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [browserStatus, setBrowserStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const { announce } = useAccessibility();
  const { speak } = useVoice();
  const hasSpoken = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const checkDevices = async () => {
      // Browser speech check
      interface WindowWithSpeech extends Window {
        SpeechRecognition?: unknown;
        webkitSpeechRecognition?: unknown;
      }
      const win = window as unknown as WindowWithSpeech;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setBrowserStatus('success');
      } else {
        setBrowserStatus('error');
      }

      // Mic check
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isMounted) setMicStatus('success');
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error('Microphone access denied or error:', err);
        if (isMounted) setMicStatus('error');
      }
    };
    checkDevices();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (micStatus === 'pending' || browserStatus === 'pending' || hasSpoken.current) return;
    hasSpoken.current = true;
    
    let msg = '';
    if (micStatus === 'success' && browserStatus === 'success') {
      msg = 'Microphone and speech services are ready. You can start the exam by saying start exam, or use the button.';
    } else if (browserStatus === 'error') {
      msg = 'This browser does not provide speech recognition. Voice mode cannot be used here. You can continue with keyboard and screen reader mode.';
    } else {
      msg = 'Microphone access is unavailable. Your voice-first preference is still kept. Allow microphone access and choose Retry, or continue with keyboard and screen reader mode.';
    }
    announce(msg, 'assertive');
    speak(msg);
  }, [micStatus, browserStatus, announce, speak, interactionMode, setInteractionMode]);

  const allClear = micStatus === 'success' && browserStatus === 'success';

  return (
    <div className="flex flex-col min-h-screen w-full max-w-4xl mx-auto pt-32 pb-24 px-6 bg-black text-white">
      <div className="mb-24 border-b border-zinc-900 pb-8">
        <span className="text-zinc-500 tracking-[0.2em] text-xs uppercase">SYSTEM CHECK</span>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-16">
        <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-light tracking-tighter leading-tight mb-8">
          Verifying Environment.
        </h2>
        
        <div className="space-y-8 border-t border-zinc-900 pt-8">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-light text-zinc-400">Browser Speech Services</span>
            {browserStatus === 'pending' && <span className="text-zinc-600 uppercase tracking-widest text-sm animate-pulse">Checking</span>}
            {browserStatus === 'success' && <span className="text-white uppercase tracking-widest text-sm font-medium">Ready</span>}
            {browserStatus === 'error' && <span className="text-red-500 uppercase tracking-widest text-sm font-medium">Unavailable</span>}
          </div>
          <div className="flex items-center justify-between border-t border-zinc-900 pt-8">
            <span className="text-2xl font-light text-zinc-400">Microphone Access</span>
            {micStatus === 'pending' && <span className="text-zinc-600 uppercase tracking-widest text-sm animate-pulse">Checking</span>}
            {micStatus === 'success' && <span className="text-white uppercase tracking-widest text-sm font-medium">Granted</span>}
            {micStatus === 'error' && <span className="text-red-500 uppercase tracking-widest text-sm font-medium">Denied</span>}
          </div>
        </div>
        
        {!allClear && (micStatus !== 'pending' && browserStatus !== 'pending') && (
           <div className="pt-8 text-zinc-500 font-light text-lg">
             Voice features are unavailable in this browser right now. You can retry voice access or explicitly continue with keyboard and screen reader mode.
           </div>
        )}

        <div className="pt-16 border-t border-zinc-900 flex flex-wrap justify-end gap-4">
          {!(micStatus === 'success' && browserStatus === 'success') && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              disabled={micStatus === 'pending' || browserStatus === 'pending'}
              className="px-8 py-4 rounded-full border border-zinc-800 text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-50 transition-colors uppercase tracking-widest text-sm font-bold"
            >
              Retry Voice Check
            </button>
          )}
          {!(micStatus === 'success' && browserStatus === 'success') && (
            <button
              type="button"
              onClick={() => setInteractionMode('standard')}
              className="px-8 py-4 rounded-full border border-zinc-800 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors uppercase tracking-widest text-sm font-bold"
            >
              Continue with Keyboard
            </button>
          )}
          <button
            onClick={onComplete}
            disabled={micStatus === 'pending' || browserStatus === 'pending'}
            className="px-12 py-4 rounded-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors uppercase tracking-widest text-sm font-bold"
          >
            Start Exam
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
  const { announce } = useAccessibility();
  const hasSpokenWelcome = useRef(false);
  const lastHandledTranscriptRef = useRef<string>('');
  const router = useRouter();
  const { useVoiceAction } = useGlobalVoice();

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAvailableExams();
        setExams(data);
      } catch {
        setError('Failed to fetch available exams');
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
      const msg = `Which exam would you like to take? Available exams are ${examNames}. You can say an exam name or say list exams.`;
      speak(msg);
      announce(msg);
      
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

    const isDashboardRequest =
      /\b(dashboard|home)\b/.test(normalized) &&
      /(back|return|take me|go to|open|show|bring me|send me)/.test(normalized);

    if (isDashboardRequest || action === 'OPEN_DASHBOARD') {
      lastHandledTranscriptRef.current = normalized;
      speak("Taking you back to your dashboard.");
      router.push('/dashboard');
      return true;
    }

    if (selectedExam) {
      const confirmed = /\b(yes|yeah|yep|confirm|start|okay|ok|haan|हाँ|అవును)\b/.test(normalized);
      const rejected = /\b(no|nope|change|cancel|different|nah|नहीं|नही|కాదు|రద్దు)\b/.test(normalized);

      if (confirmed || action === 'CONFIRM') {
        lastHandledTranscriptRef.current = normalized;
        speak("Starting exam.");
        onSelect(selectedExam.id);
        return true;
      }

      if (rejected || action === 'CHANGE') {
        lastHandledTranscriptRef.current = normalized;
        hasSpokenWelcome.current = false;
        setSelectedExam(null);
        speak("Okay. Which exam would you like instead?");
        return true;
      }

      // A new exam name while a selection is pending replaces the pending choice.
      resolveExam(raw).then((matched) => {
        if (!matched) return;
        const availableMatch = exams.find(exam => exam.id === matched.id);
        if (!availableMatch) return;

        setSelectedExam(availableMatch);

        const wantsImmediateStart =
          /\b(start|begin|take|attempt|give)\b/.test(normalized) &&
          /\b(exam|test)\b/.test(normalized);

        speak(
          wantsImmediateStart
            ? "Starting " + availableMatch.title + "."
            : availableMatch.title +
              " selected. It has " +
              availableMatch.question_count +
              " questions and " +
              availableMatch.duration_minutes +
              " minutes. Say yes to start or say change to choose another."
        );

        if (wantsImmediateStart) {
          onSelect(availableMatch.id);
        }
      });
      lastHandledTranscriptRef.current = normalized;
      return true;
    }

    if (
      /\b(list|available|show|what|which)\b/.test(normalized) &&
      /\b(exam|exams)\b/.test(normalized)
    ) {
      lastHandledTranscriptRef.current = normalized;
      const examNames = exams.map((exam, index) => `Exam ${index + 1}: ${exam.title}. ${exam.question_count} questions, ${exam.duration_minutes} minutes.`).join(' ');
      speak("Available exams are " + examNames);
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

    // Resolve the actual spoken exam title locally from the live database
    // before falling back to Gemini. This keeps exact exam selection reliable
    // even when the semantic service is unavailable.
    if (normalized.length >= 2) {
      lastHandledTranscriptRef.current = normalized;
      void resolveExam(raw).then((matched) => {
        if (!matched) return;
        const availableMatch = exams.find(exam => exam.id === matched.id);
        if (!availableMatch) return;

        setSelectedExam(availableMatch);

        const wantsImmediateStart =
          /\b(start|begin|take|attempt|give)\b/.test(normalized) &&
          /\b(exam|test)\b/.test(normalized);

        speak(
          wantsImmediateStart
            ? "Starting " + availableMatch.title + "."
            : availableMatch.title +
              " selected. It has " +
              availableMatch.question_count +
              " questions and " +
              availableMatch.duration_minutes +
              " minutes. Say yes to start or say change to choose another."
        );

        if (wantsImmediateStart) {
          onSelect(availableMatch.id);
        }
      });
      return true;
    }

    return false;
  });



  if (loading) return <div className="flex flex-col items-center justify-center min-h-screen bg-black text-zinc-500 font-light text-xl">Loading available exams...</div>;
  if (error) return <div className="flex flex-col items-center justify-center min-h-screen bg-black text-red-500 font-light text-xl">{error}</div>;

  return (
    <div className="relative flex flex-col min-h-screen w-full max-w-7xl mx-auto pt-32 pb-24 px-6 md:px-12 bg-black text-white">
      <div className="mb-24 flex items-center justify-between border-b border-zinc-900 pb-8">
        <div className="flex flex-col">
          <span className="text-zinc-500 tracking-[0.2em] text-xs uppercase mb-2">MODE</span>
          <span className="text-xl font-light tracking-wide">EXAMINATION</span>
        </div>
        <VoiceCore size="sm" />
      </div>

      <div className="flex-1 flex flex-col justify-center w-full max-w-4xl mx-auto">
        <div className="mb-16">
          <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-light tracking-tighter leading-tight mb-4">Choose your exam</h2>
          <p className="text-2xl text-zinc-500 font-light">&quot;Say the name of an available exam.&quot;</p>
        </div>

        <div className="flex flex-col">
          {exams.map((exam, i) => (
            <div 
              key={exam.id} 
              className={`group flex flex-col md:flex-row md:items-center justify-between py-8 transition-colors ${i === 0 ? 'border-t border-zinc-900' : 'border-t border-zinc-900'} ${selectedExam?.id === exam.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <div className="flex-1 pr-8">
                <h3 className="text-3xl md:text-4xl font-light tracking-tight mb-2">{exam.title}</h3>
                {exam.description && <p className="text-lg font-light opacity-60 line-clamp-2">{exam.description}</p>}
              </div>
              <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-2 mt-4 md:mt-0 opacity-80 uppercase tracking-widest text-xs">
                <span>{exam.question_count} questions</span>
                <span className="hidden md:inline">•</span>
                <span>{exam.duration_minutes} mins</span>
              </div>
            </div>
          ))}
        </div>
        
        {selectedExam && (
          <div className="mt-16 pt-8 border-t border-zinc-900 animate-in fade-in slide-in-from-bottom-4">
            <p className="text-2xl font-light text-zinc-300 mb-2">You selected <strong className="text-white font-medium">{selectedExam.title}</strong>.</p>
            <p className="text-zinc-500 font-light">Say &quot;Yes&quot; to start or &quot;No&quot; to choose another.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ExamPageContent() {
  const initializeExam = useExamStore(state => state.initializeExam);
  const { lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examIdParam = searchParams.get('exam_id');
  const { mode: interactionMode, setMode, isLoaded: preferenceLoaded } = usePreferredMode();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [examId, setExamId] = useState<string | null>(examIdParam);
  const [examStarted, setExamStarted] = useState(false);
  const [deviceCheckComplete, setDeviceCheckComplete] = useState(false);
  const [examMeta, setExamMeta] = useState<{ title: string; duration_minutes: number } | null>(null);

  // First load only the selected exam metadata. Do not create an in-progress
  // server session until the candidate has passed the device check.
  useEffect(() => {
    if (!examId) return;

    async function loadExamMeta() {
      setLoading(true);
      setError('');
      try {
        const exams = await fetchAvailableExams();
        const currentExam = exams.find(e => e.id === examId);

        if (!currentExam) {
          setError('The selected exam is no longer available.');
          return;
        }

        setExamMeta({
          title: currentExam.title,
          duration_minutes: currentExam.duration_minutes
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'Unauthorized') {
          router.push('/auth/login?message=unauthenticated');
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to load exam');
      } finally {
        setLoading(false);
      }
    }

    loadExamMeta();
  }, [examId, router]);

  // Only create the server session after the device check is complete.
  useEffect(() => {
    if (!examId || !examMeta || !deviceCheckComplete || !preferenceLoaded || examStarted) {
      return;
    }

    async function startSelectedExam() {
      setLoading(true);
      setError('');
      try {
        const sessionId = await startExamSession(examId);
        const questions = await fetchExamQuestions(examId, sessionId, lang);

        if (questions.length === 0) {
          throw new Error('This exam has no available questions.');
        }

        initializeExam(sessionId, examId, questions);
        setExamStarted(true);
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'Unauthorized') {
          router.push('/auth/login?message=unauthenticated');
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to start exam');
      } finally {
        setLoading(false);
      }
    }

    startSelectedExam();
  }, [examId, examMeta, deviceCheckComplete, preferenceLoaded, examStarted, initializeExam, lang, router]);

  if (!examId) {
    return <ExamSelection onSelect={(id) => {
      // Use replace so back button works better, or push. 
      router.replace(`/exam?exam_id=${id}`);
      setExamId(id);
    }} />;
  }

  if (loading && !examMeta) {
    return <div className="flex flex-col items-center justify-center flex-1 p-6 text-xl">Loading Exam...</div>;
  }

  if (error) {
    return <div className="flex flex-col items-center justify-center flex-1 p-6 text-xl text-destructive">{error}</div>;
  }

  if (!preferenceLoaded) {
    return <div className="flex flex-col items-center justify-center flex-1 p-6 text-xl">Loading preferences...</div>;
  }

  if (!deviceCheckComplete) {
    return <DeviceCheck 
      onComplete={() => setDeviceCheckComplete(true)} 
      interactionMode={interactionMode}
      setInteractionMode={setMode}
    />;
  }

  if (loading || !examStarted) {
    return <div className="flex flex-col items-center justify-center flex-1 p-6 text-xl">Starting exam...</div>;
  }

  return (
    <main className="flex flex-col flex-1 p-6">
      <div className="sr-only">Exam Mode</div>
      <ExamEngine 
        mode="exam" 
        examTitle={examMeta?.title} 
        durationMinutes={examMeta?.duration_minutes}
        interactionMode={interactionMode}
      />
    </main>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ExamPageContent />
    </Suspense>
  );
}
