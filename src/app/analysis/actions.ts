'use server';

import { createClient } from '@/lib/supabase/server';

export interface AnalyticsData {
  totalSessions: number;
  practiceSessions: number;
  examSessions: number;
  averagePracticeScore: number;
  averageExamScore: number;
  examPerformance: { title: string; averageScore: number; count: number }[];
  recentScores: { date: string; percentage: number; isPractice: boolean }[];
}

export async function fetchAnalyticsData(): Promise<AnalyticsData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: sessions, error } = await supabase
    .from('exam_sessions')
    .select(`
      id,
      status,
      started_at,
      completed_at,
      score,
      total_questions,
      percentage,
      is_practice,
      exams (
        title
      )
    `)
    .eq('candidate_id', user.id)
    .eq('status', 'submitted')
    .order('completed_at', { ascending: true });

  if (error || !sessions) {
    console.error('Error fetching analytics data:', error);
    return null;
  }

  let practiceSessions = 0;
  let examSessions = 0;
  let practiceScoreSum = 0;
  let examScoreSum = 0;

  const examStatsMap = new Map<string, { sum: number; count: number }>();
  const recentScores: { date: string; percentage: number; isPractice: boolean }[] = [];

  for (const session of sessions) {
    const percentage = session.percentage || 0;
    
    if (session.is_practice) {
      practiceSessions++;
      practiceScoreSum += percentage;
    } else {
      examSessions++;
      examScoreSum += percentage;
    }

    // @ts-expect-error nested typing
    const title = session.exams?.title || 'Unknown Exam';
    const currentStat = examStatsMap.get(title) || { sum: 0, count: 0 };
    examStatsMap.set(title, { sum: currentStat.sum + percentage, count: currentStat.count + 1 });

    if (session.completed_at) {
      recentScores.push({
        date: new Date(session.completed_at).toLocaleDateString(),
        percentage,
        isPractice: session.is_practice || false
      });
    }
  }

  const examPerformance = Array.from(examStatsMap.entries()).map(([title, stats]) => ({
    title,
    averageScore: Math.round(stats.sum / stats.count),
    count: stats.count
  })).sort((a, b) => b.averageScore - a.averageScore);

  return {
    totalSessions: sessions.length,
    practiceSessions,
    examSessions,
    averagePracticeScore: practiceSessions > 0 ? Math.round(practiceScoreSum / practiceSessions) : 0,
    averageExamScore: examSessions > 0 ? Math.round(examScoreSum / examSessions) : 0,
    examPerformance,
    recentScores: recentScores.slice(-10) // Last 10 sessions
  };
}
