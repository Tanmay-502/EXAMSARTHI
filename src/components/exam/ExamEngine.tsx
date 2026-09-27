'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useAccessibility } from '@/lib/accessibility/AccessibilityProvider';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { SafeAction } from '@/lib/voice/safeActionRegistry';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/lib/store/examStore';
import { Mic, MicOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { VoiceCore } from '@/components/voice/VoiceCore';
import { motion } from 'framer-motion';
import { HeroScene } from '@/components/experience/HeroScene';

type ExamEngineProps = {
  mode: 'practice' | 'exam';
  examTitle?: string;
  durationMinutes?: number;
  interactionMode?: 'standard' | 'voice-first';
};

type EngineState = 'READY' | 'EXAM' | 'CONFIRM_ANSWER' | 'CONFIRM_SUBMIT' | 'PROCESSING';


export function ExamEngine({ mode, examTitle, durationMinutes, interactionMode = 'voice-first' }: ExamEngineProps) {
  const { t, tParams, lang } = useI18n();
  const { announce } = useAccessibility();
  const { speak, stopSpeaking, startContinuousListening, pauseListening, isContinuous, micError } = useVoice();
  const { useVoiceAction } = useGlobalVoice();
  const router = useRouter();

  const {
    questions,
    answers,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    setAnswer,
    toggleMarkForReview,
    sessionId
  } = useExamStore();

  const headingRef = useRef<HTMLHeadingElement>(null);
  const currentQuestion = questions[currentQuestionIndex];
  
  const [engineState, setEngineState] = useState<EngineState>('READY');
  const [pendingAnswer, setPendingAnswer] = useState<number | null>(null);
  const [timeRemainingStr, setTimeRemainingStr] = useState<string>('60:00');
  const hasTriggeredExpiry = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (engineState === 'EXAM' && mode === 'exam') {
      timer = setInterval(() => {
        const state = useExamStore.getState();
        if (state.startTime) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
          const maxSeconds = (durationMinutes ?? 60) * 60;
          const remain = Math.max(0, maxSeconds - elapsed);
          const m = Math.floor(remain / 60).toString().padStart(2, '0');
          const s = (remain % 60).toString().padStart(2, '0');
          setTimeRemainingStr(`${m}:${s}`);

          if (remain <= 0 && !hasTriggeredExpiry.current) {
            hasTriggeredExpiry.current = true;
            setEngineState('PROCESSING');
            const msg = "Time is up. Submitting your exam.";
            announce(msg, 'assertive');
            if (interactionMode === 'voice-first') speak(msg);
            
            // Auto submit reusing existing logic
            import('@/app/exam/actions').then(({ submitExamAnswers }) => {
              const latestState = useExamStore.getState();
              if (latestState.sessionId) {
                const questionIds = latestState.questions.map(q => q.id);
                submitExamAnswers(latestState.sessionId, latestState.answers, questionIds).then(() => {
                  latestState.submitExam();
                  router.push(`/results?session_id=${latestState.sessionId}`);
                }).catch(err => {
                  console.error('Failed to auto-submit exam:', err);
                  hasTriggeredExpiry.current = false;
                  setEngineState('CONFIRM_SUBMIT');
                  spokenStateKey.current = null;
                  speak(
                    lang === 'hi-IN'
                      ? 'परीक्षा स्वतः जमा नहीं हो सकी। आपके उत्तर सुरक्षित हैं। जमा करने के लिए फिर से पुष्टि करें।'
                      : lang === 'te-IN'
                        ? 'పరీక్ష ఆటోమేటిక్‌గా సమర్పించబడలేదు. మీ సమాధానాలు భద్రంగా ఉన్నాయి. మళ్లీ నిర్ధారించండి.'
                        : 'Automatic submission failed. Your answers are preserved. Please confirm submission again.'
                  );
                });
              }
            });
          }
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [engineState, mode, durationMinutes, announce, speak, router, interactionMode]);



  const spokenStateKey = useRef<string | null>(null);

  useEffect(() => {
    // Only speak once per state/question to prevent Strict Mode double-speaking
    const currentKey = engineState === 'EXAM' ? `${engineState}-${currentQuestionIndex}` : engineState;
    if (spokenStateKey.current === currentKey) return;
    spokenStateKey.current = currentKey;

    if (engineState === 'READY') {
      const actualDuration = durationMinutes ?? 60;
      const actualTitle = examTitle ?? (mode === 'exam' ? 'Mock Exam' : 'Practice');
      const announcement = tParams('exam_orientation', { 
        examName: actualTitle, 
        total: questions.length, 
        duration: actualDuration,
        language: lang === 'en-IN' ? 'English' : lang === 'hi-IN' ? 'Hindi' : 'Telugu'
      }) + ' ' + t('say_start_exam');
      announce(announcement, 'assertive');
      if (interactionMode === 'voice-first' || isContinuous) speak(announcement);
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
          const fetchVisionOrReadAlt = async () => {
            if (currentQuestion.image_alt_text) {
              const fullAnnouncement = announcement + ' Diagram description: ' + currentQuestion.image_alt_text + buildOptionsText();
              const currentKey = engineState === 'EXAM' ? `${engineState}-${currentQuestionIndex}` : engineState;
              if (spokenStateKey.current === currentKey) {
                announce(fullAnnouncement, 'assertive');
                if (interactionMode === 'voice-first' || isContinuous) speak(fullAnnouncement);
              }
              return;
            }

            const analysisMsg = "This question contains a diagram. Analyzing...";
            announce(analysisMsg, 'assertive');
            if (interactionMode === 'voice-first' || isContinuous) speak(analysisMsg);

            try {
              const res = await fetch('/api/vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl })
              });
              const data = await res.json();
              
              const fullAnnouncement = announcement + ' Diagram description: ' + (data.description || 'Unavailable.') + buildOptionsText();
              
              const currentKey = engineState === 'EXAM' ? `${engineState}-${currentQuestionIndex}` : engineState;
              if (spokenStateKey.current === currentKey) {
                announce(fullAnnouncement, 'assertive');
                if (interactionMode === 'voice-first' || isContinuous) speak(fullAnnouncement);
              }
            } catch (err) {
              console.error('Vision fetch failed', err);
              const fallback = announcement + ' The diagram could not be analyzed. ' + buildOptionsText();
              announce(fallback, 'assertive');
              if (interactionMode === 'voice-first' || isContinuous) speak(fallback);
            }
          };
          fetchVisionOrReadAlt();
        } else {
          announcement += buildOptionsText();
          announce(announcement, 'assertive');
          if (interactionMode === 'voice-first' || isContinuous) speak(announcement);
        }
      }
    }
  }, [
    engineState, currentQuestionIndex, currentQuestion, mode, questions.length, 
    lang, t, tParams, announce, speak, stopSpeaking, isContinuous, 
    startContinuousListening, durationMinutes, examTitle, pauseListening, interactionMode
  ]);



  useEffect(() => {
    return () => stopSpeaking();
  }, [stopSpeaking]);

  const syncPersistedAnswers = useCallback(async () => {
    if (!sessionId || typeof navigator === 'undefined' || !navigator.onLine) return;

    try {
      const { saveAnswer } = await import('@/app/exam/actions');
      const state = useExamStore.getState();
      await Promise.allSettled(
        Object.values(state.answers).map((answer) =>
          saveAnswer(
            sessionId,
            answer.question_id,
            answer.answer_data ?? null,
            answer.is_marked_for_review
          )
        )
      );
    } catch (error) {
      console.error('Failed to replay persisted answers:', error);
    }
  }, [sessionId]);

  useEffect(() => {
    void syncPersistedAnswers();

    const handleOnline = () => {
      void syncPersistedAnswers();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncPersistedAnswers]);

  const handleOptionSelect = (optionIndex: number) => {
    if (!currentQuestion) return;
    setAnswer(currentQuestion.id, optionIndex);
    if (sessionId) {
      import('@/app/exam/actions').then(({ saveAnswer }) => {
        void saveAnswer(
          sessionId,
          currentQuestion.id,
          optionIndex,
          answers[currentQuestion.id]?.is_marked_for_review ?? false
        ).catch(console.error);
      });
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      announce(t('end_of_questions'));
      if (interactionMode === 'voice-first' || isContinuous) speak(t('end_of_questions'));
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      announce(t('first_question'));
      if (interactionMode === 'voice-first' || isContinuous) speak(t('first_question'));
    }
  };

  const handleToggleMarkForReview = () => {
    if (!currentQuestion) return;
    const currentAnswer = answers[currentQuestion.id];
    const nextMarked = !(currentAnswer?.is_marked_for_review ?? false);
    toggleMarkForReview(currentQuestion.id);

    if (sessionId) {
      import('@/app/exam/actions').then(({ saveAnswer }) => {
        void saveAnswer(
          sessionId,
          currentQuestion.id,
          currentAnswer?.answer_data ?? null,
          nextMarked
        ).catch(console.error);
      });
    }

    const message = nextMarked ? t('marked_for_review') : t('removed_mark');
    announce(message);
    if (interactionMode === 'voice-first' || isContinuous) speak(message);
  };

  const jumpToUnanswered = () => {
    const index = questions.findIndex(q => {
      const answer = answers[q.id]?.answer_data;
      return answer === undefined || answer === null;
    });
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
    const answeredCount = Object.values(answers).filter(
      a => typeof a.answer_data === 'number' && Number.isInteger(a.answer_data) && a.answer_data >= 0
    ).length;
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
      const state = useExamStore.getState();

      if (!state.sessionId) {
        throw new Error('No active exam session');
      }

      const questionIds = state.questions.map(q => q.id);
      await submitExamAnswers(state.sessionId, state.answers, questionIds);
      state.submitExam();
      router.push(`/results?session_id=${state.sessionId}`);
    } catch (err) {
      console.error('Failed to submit exam:', err);
      setEngineState('CONFIRM_SUBMIT');
      spokenStateKey.current = null;
      speak(
        lang === 'hi-IN'
          ? 'परीक्षा जमा नहीं हो सकी। आपके उत्तर सुरक्षित हैं। फिर से जमा करने के लिए हाँ कहें।'
          : lang === 'te-IN'
            ? 'పరీక్ష సమర్పించబడలేదు. మీ సమాధానాలు భద్రంగా ఉన్నాయి. మళ్లీ సమర్పించడానికి అవును అని చెప్పండి.'
            : 'The exam could not be submitted. Your answers are preserved. Say yes to try again.'
      );
    }
  };

  const voiceHandler = (action: SafeAction, payload?: Record<string, unknown> | null) => {
    switch (action) {
      case 'START_EXAM':
      case 'OPEN_EXAM':
        if (mode !== 'exam') return false;
        if (engineState === 'READY') {
          setEngineState('EXAM');
          return true;
        }
        if (engineState === 'CONFIRM_ANSWER' || engineState === 'CONFIRM_SUBMIT') {
          speak('Please finish the current confirmation before continuing.');
        } else if (engineState === 'PROCESSING') {
          speak('Your exam is already being submitted.');
        } else {
          speak('The exam is already in progress. You can say next, back, time left, or submit.');
        }
        return true;

      case 'START_PRACTICE':
      case 'OPEN_PRACTICE':
        if (mode !== 'practice') return false;
        if (engineState === 'READY') {
          setEngineState('EXAM');
        } else if (engineState === 'PROCESSING') {
          speak('Your practice session is already being submitted.');
        } else {
          speak('Practice is already in progress. You can continue with the current questions.');
        }
        return true;


      case 'CONFIRM':
        if (engineState === 'CONFIRM_ANSWER' && pendingAnswer !== null) {
          handleOptionSelect(pendingAnswer);
          setPendingAnswer(null);
          spokenStateKey.current = `EXAM-${currentQuestionIndex}`;
          setEngineState('EXAM');
          const msg = t('answer_saved') + ' ' + t('say_next_continue');
          speak(msg);
          announce(msg);
        } else if (engineState === 'CONFIRM_SUBMIT') {
          executeSubmit();
        } else {
          speak(lang === 'hi-IN' ? 'अभी पुष्टि करने के लिए कुछ नहीं है।' : lang === 'te-IN' ? 'ప్రస్తుతం నిర్ధారించడానికి ఏమీ లేదు.' : 'There is nothing to confirm right now.');
        }
        return true;
        
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
        } else {
          speak(lang === 'hi-IN' ? 'अभी बदलने के लिए कोई चयन नहीं है।' : lang === 'te-IN' ? 'ప్రస్తుతం మార్చడానికి ఏ ఎంపిక లేదు.' : 'There is nothing to change right now.');
        }
        return true;

      case 'UNKNOWN_COMMAND':
        return false;

      case 'NEXT_QUESTION':
        if (engineState === 'EXAM') {
          handleNext();
        } else {
          speak(t('say_start_exam'));
        }
        return true;
        
      case 'PREVIOUS_QUESTION':
        if (engineState === 'EXAM') {
          handlePrev();
        } else {
          speak(t('say_start_exam'));
        }
        return true;
        
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
        } else {
          speak(lang === 'hi-IN' ? 'कृपया पहले शुरू करें।' : lang === 'te-IN' ? 'దయచేసి ముందుగా ప్రారంభించండి.' : 'Please start the session first.');
        }
        return true;
        
      case 'MARK_REVIEW':
        if (engineState === 'EXAM') {
          handleToggleMarkForReview();
        } else {
          speak(t('say_start_exam'));
        }
        return true;
        
      case 'REVIEW_UNANSWERED':
        if (engineState === 'EXAM') {
          jumpToUnanswered();
        } else {
          speak(lang === 'hi-IN' ? 'कृपया पहले शुरू करें।' : lang === 'te-IN' ? 'దయచేసి ముందుగా ప్రారంభించండి.' : 'Please start the session first.');
        }
        return true;
        
      case 'REVIEW_MARKED':
        if (engineState === 'EXAM') {
          jumpToMarked();
        } else {
          speak(lang === 'hi-IN' ? 'कृपया पहले शुरू करें।' : lang === 'te-IN' ? 'దయచేసి ముందుగా ప్రారంభించండి.' : 'Please start the session first.');
        }
        return true;
        
      case 'JUMP_TO_QUESTION':
        if (engineState === 'EXAM' && typeof payload?.index === 'number') {
          jumpToQuestion(payload.index);
        } else {
          speak(lang === 'hi-IN' ? 'कृपया पहले शुरू करें और फिर प्रश्न संख्या बताएं।' : lang === 'te-IN' ? 'దయచేసి ముందుగా ప్రారంభించి, తరువాత ప్రశ్న సంఖ్య చెప్పండి.' : 'Please start the session first, then say the question number.');
        }
        return true;
        
      case 'SUBMIT_EXAM':
        if (engineState === 'EXAM') {
          confirmSubmitFlow();
        } else {
          speak(t('say_start_exam'));
        }
        return true;
        
      case 'TIME_LEFT':
        if (mode === 'exam') {
          const state = useExamStore.getState();
          if (state.startTime) {
            const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
            const remainingSeconds = Math.max(0, ((durationMinutes ?? 60) * 60) - elapsedSeconds);
            const minutesLeft = Math.ceil(remainingSeconds / 60);
            speak(tParams('time_remaining', { time: `${minutesLeft} ${t('minutes')}` }));
          } else {
            speak(tParams('time_remaining', { time: `${durationMinutes ?? 60} ${t('minutes')}` }));
          }
        } else {
          speak(lang === 'hi-IN' ? 'अभ्यास मोड में समय सीमा नहीं है।' : lang === 'te-IN' ? 'ప్రాక్టీస్ మోడ్‌లో సమయ పరిమితి లేదు.' : 'Practice mode has no time limit.');
        }
        return true;
        
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
        } else {
          speak(lang === 'hi-IN' ? 'कृपया पहले शुरू करें और फिर विकल्प चुनें।' : lang === 'te-IN' ? 'దయచేసి ముందుగా ప్రారంభించి, తరువాత ఒక ఎంపికను చెప్పండి.' : 'Please start the session first, then choose an option.');
        }
        return true;
        
      case 'HELP':
        speak(t('help_message'));
        return true;
    }
    return false;
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




  // Renders for different engine states
  if (engineState === 'READY') {
    return (
      <div className="relative flex flex-col min-h-screen w-full mx-auto pt-32 pb-24 px-6 md:px-12 bg-black text-white">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <HeroScene />
        </div>
        
        <div className="mb-24 flex items-center justify-between border-b border-zinc-900 pb-8 relative z-10">
          <div className="flex flex-col">
            <span className="text-zinc-500 tracking-[0.2em] text-xs uppercase mb-2">MODE</span>
            <span className="text-xl font-light tracking-wide">{mode === 'exam' ? 'EXAMINATION' : 'PRACTICE'}</span>
          </div>
          <VoiceCore size="sm" />
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 flex flex-col justify-center w-full max-w-4xl mx-auto relative z-10 space-y-12"
        >
          <h1 className="text-[clamp(3rem,6vw,7rem)] font-light tracking-tighter leading-tight mb-4">
            {t('exam')} Orientation
          </h1>
          <p className="text-2xl text-zinc-400 font-light leading-relaxed max-w-2xl" aria-live="polite">
            {tParams('exam_orientation', { examName: mode === 'exam' ? 'Mock Exam' : 'Practice', total: questions.length, duration: durationMinutes ?? 60, language: lang === 'en-IN' ? 'English' : lang === 'hi-IN' ? 'Hindi' : 'Telugu' })}
          </p>
          
          <div className="pt-16 border-t border-zinc-900 flex justify-between items-center">
            <p className="text-zinc-500 font-light uppercase tracking-widest text-sm">
              {t('say_start_exam')}
            </p>
            <button
              onClick={() => {
                stopSpeaking();
                setEngineState('EXAM');
              }}
              className="px-12 py-4 bg-white text-black text-sm font-bold uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-colors focus-visible:ring-4 focus-visible:ring-white/30"
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
      <div className="flex flex-col min-h-screen w-full mx-auto pt-32 pb-24 px-6 md:px-12 bg-black text-white">
        <div className="flex-1 flex flex-col justify-center w-full max-w-4xl mx-auto space-y-12">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-8 p-6 w-fit bg-red-950/30 rounded-full border border-red-900/50"
          >
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </motion.div>
          
          <h1 className="text-[clamp(3rem,6vw,7rem)] font-light tracking-tighter leading-tight mb-4">
            {t('submit')}
          </h1>
          <p className="text-2xl text-zinc-400 font-light leading-relaxed max-w-2xl" aria-live="polite">
            {t('submit_confirm_msg')}
          </p>

          <div className="pt-16 border-t border-zinc-900 flex flex-wrap gap-4">
            <button
              onClick={() => setEngineState('EXAM')}
              className="px-12 py-4 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors uppercase tracking-widest text-sm font-medium"
            >
              NO, GO BACK
            </button>
            <button
              onClick={executeSubmit}
              className="px-12 py-4 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors uppercase tracking-widest text-sm font-bold shadow-[0_0_20px_rgba(220,38,38,0.2)]"
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 w-full relative">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <HeroScene />
        </div>
        <VoiceCore size="lg" />
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-light tracking-wide mt-12 text-zinc-400 uppercase" 
          aria-live="assertive"
        >
          {lang === 'hi-IN' ? 'जमा किया जा रहा है...' : lang === 'te-IN' ? 'సమర్పిస్తున్నాము...' : 'Processing submission...'}
        </motion.h1>
      </div>
    );
  }

  // EXAM or CONFIRM_ANSWER state
  return (
    <div className="relative flex flex-col min-h-screen w-full max-w-7xl mx-auto pt-32 pb-24 px-6 md:px-12 bg-black text-white">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <HeroScene />
      </div>

      {/* Header Info */}
      <div className="mb-24 flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-900 pb-8 relative z-10 gap-8">
        <div className="flex items-center gap-6">
          <VoiceCore size="sm" />
          <div className="flex flex-col">
            <span className="text-zinc-500 tracking-[0.2em] text-xs uppercase mb-2">
              {mode === 'exam' ? 'Real Exam' : 'Practice Mode'}
            </span>
            <span className="text-2xl font-light tracking-wide" aria-live="polite">
              Question {currentQuestionIndex + 1} / {questions.length}
            </span>
          </div>
        </div>
        
        <div className="flex flex-row-reverse md:flex-row items-center justify-between md:justify-end gap-8 w-full md:w-auto">
          {mode === 'exam' && (
            <div className="flex flex-col md:items-end">
              <span className="text-zinc-500 tracking-[0.2em] text-xs uppercase mb-2">{t('time_left')}</span>
              <span className="text-3xl font-light tracking-tight text-zinc-100" aria-live="polite">
                {timeRemainingStr}
              </span>
            </div>
          )}
          <button 
            onClick={toggleListening}
            className={`p-4 rounded-full border transition-all ${isContinuous ? 'border-white text-black bg-white' : micError ? 'border-red-900 text-red-500 bg-red-950/20' : 'border-zinc-800 text-zinc-400 bg-transparent hover:border-zinc-500 hover:text-white'}`}
            aria-label={micError === 'denied' ? 'Microphone denied' : isContinuous ? 'Pause voice control' : 'Enable voice control'}
            title={micError === 'denied' ? 'Microphone access denied' : ''}
          >
            {micError ? <MicOff className="w-5 h-5 text-red-500" /> : isContinuous ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto relative z-10">
        {engineState === 'CONFIRM_ANSWER' ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="flex flex-col space-y-12"
          >
            <div className="flex items-center gap-6 text-zinc-300">
              <CheckCircle className="w-12 h-12 text-white" />
              <h2 className="text-3xl md:text-5xl font-light tracking-tighter" aria-live="assertive">
                {currentQuestion.options && pendingAnswer !== null 
                  ? tParams('answer_confirm_prompt', { index: pendingAnswer + 1, option: currentQuestion.options[pendingAnswer] })
                  : 'Confirm answer?'}
              </h2>
            </div>
            <div className="flex gap-4 border-t border-zinc-900 pt-12">
              <button
                onClick={() => {
                  setPendingAnswer(null);
                  setEngineState('EXAM');
                }}
                className="px-8 py-4 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors uppercase tracking-widest text-sm font-medium"
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
                className="px-8 py-4 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors uppercase tracking-widest text-sm font-bold"
              >
                CONFIRM
              </button>
            </div>
          </motion.div>
        ) : (
          /* Question */
          <div className="flex flex-col">
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
                <div className="mb-16">
                  <h2 
                    tabIndex={-1} 
                    ref={headingRef} 
                    className="text-[clamp(2rem,4vw,3.5rem)] font-light leading-tight tracking-tight outline-none"
                  >
                    {cleanText}
                  </h2>
                  {imgUrl && (
                    <div className="mt-12">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt={currentQuestion.image_alt_text || altText} className="max-w-full h-auto rounded-none border border-zinc-800" />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Options */}
            <div 
              role="radiogroup" 
              aria-label="Answer options"
              className="flex flex-col border-t border-zinc-900"
            >
              {Array.isArray(currentQuestion.options) && currentQuestion.options.map((option, idx) => {
                const isSelected = currentAnswer?.answer_data === idx;
                return (
                  <label 
                    key={idx}
                    className={`group relative flex items-start md:items-center p-8 border-b border-zinc-900 cursor-pointer transition-colors duration-300 ${isSelected ? 'bg-zinc-900/50' : 'bg-transparent hover:bg-zinc-900/30'}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center w-full gap-6">
                      <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-colors duration-300 ${isSelected ? 'border-white bg-white text-black' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
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
                        {isSelected && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                      </div>
                      
                      <div className="flex-1 flex flex-col md:flex-row md:items-baseline gap-2 md:gap-8">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest shrink-0">Opt {String.fromCharCode(65 + idx)}</span>
                        <span className={`text-xl md:text-2xl font-light leading-relaxed ${isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{option}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="mt-24 pt-8 flex flex-col md:flex-row gap-8 justify-between items-center relative z-10">
          <div className="flex gap-4 w-full md:w-auto">
            <button
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
              className="flex-1 md:flex-none px-8 py-4 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:hover:border-zinc-800 disabled:hover:text-zinc-400 transition-colors uppercase tracking-widest text-xs font-bold"
              aria-label={t('back')}
            >
              {t('back')}
            </button>
            <button
              onClick={handleNext}
              disabled={currentQuestionIndex === questions.length - 1}
              className="flex-1 md:flex-none px-8 py-4 rounded-full bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:hover:bg-white transition-colors uppercase tracking-widest text-xs font-bold"
              aria-label={t('next')}
            >
              {t('next')}
            </button>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <button
              onClick={handleToggleMarkForReview}
              aria-pressed={isMarkedForReview}
              className={`flex-1 md:flex-none px-8 py-4 rounded-full border transition-colors uppercase tracking-widest text-xs font-bold ${isMarkedForReview ? 'border-zinc-400 text-white bg-zinc-800/50' : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500'}`}
            >
              {t('mark_review')}
            </button>
            <button
              onClick={confirmSubmitFlow}
              className="flex-1 md:flex-none px-8 py-4 rounded-full border border-red-900/50 text-red-500 hover:bg-red-950/20 transition-colors uppercase tracking-widest text-xs font-bold"
            >
              {t('submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
