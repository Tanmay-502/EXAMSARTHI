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
      msg = 'Microphone and speech services are ready. You can start the exam.';
    } else {
      msg = 'Microphone or speech services are not available. You can still take the exam using standard mode.';
      setInteractionMode('standard');
    }
    announce(msg, 'assertive');
    if (interactionMode === 'voice-first') speak(msg);
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
             Voice features are currently unavailable. The exam will start in Standard mode.
           </div>
        )}

        <div className="pt-16 border-t border-zinc-900 flex justify-end">
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
  const { speak, isContinuous, startContinuousListening, transcript } = useVoice();
  const { announce } = useAccessibility();
  const hasSpokenWelcome = useRef(false);
  const hasSpokenConfirmation = useRef(false);

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

  useEffect(() => {
    if (!transcript || transcript.length === 0) return;
    const lastMessage = transcript[transcript.length - 1];
    if (lastMessage.sender !== 'user') return;
    const lower = lastMessage.text.toLowerCase();
    
    if (selectedExam && !hasSpokenConfirmation.current) {
      if (lower.includes('yes') || lower.includes('start')) {
        hasSpokenConfirmation.current = true;
        speak("Starting exam.");
        onSelect(selectedExam.id);
      } else if (lower.includes('no') || lower.includes('change')) {
        hasSpokenConfirmation.current = true; // prevent re-trigger
        setTimeout(() => setSelectedExam(null), 0);
        hasSpokenWelcome.current = false;
        speak("Which exam would you like instead?");
        setTimeout(() => { hasSpokenConfirmation.current = false; }, 2000);
      }
      return;
    }
    
    if (!selectedExam) {
      if (lower.includes('read available') || lower.includes('list exam')) {
        const examNames = exams.map(e => e.title).join(', ');
        speak(`Available exams are ${examNames}.`);
      } else {
        const matchedExam = exams.find(e => lower.includes(e.title.toLowerCase()));
        if (matchedExam) {
          setTimeout(() => setSelectedExam(matchedExam), 0);
          speak(`${matchedExam.title} selected. You have ${matchedExam.question_count} questions and ${matchedExam.duration_minutes} minutes. Would you like to start?`);
        }
      }
    }
  }, [transcript, exams, selectedExam, onSelect, speak]);

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
  const { mode: interactionMode, setMode } = usePreferredMode();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [examId, setExamId] = useState<string | null>(examIdParam);
  const [examStarted, setExamStarted] = useState(false);
  const [deviceCheckComplete, setDeviceCheckComplete] = useState(false);
  const [examMeta, setExamMeta] = useState<{ title: string; duration_minutes: number } | null>(null);

  useEffect(() => {
    if (!examId) return;
    
    async function loadExam() {
      setLoading(true);
      try {
        const exams = await fetchAvailableExams();
        const currentExam = exams.find(e => e.id === examId);
        if (currentExam) {
          setExamMeta({ title: currentExam.title, duration_minutes: currentExam.duration_minutes });
        }
        
        const sessionId = await startExamSession(examId!);
        const questions = await fetchExamQuestions(examId!, sessionId, lang);
        
        initializeExam(sessionId, examId!, questions);
        setExamStarted(true);
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message === 'Unauthorized') {
            router.push('/auth/login?message=unauthenticated');
            return;
          }
          setError(err.message || 'Failed to load exam');
        } else {
          setError('Failed to load exam');
        }
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [examId, initializeExam, lang, router]);

  if (!examId) {
    return <ExamSelection onSelect={(id) => {
      // Use replace so back button works better, or push. 
      router.replace(`/exam?exam_id=${id}`);
      setExamId(id);
    }} />;
  }

  if (loading) {
    return <div className="flex flex-col items-center justify-center flex-1 p-6 text-xl">Loading Exam...</div>;
  }

  if (error) {
    return <div className="flex flex-col items-center justify-center flex-1 p-6 text-xl text-destructive">{error}</div>;
  }

  if (!examStarted) {
    return null;
  }

  if (!deviceCheckComplete) {
    return <DeviceCheck 
      onComplete={() => setDeviceCheckComplete(true)} 
      interactionMode={interactionMode}
      setInteractionMode={setMode}
    />;
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
