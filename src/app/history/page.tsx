import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import HistoryVoiceHandler from './HistoryVoiceHandler';
import HistoryPageContent from './HistoryPageContent';

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const supabase = await createClient();
  const { filter = 'all' } = await searchParams;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch all completed exam sessions for this user
  const { data: sessions } = await supabase
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
      practice_subject,
      exams (
        title
      )
    `)
    .eq('candidate_id', user.id)
    .order('completed_at', { ascending: false });

  let displayedSessions = sessions || [];
  if (filter === 'exam') {
    displayedSessions = displayedSessions.filter(s => !s.is_practice);
  } else if (filter === 'practice') {
    displayedSessions = displayedSessions.filter(s => s.is_practice);
  }

  return (
    <>
      <HistoryVoiceHandler totalSessions={displayedSessions.length} />
      <HistoryPageContent filter={filter} displayedSessions={displayedSessions} />
    </>
  );
}
