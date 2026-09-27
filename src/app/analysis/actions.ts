'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { buildSubjectStats } from '@/lib/analytics/subjectStats'

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

  const adminClient = await createAdminClient();
  const subjectStats = await buildSubjectStats(adminClient, completedSessions);
  const subjectStatsMap: Record<string, SubjectStats> = Object.fromEntries(
    Object.entries(subjectStats).map(([subject, stats]) => [subject, { ...stats }])
  );

  const strongSubjects: string[] = [];
  const weakSubjects: string[] = [];

  Object.values(subjectStatsMap).forEach(stats => {
    if (stats.total >= 2) {
      if (stats.accuracy >= 70) strongSubjects.push(stats.subject);
      if (stats.accuracy < 50) weakSubjects.push(stats.subject);
    }
  });

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
