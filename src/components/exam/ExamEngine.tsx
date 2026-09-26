'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useAccessibility } from '@/lib/accessibility/AccessibilityProvider';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/lib/store/examStore';
import { Mic, MicOff, CheckCircle, AlertTriangle } from 'lucide-react';

type ExamEngineProps = {
  mode: 'practice' | 'exam';
};

type EngineState = 'MIC_TEST' | 'READY' | 'EXAM' | 'CONFIRM_ANSWER' | 'CONFIRM_SUBMIT' | 'PROCESSING';

export function ExamEngine({ mode }: ExamEngineProps) {
  const { t, tParams, lang } = useI18n();
  const { announce } = useAccessibility();
  const { speak, stopSpeaking, startContinuousListening, pauseListening, isListening, isContinuous, micError } = useVoice();
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
      const prompt = t('mic_check_prompt') || "Let's test your microphone. Please say: Next.";
      announce(prompt, 'assertive');
      if (isContinuous) speak(prompt);
      // Ensure continuous listening is on for mic test
      if (!isContinuous) startContinuousListening();
    } else if (engineState === 'READY') {
      const announcement = tParams('exam_orientation', { 
        examName: mode === 'exam' ? 'Mock Exam' : 'Practice', 
        total: questions.length, 
        duration: 60,
        language: lang === 'en-IN' ? 'English' : lang === 'hi-IN' ? 'Hindi' : 'Telugu'
      }) + ' ' + t('say_start_exam');
      announce(announcement, 'assertive');
      if (isContinuous) speak(announcement);
    } else if (engineState === 'EXAM') {
      // Focus the question heading on mount and index change
      headingRef.current?.focus();
      
      // Automatically announce the question
      if (currentQuestion) {
        let announcement = `${tParams('question_x_of_y', { x: currentQuestionIndex + 1, y: questions.length })}. ${currentQuestion.question_text}.`;
        if (currentQuestion.options && currentQuestion.options.length > 0) {
          const optionsText = currentQuestion.options.map((opt, idx) => `${t('option')} ${idx + 1}: ${opt}.`).join(' ');
          announcement += ' ' + optionsText + ' ' + t('question_instruction');
        }
        announce(announcement, 'assertive');
        if (isContinuous) speak(announcement);
      }
    }
  }, [engineState, currentQuestionIndex, currentQuestion, mode, questions.length, lang, t, tParams, announce, speak, isContinuous, startContinuousListening]);

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
    if (mode === 'exam') {
      try {
        const { submitExamAnswers } = await import('@/app/exam/actions');
        if (sessionId) {
          await submitExamAnswers(sessionId, answers);
          submitExam();
          router.push(`/results?session_id=${sessionId}`);
          return;
        }
      } catch (err) {
        console.error('Failed to submit exam:', err);
      }
    }
    submitExam();
    router.push('/results');
  };

  useVoiceAction((action, payload) => {
    switch (action) {
      case 'START_EXAM':
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

      case 'NEXT_QUESTION':
        if (engineState === 'MIC_TEST') {
          const success = t('mic_check_success') || "You said Next. Your microphone is working.";
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
          const announcement = tParams('exam_orientation', { 
            examName: mode === 'exam' ? 'Mock Exam' : 'Practice', 
            total: questions.length, 
            duration: 60,
            language: lang === 'en-IN' ? 'English' : lang === 'hi-IN' ? 'Hindi' : 'Telugu'
          });
          speak(announcement);
        } else if (engineState === 'EXAM' && currentQuestion) {
          let announcement = '';
          if (action === 'REPEAT' || action === 'READ_QUESTION') {
            announcement += `${tParams('question_x_of_y', { x: currentQuestionIndex + 1, y: questions.length })}. ${currentQuestion.question_text}. `;
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
  });

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
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl mx-auto space-y-8 p-8 text-center">
        <Mic className={`w-16 h-16 ${isListening ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
        <h1 className="text-3xl font-bold" aria-live="assertive">Microphone Test</h1>
        <p className="text-xl" aria-live="polite">
          {t('mic_check_prompt') || "Let's test your microphone. Please say: Next."}
        </p>
        {micError && (
          <div className="text-destructive font-medium p-4 bg-destructive/10 rounded-lg">
            {t('mic_check_fail')}
          </div>
        )}
        <div className="flex gap-4 mt-8">
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
            className="px-8 py-4 bg-secondary text-secondary-foreground text-xl font-bold rounded-xl hover:bg-secondary/90 focus-visible:ring-4 focus-visible:ring-ring"
          >
            SKIP TEST
          </button>
        </div>
      </div>
    );
  }

  // Renders for different engine states
  if (engineState === 'READY') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl mx-auto space-y-8 p-8 text-center">
        <h1 className="text-3xl font-bold">{t('exam')} Orientation</h1>
        <p className="text-xl" aria-live="polite">
          {tParams('exam_orientation', { examName: mode === 'exam' ? 'Mock Exam' : 'Practice', total: questions.length, duration: 60, language: lang === 'en-IN' ? 'English' : lang === 'hi-IN' ? 'Hindi' : 'Telugu' })}
        </p>
        <p className="text-lg text-muted-foreground">
          {t('say_start_exam')}
        </p>
        <button
          onClick={() => {
            stopSpeaking();
            setEngineState('EXAM');
          }}
          className="mt-8 px-8 py-4 bg-primary text-primary-foreground text-2xl font-bold rounded-xl hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring"
        >
          START EXAM
        </button>
      </div>
    );
  }

  if (engineState === 'CONFIRM_SUBMIT') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl mx-auto space-y-8 p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-destructive" />
        <h1 className="text-3xl font-bold">{t('submit')}</h1>
        <p className="text-xl" aria-live="polite">
          {t('submit_confirm_msg')}
        </p>
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => setEngineState('EXAM')}
            className="px-8 py-4 bg-secondary text-secondary-foreground text-xl font-bold rounded-xl hover:bg-secondary/90 focus-visible:ring-4 focus-visible:ring-ring"
          >
            NO, GO BACK
          </button>
          <button
            onClick={executeSubmit}
            className="px-8 py-4 bg-destructive text-destructive-foreground text-xl font-bold rounded-xl hover:bg-destructive/90 focus-visible:ring-4 focus-visible:ring-ring"
          >
            YES, SUBMIT
          </button>
        </div>
      </div>
    );
  }

  if (engineState === 'PROCESSING') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl mx-auto space-y-8 p-8 text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <h1 className="text-3xl font-bold" aria-live="assertive">
          {lang === 'hi-IN' ? 'जमा किया जा रहा है...' : lang === 'te-IN' ? 'సమర్పిస్తున్నాము...' : 'Processing submission...'}
        </h1>
      </div>
    );
  }

  // EXAM or CONFIRM_ANSWER state
  return (
    <div className="flex flex-col flex-1 w-full max-w-4xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
        <span className="text-lg font-medium" aria-live="polite">
          {tParams('question_x_of_y', { x: currentQuestionIndex + 1, y: questions.length })}
        </span>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleListening}
            className={`p-2 rounded-full border ${isContinuous ? 'bg-red-500 text-white animate-pulse' : micError ? 'bg-destructive/10 text-destructive border-destructive' : 'bg-background hover:bg-accent text-foreground'}`}
            aria-label={micError === 'denied' ? 'Microphone denied' : isContinuous ? 'Pause voice control' : 'Enable voice control'}
            title={micError === 'denied' ? 'Microphone access denied' : ''}
          >
            {micError ? <MicOff className="w-5 h-5 text-destructive" /> : isContinuous ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          {mode === 'exam' && (
            <span className="text-lg font-medium text-destructive" aria-live="polite">
              {t('time_left')}: {timeRemainingStr}
            </span>
          )}
        </div>
      </div>

      {engineState === 'CONFIRM_ANSWER' ? (
        <div className="bg-primary/10 text-primary shadow-sm rounded-xl border-2 border-primary p-6 md:p-8 flex flex-col items-center space-y-4">
          <CheckCircle className="w-12 h-12" />
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
        </div>
      ) : (
        /* Question */
        <div className="bg-card text-card-foreground shadow-sm rounded-xl border p-6 md:p-8">
          <h2 
            tabIndex={-1} 
            ref={headingRef} 
            className="text-2xl md:text-3xl font-bold mb-8 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring rounded"
          >
            {currentQuestion.question_text}
          </h2>

          {/* Options */}
          <div 
            role="radiogroup" 
            aria-label="Answer options"
            className="space-y-4"
          >
            {Array.isArray(currentQuestion.options) && currentQuestion.options.map((option, idx) => {
              const isSelected = currentAnswer?.answer_data === idx;
              return (
                <label 
                  key={idx}
                  className={`flex items-center space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-colors focus-within:ring-4 focus-within:ring-ring ${isSelected ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent'}`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={idx}
                    checked={isSelected}
                    onChange={() => {
                      // Using manual click behaves like voice, require confirmation?
                      // Wait, for manual test, maybe skip confirmation or not? Let's just set it for manual.
                      // The prompt says "A visually impaired candidate must be able to complete a complete mock exam without needing another person... Keyboard must remain available as a fallback."
                      // If keyboard/mouse, we probably just select it.
                      handleOptionSelect(idx);
                    }}
                    className="w-6 h-6 text-primary focus:outline-none"
                    aria-label={`Option ${idx + 1}: ${option}`}
                  />
                  <span className="text-xl">{option}</span>
                </label>
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
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-12 px-6"
            aria-label={t('back')}
          >
            {t('back')}
          </button>
          <button
            onClick={handleNext}
            disabled={currentQuestionIndex === questions.length - 1}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-12 px-6"
            aria-label={t('next')}
          >
            {t('next')}
          </button>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleToggleMarkForReview}
            aria-pressed={isMarkedForReview}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring border h-12 px-6 ${isMarkedForReview ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-background border-input hover:bg-accent'}`}
          >
            {t('mark_review')}
          </button>
          <button
            onClick={confirmSubmitFlow}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring bg-destructive text-destructive-foreground shadow hover:bg-destructive/90 h-12 px-6"
          >
            {t('submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
