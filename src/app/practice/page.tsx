'use client'

import { ExamEngine } from '@/components/exam/ExamEngine';
import { useExamStore, Question } from '@/lib/store/examStore';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { VoiceCore } from '@/components/voice/VoiceCore';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchPracticeQuestions, startPracticeSession } from '@/app/exam/actions';
import { usePreferredMode } from '@/lib/hooks/usePreferredMode';
import { SUPPORTED_SUBJECTS, resolveSubject } from '@/lib/catalog/examCatalog';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { SafeAction } from '@/lib/voice/safeActionRegistry';

function PracticeContent() {
  const initializeExam = useExamStore(state => state.initializeExam);
  const { t, lang } = useI18n();
  const searchParams = useSearchParams();
  const { speak, startContinuousListening, isContinuous } = useVoice();
  const { useVoiceAction } = useGlobalVoice();
  
  const initialSubject = searchParams.get('subject') || '';
  const initialCount = searchParams.get('count') || '';
  const initialDifficulty = searchParams.get('difficulty') || '';
  
  const { mode: interactionMode, isLoaded } = usePreferredMode();

  const [setupState, setSetupState] = useState<'ASK_SUBJECT' | 'ASK_COUNT' | 'ASK_DIFFICULTY' | 'FETCHING' | 'CONFIRM_SHORTFALL' | 'STARTING' | 'READY'>(() => {
    if (initialSubject && initialCount && initialDifficulty) {
      return 'FETCHING';
    }
    return 'ASK_SUBJECT';
  });
  
  const [subject, setSubject] = useState(initialSubject);
  const [count, setCount] = useState(initialCount);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [confirmedShortfall, setConfirmedShortfall] = useState(false);
  const [fetchedQuestions, setFetchedQuestions] = useState<Question[]>([]);
  const [availableCount, setAvailableCount] = useState<number>(0);
  
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!isContinuous && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startContinuousListening();
    }
  }, [isContinuous, startContinuousListening]);

  useEffect(() => {
    if (setupState === 'FETCHING') {
      const qCount = parseInt(count, 10) || 5;
      fetchPracticeQuestions(subject, difficulty, qCount, lang)
        .then(res => {
          setFetchedQuestions(res.questions);
          setAvailableCount(res.totalFound);
          if (res.totalFound < qCount && res.totalFound > 0) {
            setSetupState('CONFIRM_SHORTFALL');
          } else if (res.totalFound === 0) {
            speak(`I couldn't find any questions for ${subject} at ${difficulty} difficulty. Let's try another subject.`);
            setSubject('');
            setSetupState('ASK_SUBJECT');
          } else {
            setSetupState('STARTING');
          }
        })
        .catch(err => {
          console.error(err);
          speak("Sorry, there was an error loading practice questions.");
        });
    }
  }, [setupState, subject, count, difficulty, lang, speak]);

  useEffect(() => {
    if (setupState === 'STARTING') {
      const actualCount = fetchedQuestions.length;
      const confirmMsg = lang === 'hi-IN' 
        ? `${actualCount} प्रश्नों का ${difficulty} स्तर का ${subject} अभ्यास शुरू हो रहा है।` 
        : lang === 'te-IN' 
        ? `${actualCount} ప్రశ్నల ${difficulty} స్థాయి ${subject} అభ్యాసం ప్రారంభమవుతోంది.` 
        : `Starting a ${actualCount}-question ${difficulty} ${subject} practice session.`;
      
      speak(confirmMsg);
      startPracticeSession().then(sessionId => {
        initializeExam(sessionId, 'practice-exam', fetchedQuestions);
        setSetupState('READY');
      }).catch(err => {
        console.error(err);
        speak("Failed to create practice session.");
      });
    }
  }, [setupState, fetchedQuestions, subject, difficulty, lang, initializeExam, speak]);

  useEffect(() => {
    if (setupState === 'CONFIRM_SHORTFALL' && !confirmedShortfall) {
      const msg = lang === 'hi-IN'
        ? `मुझे ${subject} के लिए केवल ${availableCount} उपलब्ध प्रश्न मिले। क्या आप ${availableCount} के साथ शुरू करना चाहेंगे?`
        : lang === 'te-IN'
        ? `నాకు ${subject} కోసం కేవలం ${availableCount} అందుబాటులో ఉన్న ప్రశ్నలు మాత్రమే దొరికాయి. మీరు ${availableCount} తో ప్రారంభించాలనుకుంటున్నారా?`
        : `I found only ${availableCount} available validated questions for ${subject}. Would you like me to start with ${availableCount}?`;
      speak(msg);
    }
  }, [setupState, confirmedShortfall, subject, availableCount, lang, speak]);

  useEffect(() => {
    if (setupState === 'ASK_SUBJECT' && !subject) speak("What subject would you like to practice?");
    if (setupState === 'ASK_COUNT' && !count) speak("How many questions would you like?");
    if (setupState === 'ASK_DIFFICULTY' && !difficulty) speak("What difficulty? Easy, medium, or hard?");
  }, [setupState, subject, count, difficulty, speak]);

  useVoiceAction((action: SafeAction, payload?: Record<string, unknown> | null, transcript?: string) => {
    if (setupState === 'READY') return false;

    const handleVoiceFallback = (errorMsg: string, repromptMsg: string) => {
      speak(`${errorMsg} ${repromptMsg}`);
    };

    if ((action as string === 'RAW_TRANSCRIPT' || action === 'UNKNOWN_COMMAND') && transcript) {
      if (setupState === 'ASK_SUBJECT') {
        const trimmed = transcript.trim();
        resolveSubject(trimmed).then(resolved => {
          if (!resolved) {
             handleVoiceFallback("I didn't quite catch that.", "What subject would you like to practice?");
          } else {
             setSubject(resolved);
             setSetupState('ASK_COUNT');
          }
        });
        return true;
      }

      if (setupState === 'ASK_COUNT') {
        const numMatch = transcript.match(/\d+/);
        const wordMatch = transcript.toLowerCase().match(/(five|ten|fifteen|twenty|५|१०|१५|२०)/);
        let countVal = '';
        if (numMatch) countVal = numMatch[0];
        else if (wordMatch) {
           const word = wordMatch[0];
           if (word === 'five' || word === '५') countVal = '5';
           if (word === 'ten' || word === '१०') countVal = '10';
           if (word === 'fifteen' || word === '१५') countVal = '15';
           if (word === 'twenty' || word === '२०') countVal = '20';
        }

        if (!countVal) {
           handleVoiceFallback("Please say the number of questions, such as 10 or 20.", "How many questions would you like?");
        } else {
           setCount(countVal);
           setSetupState('ASK_DIFFICULTY');
        }
        return true;
      }

      if (setupState === 'ASK_DIFFICULTY') {
        const t = transcript.trim().toLowerCase();
        let diff = '';
        if (t.includes('easy')) diff = 'easy';
        else if (t.includes('medium')) diff = 'medium';
        else if (t.includes('hard')) diff = 'hard';
        
        if (!diff) {
           handleVoiceFallback("Please say easy, medium, or hard.", "What difficulty?");
        } else {
           setDifficulty(diff);
           setSetupState('FETCHING');
        }
        return true;
      }

      if (setupState === 'CONFIRM_SHORTFALL') {
        const t = transcript.trim().toLowerCase();
        if (t.includes('yes') || t.includes('confirm') || t.includes('हाँ') || t.includes('అవును') || t.includes('start') || t.includes('ok')) {
          setConfirmedShortfall(true);
          setSetupState('STARTING');
        } else if (t.includes('no') || t.includes('change') || t.includes('नहीं') || t.includes('కాదు') || t.includes('wait') || t.includes('cancel')) {
          setCount('');
          setSetupState('ASK_COUNT');
        } else {
           handleVoiceFallback("Please say yes or no.", "Would you like me to start with the available questions?");
        }
        return true;
      }
    }
    
    // Explicit global START_PRACTICE inside practice context restarts the flow
    if (action === 'START_PRACTICE' || action === 'OPEN_PRACTICE') {
      if (payload?.subject) setSubject(payload.subject as string);
      else setSubject('');
      
      if (payload?.count) setCount(String(payload.count));
      else setCount('');

      if (payload?.difficulty) setDifficulty(payload.difficulty as string);
      else setDifficulty('');

      setSetupState('ASK_SUBJECT'); // will autoprogress if all 3 are set via useEffect
      return true;
    }

    return false;
  });

  if (setupState !== 'READY') {
    return (
      <div className="relative flex flex-col min-h-screen w-full max-w-7xl mx-auto pt-32 pb-24 px-6 md:px-12 bg-black text-white">
        
        <div className="mb-24 flex items-center justify-between border-b border-zinc-900 pb-8">
          <div className="flex flex-col">
            <span className="text-zinc-500 tracking-[0.2em] text-xs uppercase mb-2">MODE</span>
            <span className="text-xl font-light tracking-wide">PRACTICE</span>
          </div>
          <VoiceCore size="sm" />
        </div>

        <div className="flex-1 flex flex-col justify-center w-full max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={setupState}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col"
            >
              {setupState === 'ASK_SUBJECT' && (
                <div className="space-y-16">
                  <div>
                    <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-light tracking-tighter leading-tight mb-4">Practice Subject</h2>
                    <p className="text-2xl text-zinc-500 font-light">&quot;What subject would you like to practice?&quot;</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {SUPPORTED_SUBJECTS.map(subj => (
                      <button 
                        key={subj}
                        onClick={() => { setSubject(subj); setSetupState('ASK_COUNT'); }}
                        className="px-6 py-4 rounded-full border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors text-sm md:text-base uppercase tracking-widest font-medium"
                      >
                        {subj}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {setupState === 'ASK_COUNT' && (
                <div className="space-y-16">
                  <div>
                    <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-light tracking-tighter leading-tight mb-4">Question Count</h2>
                    <p className="text-2xl text-zinc-500 font-light">&quot;How many questions would you like?&quot;</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {['5', '10', '15'].map(num => (
                      <button 
                        key={num}
                        onClick={() => { setCount(num); setSetupState('ASK_DIFFICULTY'); }}
                        className="px-8 py-4 rounded-full border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors text-xl font-light"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {setupState === 'ASK_DIFFICULTY' && (
                <div className="space-y-16">
                  <div>
                    <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-light tracking-tighter leading-tight mb-4">Difficulty Level</h2>
                    <p className="text-2xl text-zinc-500 font-light">&quot;What difficulty? Easy, medium, or hard?&quot;</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {['easy', 'medium', 'hard'].map(diff => (
                      <button 
                        key={diff}
                        onClick={() => { setDifficulty(diff); setSetupState('FETCHING'); }}
                        className="px-8 py-4 rounded-full border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors text-lg uppercase tracking-widest font-medium"
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {setupState === 'CONFIRM_SHORTFALL' && (
                <div className="space-y-16">
                  <div>
                    <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-light tracking-tighter leading-tight mb-4 text-zinc-100">Insufficient Questions</h2>
                    <p className="text-2xl text-zinc-500 font-light">&quot;Would you like me to start with the available questions?&quot;</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => { setCount(''); setSetupState('ASK_COUNT'); }}
                      className="px-8 py-4 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors uppercase tracking-widest text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => { setConfirmedShortfall(true); setSetupState('STARTING'); }}
                      className="px-8 py-4 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors uppercase tracking-widest text-sm font-bold"
                    >
                      Start
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Visual Parameter Collection Status */}
        <div className="mt-24 pt-8 border-t border-zinc-900 flex gap-12">
          {subject && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
              <span className="text-zinc-600 uppercase tracking-[0.2em] text-xs mb-2">Subject</span>
              <span className="text-zinc-300 font-light capitalize">{subject}</span>
            </motion.div>
          )}
          {count && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
              <span className="text-zinc-600 uppercase tracking-[0.2em] text-xs mb-2">Count</span>
              <span className="text-zinc-300 font-light">{count} Questions</span>
            </motion.div>
          )}
          {difficulty && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
              <span className="text-zinc-600 uppercase tracking-[0.2em] text-xs mb-2">Difficulty</span>
              <span className="text-zinc-300 font-light capitalize">{difficulty}</span>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sr-only">{t('practice')} Mode</div>
      {isLoaded ? (
        <ExamEngine mode="practice" interactionMode={interactionMode} />
      ) : (
        <div className="flex items-center justify-center p-12 text-white/50">{t('loading')}</div>
      )}
    </>
  );
}

export default function PracticePage() {
  const { t } = useI18n();
  return (
    <main className="flex flex-col flex-1 bg-black min-h-screen">
      <Suspense fallback={<div className="p-12 text-center text-white/50">{t('loading')}</div>}>
        <PracticeContent />
      </Suspense>
    </main>
  );
}
