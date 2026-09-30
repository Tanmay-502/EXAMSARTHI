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
import { resolveSubject } from '@/app/exam/actions';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { parseCommand } from '@/lib/voice/commandParser';
import { SafeAction } from '@/lib/voice/safeActionRegistry';
import { shouldEscapeToGlobal } from '@/lib/voice/navigationEscape';
import { useVoiceAppContext } from '@/lib/store/voiceContextStore';
import { clearExamStorage } from '@/lib/store/clearExamStorage';

/** Configures or resumes a practice session and renders the exam engine, starting automatic listening only in voice-first mode. */
function PracticeContent() {
  const initializeExam = useExamStore(state => state.initializeExam);
  const persistedUserId = useExamStore(state => state.userId);
  const persistedSessionId = useExamStore(state => state.sessionId);
  const persistedExamId = useExamStore(state => state.examId);
  const persistedStatus = useExamStore(state => state.status);
  const persistedQuestions = useExamStore(state => state.questions);
  const hasHydrated = useExamStore(state => state.hasHydrated);
  const { t, tParams, lang } = useI18n();
  const setVoiceContext = useVoiceAppContext(state => state.setContext);
  const searchParams = useSearchParams();
  const { speak, startContinuousListening, pauseListening, isContinuous } = useVoice();
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
    if (!isLoaded) return;
    if (interactionMode === 'standard') {
      pauseListening();
      return;
    }
    if (interactionMode !== 'voice-first' || isContinuous || hasStartedRef.current) return;
    hasStartedRef.current = true;
    startContinuousListening();
  }, [interactionMode, isContinuous, isLoaded, pauseListening, startContinuousListening]);

  useEffect(() => {
    fetchAvailablePracticeSubjects()
      .then(data => setAvailableSubjects((data ?? []) as string[]))
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
          speak(t('practice_resume'));
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
            speak(tParams('practice_none_found', { subject: subject ?? '', difficulty: difficulty ?? '' }));
            setSubject('');
            setSetupState('ASK_SUBJECT');
          } else {
            setSetupState('STARTING');
          }
        })
        .catch(err => {
          console.error(err);
          setSetupError(t('practice_load_error'));
          setSetupState('ERROR');
          speak(t('practice_load_error'));
        });
  }, [hasHydrated, setupState, subject, count, difficulty, speak, tParams, resumeChecked]);

  useEffect(() => {
    if (!hasHydrated || !resumeChecked || setupState !== 'STARTING') return;

    const actualCount = fetchedQuestions.length;
    const difficultyLabel = t(difficulty === 'easy' ? 'difficulty_easy' : difficulty === 'medium' ? 'difficulty_medium' : 'difficulty_hard');
    const confirmMsg = tParams('practice_starting_session', { count: actualCount, difficulty: difficultyLabel, subject: subject ?? '' });

    speak(confirmMsg);
    startPracticeSession(
      fetchedQuestions.map(question => question.id),
      subject,
      difficulty
    )
      .then(session => {
        initializeExam(session.id, 'practice-exam', fetchedQuestions, undefined, session.userId);
        setSetupState('READY');
      })
      .catch(err => {
        console.error(err);
        setSetupError(
          err instanceof Error ? err.message : t('practice_session_start_error')
        );
        setSetupState('ERROR');
        speak(t('practice_start_error'));
      });
  }, [hasHydrated, setupState, fetchedQuestions, subject, difficulty, lang, initializeExam, speak, t, tParams]);

  useEffect(() => {
    if (setupState === 'CONFIRM_SHORTFALL' && !confirmedShortfall) {
      const msg = tParams('practice_shortfall', { subject: subject ?? '', availableCount: availableCount ?? 0, difficulty: difficulty ?? '' });
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

    if (setupState === 'ASK_SUBJECT' && !subject) speak(t('practice_subject_prompt'));
    if (setupState === 'ASK_COUNT' && !count) speak(t('practice_count_prompt'));
    if (setupState === 'ASK_DIFFICULTY' && !difficulty) speak(t('practice_difficulty_prompt'));
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
        speak(t('practice_retrying'));
        return true;
      }
      if (/\b(change|subject|different)\b/.test(lower)) {
        setSetupError('');
        setSubject('');
        setCount('');
        setDifficulty('');
        setSetupState('ASK_SUBJECT');
        speak(t('practice_subject_prompt'));
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
            ? t('practice_already_subject')
            : setupState === 'ASK_COUNT'
              ? t('practice_already_count')
              : setupState === 'ASK_DIFFICULTY'
                ? t('practice_already_difficulty')
                : t('practice_already_ready');
        speak(
          lang === 'hi-IN'
            ? reprompt
            : lang === 'te-IN'
              ? reprompt
              : reprompt
        );
        return true;
      }

      if (setupState === 'ASK_SUBJECT') {
        const countVal = parseQuestionCount(raw);
        const diff = parseDifficulty(lower) || '';
        resolveSubject(raw).then(resolved => {
          if (!resolved) {
            handleVoiceFallback(t('voice_not_catch'), t('practice_subject_prompt'));
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
        }).catch((error) => {
          console.error('Failed to resolve practice subject', error);
          handleVoiceFallback(t('practice_load_error'), t('practice_subject_prompt'));
        });
        return true;
      }

      if (setupState === 'ASK_COUNT') {
        const countVal = parseQuestionCount(raw);
        const diff = parseDifficulty(lower) || '';

        if (!countVal) {
          handleVoiceFallback(t('practice_number_example'), t('practice_count_prompt'));
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
          handleVoiceFallback(t('practice_easy_medium_hard'), t('practice_difficulty_prompt'));
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
          handleVoiceFallback(t('confirm_yes_no_hint'), tParams('practice_shortfall', { subject: subject ?? '', availableCount: availableCount ?? 0, difficulty: difficulty ?? '' }));
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
        <div className="relative flex flex-col min-h-0 w-full max-w-4xl mx-auto pt-32 pb-24 px-6 md:px-12 bg-black text-white">
          <div className="flex-1 flex flex-col justify-center space-y-10">
            <p className="text-zinc-400 tracking-[0.2em] text-sm uppercase">{t('practice').toUpperCase()}</p>
            <h2 className="text-[clamp(3rem,6vw,6rem)] font-light tracking-tighter">{t('page_error_title')}</h2>
            <p className="text-xl text-zinc-400 font-light" aria-live="assertive">
              {setupError || t('practice_start_error')}
            </p>
            <div className="flex flex-wrap gap-4 border-t border-zinc-900 pt-10">
              <button
                type="button"
                onClick={() => setSetupState('FETCHING')}
                className="px-10 py-4 rounded-full bg-white text-black uppercase tracking-widest text-sm font-bold"
              >
                {t('retry')}
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
                {t('choose_another')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative flex flex-col min-h-0 w-full max-w-7xl mx-auto pt-32 pb-24 px-6 md:px-12 bg-black text-white">
        
        <div className="mb-24 flex items-center justify-between border-b border-zinc-900 pb-8">
          <div className="flex flex-col">
            <span className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-2">{t('mode')}</span>
            <span className="text-xl font-light tracking-wide">{t('practice').toUpperCase()}</span>
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
                    <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-light tracking-tighter leading-tight mb-4">{t('practice')}</h2>
                    <p className="text-2xl text-zinc-400 font-light">&quot;{t('practice_subject_prompt')}&quot;</p>
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
                        {t('questions_available_hint')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {setupState === 'ASK_COUNT' && (
                <div className="space-y-16">
                  <div>
                    <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-light tracking-tighter leading-tight mb-4">{t('total_questions')}</h2>
                    <p className="text-2xl text-zinc-400 font-light">&quot;{t('practice_count_prompt')}&quot;</p>
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
                    <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-light tracking-tighter leading-tight mb-4">{t('difficulty')}</h2>
                    <p className="text-2xl text-zinc-400 font-light">&quot;{t('practice_difficulty_prompt')}&quot;</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {(['easy', 'medium', 'hard'] as const).map(diff => (
                      <button 
                        key={t(diff === 'easy' ? 'difficulty_easy' : diff === 'medium' ? 'difficulty_medium' : 'difficulty_hard')}
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
                    <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-light tracking-tighter leading-tight mb-4 text-zinc-100">{tParams('practice_shortfall', { availableCount: availableCount ?? 0, subject: subject ?? '', difficulty: difficulty ?? '' })}</h2>
                    <p className="text-2xl text-zinc-400 font-light">&quot;{t('practice_shortfall_question')}&quot;</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => { setCount(''); setSetupState('ASK_COUNT'); }}
                      className="px-8 py-4 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors uppercase tracking-widest text-sm font-medium"
                    >
                      {t('cancel')}
                    </button>
                    <button 
                      onClick={() => { setConfirmedShortfall(true); setSetupState('STARTING'); }}
                      className="px-8 py-4 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors uppercase tracking-widest text-sm font-bold"
                    >
                      {t('start')}
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
              <span className="text-zinc-400 uppercase tracking-[0.2em] text-xs mb-2">{t('subject')}</span>
              <span className="text-zinc-300 font-light capitalize">{subject}</span>
            </motion.div>
          )}
          {count && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
              <span className="text-zinc-400 uppercase tracking-[0.2em] text-xs mb-2">{t('count')}</span>
              <span className="text-zinc-300 font-light">{count} {t('questions')}</span>
            </motion.div>
          )}
          {difficulty && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
              <span className="text-zinc-400 uppercase tracking-[0.2em] text-xs mb-2">{t('difficulty')}</span>
              <span className="text-zinc-300 font-light">{t(difficulty === 'easy' ? 'difficulty_easy' : difficulty === 'medium' ? 'difficulty_medium' : 'difficulty_hard')}</span>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sr-only">{t('practice')} {t('mode')}</div>
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
    <main id="main-content" className="flex min-h-dvh flex-col flex-1 bg-black">
      <h1 className="sr-only">{t('practice')}</h1>
      <Suspense fallback={<div className="p-12 text-center text-white/50">{t('loading')}</div>}>
        <PracticeContent />
      </Suspense>
    </main>
  );
}
