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

function PracticeContent() {
  const initializeExam = useExamStore(state => state.initializeExam);
  const { t, lang } = useI18n();
  const searchParams = useSearchParams();
  const { speak, setOnResult, startContinuousListening, isContinuous } = useVoice();
  
  const initialSubject = searchParams.get('subject') || '';
  const initialCount = searchParams.get('count') || '';
  const initialDifficulty = searchParams.get('difficulty') || '';
  
  const { mode: interactionMode } = usePreferredMode();

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
    let active = true;
    
    const handleVoiceFallback = (errorMsg: string, repromptMsg: string) => {
      speak(`${errorMsg} ${repromptMsg}`);
    };
    
    if (setupState === 'ASK_SUBJECT') {
      if (!subject) {
        speak("What subject would you like to practice?");
        setOnResult(async (text) => {
          if (active) {
            const trimmed = text.trim();
            const resolved = await resolveSubject(trimmed);
            if (!resolved) {
               handleVoiceFallback("I didn't quite catch that.", "What subject would you like to practice?");
               return;
            }
            setSubject(resolved);
            setSetupState('ASK_COUNT');
          }
        });
      }
    } else if (setupState === 'ASK_COUNT') {
      if (!count) {
        speak("How many questions would you like?");
        setOnResult((text) => {
          if (active) {
            const numMatch = text.match(/\d+/);
            if (!numMatch) {
               handleVoiceFallback("I didn't hear a number.", "How many questions would you like?");
               return;
            }
            const num = numMatch[0];
            setCount(num);
            setSetupState('ASK_DIFFICULTY');
          }
        });
      }
    } else if (setupState === 'ASK_DIFFICULTY') {
      if (!difficulty) {
        speak("What difficulty? Easy, medium, or hard?");
        setOnResult((text) => {
          if (active) {
            const t = text.trim().toLowerCase();
            let diff = '';
            if (t.includes('easy')) diff = 'easy';
            else if (t.includes('medium')) diff = 'medium';
            else if (t.includes('hard')) diff = 'hard';
            
            if (!diff) {
               handleVoiceFallback("Please choose from easy, medium, or hard.", "What difficulty?");
               return;
            }
            setDifficulty(diff);
            setSetupState('FETCHING');
          }
        });
      }
    } else if (setupState === 'CONFIRM_SHORTFALL') {
      setOnResult((text) => {
        if (active) {
          const t = text.trim().toLowerCase();
          if (t.includes('yes') || t.includes('confirm') || t.includes('हाँ') || t.includes('అవును') || t.includes('start') || t.includes('ok')) {
            setConfirmedShortfall(true);
            setTimeout(() => active && setSetupState('STARTING'), 0);
          } else if (t.includes('no') || t.includes('change') || t.includes('नहीं') || t.includes('కాదు') || t.includes('wait') || t.includes('cancel')) {
            setCount('');
            setSetupState('ASK_COUNT');
          } else {
             handleVoiceFallback("Please say yes or no.", "Would you like me to start with the available questions?");
          }
        }
      });
    }
    
    return () => { active = false; };
  }, [setupState, subject, count, difficulty, speak, setOnResult]);

  if (setupState !== 'READY') {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-black text-white p-6 overflow-hidden">
        {/* Subtle background transitions based on state */}
        <AnimatePresence>
          {setupState === 'ASK_SUBJECT' && (
            <motion.div key="bg-subject" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0 bg-linear-to-b from-blue-900/20 to-black pointer-events-none" />
          )}
          {setupState === 'ASK_COUNT' && (
            <motion.div key="bg-count" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0 bg-linear-to-b from-purple-900/20 to-black pointer-events-none" />
          )}
          {setupState === 'ASK_DIFFICULTY' && (
            <motion.div key="bg-diff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0 bg-linear-to-b from-emerald-900/20 to-black pointer-events-none" />
          )}
          {setupState === 'CONFIRM_SHORTFALL' && (
            <motion.div key="bg-short" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0 bg-linear-to-b from-amber-900/20 to-black pointer-events-none" />
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-12 relative z-10"
        >
          <VoiceCore size="lg" />
        </motion.div>
        
        <div className="w-full max-w-4xl h-64 relative flex items-center justify-center text-center z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={setupState}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              {setupState === 'ASK_SUBJECT' && (
                <div className="space-y-6 w-full max-w-md mx-auto">
                  <h2 className="text-4xl md:text-7xl font-extrabold tracking-tighter mb-4 text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-400 drop-shadow-sm">Practice Subject</h2>
                  <p className="text-2xl md:text-3xl font-light text-white/80">&quot;What subject would you like to practice?&quot;</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {SUPPORTED_SUBJECTS.map(subj => (
                      <button 
                        key={subj}
                        onClick={() => { setSubject(subj); setSetupState('ASK_COUNT'); }}
                        className="p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-colors text-sm md:text-base"
                      >
                        {subj}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {setupState === 'ASK_COUNT' && (
                <div className="space-y-6 w-full max-w-md mx-auto">
                  <h2 className="text-4xl md:text-7xl font-extrabold tracking-tighter mb-4 text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-pink-400 drop-shadow-sm">Question Count</h2>
                  <p className="text-2xl md:text-3xl font-light text-white/80">&quot;How many questions would you like?&quot;</p>
                  <div className="flex justify-center gap-4 mt-8">
                    {['5', '10', '15'].map(num => (
                      <button 
                        key={num}
                        onClick={() => { setCount(num); setSetupState('ASK_DIFFICULTY'); }}
                        className="p-4 px-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-xl transition-colors"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {setupState === 'ASK_DIFFICULTY' && (
                <div className="space-y-6 w-full max-w-md mx-auto">
                  <h2 className="text-4xl md:text-7xl font-extrabold tracking-tighter mb-4 text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-teal-400 drop-shadow-sm">Difficulty Level</h2>
                  <p className="text-2xl md:text-3xl font-light text-white/80">&quot;What difficulty? Easy, medium, or hard?&quot;</p>
                  <div className="grid grid-cols-3 gap-4 mt-8">
                    {['easy', 'medium', 'hard'].map(diff => (
                      <button 
                        key={diff}
                        onClick={() => { setDifficulty(diff); setSetupState('FETCHING'); }}
                        className="p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium capitalize transition-colors"
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {setupState === 'CONFIRM_SHORTFALL' && (
                <div className="space-y-6 w-full max-w-md mx-auto">
                  <h2 className="text-4xl md:text-7xl font-extrabold tracking-tighter mb-4 text-transparent bg-clip-text bg-linear-to-r from-amber-400 to-orange-400 drop-shadow-sm">Insufficient Questions</h2>
                  <p className="text-2xl md:text-3xl font-light text-white/80">&quot;Would you like me to start with the available questions?&quot;</p>
                  <div className="flex justify-center gap-4 mt-8">
                    <button 
                      onClick={() => { setCount(''); setSetupState('ASK_COUNT'); }}
                      className="p-4 px-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => { setConfirmedShortfall(true); setSetupState('STARTING'); }}
                      className="p-4 px-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-medium transition-colors shadow-[0_0_20px_rgba(245,158,11,0.4)]"
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
        <div className="flex items-center justify-center gap-6 mt-12 text-center w-full max-w-4xl flex-wrap">
          {subject && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/10 min-w-32">
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Subject</span>
              <span className="text-xl text-white font-medium capitalize">{subject}</span>
            </motion.div>
          )}
          {count && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/10 min-w-32">
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Count</span>
              <span className="text-xl text-white font-medium">{count} Questions</span>
            </motion.div>
          )}
          {difficulty && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/10 min-w-32">
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Difficulty</span>
              <span className="text-xl text-white font-medium capitalize">{difficulty}</span>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sr-only">{t('practice')} Mode</div>
      <ExamEngine mode="practice" interactionMode={interactionMode} />
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
