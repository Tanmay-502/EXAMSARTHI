'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

export type SubjectStats = {
  subject: string;
  correct: number;
  incorrect: number;
  unanswered: number;
  total: number;
  accuracy: number;
};

export type AnalyticsData = {
  overall: {
    totalSessions: number;
    avgPercentage: number;
    improvementTrend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  };
  timeEfficiency: {
    avgDurationSeconds: number;
  };
  subjectAccuracy: SubjectStats[];
  strongSubjects: string[];
  weakSubjects: string[];
};

export async function fetchAnalyticsData(): Promise<AnalyticsData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: sessions, error: sessionsError } = await supabase
    .from('exam_sessions')
    .select('id, is_practice, exam_id, question_ids, percentage, started_at, completed_at, score, total_questions')
    .eq('candidate_id', user.id)
    .eq('status', 'submitted')
    .order('started_at', { ascending: true }); // Chronological for trend analysis

  if (sessionsError) throw new Error(sessionsError.message);

  const completedSessions = sessions || [];
  const totalSessions = completedSessions.length;

  let avgPercentage = 0;
  let improvementTrend: 'improving' | 'declining' | 'stable' | 'insufficient_data' = 'insufficient_data';
  let avgDurationSeconds = 0;

  if (totalSessions > 0) {
    const sumPercentage = completedSessions.reduce((acc, s) => acc + (s.percentage || 0), 0);
    avgPercentage = Math.round(sumPercentage / totalSessions);

    // Trend analysis (first half vs second half)
    if (totalSessions >= 4) {
      const mid = Math.floor(totalSessions / 2);
      const firstHalf = completedSessions.slice(0, mid);
      const secondHalf = completedSessions.slice(mid);
      
      const firstHalfAvg = firstHalf.reduce((acc, s) => acc + (s.percentage || 0), 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((acc, s) => acc + (s.percentage || 0), 0) / secondHalf.length;
      
      if (secondHalfAvg > firstHalfAvg + 5) improvementTrend = 'improving';
      else if (secondHalfAvg < firstHalfAvg - 5) improvementTrend = 'declining';
      else improvementTrend = 'stable';
    }

    // Time efficiency
    const totalDuration = completedSessions.reduce((acc, s) => {
      const start = new Date(s.started_at).getTime();
      const end = new Date(s.completed_at || s.started_at).getTime();
      return acc + (end - start);
    }, 0);
    avgDurationSeconds = Math.round(totalDuration / totalSessions / 1000);
  }

  const subjectStatsMap: Record<string, SubjectStats> = {};
  const adminClient = totalSessions > 0 ? await createAdminClient() : null;

  if (adminClient && totalSessions > 0) {
    const sessionIds = completedSessions.map(session => session.id);
    const { data: answers, error: answersError } = await adminClient
      .from('answers')
      .select('session_id, question_id, selected_option_index')
      .in('session_id', sessionIds);

    const answerBySessionQuestion = new Map<string, number | null>();
    for (const answer of answers || []) {
      answerBySessionQuestion.set(
        `${answer.session_id}:${answer.question_id}`,
        answer.selected_option_index
      );
    }

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

    let questionQuery = adminClient
      .from('questions')
      .select(`id, exam_id, subject, question_answers(correct_answer_index)`);

    if (rosterQuestionIds.length > 0 && legacyExamIds.length === 0) {
      questionQuery = questionQuery.in('id', rosterQuestionIds);
    } else if (rosterQuestionIds.length === 0 && legacyExamIds.length > 0) {
      questionQuery = questionQuery.in('exam_id', legacyExamIds);
    } else if (rosterQuestionIds.length > 0 || legacyExamIds.length > 0) {
      const filters = [];
      if (rosterQuestionIds.length > 0) filters.push(`id.in.(${rosterQuestionIds.join(',')})`);
      if (legacyExamIds.length > 0) filters.push(`exam_id.in.(${legacyExamIds.join(',')})`);
      questionQuery = questionQuery.or(filters.join(','));
    }

    const { data: questions, error: questionsError } = await questionQuery;
    if (questionsError) {
      console.error('Failed to fetch analysis question roster:', questionsError.message);
    }

    type AnalysisQuestion = {
      id: string;
      exam_id: string | null;
      subject: string | null;
      question_answers: { correct_answer_index: number }[] | { correct_answer_index: number } | null;
    };

    const questionMap = new Map((questions || []).map(question => [question.id, question as AnalysisQuestion]));

    for (const session of completedSessions) {
      let rosterIds = Array.isArray(session.question_ids)
        ? session.question_ids.filter((id: unknown): id is string => typeof id === 'string')
        : [];

      if (rosterIds.length === 0 && session.exam_id) {
        rosterIds = (questions || [])
          .filter(question => question.exam_id === session.exam_id)
          .map(question => question.id);
      }

      for (const questionId of rosterIds) {
        const question = questionMap.get(questionId);
        if (!question) continue;

        const subject = question.subject || 'General';
        const stats = subjectStatsMap[subject] || {
          subject, correct: 0, incorrect: 0, unanswered: 0, total: 0, accuracy: 0
        };
        stats.total += 1;

        const answer = answerBySessionQuestion.get(`${session.id}:${questionId}`) ?? null;
        const questionAnswers = question.question_answers;
        const correctIndex = Array.isArray(questionAnswers)
          ? questionAnswers[0]?.correct_answer_index
          : questionAnswers?.correct_answer_index;

        if (answer === null) {
          stats.unanswered += 1;
        } else if (answer === correctIndex) {
          stats.correct += 1;
        } else {
          stats.incorrect += 1;
        }

        subjectStatsMap[subject] = stats;
      }
    }

    Object.values(subjectStatsMap).forEach(stats => {
      stats.accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      if (stats.total >= 2) {
        if (stats.accuracy >= 70) strongSubjects.push(stats.subject);
        if (stats.accuracy <= 50) weakSubjects.push(stats.subject);
      }
    });
  }
  return {
    overall: {
      totalSessions,
      avgPercentage,
      improvementTrend
    },
    timeEfficiency: {
      avgDurationSeconds
    },
    subjectAccuracy: Object.values(subjectStatsMap).sort((a, b) => b.total - a.total),
    strongSubjects,
    weakSubjects
  };
}
