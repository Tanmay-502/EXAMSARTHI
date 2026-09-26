import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function HistoryPage() {
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
      exams (
        title
      )
    `)
    .eq('candidate_id', user.id)
    .order('completed_at', { ascending: false });

  return (
    <main id="main-content" className="flex flex-col flex-1 p-6 items-center justify-start max-w-5xl mx-auto w-full space-y-8">
      <div className="w-full">
        <h1 className="text-4xl font-bold mb-2" tabIndex={-1}>Exam History</h1>
        <p className="text-xl text-muted-foreground mb-8">Review your past attempts</p>

        {(!sessions || sessions.length === 0) ? (
          <div className="bg-card shadow border rounded-xl p-8 text-center text-muted-foreground">
            <p className="text-lg">No exams completed yet.</p>
          </div>
        ) : (
          <div className="bg-card shadow border rounded-xl overflow-x-auto">
            <table className="w-full border-collapse text-left" aria-label="Exam History">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th scope="col" className="p-4 font-semibold">Date</th>
                  <th scope="col" className="p-4 font-semibold">Exam Title</th>
                  <th scope="col" className="p-4 font-semibold">Score</th>
                  <th scope="col" className="p-4 font-semibold text-center">Percentage</th>
                  <th scope="col" className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4">
                      {/* @ts-expect-error supabase types nested object */}
                      {session.exams?.title || 'Unknown Exam'}
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
