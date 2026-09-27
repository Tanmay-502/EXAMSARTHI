import { redirect } from 'next/navigation';
import Link from 'next/link';
import { fetchAnalyticsData } from './actions';

export const metadata = {
  title: 'Analysis | EXAMSAARTHI',
  description: 'Detailed analysis of your exam and practice performance',
};

export default async function AnalysisPage() {
  const data = await fetchAnalyticsData();

  if (!data) {
    redirect('/auth/login');
  }

  return (
    <main id="main-content" className="flex flex-col flex-1 p-6 items-center justify-start max-w-5xl mx-auto w-full space-y-8">
      <div className="w-full">
        <h1 className="text-4xl font-bold mb-2" tabIndex={-1}>Performance Analysis</h1>
        <p className="text-xl text-muted-foreground mb-8">Deep insights into your learning journey.</p>

        {/* High-Level Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card shadow border rounded-xl p-6 flex flex-col justify-center items-center">
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Total Sessions</h3>
            <p className="text-4xl font-bold text-primary">{data.totalSessions}</p>
          </div>
          <div className="bg-card shadow border rounded-xl p-6 flex flex-col justify-center items-center">
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Practice vs Exam</h3>
            <p className="text-2xl font-bold">{data.practiceSessions} / {data.examSessions}</p>
          </div>
          <div className="bg-card shadow border rounded-xl p-6 flex flex-col justify-center items-center">
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Avg Practice Score</h3>
            <p className="text-4xl font-bold text-blue-500">{data.averagePracticeScore}%</p>
          </div>
          <div className="bg-card shadow border rounded-xl p-6 flex flex-col justify-center items-center">
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Avg Exam Score</h3>
            <p className="text-4xl font-bold text-purple-500">{data.averageExamScore}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
          {/* Performance by Exam Type */}
          <div className="bg-card shadow border rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-6 border-b pb-2">Score by Subject / Exam</h2>
            {data.examPerformance.length === 0 ? (
              <p className="text-muted-foreground">No data available yet.</p>
            ) : (
              <div className="space-y-6">
                {data.examPerformance.map((perf, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <span className="font-medium text-lg">{perf.title}</span>
                      <span className="text-muted-foreground text-sm">{perf.averageScore}% avg ({perf.count} attempts)</span>
                    </div>
                    <div className="h-4 w-full bg-secondary rounded-full overflow-hidden" role="progressbar" aria-valuenow={perf.averageScore} aria-valuemin={0} aria-valuemax={100} aria-label={`Average score for ${perf.title}`}>
                      <div 
                        className="h-full bg-primary transition-all" 
                        style={{ width: `${perf.averageScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Trend */}
          <div className="bg-card shadow border rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-6 border-b pb-2">Recent Trend</h2>
            {data.recentScores.length === 0 ? (
              <p className="text-muted-foreground">No recent sessions found.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {data.recentScores.map((score, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${score.isPractice ? 'bg-blue-500' : 'bg-purple-500'}`} aria-label={score.isPractice ? 'Practice' : 'Exam'} />
                      <span className="font-medium">{score.date}</span>
                    </div>
                    <span className="font-bold text-lg">{score.percentage}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="pt-4 w-full flex gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring border border-input bg-background hover:bg-accent h-12 px-6"
        >
          Return to Dashboard
        </Link>
        <Link
          href="/history"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6"
        >
          View Full History
        </Link>
      </div>
    </main>
  );
}
