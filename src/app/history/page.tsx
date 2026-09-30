import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import HistoryVoiceHandler from './HistoryVoiceHandler';
import HistoryPageContent from './HistoryPageContent';
import { isMissingColumnError } from '@/lib/db/schemaCompatibility';

type HistorySession = {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total_questions: number | null;
  percentage: number | null;
  is_practice: boolean | null;
  practice_subject: string | null;
  exams: { title: string } | { title: string }[] | null;
};


export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const supabase = await createClient();
  const requestedFilter = (await searchParams).filter?.toLowerCase();
  const filter: 'all' | 'exam' | 'practice' = requestedFilter === 'exam' || requestedFilter === 'practice' ? requestedFilter : 'all';
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Read legacy sessions too: older production databases may not yet have the
  // practice classification columns. Never guess practice mode for those rows.
  const sessionSelects = [
    `id, status, started_at, completed_at, score, total_questions, percentage, is_practice, practice_subject, exams(title)`,
    `id, status, started_at, completed_at, score, total_questions, percentage, practice_subject, exams(title)`,
    `id, status, started_at, completed_at, score, total_questions, percentage, exams(title)`,
  ];

  let sessions: HistorySession[] = [];
  let sessionsError: { message?: string } | null = null;

  for (const select of sessionSelects) {
    const result = await supabase
      .from('exam_sessions')
      .select(select)
      .eq('candidate_id', user.id)
      .eq('status', 'submitted')
      .order('completed_at', { ascending: false });

    if (!result.error) {
      sessions = (result.data || []) as unknown as HistorySession[];
      sessionsError = null;
      break;
    }

    sessionsError = result.error;
    if (!isMissingColumnError(result.error)) break;
  }

  if (sessionsError) {
    throw new Error(sessionsError.message);
  }

  sessions = sessions.map(session => ({
    ...session,
    is_practice: typeof session.is_practice === 'boolean'
      ? session.is_practice
      : Boolean(session.practice_subject),
    practice_subject: typeof session.practice_subject === 'string' ? session.practice_subject : null,
  }));


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
