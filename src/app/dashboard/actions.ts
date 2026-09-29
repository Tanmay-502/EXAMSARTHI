'use server'

import { LANGUAGE_REGISTRY, type Locale } from '@/lib/i18n/registry';

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { chunk } from '@/lib/db/chunk'

type ServerQuestionWithAnswer = {
  id: string;
  exam_id: string | null;
  subject: string | null;
  question_answers: { correct_answer_index: number } | { correct_answer_index: number }[] | null;
};

export type DashboardStats = {
  totalExams: number;
  totalPractice: number;
  avgPercentage: number;
  totalQuestionsAttempted: number;
  strongSubjects: string[];
  weakSubjects: string[];
  focusSubject: string | null;
  focusPercentage: number | null;
  recentSessions: {
    id: string;
    title: string | null;
    date: string;
    score: number;
    percentage: number;
    is_practice: boolean;
  }[];
}

/**
 * Builds the authenticated candidate's dashboard statistics from submitted sessions.
 * Localizes practice and fallback exam titles using the profile language, defaulting to English.
 * @throws If authentication or a required session, answer, or question query fails.
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_lang')
    .eq('id', user.id)
    .maybeSingle();
  const preferredLang: Locale = profile?.preferred_lang === 'hi-IN' || profile?.preferred_lang === 'te-IN'
    ? profile.preferred_lang
    : 'en-IN';
  const dictionary = LANGUAGE_REGISTRY[preferredLang].dictionary;

  // Get all exam sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from('exam_sessions')
    .select('*, exams(title)')
    .eq('candidate_id', user.id)
    .order('started_at', { ascending: false });

  if (sessionsError) throw new Error(sessionsError.message);

  const completedSessions = sessions?.filter(s => s.status === 'submitted') || [];
  
  const totalExams = completedSessions.filter(s => !s.is_practice).length;
  const totalPractice = completedSessions.filter(s => s.is_practice).length;
  
  const totalQuestionsAttempted = completedSessions.reduce((acc, s) => acc + (s.attempted_questions || 0), 0);
  const strongSubjects: string[] = [];
  const weakSubjects: string[] = [];
  let focusSubject: string | null = null;
  let focusPercentage: number | null = null;
  
  const sumPercentage = completedSessions.reduce((acc, s) => acc + (s.percentage || 0), 0);
  const avgPercentage = completedSessions.length > 0 ? Math.round(sumPercentage / completedSessions.length) : 0;

  const recentSessions = completedSessions.slice(0, 5).map(s => ({
    id: s.id,
    title: s.is_practice
      ? (s.practice_subject
          ? dictionary.dashboard_practice_title.replace('{subject}', s.practice_subject)
          : dictionary.practice)
      : (Array.isArray(s.exams) ? s.exams[0]?.title : (s.exams as { title?: string } | null)?.title) || dictionary.unknown_exam,
    date: new Date(s.started_at).toLocaleDateString(),
    score: s.score || 0,
    percentage: s.percentage || 0,
    is_practice: !!s.is_practice
  }));

  const adminClient = await createAdminClient();
  const subjectStats: Record<string, { subject: string; total: number; correct: number; incorrect: number; unanswered: number; accuracy: number }> = {};

  const sessionIds = completedSessions.map(session => session.id);
  const rosterQuestionIds = [...new Set(
    completedSessions.flatMap(session =>
      Array.isArray(session.question_ids)
        ? session.question_ids.filter((id: unknown): id is string => typeof id === 'string')
        : []
    )
  )];

  const legacyExamIds = [...new Set(
    completedSessions
      .filter(session => !Array.isArray(session.question_ids) || session.question_ids.length === 0)
      .map(session => session.exam_id)
      .filter((id): id is string => typeof id === 'string')
  )];

  if (completedSessions.length > 0) {
    const answerBatches = await Promise.all(
      chunk(sessionIds).map(ids =>
        adminClient
          .from('answers')
          .select('session_id, question_id, selected_option_index')
          .in('session_id', ids)
      )
    );
    const answers = answerBatches.flatMap(batch => batch.data || []);
    const answersError = answerBatches.find(batch => batch.error)?.error || null;

    const [questionByIdBatches, questionByExamBatches] = await Promise.all([
      Promise.all(chunk(rosterQuestionIds).map(ids =>
        ids.length === 0
          ? Promise.resolve({ data: [], error: null })
          : adminClient.from('questions').select('id, exam_id, subject, question_answers(correct_answer_index)').in('id', ids)
      )),
      Promise.all(chunk(legacyExamIds).map(ids =>
        ids.length === 0
          ? Promise.resolve({ data: [], error: null })
          : adminClient.from('questions').select('id, exam_id, subject, question_answers(correct_answer_index)').in('exam_id', ids)
      )),
    ]);
    const questions = [...questionByIdBatches, ...questionByExamBatches].flatMap(batch => batch.data || []);
    const questionsError = [...questionByIdBatches, ...questionByExamBatches].find(batch => batch.error)?.error || null;

    if (answersError) throw new Error(answersError.message);
    if (questionsError) throw new Error(questionsError.message);

    const answerMap = new Map(
      (answers || []).map(answer => [`${answer.session_id}:${answer.question_id}`, answer.selected_option_index])
    );
    const typedQuestions = (questions || []) as ServerQuestionWithAnswer[];
    const questionMap = new Map(typedQuestions.map(question => [question.id, question]));

    for (const session of completedSessions) {
      let ids = Array.isArray(session.question_ids)
        ? session.question_ids.filter((id: unknown): id is string => typeof id === 'string')
        : [];
      if (ids.length === 0 && session.exam_id) {
        ids = typedQuestions.filter(question => question.exam_id === session.exam_id).map(question => question.id);
      }

      for (const questionId of ids) {
        const question = questionMap.get(questionId);
        if (!question) continue;

        const subject = question.subject || 'General';
        const current = subjectStats[subject] || { subject, total: 0, correct: 0, incorrect: 0, unanswered: 0, accuracy: 0 };
        const answer = answerMap.get(`${session.id}:${questionId}`) ?? null;
        const qa = question.question_answers;
        const correctIndex = Array.isArray(qa) ? qa[0]?.correct_answer_index : qa?.correct_answer_index;

        current.total += 1;
        if (answer === null || answer === undefined) current.unanswered += 1;
        else if (answer === correctIndex) current.correct += 1;
        else current.incorrect += 1;

        current.accuracy = Math.round((current.correct / current.total) * 100);
        subjectStats[subject] = current;
      }
    }

    Object.values(subjectStats).forEach(stats => {
      if (stats.total >= 2) {
        if (stats.accuracy >= 70) strongSubjects.push(stats.subject);
        if (stats.accuracy <= 50) weakSubjects.push(stats.subject);
      }
    });

    for (const stats of Object.values(subjectStats)) {
      if (stats.total === 0) continue;
      if (focusPercentage === null || stats.accuracy < focusPercentage ||
          (stats.accuracy === focusPercentage && stats.subject.localeCompare(focusSubject || '') < 0)) {
        focusSubject = stats.subject;
        focusPercentage = stats.accuracy;
      }
    }
  }
  return {
    totalExams,
    totalPractice,
    avgPercentage,
    totalQuestionsAttempted,
    strongSubjects,
    weakSubjects,
    focusSubject,
    focusPercentage,
    recentSessions
  };
}
