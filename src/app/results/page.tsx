import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ResultsAnnouncer } from '@/components/exam/ResultsAnnouncer';
import ResultsPageContent from './ResultsPageContent';

type ServerResultQuestion = {
  id: string;
  subject: string | null;
  question_answers: { correct_answer_index: number } | { correct_answer_index: number }[] | null;
};

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

  // Build the breakdown from the full question roster plus the session answers.
  // This keeps unanswered questions in the subject denominator instead of silently
  // dropping them because they have no row in answers.
  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminClient = await createAdminClient();

  let questionQuery = adminClient
    .from('questions')
    .select(`
      id,
      subject,
      question_answers (
        correct_answer_index
      )
    `);

  let rosterIds = Array.isArray(session.question_ids)
    ? session.question_ids.filter((id: unknown): id is string => typeof id === 'string')
    : [];

  if (rosterIds.length === 0) {
    // Legacy practice/exam sessions created before question-roster persistence.
    const { data: legacyAnswers } = await adminClient
      .from('answers')
      .select('question_id')
      .eq('session_id', sessionId);

    rosterIds = [...new Set(
      (legacyAnswers || [])
        .map(answer => answer.question_id)
        .filter((id): id is string => typeof id === 'string')
    )];
  }

  if (rosterIds.length > 0) {
    questionQuery = questionQuery.in('id', rosterIds);
  } else if (session.is_practice) {
    questionQuery = questionQuery.in('id', ['00000000-0000-0000-0000-000000000000']);
  } else {
    // Legacy exam fallback.
    questionQuery = questionQuery.eq('exam_id', session.exam_id);
  }

  const [{ data: sessionQuestions }, { data: sessionAnswers }] = await Promise.all([
    questionQuery,
    adminClient
      .from('answers')
      .select('question_id, selected_option_index')
      .eq('session_id', sessionId),
  ]);

  const typedSessionQuestions = (sessionQuestions || []) as ServerResultQuestion[];

  const answerByQuestion = new Map(
    (sessionAnswers || []).map(answer => [answer.question_id, answer.selected_option_index])
  );

  const subjectStats: Record<string, { total: number; correct: number; incorrect: number; unanswered: number }> = {};
  let weakestSubject = '';
  let weakestSubjectPerc = Number.POSITIVE_INFINITY;

  for (const question of typedSessionQuestions) {
    const subject = question.subject || 'General';
    const answer = answerByQuestion.get(question.id) ?? null;
    const questionAnswers = question.question_answers;
    const correctIndex = questionAnswers === null
      ? null
      : Array.isArray(questionAnswers)
        ? questionAnswers[0]?.correct_answer_index ?? null
        : questionAnswers.correct_answer_index;

    const stats = subjectStats[subject] || { total: 0, correct: 0, incorrect: 0, unanswered: 0 };
    stats.total += 1;

    if (answer === null) {
      stats.unanswered += 1;
    } else if (answer === correctIndex) {
      stats.correct += 1;
    } else {
      stats.incorrect += 1;
    }

    subjectStats[subject] = stats;
  }

  Object.entries(subjectStats).forEach(([subject, stats]) => {
    if (stats.total === 0) return;
    const percentageForSubject = Math.round((stats.correct / stats.total) * 100);
    if (percentageForSubject < weakestSubjectPerc) {
      weakestSubjectPerc = percentageForSubject;
      weakestSubject = subject;
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
