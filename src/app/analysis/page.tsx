import { redirect } from 'next/navigation';
import Link from 'next/link';
import { fetchAnalyticsData } from './actions';
import { TrendingUp, TrendingDown, Minus, Clock, AlertCircle, CheckCircle } from 'lucide-react';

export const metadata = {
  title: 'Analysis - ExamSaarthi',
  description: 'Detailed analysis of your exam and practice performance',
};

export default async function AnalysisPage() {
  const data = await fetchAnalyticsData();

  if (!data) {
    redirect('/auth/login');
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <main id="main-content" className="flex flex-col flex-1 p-6 items-center justify-start max-w-5xl mx-auto w-full space-y-8">
      <div className="w-full">
        <h1 className="text-4xl font-bold tracking-tight mb-2" tabIndex={-1}>Performance Analysis</h1>
        <p className="text-xl text-muted-foreground mb-8">Detailed insights across all your practice and exam sessions.</p>

        {/* High-Level Stats */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="bg-card shadow border rounded-xl flex flex-col justify-center items-center p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Overall Accuracy</h3>
            <div className="text-3xl font-bold">{data.overall.avgPercentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">Across {data.overall.totalSessions} sessions</p>
          </div>

          <div className="bg-card shadow border rounded-xl flex flex-col justify-center items-center p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Improvement Trend</h3>
            <div className="flex items-center gap-2">
              {data.overall.improvementTrend === 'improving' && <TrendingUp className="text-green-500 w-8 h-8" />}
              {data.overall.improvementTrend === 'declining' && <TrendingDown className="text-destructive w-8 h-8" />}
              {data.overall.improvementTrend === 'stable' && <Minus className="text-muted-foreground w-8 h-8" />}
              {data.overall.improvementTrend === 'insufficient_data' && <Minus className="text-muted-foreground w-8 h-8" />}
              <div className="text-2xl font-bold capitalize">
                {data.overall.improvementTrend.replace('_', ' ')}
              </div>
            </div>
            {data.overall.improvementTrend === 'insufficient_data' && (
              <p className="text-xs text-muted-foreground mt-1">Take more exams to see trends</p>
            )}
          </div>

          <div className="bg-card shadow border rounded-xl flex flex-col justify-center items-center p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Avg Time per Session</h3>
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground w-8 h-8" />
              <div className="text-3xl font-bold">{formatDuration(data.timeEfficiency.avgDurationSeconds)}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="bg-card shadow border rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-2">Strong Areas</h2>
            <p className="text-muted-foreground mb-6">Subjects where you score above 70%</p>
            {data.strongSubjects.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.strongSubjects.map(subject => (
                  <span key={subject} className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-green-500/20 text-green-500 hover:bg-green-500/30 text-sm">
                    <CheckCircle className="w-4 h-4 mr-1.5 inline-block" />
                    {subject}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No strong subjects identified yet.</p>
            )}
          </div>

          <div className="bg-card shadow border rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-2">Areas for Improvement</h2>
            <p className="text-muted-foreground mb-6">Subjects where you score below 50%</p>
            {data.weakSubjects.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {data.weakSubjects.map(subject => (
                    <span key={subject} className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1.5 inline-block" />
                      {subject}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground pt-2">
                  <strong>Recommendation:</strong> You should practice more questions in these subjects.
                  <div className="mt-3">
                    <Link href="/practice" className="text-primary hover:underline font-medium">Start Practice Session &rarr;</Link>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No weak subjects identified yet. Keep it up!</p>
            )}
          </div>
        </div>

        <div className="bg-card shadow border rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-2">Subject-wise Breakdown</h2>
          <p className="text-muted-foreground mb-6">Detailed accuracy across all subjects</p>
          {data.subjectAccuracy.length > 0 ? (
            <div className="space-y-6">
              {data.subjectAccuracy.map(stat => (
                <div key={stat.subject} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-lg">{stat.subject}</span>
                    <span className="text-muted-foreground">{stat.accuracy}% ({stat.correct}/{stat.total} correct)</span>
                  </div>
                  <div className="h-3 w-full bg-secondary rounded-full overflow-hidden" role="progressbar" aria-valuenow={stat.accuracy} aria-valuemin={0} aria-valuemax={100} aria-label={`Accuracy for ${stat.subject}`}>
                    <div 
                      className="h-full bg-primary transition-all" 
                      style={{ width: `${stat.accuracy}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs font-medium">
                    <span className="text-green-500">{stat.correct} Correct</span>
                    <span className="text-destructive">{stat.incorrect} Incorrect</span>
                    <span className="text-muted-foreground">{stat.unanswered} Unanswered</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Not enough data to show subject breakdown.</p>
          )}
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
