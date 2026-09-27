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
    <div className="flex flex-col items-center justify-center flex-1 p-6 max-w-xl mx-auto space-y-6 text-center">
      <h2 className="text-3xl font-bold">Device Readiness Check</h2>
      <div className="w-full space-y-4 text-left border rounded-xl p-6 bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium">Browser Speech Services</span>
          {browserStatus === 'pending' && <span className="text-muted-foreground animate-pulse">Checking...</span>}
          {browserStatus === 'success' && <span className="text-green-500 font-bold">✅ Available</span>}
          {browserStatus === 'error' && <span className="text-destructive font-bold">❌ Unavailable</span>}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium">Microphone Access</span>
          {micStatus === 'pending' && <span className="text-muted-foreground animate-pulse">Checking...</span>}
          {micStatus === 'success' && <span className="text-green-500 font-bold">✅ Granted</span>}
          {micStatus === 'error' && <span className="text-destructive font-bold">❌ Denied</span>}
        </div>
      </div>
      
      {!allClear && (micStatus !== 'pending' && browserStatus !== 'pending') && (
         <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 w-full text-sm">
           Voice features are currently unavailable. The exam will start in Standard mode.
         </div>
      )}

      <button
        onClick={onComplete}
        disabled={micStatus === 'pending' || browserStatus === 'pending'}
        className="w-full py-4 text-lg font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        Start Exam
      </button>
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

  if (loading) return <div className="flex flex-col items-center justify-center flex-1 p-6 text-xl">Loading available exams...</div>;
  if (error) return <div className="flex flex-col items-center justify-center flex-1 p-6 text-xl text-destructive">{error}</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-8 max-w-2xl mx-auto w-full">
      <div className="flex flex-col items-center space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Choose your exam</h1>
        <p className="text-lg text-muted-foreground">Say the name of an available exam.</p>
      </div>

      <div className="relative flex items-center justify-center w-full py-12">
        <VoiceCore size="lg" />
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        {exams.map(exam => (
          <div key={exam.id} className={`p-6 border rounded-xl bg-card text-card-foreground shadow-sm transition-all ${selectedExam?.id === exam.id ? 'ring-2 ring-primary border-primary' : ''}`}>
            <h3 className="text-xl font-semibold mb-2">{exam.title}</h3>
            {exam.description && <p className="text-sm text-muted-foreground mb-4">{exam.description}</p>}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{exam.question_count} questions</span>
              <span>{exam.duration_minutes} mins</span>
            </div>
          </div>
        ))}
      </div>
      
      {selectedExam && (
        <div className="p-4 mt-6 border rounded-lg bg-primary/10 text-primary border-primary/20 text-center animate-in fade-in slide-in-from-bottom-4 w-full">
          <p className="font-medium">You selected <strong>{selectedExam.title}</strong>.</p>
          <p className="text-sm opacity-90 mt-1">Say &quot;Yes&quot; to start or &quot;No&quot; to choose another.</p>
        </div>
      )}
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
        
        const questions = await fetchExamQuestions(examId!, lang);
        const sessionId = await startExamSession(examId!);
        
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
