import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ResultsAnnouncer } from '@/components/exam/ResultsAnnouncer';
import ResultsPageContent from './ResultsPageContent';

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

  // Fetch the session answers with their questions and correct answers.
  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminClient = await createAdminClient();
  const { data: answersWithQuestions } = await adminClient
    .from('answers')
    .select(`
      selected_option_index,
      questions!inner (
        id,
        subject,
        question_answers (
          correct_answer_index
        )
      )
    `)
    .eq('session_id', sessionId);

  // Compute Subject Breakdown
  const subjectStats: Record<string, { total: number; correct: number; incorrect: number; unanswered: number }> = {};
  let weakestSubject = '';
  let weakestSubjectPerc = 100;

  if (answersWithQuestions) {
    type AnswerWithQuestion = {
      selected_option_index: number | null;
      questions: {
        subject: string | null;
        question_answers: { correct_answer_index: number }[] | { correct_answer_index: number } | null;
      }[] | {
        subject: string | null;
        question_answers: { correct_answer_index: number }[] | { correct_answer_index: number } | null;
      } | null;
    };

    (answersWithQuestions as AnswerWithQuestion[]).forEach(answer => {
      const question = Array.isArray(answer.questions) ? answer.questions[0] : answer.questions;
      if (!question) return;

      const subj = question.subject || 'General';
      if (!subjectStats[subj]) {
        subjectStats[subj] = { total: 0, correct: 0, incorrect: 0, unanswered: 0 };
      }

      subjectStats[subj].total += 1;

      if (answer.selected_option_index === null) {
        subjectStats[subj].unanswered += 1;
      } else {
        let correctIdx = -1;
        if (Array.isArray(question.question_answers) && question.question_answers.length > 0) {
          correctIdx = question.question_answers[0].correct_answer_index;
        } else if (question.question_answers && !Array.isArray(question.question_answers)) {
          correctIdx = question.question_answers.correct_answer_index;
        }

        if (answer.selected_option_index === correctIdx) {
          subjectStats[subj].correct += 1;
        } else {
          subjectStats[subj].incorrect += 1;
        }
      }
    });

    // Find weakest subject
    Object.entries(subjectStats).forEach(([subj, stats]) => {
      if (stats.total > 0) {
        const perc = Math.round((stats.correct / stats.total) * 100);
        if (perc < weakestSubjectPerc) {
          weakestSubjectPerc = perc;
          weakestSubject = subj;
        }
      }
    });
  }

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
