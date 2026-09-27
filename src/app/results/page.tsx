import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ResultsAnnouncer } from '@/components/exam/ResultsAnnouncer';
import ResultsPageContent from './ResultsPageContent';
import { buildSubjectStats } from '@/lib/analytics/subjectStats';

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const resolvedSearchParams = await searchParams;
  const sessionId = resolvedSearchParams.session_id;

  if (!sessionId) {
    // If no specific session, fetch the latest completed session for this user
    const { data: latestSession } = await supabase
      .from('exam_sessions')
      .select('id')
      .eq('candidate_id', user.id)
      .eq('status', 'submitted')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (!latestSession) {
      redirect('/dashboard');
    }

    redirect('/results?session_id=' + latestSession.id);
  }

  const { data: session } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('candidate_id', user.id)
    .eq('status', 'submitted')
    .single();

  if (!session) {
    redirect('/dashboard');
  }

  const { score, total_questions, attempted_questions, correct_questions, incorrect_questions, unanswered_questions, percentage } = session;

  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminClient = await createAdminClient();
  const subjectStats = await buildSubjectStats(adminClient, [session]);

  let weakestSubject = '';
  let weakestSubjectPerc = 101;
  Object.values(subjectStats).forEach((stats) => {
    if (stats.total > 0 && stats.accuracy < weakestSubjectPerc) {
      weakestSubjectPerc = stats.accuracy;
      weakestSubject = stats.subject;
    }
  });


  return (
    <>
      <ResultsAnnouncer
        score={score || 0}
        total={total_questions || 0}
        percentage={percentage || 0}
        correct={correct_questions || 0}
        incorrect={incorrect_questions || 0}
        unanswered={unanswered_questions || 0}
        subjectStats={subjectStats}
      />
      <ResultsPageContent
        total_questions={total_questions || 0}
        attempted_questions={attempted_questions || 0}
        correct_questions={correct_questions || 0}
        incorrect_questions={incorrect_questions || 0}
        unanswered_questions={unanswered_questions || 0}
        percentage={percentage || 0}
        subjectStats={subjectStats}
        weakestSubject={weakestSubject}
      />
    </>
  );
}
