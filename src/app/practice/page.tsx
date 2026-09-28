'use client'

import { ExamEngine } from '@/components/exam/ExamEngine';
import { useExamStore, Question } from '@/lib/store/examStore';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { VoiceCore } from '@/components/voice/VoiceCore';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchPracticeQuestions, fetchAvailablePracticeSubjects, startPracticeSession, verifyActiveSession } from '@/app/exam/actions';
import { usePreferredMode } from '@/lib/hooks/usePreferredMode';
import { resolveSubject } from '@/lib/catalog/examCatalog';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { parseCommand } from '@/lib/voice/commandParser';
import { SafeAction } from '@/lib/voice/safeActionRegistry';
import { shouldEscapeToGlobal } from '@/lib/voice/navigationEscape';
import { useVoiceAppContext } from '@/lib/store/voiceContextStore';
import { clearExamStorage } from '@/lib/store/clearExamStorage';

function PracticeContent() {
  const initializeExam = useExamStore(state => state.initializeExam);
  const persistedUserId = useExamStore(state => state.userId);
  const persistedSessionId = useExamStore(state => state.sessionId);
  const persistedExamId = useExamStore(state => state.examId);
  const persistedStatus = useExamStore(state => state.status);
  const persistedQuestions = useExamStore(state => state.questions);
  const hasHydrated = useExamStore(state => state.hasHydrated);
  const { t, lang } = useI18n();
  const setVoiceContext = useVoiceAppContext(state => state.setContext);
  const searchParams = useSearchParams();
  const { speak, startContinuousListening, isContinuous } = useVoice();
  const { useVoiceAction } = useGlobalVoice();
  
  const initialSubject = searchParams.get('subject') || '';
  const initialCount = searchParams.get('count') || '';
  const initialDifficulty = searchParams.get('difficulty') || '';
  
  const { mode: interactionMode, isLoaded } = usePreferredMode();

  const [setupState, setSetupState] = useState<'ASK_SUBJECT' | 'ASK_COUNT' | 'ASK_DIFFICULTY' | 'FETCHING' | 'CONFIRM_SHORTFALL' | 'STARTING' | 'ERROR' | 'READY'>(() => {
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
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [setupError, setSetupError] = useState('');
  const [resumeChecked, setResumeChecked] = useState(false);
  
  const hasStartedRef = useRef(false);
  const hasAnnouncedResumeRef = useRef(false);


  const parseQuestionCount = (transcript: string): string | null => {
    const normalized = transcript.trim().toLowerCase().replace(/[.,!?।]/g, ' ');
    const numericMatch = normalized.match(/\b(5|10|15|20|25|30|40|50|100)\b/);
    if (numericMatch) return numericMatch[1];

    const wordCounts: Array<[string, string]> = [
      ['one hundred','100'], ['hundred','100'], ['fifty','50'], ['forty','40'], ['thirty','30'],
      ['twenty five','25'], ['twenty-five','25'], ['twenty','20'], ['fifteen','15'], ['ten','10'], ['five','5'],
      ['एक सौ','100'], ['पचास','50'], ['चालीस','40'], ['तीस','30'], ['पच्चीस','25'], ['बीस','20'], ['पंद्रह','15'], ['दस','10'], ['पाँच','5'], ['पांच','5'],
      ['వంద','100'], ['యాభై','50'], ['నలభై','40'], ['ముప్పై','30'], ['ఇరవై ఐదు','25'], ['ఇరవై','20'], ['పదిహేను','15'], ['పది','10'], ['ఐదు','5'],
      ['१००','100'], ['५०','50'], ['४०','40'], ['३०','30'], ['२५','25'], ['२०','20'], ['१५','15'], ['१०','10'], ['५','5'],
    ];

    for (const [phrase, value] of wordCounts) {
      if (normalized.split(/\s+/).includes(phrase) || normalized.includes(phrase)) return value;
    }
    return null;
  };

  const parseDifficulty = (transcript: string): string | null => {
    const normalized = transcript.trim().toLowerCase();
    if (/\b(easy|beginner|basic|आसान|सरल|शुरुआती)\b/.test(normalized)) return 'easy';
    if (/\b(medium|moderate|intermediate|मध्यम|सामान्य)\b/.test(normalized)) return 'medium';
    if (/\b(hard|difficult|advanced|कठिन|मुश्किल)\b/.test(normalized)) return 'hard';
    if (/\b(సులభం|ఈజీ)\b/.test(normalized)) return 'easy';
    if (/\b(మధ్యస్థం|మధ్యస్థ|మీడియం)\b/.test(normalized)) return 'medium';
    if (/\b(కఠినం|కష్టం|హార్డ్)\b/.test(normalized)) return 'hard';
    return null;
  };

  useEffect(() => {
    setVoiceContext('practice_setup');
    return () => setVoiceContext('unknown');
  }, [setVoiceContext]);

  useEffect(() => {
    if (!isContinuous && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startContinuousListening();
    }
  }, [isContinuous, startContinuousListening]);

  useEffect(() => {
    fetchAvailablePracticeSubjects()
      .then(setAvailableSubjects)
      .catch((error) => {
        console.error('Failed to load practice subjects', error);
        setAvailableSubjects([]);
      });
  }, []);

  useEffect(() => {
    if (!hasHydrated || resumeChecked) return;

    async function checkPersistedPractice() {
      const canResume =
        persistedStatus === 'IN_PROGRESS' &&
        persistedExamId === 'practice-exam' &&
        Boolean(persistedSessionId) &&
        Boolean(persistedUserId) &&
        persistedQuestions.length > 0;

      if (!canResume || !persistedSessionId || !persistedUserId) {
        setResumeChecked(true);
        return;
      }

      try {
        const verification = await verifyActiveSession(persistedSessionId, true);
        if (!verification.valid || verification.userId !== persistedUserId) {
          await clearExamStorage();
          setResumeChecked(true);
          return;
        }
        setSetupState('READY');
        if (!hasAnnouncedResumeRef.current) {
          hasAnnouncedResumeRef.current = true;
          speak('Resuming your current practice session.');
        }
      } catch (error) {
        console.error('Persisted practice resume validation failed:', error);
        await clearExamStorage();
      } finally {
        setResumeChecked(true);
      }
    }

    void checkPersistedPractice();
  }, [hasHydrated, resumeChecked, persistedStatus, persistedExamId, persistedSessionId, persistedUserId, persistedQuestions.length, speak]);

  useEffect(() => {
    if (!hasHydrated || !resumeChecked || setupState !== 'FETCHING') return;

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
          setSetupError(
            err instanceof Error
              ? err.message
              : "Sorry, there was an error loading practice questions."
          );
          setSetupState('ERROR');
          speak("I couldn't load those practice questions. I can retry or you can choose another subject.");
        });
  }, [hasHydrated, setupState, subject, count, difficulty, lang, speak]);

  useEffect(() => {
    if (!hasHydrated || !resumeChecked || setupState !== 'STARTING') return;

    const actualCount = fetchedQuestions.length;
    const confirmMsg = lang === 'hi-IN'
      ? `${actualCount} प्रश्नों का ${difficulty} स्तर का ${subject} अभ्यास शुरू हो रहा है।`
      : lang === 'te-IN'
        ? `${actualCount} प्रश्नల ${difficulty} స్థాయి ${subject} అభ్యాసం ప్రారంభమవుతోంది.`
        : `Starting a ${actualCount}-question ${difficulty} ${subject} practice session.`;

    speak(confirmMsg);
    startPracticeSession(
      fetchedQuestions.map(question => question.id),
      subject,
      difficulty
    )
      .then(sessionId => {
        initializeExam(sessionId, 'practice-exam', fetchedQuestions);
        setSetupState('READY');
      })
      .catch(err => {
        console.error(err);
        setSetupError(
          err instanceof Error ? err.message : 'Failed to create practice session.'
        );
        setSetupState('ERROR');
        speak("I couldn't start that practice session. You can retry.");
      });
  }, [hasHydrated, setupState, fetchedQuestions, subject, difficulty, lang, initializeExam, speak]);

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
    const canResume =
      hasHydrated &&
      persistedStatus === 'IN_PROGRESS' &&
      persistedExamId === 'practice-exam' &&
      Boolean(persistedSessionId) &&
      persistedQuestions.length > 0;

    if (!hasHydrated || !resumeChecked || canResume) return;

    if (setupState === 'ASK_SUBJECT' && !subject) speak("What subject would you like to practice?");
    if (setupState === 'ASK_COUNT' && !count) speak("How many questions would you like?");
    if (setupState === 'ASK_DIFFICULTY' && !difficulty) speak("What difficulty? Easy, medium, or hard?");
  }, [
    hasHydrated,
    persistedStatus,
    persistedExamId,
    persistedSessionId,
    persistedQuestions.length,
    setupState,
    subject,
    count,
    difficulty,
    speak
  ]);

  useVoiceAction((action: SafeAction, payload?: Record<string, unknown> | null, transcript?: string) => {
    if (setupState === 'READY') return false;

    const handleVoiceFallback = (errorMsg: string, repromptMsg: string) => {
      speak(`${errorMsg} ${repromptMsg}`);
    };

    if (setupState === 'ERROR') {
      const lower = transcript?.trim().toLowerCase() || '';
      if (/\b(retry|again|try again|yes|start)\b/.test(lower)) {
        setSetupState('FETCHING');
        speak('Retrying the practice question load.');
        return true;
      }
      if (/\b(change|subject|different)\b/.test(lower)) {
        setSetupError('');
        setSubject('');
        setCount('');
        setDifficulty('');
        setSetupState('ASK_SUBJECT');
        speak('Okay. What subject would you like to practice?');
        return true;
      }
      return true;
    }

    if ((action as string === 'RAW_TRANSCRIPT' || action === 'UNKNOWN_COMMAND') && transcript) {
      const raw = transcript.trim();
      const lower = raw.toLowerCase();

      if (/\b(help|support|dashboard|home|history|analysis|settings|logout|log out)\b/.test(lower)) {
        return false;
      }
      
      if ((action as string) === 'RAW_TRANSCRIPT' && shouldEscapeToGlobal(raw, lang, 'practice_setup')) {
        return false;
      }

      if (parseCommand(raw, lang).type === 'DASHBOARD_PRACTICE') {
        const reprompt =
          setupState === 'ASK_SUBJECT'
            ? 'You are already in practice mode. What subject?'
            : setupState === 'ASK_COUNT'
              ? 'You are already in practice mode. How many questions would you like?'
              : setupState === 'ASK_DIFFICULTY'
                ? 'You are already in practice mode. What difficulty?'
                : 'You are already in practice mode. Would you like me to start with the available questions?';
        speak(
          lang === 'hi-IN'
            ? `आप पहले से अभ्यास मोड में हैं। ${setupState === 'ASK_SUBJECT' ? 'कौन सा विषय?' : setupState === 'ASK_COUNT' ? 'कितने प्रश्न?' : setupState === 'ASK_DIFFICULTY' ? 'कठिनाई क्या है?' : 'क्या मैं उपलब्ध प्रश्नों से शुरू करूँ?'}`
            : lang === 'te-IN'
              ? `మీరు ఇప్పటికే ప్రాక్టీస్ మోడ్‌లో ఉన్నారు. ${setupState === 'ASK_SUBJECT' ? 'ఏ విషయం?' : setupState === 'ASK_COUNT' ? 'ఎన్ని ప్రశ్నలు కావాలి?' : setupState === 'ASK_DIFFICULTY' ? 'ఏ కఠినత?' : 'అందుబాటులో ఉన్న ప్రశ్నలతో ప్రారంభించనా?'}`
              : reprompt
        );
        return true;
      }

      if (setupState === 'ASK_SUBJECT') {
        const countVal = parseQuestionCount(raw);
        const diff = parseDifficulty(lower) || '';
        resolveSubject(raw).then(resolved => {
          if (!resolved) {
            handleVoiceFallback("I didn't quite catch that.", "What subject would you like to practice?");
            return;
          }

          setSubject(resolved);
          if (countVal && diff) {
            setCount(countVal);
            setDifficulty(diff);
            setSetupState('FETCHING');
          } else if (countVal) {
            setCount(countVal);
            setSetupState('ASK_DIFFICULTY');
          } else {
            setSetupState('ASK_COUNT');
          }
        });
        return true;
      }

      if (setupState === 'ASK_COUNT') {
        const countVal = parseQuestionCount(raw);
        const diff = parseDifficulty(lower) || '';

        if (!countVal) {
          handleVoiceFallback("Please say the number of questions, such as 10 or 20.", "How many questions would you like?");
        } else if (diff) {
          setCount(countVal);
          setDifficulty(diff);
          setSetupState('FETCHING');
        } else {
          setCount(countVal);
          setSetupState('ASK_DIFFICULTY');
        }
        return true;
      }

      if (setupState === 'ASK_DIFFICULTY') {
        const diff = parseDifficulty(lower) || '';

        if (!diff) {
          handleVoiceFallback("Please say easy, medium, or hard.", "What difficulty?");
        } else {
          setDifficulty(diff);
          setSetupState('FETCHING');
        }
        return true;
      }

      if (setupState === 'CONFIRM_SHORTFALL') {
        if (lower.includes('yes') || lower.includes('confirm') || lower.includes('हाँ') || lower.includes('అవును') || lower.includes('start') || lower.includes('ok')) {
          setConfirmedShortfall(true);
          setSetupState('STARTING');
        } else if (lower.includes('no') || lower.includes('change') || lower.includes('नहीं') || lower.includes('కాదు') || lower.includes('wait') || lower.includes('cancel')) {
          setCount('');
          setSetupState('ASK_COUNT');
        } else {
          handleVoiceFallback("Please say yes or no.", "Would you like me to start with the available questions?");
        }
        return true;
      }
    }
    
    // Explicit natural START_PRACTICE commands can carry all three parameters.
    if (action === 'START_PRACTICE' || action === 'OPEN_PRACTICE') {
      const nextSubject = typeof payload?.subject === 'string' ? payload.subject : '';
      const nextCount = payload?.count !== undefined ? String(payload.count) : '';
      const nextDifficulty = typeof payload?.difficulty === 'string'
        ? payload.difficulty.toLowerCase()
        : '';

      setSubject(nextSubject);
      setCount(nextCount);
      setDifficulty(nextDifficulty);

      if (nextSubject && nextCount && ['easy', 'medium', 'hard'].includes(nextDifficulty)) {
        setSetupState('FETCHING');
      } else if (!nextSubject) {
        setSetupState('ASK_SUBJECT');
      } else if (!nextCount) {
        setSetupState('ASK_COUNT');
      } else {
        setSetupState('ASK_DIFFICULTY');
      }
      return true;
    }

    return false;
  });

  if (setupState !== 'READY') {
    if (setupState === 'ERROR') {
      return (
        <div className="relative flex flex-col min-h-screen w-full max-w-4xl mx-auto pt-32 pb-24 px-6 md:px-12 bg-black text-white">
          <div className="flex-1 flex flex-col justify-center space-y-10">
            <p className="text-zinc-400 tracking-[0.2em] text-sm uppercase">PRACTICE</p>
            <h1 className="text-[clamp(3rem,6vw,6rem)] font-light tracking-tighter">Something went wrong.</h1>
            <p className="text-xl text-zinc-400 font-light" aria-live="assertive">
              {setupError || 'I could not start the practice session.'}
            </p>
            <div className="flex flex-wrap gap-4 border-t border-zinc-900 pt-10">
              <button
                type="button"
                onClick={() => setSetupState('FETCHING')}
                className="px-10 py-4 rounded-full bg-white text-black uppercase tracking-widest text-sm font-bold"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetupError('');
                  setSubject('');
                  setCount('');
                  setDifficulty('');
                  setSetupState('ASK_SUBJECT');
                }}
                className="px-10 py-4 rounded-full border border-zinc-800 text-zinc-300 uppercase tracking-widest text-sm font-medium"
              >
                Choose another subject
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative flex flex-col min-h-screen w-full max-w-7xl mx-auto pt-32 pb-24 px-6 md:px-12 bg-black text-white">
        
        <div className="mb-24 flex items-center justify-between border-b border-zinc-900 pb-8">
          <div className="flex flex-col">
            <span className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-2">MODE</span>
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
                    <p className="text-2xl text-zinc-400 font-light">&quot;What subject would you like to practice?&quot;</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {availableSubjects.length > 0 ? availableSubjects.map(subj => (
                      <button 
                        key={subj}
                        onClick={() => { setSubject(subj); setSetupState('ASK_COUNT'); }}
                        className="px-6 py-4 rounded-full border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors text-sm md:text-base uppercase tracking-widest font-medium"
                      >
                        {subj}
                      </button>
                    )) : (
                      <p className="text-zinc-400 text-base">
                        Subjects will appear here once questions are available.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {setupState === 'ASK_COUNT' && (
                <div className="space-y-16">
                  <div>
                    <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-light tracking-tighter leading-tight mb-4">Question Count</h2>
                    <p className="text-2xl text-zinc-400 font-light">&quot;How many questions would you like?&quot;</p>
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
                    <p className="text-2xl text-zinc-400 font-light">&quot;What difficulty? Easy, medium, or hard?&quot;</p>
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
                    <p className="text-2xl text-zinc-400 font-light">&quot;Would you like me to start with the available questions?&quot;</p>
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
              <span className="text-zinc-400 uppercase tracking-[0.2em] text-xs mb-2">Subject</span>
              <span className="text-zinc-300 font-light capitalize">{subject}</span>
            </motion.div>
          )}
          {count && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
              <span className="text-zinc-400 uppercase tracking-[0.2em] text-xs mb-2">Count</span>
              <span className="text-zinc-300 font-light">{count} Questions</span>
            </motion.div>
          )}
          {difficulty && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
              <span className="text-zinc-400 uppercase tracking-[0.2em] text-xs mb-2">Difficulty</span>
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
