'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

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
    title: (s.exams as { title: string } | null)?.title || 'Unknown Exam',
    date: new Date(s.started_at).toLocaleDateString(),
    score: s.score || 0,
    percentage: s.percentage || 0,
    is_practice: !!s.is_practice
  }));

  const adminClient = await createAdminClient();
  
  const strongSubjects: string[] = [];
  const weakSubjects: string[] = [];

  if (completedSessions.length > 0) {
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
      const subjectStats: Record<string, { correct: number, total: number }> = {};
      
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
        const isCorrect = ans.selected_option_index !== null && ans.selected_option_index === correctIndex;
        
        if (!subjectStats[subject]) {
          subjectStats[subject] = { correct: 0, total: 0 };
        }
        subjectStats[subject].total += 1;
        if (isCorrect) subjectStats[subject].correct += 1;
      });

      Object.entries(subjectStats).forEach(([subject, stats]) => {
        if (stats.total < 2) return; 
        const accuracy = (stats.correct / stats.total) * 100;
        if (accuracy >= 70) strongSubjects.push(subject);
        if (accuracy <= 50) weakSubjects.push(subject);
      });
    }
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
