import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ResultsAnnouncer } from '@/components/exam/ResultsAnnouncer';
import { 
  Trophy, 
  Target, 
  AlertCircle, 
  HelpCircle, 
  ArrowRight,
  BarChart3,
  BookOpen,
  History,
  Home
} from 'lucide-react';
import { ScoreVisualizer } from '@/components/exam/ScoreVisualizer';

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

  const isPassing = (percentage || 0) >= 50;

  return (
    <main id="main-content" className="flex flex-col flex-1 p-6 md:p-12 items-center justify-center min-h-screen relative overflow-hidden bg-background">
      
      {/* Decorative Blur Backgrounds */}
      <div className={`absolute top-0 right-0 w-[50%] h-[50%] rounded-full opacity-20 blur-[150px] pointer-events-none ${isPassing ? 'bg-primary' : 'bg-amber-500'}`} />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[120px] pointer-events-none" />
      
      <ResultsAnnouncer 
        score={score || 0}
        total={total_questions || 0}
        percentage={percentage || 0}
        correct={correct_questions || 0}
        incorrect={incorrect_questions || 0}
        unanswered={unanswered_questions || 0}
        subjectStats={subjectStats}
      />
      
      <div className="w-full max-w-5xl z-10 space-y-12">
        
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-card rounded-2xl border-2 shadow-sm mb-4">
            <Trophy className={`w-12 h-12 ${isPassing ? 'text-primary' : 'text-amber-500'}`} />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">Exam Complete</h1>
          <p className="text-xl text-muted-foreground font-medium">Your performance summary and analytics</p>
        </header>

        {/* Primary Score Card */}
        <div className="bg-card border-2 shadow-xl shadow-black/5 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1 text-center md:text-left space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Overall Score</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              You answered <span className="text-foreground font-bold">{attempted_questions}</span> out of {total_questions} questions. 
              {isPassing ? ' Great job!' : ' Keep practicing to improve your score.'}
            </p>
          </div>
          
          <ScoreVisualizer percentage={percentage || 0} isPassing={isPassing} />
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border-2 p-6 rounded-2xl flex items-center space-x-6 group hover:border-primary/50 transition-colors">
            <div className="p-4 bg-green-500/10 rounded-xl text-green-600">
              <Target className="w-8 h-8" />
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground">{correct_questions}</div>
              <div className="text-sm font-semibold uppercase text-muted-foreground tracking-wider mt-1">Correct</div>
            </div>
          </div>

          <div className="bg-card border-2 p-6 rounded-2xl flex items-center space-x-6 group hover:border-destructive/50 transition-colors">
            <div className="p-4 bg-destructive/10 rounded-xl text-destructive">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground">{incorrect_questions}</div>
              <div className="text-sm font-semibold uppercase text-muted-foreground tracking-wider mt-1">Incorrect</div>
            </div>
          </div>

          <div className="bg-card border-2 p-6 rounded-2xl flex items-center space-x-6 group hover:border-muted-foreground/50 transition-colors">
            <div className="p-4 bg-muted rounded-xl text-muted-foreground">
              <HelpCircle className="w-8 h-8" />
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground">{unanswered_questions}</div>
              <div className="text-sm font-semibold uppercase text-muted-foreground tracking-wider mt-1">Skipped</div>
            </div>
          </div>
        </div>

        {/* Subject Breakdown */}
        {Object.keys(subjectStats).length > 0 && (
          <div className="bg-card border-2 rounded-3xl p-8 md:p-10 space-y-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-secondary/20 rounded-xl">
                <BarChart3 className="w-6 h-6 text-foreground" />
              </div>
              <h2 className="text-2xl font-bold">Subject Analysis</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(subjectStats).map(([subj, stats]) => {
                const subjPerc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                return (
                  <div key={subj} className="p-6 rounded-2xl border bg-card/50 hover:bg-card transition-colors">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold">{subj}</h3>
                      <span className="text-2xl font-extrabold text-primary">{subjPerc}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 mb-6 overflow-hidden">
                      <div 
                        className="bg-primary h-3 rounded-full transition-all duration-1000"
                        style={{ width: `${subjPerc}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold text-green-600">{stats.correct}</div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase mt-1">Correct</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-destructive">{stats.incorrect}</div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase mt-1">Incorrect</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-muted-foreground">{stats.unanswered}</div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase mt-1">Skipped</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center items-stretch gap-4 pt-4">
          {weakestSubject && (
            <Link
              href={`/practice?subject=${encodeURIComponent(weakestSubject)}`}
              className="group inline-flex items-center justify-center px-8 py-5 rounded-2xl text-lg font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
            >
              <BookOpen className="mr-3 w-5 h-5" />
              Practice {weakestSubject}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
          <Link
            href="/history"
            className="inline-flex items-center justify-center px-8 py-5 rounded-2xl text-lg font-bold border-2 border-input bg-card hover:bg-accent transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
          >
            <History className="mr-3 w-5 h-5" />
            View History
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-5 rounded-2xl text-lg font-bold border-2 border-input bg-card hover:bg-accent transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
          >
            <Home className="mr-3 w-5 h-5" />
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
