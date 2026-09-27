'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useAccessibility } from '@/lib/accessibility/AccessibilityProvider';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { SafeAction } from '@/lib/voice/safeActionRegistry';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/lib/store/examStore';
import { Mic, MicOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { VoiceCore } from '@/components/voice/VoiceCore';
import { motion } from 'framer-motion';

type ExamEngineProps = {
  mode: 'practice' | 'exam';
  examTitle?: string;
  durationMinutes?: number;
};

type EngineState = 'MIC_TEST' | 'READY' | 'EXAM' | 'CONFIRM_ANSWER' | 'CONFIRM_SUBMIT' | 'PROCESSING';


export function ExamEngine({ mode, examTitle, durationMinutes }: ExamEngineProps) {
  const { t, tParams, lang } = useI18n();
  const { announce } = useAccessibility();
  const { speak, stopSpeaking, startContinuousListening, pauseListening, isContinuous, micError, voiceState } = useVoice();
  const { useVoiceAction } = useGlobalVoice();
  const router = useRouter();

  const {
    questions,
    answers,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    setAnswer,
    toggleMarkForReview,
    submitExam,
    sessionId
  } = useExamStore();

  const headingRef = useRef<HTMLHeadingElement>(null);
  const currentQuestion = questions[currentQuestionIndex];
  
  const [engineState, setEngineState] = useState<EngineState>('MIC_TEST');
  const [pendingAnswer, setPendingAnswer] = useState<number | null>(null);
  const [timeRemainingStr, setTimeRemainingStr] = useState<string>('60:00');
  const micTestStateRef = useRef<'INIT' | 'SPEAKING' | 'LISTENING'>('INIT');

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (engineState === 'EXAM' && mode === 'exam') {
      timer = setInterval(() => {
        const state = useExamStore.getState();
        if (state.startTime) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
          const remain = Math.max(0, (60 * 60) - elapsed);
          const m = Math.floor(remain / 60).toString().padStart(2, '0');
          const s = (remain % 60).toString().padStart(2, '0');
          setTimeRemainingStr(`${m}:${s}`);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [engineState, mode]);



  const spokenStateKey = useRef<string | null>(null);

  useEffect(() => {
    // Only speak once per state/question to prevent Strict Mode double-speaking
    const currentKey = engineState === 'EXAM' ? `${engineState}-${currentQuestionIndex}` : engineState;
    if (spokenStateKey.current === currentKey) return;
    spokenStateKey.current = currentKey;

    if (engineState === 'MIC_TEST') {
      if (micTestStateRef.current === 'INIT') {
        pauseListening();
        stopSpeaking(); // Cancel any stale speech
        
        let mounted = true;
        const fallbackTimeout = setTimeout(() => {
          if (!mounted) return;
          const attemptSpeak = () => {
            if (!mounted) return;
            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) {
              const onVoicesChanged = () => {
                window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
                if (mounted) attemptSpeak();
              };
              window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
              setTimeout(() => {
                window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
                if (mounted && window.speechSynthesis.getVoices().length === 0) {
                  announce("Voice instructions could not be spoken. You can continue using the keyboard.", "assertive");
                  micTestStateRef.current = 'LISTENING';
                  startContinuousListening();
                } else if (mounted) {
                  attemptSpeak();
                }
              }, 3000);
              return;
            }
            
            const prompt = t('mic_check_prompt') || "Let's test your microphone. Please say: Next.";
            announce(prompt, 'assertive');
            micTestStateRef.current = 'SPEAKING';
            speak(prompt);
          };
          attemptSpeak();
        }, 500); // Wait briefly for stabilization

        return () => {
          mounted = false;
          clearTimeout(fallbackTimeout);
        };
      }
    } else if (engineState === 'READY') {
      const actualDuration = durationMinutes ?? 60;
      const actualTitle = examTitle ?? (mode === 'exam' ? 'Mock Exam' : 'Practice');
      const announcement = tParams('exam_orientation', { 
        examName: actualTitle, 
        total: questions.length, 
        duration: actualDuration,
        language: lang === 'en-IN' ? 'English' : lang === 'hi-IN' ? 'Hindi' : 'Telugu'
      }) + ' ' + t('say_start_exam');
      announce(announcement, 'assertive');
      if (isContinuous) speak(announcement);
    } else if (engineState === 'EXAM') {
      // Focus the question heading on mount and index change
      headingRef.current?.focus();
      
      // Automatically announce the question
      if (currentQuestion) {
        let cleanQuestion = currentQuestion.question_text;
        let imageUrl = currentQuestion.image_url || null;
        
        // Fallback for legacy format if present
        const match = cleanQuestion.match(/\[IMAGE:(.*?)\]/);
        if (match && !imageUrl) {
          imageUrl = match[1];
        }
        if (match) {
          cleanQuestion = cleanQuestion.replace(match[0], '').trim();
        }

        let announcement = `${tParams('question_x_of_y', { x: currentQuestionIndex + 1, y: questions.length })}. ${cleanQuestion}.`;
        
        const buildOptionsText = () => {
          let text = '';
          if (currentQuestion.options && currentQuestion.options.length > 0) {
            const optionsText = currentQuestion.options.map((opt, idx) => `${t('option')} ${idx + 1}: ${opt}.`).join(' ');
            text += ' ' + optionsText + ' ' + t('question_instruction');
          }
          return text;
        };

        if (imageUrl) {
          const fetchVision = async () => {
            const analysisMsg = "This question contains a diagram. Analyzing...";
            announce(analysisMsg, 'assertive');
            if (isContinuous) speak(analysisMsg);

            try {
              const res = await fetch('/api/vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl })
              });
              const data = await res.json();
              
              const fullAnnouncement = announcement + ' Diagram description: ' + data.description + buildOptionsText();
              
              // Only speak if we are still on this question
              const currentKey = engineState === 'EXAM' ? `${engineState}-${currentQuestionIndex}` : engineState;
              if (spokenStateKey.current === currentKey) {
                announce(fullAnnouncement, 'assertive');
                if (isContinuous) speak(fullAnnouncement);
              }
            } catch (err) {
              console.error('Vision fetch failed', err);
              const fallback = announcement + ' The diagram could not be analyzed. ' + buildOptionsText();
              announce(fallback, 'assertive');
              if (isContinuous) speak(fallback);
            }
          };
          fetchVision();
        } else {
          announcement += buildOptionsText();
          announce(announcement, 'assertive');
          if (isContinuous) speak(announcement);
        }
      }
    }
  }, [
    engineState, currentQuestionIndex, currentQuestion, mode, questions.length, 
    lang, t, tParams, announce, speak, stopSpeaking, isContinuous, 
    startContinuousListening, durationMinutes, examTitle, pauseListening
  ]);

  useEffect(() => {
    if (engineState === 'MIC_TEST' && micTestStateRef.current === 'SPEAKING') {
      if (voiceState === 'IDLE') {
        micTestStateRef.current = 'LISTENING';
        startContinuousListening();
      }
    }
  }, [engineState, voiceState, startContinuousListening]);

  useEffect(() => {
    return () => stopSpeaking();
  }, [stopSpeaking]);

  const handleOptionSelect = (optionIndex: number) => {
    if (!currentQuestion) return;
    setAnswer(currentQuestion.id, optionIndex);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      announce(t('end_of_questions'));
      speak(t('end_of_questions'));
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      announce(t('first_question'));
      speak(t('first_question'));
    }
  };

  const handleToggleMarkForReview = () => {
    if (!currentQuestion) return;
    toggleMarkForReview(currentQuestion.id);
    const isMarked = answers[currentQuestion.id]?.is_marked_for_review;
    if (isMarked) {
      announce(t('removed_mark'));
      speak(t('removed_mark'));
    } else {
      announce(t('marked_for_review'));
      speak(t('marked_for_review'));
    }
  };

  const jumpToUnanswered = () => {
    const index = questions.findIndex(q => answers[q.id]?.answer_data === undefined);
    if (index !== -1) {
      setCurrentQuestionIndex(index);
    } else {
      speak('All questions answered.');
    }
  };

  const jumpToMarked = () => {
    const index = questions.findIndex(q => answers[q.id]?.is_marked_for_review);
    if (index !== -1) {
      setCurrentQuestionIndex(index);
    } else {
      speak('No questions marked for review.');
    }
  };

  const jumpToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    } else {
      speak('Invalid question number.');
    }
  };

  const confirmSubmitFlow = () => {
    const answeredCount = Object.values(answers).filter(a => a.answer_data !== undefined).length;
    const markedCount = Object.values(answers).filter(a => a.is_marked_for_review).length;
    const unansweredCount = questions.length - answeredCount;

    setEngineState('CONFIRM_SUBMIT');
    spokenStateKey.current = null; // reset to force speaking the submit message
    
    const warning = tParams('submit_warning_msg', { 
      total: questions.length, 
      answered: answeredCount, 
      unanswered: unansweredCount, 
      marked: markedCount 
    });
    const confirm = t('submit_confirm_msg');
    
    const msg = warning + ' ' + confirm;
    announce(msg, 'assertive');
    speak(msg);
  };

  const executeSubmit = async () => {
    setEngineState('PROCESSING');
    speak(lang === 'hi-IN' ? 'जमा किया जा रहा है...' : lang === 'te-IN' ? 'సమర్పిస్తున్నాము...' : 'Processing submission...');
    try {
      const { submitExamAnswers } = await import('@/app/exam/actions');
      if (sessionId) {
        const questionIds = questions.map(q => q.id);
        await submitExamAnswers(sessionId, answers, questionIds);
        submitExam();
        router.push(`/results?session_id=${sessionId}`);
        return;
      }
    } catch (err) {
      console.error('Failed to submit exam:', err);
    }
    submitExam();
    router.push('/results');
  };

  const voiceHandler = (action: SafeAction, payload?: Record<string, unknown> | null) => {
    switch (action) {
      case 'START_EXAM':
      case 'OPEN_EXAM':
      case 'START_PRACTICE':
      case 'OPEN_PRACTICE':
        if (engineState === 'READY') {
          setEngineState('EXAM');
        }
        break;


      case 'CONFIRM':
        if (engineState === 'CONFIRM_ANSWER' && pendingAnswer !== null) {
          handleOptionSelect(pendingAnswer);
          setPendingAnswer(null);
          spokenStateKey.current = `EXAM-${currentQuestionIndex}`; // prevent re-announcing the question
          setEngineState('EXAM');
          const msg = t('answer_saved') + ' ' + t('say_next_continue');
          speak(msg);
          announce(msg);
        } else if (engineState === 'CONFIRM_SUBMIT') {
          executeSubmit();
        }
        break;
        
      case 'CHANGE':
        if (engineState === 'CONFIRM_ANSWER' || engineState === 'CONFIRM_SUBMIT') {
          setPendingAnswer(null);
          spokenStateKey.current = `EXAM-${currentQuestionIndex}`;
          setEngineState('EXAM');
          const canceledMsg = lang === 'hi-IN' ? 'रद्द किया गया' : lang === 'te-IN' ? 'రద్దు చేయబడింది' : 'Canceled.';
          
          let announcement = canceledMsg + ' ';
          if (currentQuestion) {
            announcement += `${tParams('question_x_of_y', { x: currentQuestionIndex + 1, y: questions.length })}. ${currentQuestion.question_text}.`;
            if (currentQuestion.options && currentQuestion.options.length > 0) {
              const optionsText = currentQuestion.options.map((opt, idx) => `${t('option')} ${idx + 1}: ${opt}.`).join(' ');
              announcement += ' ' + optionsText;
            }
          }
          speak(announcement);
        }
        break;

      case 'UNKNOWN_COMMAND':
        if (engineState === 'MIC_TEST' && payload?.transcript) {
          const t_input = String(payload.transcript).toLowerCase();
          if (t_input.includes('test') || t_input.includes('1') || t_input.includes('hello') || t_input.includes('skip') || t_input.includes('next')) {
            const success = t('mic_check_success') || "Voice control is ready.";
            setEngineState('READY');
            spokenStateKey.current = 'READY';
            
            const actualDuration = durationMinutes ?? 60;
            const actualTitle = examTitle ?? (mode === 'exam' ? 'Mock Exam' : 'Practice');
            const announcement = tParams('exam_orientation', { 
              examName: actualTitle, 
              total: questions.length, 
              duration: actualDuration,
              language: lang === 'en-IN' ? 'English' : lang === 'hi-IN' ? 'Hindi' : 'Telugu'
            }) + ' ' + t('say_start_exam');
            
            const msg = success + ' ' + announcement;
            speak(msg);
            announce(msg);
          } else {
            const retryMsg = lang === 'hi-IN' ? 'मुझे समझ नहीं आया। कृपया कहें अगला या परीक्षण छोड़ें।' : lang === 'te-IN' ? 'నాకు అర్థం కాలేదు. దయచేసి చెప్పండి తదుపరి లేదా పరీక్ష వదిలేయండి.' : "I didn't catch that. Please say next or skip test.";
            speak(retryMsg);
          }
        }
        break;

      case 'NEXT_QUESTION':
        if (engineState === 'MIC_TEST') {
          const success = t('mic_check_success') || "You said Next. Your microphone is working.";
          setEngineState('READY');
          spokenStateKey.current = 'READY';
          
          const actualDuration = durationMinutes ?? 60;
          const actualTitle = examTitle ?? (mode === 'exam' ? 'Mock Exam' : 'Practice');
          const announcement = tParams('exam_orientation', { 
            examName: actualTitle, 
            total: questions.length, 
            duration: actualDuration,
            language: lang === 'en-IN' ? 'English' : lang === 'hi-IN' ? 'Hindi' : 'Telugu'
          }) + ' ' + t('say_start_exam');
          
          const msg = success + ' ' + announcement;
          speak(msg);
          announce(msg);
        } else if (engineState === 'EXAM') {
          handleNext();
        }
        break;
        
      case 'PREVIOUS_QUESTION':
        if (engineState === 'EXAM') handlePrev();
        break;
        
      case 'REPEAT':
      case 'READ_QUESTION':
      case 'READ_OPTIONS':
        if (engineState === 'READY') {
          const actualDuration = durationMinutes ?? 60;
          const actualTitle = examTitle ?? (mode === 'exam' ? 'Mock Exam' : 'Practice');
          const announcement = tParams('exam_orientation', { 
            examName: actualTitle, 
            total: questions.length, 
            duration: actualDuration,
            language: lang === 'en-IN' ? 'English' : lang === 'hi-IN' ? 'Hindi' : 'Telugu'
          });
          speak(announcement);
        } else if (engineState === 'EXAM' && currentQuestion) {
          let announcement = '';
          if (action === 'REPEAT' || action === 'READ_QUESTION') {
            let cleanText = currentQuestion.question_text;
            let imgUrl = currentQuestion.image_url || null;
            const match = currentQuestion.question_text.match(/\[IMAGE:(.*?)\]/);
            if (match && !imgUrl) {
              imgUrl = match[1];
            }
            if (match) {
              cleanText = cleanText.replace(match[0], '').trim();
            }
            if (imgUrl) {
              cleanText += '. (This question contains a diagram)';
            }
            announcement += `${tParams('question_x_of_y', { x: currentQuestionIndex + 1, y: questions.length })}. ${cleanText}. `;
          }
          if (action === 'REPEAT' || action === 'READ_OPTIONS') {
            if (currentQuestion.options && currentQuestion.options.length > 0) {
              const optionsText = currentQuestion.options.map((opt, idx) => `${t('option')} ${idx + 1}: ${opt}.`).join(' ');
              announcement += ' ' + optionsText;
            }
          }
          speak(announcement);
        }
        break;
        
      case 'MARK_REVIEW':
        if (engineState === 'EXAM') handleToggleMarkForReview();
        break;
        
      case 'REVIEW_UNANSWERED':
        if (engineState === 'EXAM') jumpToUnanswered();
        break;
        
      case 'REVIEW_MARKED':
        if (engineState === 'EXAM') jumpToMarked();
        break;
        
      case 'JUMP_TO_QUESTION':
        if (engineState === 'EXAM' && typeof payload?.index === 'number') {
          jumpToQuestion(payload.index);
        }
        break;
        
      case 'SUBMIT_EXAM':
        if (engineState === 'EXAM') confirmSubmitFlow();
        break;
        
      case 'TIME_LEFT':
        if (mode === 'exam') {
          const state = useExamStore.getState();
          if (state.startTime) {
            const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
            const remainingSeconds = Math.max(0, (60 * 60) - elapsedSeconds);
            const minutesLeft = Math.ceil(remainingSeconds / 60);
            speak(tParams('time_remaining', { time: `${minutesLeft} ${t('minutes')}` }));
          } else {
            speak(tParams('time_remaining', { time: '60 minutes' }));
          }
        }
        break;
        
      case 'SELECT_OPTION':
        if (engineState === 'EXAM' && typeof payload?.index === 'number') {
          if (currentQuestion && currentQuestion.options && payload.index >= 0 && payload.index < currentQuestion.options.length) {
            setPendingAnswer(payload.index);
            spokenStateKey.current = null;
            setEngineState('CONFIRM_ANSWER');
            const selectedOption = currentQuestion.options[payload.index];
            const prompt = tParams('answer_confirm_prompt', { index: payload.index + 1, option: selectedOption });
            announce(prompt);
            speak(prompt);
          } else {
            speak(t('invalid_option'));
          }
        }
        break;
        
      case 'HELP':
        speak(t('help_message'));
        break;
    }
  };

  useVoiceAction(voiceHandler);

  // Removed duplicated setup logic for MIC_TEST in useEffect

  const toggleListening = () => {
    if (isContinuous) {
      pauseListening();
    } else {
      startContinuousListening();
    }
  };

  if (!currentQuestion) return null;

  const currentAnswer = answers[currentQuestion.id];
  const isMarkedForReview = currentAnswer?.is_marked_for_review || false;


  if (engineState === 'MIC_TEST') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-black text-white p-6 relative overflow-hidden w-full">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <VoiceCore size="lg" />
        </motion.div>

        <div className="w-full max-w-2xl text-center space-y-6 relative z-10">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight" aria-live="assertive">Microphone Test</h1>
          <p className="text-xl text-white/60" aria-live="polite">
            {t('mic_check_prompt') || "Let's test your microphone. Please say: Next."}
          </p>
          
          {micError && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-destructive font-medium p-4 bg-destructive/10 rounded-lg border border-destructive/20 inline-block mt-4"
            >
              {t('mic_check_fail')}
            </motion.div>
          )}

          <div className="pt-8">
            <button
              onClick={() => {
                const success = t('mic_check_success') || "You skipped the microphone test.";
                setEngineState('READY');
                spokenStateKey.current = 'READY';
                
                const announcement = tParams('exam_orientation', { 
                  examName: mode === 'exam' ? 'Mock Exam' : 'Practice', 
                  total: questions.length, 
                  duration: 60,
                  language: lang === 'en-IN' ? 'English' : lang === 'hi-IN' ? 'Hindi' : 'Telugu'
                }) + ' ' + t('say_start_exam');
                
                const msg = success + ' ' + announcement;
                speak(msg);
                announce(msg);
              }}
              className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-full border border-white/10 transition-colors focus-visible:ring-4 focus-visible:ring-white/30"
            >
              SKIP TEST
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Renders for different engine states
  if (engineState === 'READY') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-black text-white p-6 relative overflow-hidden w-full">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <VoiceCore size="lg" />
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-2xl text-center space-y-6 relative z-10"
        >
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{t('exam')} Orientation</h1>
          <p className="text-xl text-white/80 leading-relaxed" aria-live="polite">
            {tParams('exam_orientation', { examName: mode === 'exam' ? 'Mock Exam' : 'Practice', total: questions.length, duration: 60, language: lang === 'en-IN' ? 'English' : lang === 'hi-IN' ? 'Hindi' : 'Telugu' })}
          </p>
          <p className="text-lg text-emerald-400 font-medium">
            {t('say_start_exam')}
          </p>
          <div className="pt-8">
            <button
              onClick={() => {
                stopSpeaking();
                setEngineState('EXAM');
              }}
              className="px-10 py-4 bg-white text-black text-xl font-bold rounded-full hover:bg-white/90 transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-white/30"
            >
              START EXAM
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (engineState === 'CONFIRM_SUBMIT') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-black text-white p-6 w-full">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-8 p-6 bg-red-500/20 rounded-full border border-red-500/30"
        >
          <AlertTriangle className="w-16 h-16 text-red-500" />
        </motion.div>
        
        <div className="w-full max-w-2xl text-center space-y-6">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{t('submit')}</h1>
          <p className="text-xl text-white/80 leading-relaxed" aria-live="polite">
            {t('submit_confirm_msg')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <button
              onClick={() => setEngineState('EXAM')}
              className="px-8 py-4 bg-white/10 text-white text-lg font-bold rounded-full hover:bg-white/20 transition-colors focus-visible:ring-4 focus-visible:ring-white/30"
            >
              NO, GO BACK
            </button>
            <button
              onClick={executeSubmit}
              className="px-8 py-4 bg-red-600 text-white text-lg font-bold rounded-full hover:bg-red-500 transition-colors shadow-[0_0_20px_rgba(220,38,38,0.4)] focus-visible:ring-4 focus-visible:ring-red-500/50"
            >
              YES, SUBMIT
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (engineState === 'PROCESSING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-black text-white p-6 w-full">
        <VoiceCore size="lg" />
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl md:text-3xl font-bold mt-12 text-white/80" 
          aria-live="assertive"
        >
          {lang === 'hi-IN' ? 'जमा किया जा रहा है...' : lang === 'te-IN' ? 'సమర్పిస్తున్నాము...' : 'Processing submission...'}
        </motion.h1>
      </div>
    );
  }

  // EXAM or CONFIRM_ANSWER state
  return (
    <div className="flex flex-col flex-1 w-full max-w-4xl mx-auto space-y-8">
      {/* Header Info */}
      {/* Header Info */}
      <div className="flex justify-between items-center bg-muted/50 p-4 rounded-xl border border-border/50 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-6 z-10">
          <VoiceCore size="sm" />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{mode === 'exam' ? 'Real Exam' : 'Practice Mode'}</span>
            <span className="text-xl font-bold" aria-live="polite">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 z-10">
          <button 
            onClick={toggleListening}
            className={`p-3 rounded-full border-2 transition-all ${isContinuous ? 'bg-primary/20 text-primary border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]' : micError ? 'bg-destructive/10 text-destructive border-destructive' : 'bg-background hover:bg-accent text-foreground border-border'}`}
            aria-label={micError === 'denied' ? 'Microphone denied' : isContinuous ? 'Pause voice control' : 'Enable voice control'}
            title={micError === 'denied' ? 'Microphone access denied' : ''}
          >
            {micError ? <MicOff className="w-6 h-6 text-destructive" /> : isContinuous ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>
          {mode === 'exam' && (
            <div className="flex flex-col items-end">
              <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{t('time_left')}</span>
              <span className="text-2xl font-mono font-bold text-primary tracking-tight" aria-live="polite">
                {timeRemainingStr}
              </span>
            </div>
          )}
        </div>
      </div>

      {engineState === 'CONFIRM_ANSWER' ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="bg-primary/5 text-primary shadow-lg shadow-primary/10 rounded-2xl border-2 border-primary/50 p-8 md:p-12 flex flex-col items-center space-y-8"
        >
          <CheckCircle className="w-16 h-16 text-primary animate-bounce" />
          <h2 className="text-2xl md:text-3xl font-bold text-center" aria-live="assertive">
            {currentQuestion.options && pendingAnswer !== null 
              ? tParams('answer_confirm_prompt', { index: pendingAnswer + 1, option: currentQuestion.options[pendingAnswer] })
              : 'Confirm answer?'}
          </h2>
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => {
                setPendingAnswer(null);
                setEngineState('EXAM');
              }}
              className="px-6 py-3 bg-background text-foreground text-lg font-bold rounded-lg border hover:bg-accent focus-visible:ring-4 focus-visible:ring-ring"
            >
              CHANGE
            </button>
            <button
              onClick={() => {
                if (pendingAnswer !== null) {
                  handleOptionSelect(pendingAnswer);
                  setPendingAnswer(null);
                  setEngineState('EXAM');
                }
              }}
              className="px-6 py-3 bg-primary text-primary-foreground text-lg font-bold rounded-lg hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring"
            >
              CONFIRM
            </button>
          </div>
        </motion.div>
      ) : (
        /* Question */
        <div className="bg-card text-card-foreground shadow-sm rounded-xl border p-6 md:p-8">
          {(() => {
            let cleanText = currentQuestion.question_text;
            let imgUrl = currentQuestion.image_url || null;
            const altText = currentQuestion.image_alt_text || "Question diagram";
            
            // Legacy fallback
            const match = cleanText.match(/\[IMAGE:(.*?)\]/);
            if (match && !imgUrl) {
              imgUrl = match[1];
            }
            if (match) {
              cleanText = cleanText.replace(match[0], '').trim();
            }
            return (
              <>
                <h2 
                  tabIndex={-1} 
                  ref={headingRef} 
                  className="text-3xl md:text-5xl font-extrabold tracking-tight mb-8 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background rounded-md"
                >
                  {cleanText}
                </h2>
                {imgUrl && (
                  <div className="mb-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl} alt={altText} className="max-w-full h-auto rounded-lg border shadow-sm" />
                  </div>
                )}
              </>
            );
          })()}

          {/* Options */}
          <div 
            role="radiogroup" 
            aria-label="Answer options"
            className="space-y-4 mt-8"
          >
            {Array.isArray(currentQuestion.options) && currentQuestion.options.map((option, idx) => {
              const isSelected = currentAnswer?.answer_data === idx;
              return (
                <motion.label 
                  key={idx}
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`group relative flex items-center space-x-6 p-8 rounded-3xl border-2 cursor-pointer transition-colors duration-300 focus-within:ring-4 focus-within:ring-primary/50 focus-within:ring-offset-4 focus-within:ring-offset-background ${isSelected ? 'border-primary bg-primary/10 shadow-[0_10px_30px_-10px_rgba(var(--primary),0.3)]' : 'border-border bg-card hover:bg-accent/40 shadow-sm hover:shadow-lg hover:border-primary/40'}`}
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors duration-300 ${isSelected ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]' : 'border-muted-foreground group-hover:border-primary/60'}`}>
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={idx}
                      checked={isSelected}
                      onChange={() => {
                        handleOptionSelect(idx);
                      }}
                      className="sr-only"
                      aria-label={`Option ${String.fromCharCode(65 + idx)}: ${option}`}
                    />
                    {isSelected && <motion.div layoutId={`selected-${currentQuestion.id}`} className="w-4 h-4 bg-current rounded-full" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1 group-hover:text-primary/70 transition-colors">Option {String.fromCharCode(65 + idx)}</span>
                    <span className={`text-2xl font-medium tracking-wide leading-relaxed ${isSelected ? 'text-primary' : 'text-foreground'}`}>{option}</span>
                  </div>
                </motion.label>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex flex-wrap gap-4 justify-between items-center pt-4">
        <div className="flex gap-4">
          <button
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-lg font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground h-14 px-8"
            aria-label={t('back')}
          >
            {t('back')}
          </button>
          <button
            onClick={handleNext}
            disabled={currentQuestionIndex === questions.length - 1}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-lg font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-14 px-8"
            aria-label={t('next')}
          >
            {t('next')}
          </button>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleToggleMarkForReview}
            aria-pressed={isMarkedForReview}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl text-lg font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring border-2 h-14 px-8 ${isMarkedForReview ? 'bg-amber-500/20 text-amber-500 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-background border-input hover:bg-accent'}`}
          >
            {t('mark_review')}
          </button>
          <button
            onClick={confirmSubmitFlow}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-lg font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring bg-destructive text-destructive-foreground hover:bg-destructive/90 h-14 px-8 shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)]"
          >
            {t('submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
