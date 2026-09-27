'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { VoiceCore } from '@/components/voice/VoiceCore';
import type { AnalyticsData } from './actions';

function formatDuration(seconds: number) {
  if (seconds < 60) return seconds + 's';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + 'm ' + s + 's';
}

export default function AnalysisPageContent({ data }: { data: AnalyticsData }) {
  return (
    <main id="main-content" className="flex flex-col flex-1 min-h-screen w-full max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-24 bg-black text-white">
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-900 pb-12"
        >
          <div>
            <p className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-6">PERFORMANCE</p>
            <h1 className="text-[clamp(3rem,6vw,7rem)] leading-[0.9] font-light tracking-tighter mb-6 text-zinc-100" tabIndex={-1}>Analysis.</h1>
            <p className="text-2xl md:text-3xl font-light text-zinc-400">Detailed insights across all your practice and exam sessions.</p>
          </div>
          <VoiceCore size="sm" />
        </motion.div>

        {/* High-Level Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid gap-12 lg:grid-cols-3 mb-24"
        >
          <div className="border-t border-zinc-900 pt-8">
            <h3 className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-6">Overall Accuracy</h3>
            <div className="text-6xl md:text-7xl font-light tracking-tighter">{data.overall.avgPercentage}%</div>
            <p className="text-sm text-zinc-400 mt-3">Across {data.overall.totalSessions} sessions</p>
          </div>

          <div className="border-t border-zinc-900 pt-8">
            <h3 className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-6">Improvement Trend</h3>
            <div className="flex items-center gap-2">
              {data.overall.improvementTrend === 'improving' && <TrendingUp className="text-green-500 w-8 h-8" />}
              {data.overall.improvementTrend === 'declining' && <TrendingDown className="text-red-500 w-8 h-8" />}
              {data.overall.improvementTrend === 'stable' && <Minus className="text-zinc-400 w-8 h-8" />}
              {data.overall.improvementTrend === 'insufficient_data' && <Minus className="text-zinc-400 w-8 h-8" />}
              <div className="text-3xl font-light capitalize">
                {data.overall.improvementTrend.replace('_', ' ')}
              </div>
            </div>
            {data.overall.improvementTrend === 'insufficient_data' && (
              <p className="text-sm text-zinc-400 mt-3">Take more exams to see trends</p>
            )}
          </div>

          <div className="border-t border-zinc-900 pt-8">
            <h3 className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-6">Avg Time per Session</h3>
            <div className="flex items-center gap-2">
              <Clock className="text-zinc-400 w-8 h-8" />
              <div className="text-4xl font-light tracking-tighter">{formatDuration(data.timeEfficiency.avgDurationSeconds)}</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid gap-12 lg:grid-cols-2 mb-24"
        >
          <div className="border-t border-zinc-900 pt-8">
            <h2 className="text-4xl md:text-5xl font-light tracking-tighter mb-4">Strong Areas</h2>
            <p className="text-zinc-400 text-lg font-light mb-8">Subjects where you score above 70%</p>
            {data.strongSubjects.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.strongSubjects.map(subject => (
                  <span key={subject} className="inline-flex items-center rounded-full border border-green-900/50 px-4 py-2 text-green-400 text-sm uppercase tracking-widest font-bold">
                    <CheckCircle className="w-4 h-4 mr-1.5 inline-block" />
                    {subject}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No strong subjects identified yet.</p>
            )}
          </div>

          <div className="border-t border-zinc-900 pt-8">
            <h2 className="text-4xl md:text-5xl font-light tracking-tighter mb-4">Areas for Improvement</h2>
            <p className="text-zinc-400 text-lg font-light mb-8">Subjects where you score below 50%</p>
            {data.weakSubjects.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {data.weakSubjects.map(subject => (
                    <span key={subject} className="inline-flex items-center rounded-full border border-red-900/50 px-4 py-2 text-red-400 text-sm uppercase tracking-widest font-bold">
                      <AlertCircle className="w-4 h-4 mr-1.5 inline-block" />
                      {subject}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-zinc-400 pt-2">
                  <strong>Recommendation:</strong> You should practice more questions in these subjects.
                  <div className="mt-3">
                    <Link href="/practice" className="inline-flex items-center rounded-full bg-white text-black px-6 py-3 uppercase tracking-widest text-xs font-bold hover:bg-zinc-200 transition-colors">Start Practice Session &rarr;</Link>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No weak subjects identified yet. Keep it up!</p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="border-t border-zinc-900 pt-8"
        >
          <h2 className="text-4xl md:text-5xl font-light tracking-tighter mb-4">Subject-wise Breakdown</h2>
          <p className="text-zinc-400 text-lg font-light mb-12">Detailed accuracy across all subjects</p>
          {data.subjectAccuracy.length > 0 ? (
            <div className="space-y-10">
              {data.subjectAccuracy.map(stat => (
                <div key={stat.subject} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-light text-2xl">{stat.subject}</span>
                    <span className="text-zinc-400">{stat.accuracy}% ({stat.correct}/{stat.total} correct)</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden" role="progressbar" aria-valuenow={stat.accuracy} aria-valuemin={0} aria-valuemax={100} aria-label={`Accuracy for ${stat.subject}`}>
                    <div 
                      className="h-full bg-white transition-all"
                      style={{ width: `${stat.accuracy}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs font-medium">
                    <span className="text-green-500">{stat.correct} Correct</span>
                    <span className="text-red-500">{stat.incorrect} Incorrect</span>
                    <span className="text-zinc-400">{stat.unanswered} Unanswered</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 text-center py-8">Not enough data to show subject breakdown.</p>
          )}
        </motion.div>

      </div>

      <div className="pt-16 w-full flex flex-wrap gap-4 border-t border-zinc-900 mt-24">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors uppercase tracking-widest text-xs font-bold h-12 px-6"
        >
          Return to Dashboard
        </Link>
        <Link
          href="/history"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-white text-black hover:bg-zinc-200 transition-colors uppercase tracking-widest text-xs font-bold h-12 px-6"
        >
          View Full History
        </Link>
      </div>
    </main>
  );
}
