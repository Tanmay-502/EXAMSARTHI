import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function HistoryPage({ searchParams }: { searchParams: { filter?: string } }) {
  const supabase = await createClient();
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
      exams (
        title
      )
    `)
    .eq('candidate_id', user.id)
    .order('completed_at', { ascending: false });

  const filter = searchParams.filter || 'all';
  
  let displayedSessions = sessions || [];
  if (filter === 'exam') {
    displayedSessions = displayedSessions.filter(s => !s.is_practice);
  } else if (filter === 'practice') {
    displayedSessions = displayedSessions.filter(s => s.is_practice);
  }

  const formatDuration = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diffMins = Math.round((e - s) / 60000);
    return `${diffMins} min${diffMins !== 1 ? 's' : ''}`;
  };

  return (
    <main id="main-content" className="flex flex-col flex-1 p-6 items-center justify-start max-w-5xl mx-auto w-full space-y-8">
      <div className="w-full">
        <h1 className="text-4xl font-bold mb-2" tabIndex={-1}>Exam History</h1>
        <p className="text-xl text-muted-foreground mb-8">Review your past attempts</p>

        <div className="flex gap-4 mb-6" role="group" aria-label="Filter history">
          <Link 
            href="/history?filter=all" 
            className={`px-4 py-2 rounded-lg border ${filter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground hover:bg-accent'}`}
            aria-pressed={filter === 'all'}
          >
            All Sessions
          </Link>
          <Link 
            href="/history?filter=exam" 
            className={`px-4 py-2 rounded-lg border ${filter === 'exam' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground hover:bg-accent'}`}
            aria-pressed={filter === 'exam'}
          >
            Exams
          </Link>
          <Link 
            href="/history?filter=practice" 
            className={`px-4 py-2 rounded-lg border ${filter === 'practice' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground hover:bg-accent'}`}
            aria-pressed={filter === 'practice'}
          >
            Practice
          </Link>
        </div>

        {(!displayedSessions || displayedSessions.length === 0) ? (
          <div className="bg-card shadow border rounded-xl p-8 text-center text-muted-foreground">
            <p className="text-lg">No {filter !== 'all' ? filter : ''} sessions found.</p>
          </div>
        ) : (
          <div className="bg-card shadow border rounded-xl overflow-x-auto">
            <table className="w-full border-collapse text-left" aria-label="Exam History">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th scope="col" className="p-4 font-semibold">Date</th>
                  <th scope="col" className="p-4 font-semibold">Type</th>
                  <th scope="col" className="p-4 font-semibold">Exam Title</th>
                  <th scope="col" className="p-4 font-semibold">Duration</th>
                  <th scope="col" className="p-4 font-semibold">Score</th>
                  <th scope="col" className="p-4 font-semibold text-center">Percentage</th>
                  <th scope="col" className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedSessions.map((session) => (
                  <tr key={session.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-md ${session.is_practice ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                        {session.is_practice ? 'Practice' : 'Exam'}
                      </span>
                    </td>
                    <td className="p-4">
                      {/* @ts-expect-error supabase types nested object */}
                      {session.exams?.title || 'Unknown Exam'}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {session.started_at && session.completed_at ? formatDuration(session.started_at, session.completed_at) : '-'}
                    </td>
                    <td className="p-4 font-medium">
                      {session.score !== null ? `${session.score} / ${session.total_questions}` : '-'}
                    </td>
                    <td className="p-4 text-center font-bold text-primary">
                      {session.percentage !== null ? `${session.percentage}%` : '-'}
                    </td>
                    <td className="p-4 text-right">
                      {session.status === 'submitted' && (
                        <Link
                          href={`/results?session_id=${session.id}`}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4"
                          aria-label={`View detailed results for ${session.completed_at}`}
                        >
                          View Results
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pt-4 w-full">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring border border-input bg-background hover:bg-accent h-12 px-6"
        >
          Return to Dashboard
        </Link>
      </div>
    </main>
  );
}
