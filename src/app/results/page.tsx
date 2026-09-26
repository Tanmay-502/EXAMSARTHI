import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ResultsAnnouncer } from '@/components/exam/ResultsAnnouncer';

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
    
    redirect(`/results?session_id=${latestSession.id}`);
  }

  const { data: session } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('candidate_id', user.id)
    .single();

  if (!session) {
    redirect('/dashboard');
  }

  const { score, total_questions, attempted_questions, correct_questions, incorrect_questions, unanswered_questions, percentage } = session;

  // 1. Fetch the user's answers for this session
  const { data: userAnswers } = await supabase
    .from('answers')
    .select('question_id, selected_option_index')
    .eq('session_id', sessionId);

  // 2. Fetch the questions and correct answers using admin client
  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminClient = await createAdminClient();
  const { data: questionsWithAnswers } = await adminClient
    .from('questions')
    .select('id, subject, question_answers(correct_answer_index)')
    .eq('exam_id', session.exam_id);

  // 3. Compute Subject Breakdown
  const subjectStats: Record<string, { total: number; correct: number; incorrect: number; unanswered: number }> = {};
  let weakestSubject = '';
  let weakestSubjectPerc = 100;
  
  if (questionsWithAnswers && userAnswers) {
    type QuestionWithAnswer = {
      id: string;
      subject: string;
      question_answers: { correct_answer_index: number }[] | { correct_answer_index: number } | null;
    };
    
    (questionsWithAnswers as QuestionWithAnswer[]).forEach(q => {
      const subj = q.subject || 'General';
      if (!subjectStats[subj]) {
        subjectStats[subj] = { total: 0, correct: 0, incorrect: 0, unanswered: 0 };
      }
      
      subjectStats[subj].total += 1;
      
      const userAns = userAnswers.find(a => a.question_id === q.id);
      
      if (!userAns || userAns.selected_option_index === null) {
        subjectStats[subj].unanswered += 1;
      } else {
        let correctIdx = -1;
        if (Array.isArray(q.question_answers) && q.question_answers.length > 0) {
          correctIdx = q.question_answers[0].correct_answer_index;
        } else if (q.question_answers && !Array.isArray(q.question_answers)) {
          correctIdx = q.question_answers.correct_answer_index;
        }
        
        if (userAns.selected_option_index === correctIdx) {
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
    <main id="main-content" className="flex flex-col flex-1 p-6 items-center justify-center">
      <ResultsAnnouncer 
        score={score || 0}
        total={total_questions || 0}
        percentage={percentage || 0}
        correct={correct_questions || 0}
        incorrect={incorrect_questions || 0}
        unanswered={unanswered_questions || 0}
        subjectStats={subjectStats}
      />
      
      <div className="w-full max-w-4xl bg-card text-card-foreground shadow border rounded-xl p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Exam Results</h1>
          <p className="text-xl text-muted-foreground">Your performance summary</p>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-primary/10 border border-primary p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-primary">{percentage}%</div>
            <div className="text-sm uppercase font-semibold">Score</div>
          </div>
          <div className="bg-muted p-4 rounded-lg text-center border">
            <div className="text-3xl font-bold text-green-600">{correct_questions}</div>
            <div className="text-sm uppercase font-semibold">Correct</div>
          </div>
          <div className="bg-muted p-4 rounded-lg text-center border">
            <div className="text-3xl font-bold text-destructive">{incorrect_questions}</div>
            <div className="text-sm uppercase font-semibold">Incorrect</div>
          </div>
          <div className="bg-muted p-4 rounded-lg text-center border">
            <div className="text-3xl font-bold text-muted-foreground">{unanswered_questions}</div>
            <div className="text-sm uppercase font-semibold">Skipped</div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="overflow-x-auto pt-4">
          <table className="w-full border-collapse text-left" aria-label="Detailed results">
            <thead>
              <tr className="border-b bg-muted/50">
                <th scope="col" className="p-4 font-semibold">Total Questions</th>
                <th scope="col" className="p-4 font-semibold">Attempted</th>
                <th scope="col" className="p-4 font-semibold">Unanswered</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4 text-lg">{total_questions}</td>
                <td className="p-4 text-lg">{attempted_questions}</td>
                <td className="p-4 text-lg">{unanswered_questions}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Subject Breakdown */}
        {Object.keys(subjectStats).length > 0 && (
          <div className="pt-8">
            <h2 className="text-2xl font-bold mb-4">Subject Analysis</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left" aria-label="Subject performance">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th scope="col" className="p-4 font-semibold">Subject</th>
                    <th scope="col" className="p-4 font-semibold text-center">Total</th>
                    <th scope="col" className="p-4 font-semibold text-center text-green-600">Correct</th>
                    <th scope="col" className="p-4 font-semibold text-center text-destructive">Incorrect</th>
                    <th scope="col" className="p-4 font-semibold text-center text-muted-foreground">Unanswered</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(subjectStats).map(([subj, stats]) => (
                    <tr key={subj} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-medium">{subj}</td>
                      <td className="p-4 text-center">{stats.total}</td>
                      <td className="p-4 text-center text-green-600 font-medium">{stats.correct}</td>
                      <td className="p-4 text-center text-destructive font-medium">{stats.incorrect}</td>
                      <td className="p-4 text-center text-muted-foreground">{stats.unanswered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-center pt-8 gap-4">
          {weakestSubject && (
            <Link
              href={`/practice?subject=${encodeURIComponent(weakestSubject)}`}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring bg-secondary text-secondary-foreground shadow hover:bg-secondary/90 h-14 px-8 w-full md:w-auto"
            >
              Practice {weakestSubject}
            </Link>
          )}
          <Link
            href="/history"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring border border-input bg-background hover:bg-accent h-14 px-8 w-full md:w-auto"
          >
            View History
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-14 px-8 w-full md:w-auto"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
