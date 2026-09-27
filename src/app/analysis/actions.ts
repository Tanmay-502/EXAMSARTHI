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
    .select('*')
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
  const strongSubjects: string[] = [];
  const weakSubjects: string[] = [];

  if (totalSessions > 0) {
    const adminClient = await createAdminClient();
    const { data: answers, error: answersError } = await adminClient
      .from('answers')
      .select(`
        id,
        session_id,
        selected_option_index,
        questions!inner (
          subject,
          question_answers (
            correct_answer_index
          )
        )
      `)
      .in('session_id', completedSessions.map(s => s.id));

    if (!answersError && answers && answers.length > 0) {
      // Type assertion or robust handling
      answers.forEach((ans: {
        selected_option_index: number | null;
        questions: {
          subject: string | null;
          question_answers: { correct_answer_index: number }[] | { correct_answer_index: number } | null;
        }[] | {
          subject: string | null;
          question_answers: { correct_answer_index: number }[] | { correct_answer_index: number } | null;
        } | null;
      }) => {
        const qList = Array.isArray(ans.questions) ? ans.questions : (ans.questions ? [ans.questions] : []);
        const q = qList[0];
        const subject = q?.subject || 'General';
        const qa = q?.question_answers;
        const correctIndex = Array.isArray(qa) ? qa[0]?.correct_answer_index : qa?.correct_answer_index;
        
        if (!subjectStatsMap[subject]) {
          subjectStatsMap[subject] = { subject, correct: 0, incorrect: 0, unanswered: 0, total: 0, accuracy: 0 };
        }
        
        subjectStatsMap[subject].total += 1;
        
        if (ans.selected_option_index === null) {
          subjectStatsMap[subject].unanswered += 1;
        } else if (ans.selected_option_index === correctIndex) {
          subjectStatsMap[subject].correct += 1;
        } else {
          subjectStatsMap[subject].incorrect += 1;
        }
      });

      Object.values(subjectStatsMap).forEach(stats => {
        stats.accuracy = Math.round((stats.correct / stats.total) * 100);
        if (stats.total >= 2) {
          if (stats.accuracy >= 70) strongSubjects.push(stats.subject);
          if (stats.accuracy <= 50) weakSubjects.push(stats.subject);
        }
      });
    }
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
