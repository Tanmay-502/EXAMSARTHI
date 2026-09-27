'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { buildSubjectStats } from '@/lib/analytics/subjectStats'

export type DashboardStats = {
  totalExams: number;
  totalPractice: number;
  avgPercentage: number;
  totalQuestionsAttempted: number;
  strongSubjects: string[];
  weakSubjects: string[];
  recentSessions: {
    id: string;
    title: string | null;
    date: string;
    score: number;
    percentage: number;
    is_practice: boolean;
  }[];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

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
  
  const sumPercentage = completedSessions.reduce((acc, s) => acc + (s.percentage || 0), 0);
  const avgPercentage = completedSessions.length > 0 ? Math.round(sumPercentage / completedSessions.length) : 0;

  const recentSessions = completedSessions.slice(0, 5).map(s => ({
    id: s.id,
    title: Array.isArray(s.exams) ? (s.exams[0]?.title || 'Unknown Exam') : ((s.exams as { title: string } | null)?.title || 'Unknown Exam'),
    date: new Date(s.started_at).toLocaleDateString(),
    score: s.score || 0,
    percentage: s.percentage || 0,
    is_practice: !!s.is_practice
  }));

  const adminClient = await createAdminClient();

  const strongSubjects: string[] = [];
  const weakSubjects: string[] = [];

  if (completedSessions.length > 0) {
    const subjectStats = await buildSubjectStats(adminClient, completedSessions);
    Object.values(subjectStats).forEach((stats) => {
      if (stats.total < 2) return;
      if (stats.accuracy >= 70) strongSubjects.push(stats.subject);
      if (stats.accuracy < 50) weakSubjects.push(stats.subject);
    });
  }

  return {
    totalExams,
    totalPractice,
    avgPercentage,
    totalQuestionsAttempted,
    strongSubjects,
    weakSubjects,
    recentSessions
  };
}
