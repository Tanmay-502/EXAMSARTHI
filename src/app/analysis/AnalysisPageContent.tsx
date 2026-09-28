'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { VoiceCore } from '@/components/voice/VoiceCore';
import type { AnalyticsData } from './actions';
import { useI18n } from '@/lib/i18n/I18nProvider';

function TrendChart({ points, t, tParams }: { points: AnalyticsData['sessionTrend']; t: (key: string) => string; tParams: (key: string, params: Record<string, string | number>) => string }) {
  if (points.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-400">
        {t('analysis_empty_trend')}
      </div>
    );
  }

  const width = 760;
  const height = 240;
  const padX = 32;
  const padY = 28;
  const usableWidth = width - padX * 2;
  const usableHeight = height - padY * 2;
  const xStep = points.length === 1 ? 0 : usableWidth / (points.length - 1);
  const linePoints = points.map((point, index) => {
    const x = padX + index * xStep;
    const y = padY + usableHeight - (point.percentage / 100) * usableHeight;
    return { ...point, x, y };
  });
  const path = linePoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 md:p-6">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto min-w-[620px] w-full"
        role="img"
        aria-label={tParams('analysis_trend_label', { count: points.length })}
      >
        {[0, 25, 50, 75, 100].map(value => {
          const y = padY + usableHeight - (value / 100) * usableHeight;
          return (
            <g key={value}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#27272a" strokeWidth="1" />
              <text x="4" y={y + 4} fill="#a1a1aa" fontSize="0.6875rem">{value}</text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#f4f4f5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {linePoints.map(point => (
          <g key={point.id}>
            <circle cx={point.x} cy={point.y} r="7" fill="#000" stroke="#f4f4f5" strokeWidth="3" />
            <text x={point.x} y={height - 6} fill="#a1a1aa" fontSize="0.6875rem" textAnchor="middle">{point.label}</text>
          </g>
        ))}
      </svg>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400" aria-hidden="true">
        {points.map(point => (
          <span key={point.id}>
            {point.label}: <span className="text-white">{point.percentage}%</span> {point.isPractice ? t('practice') : t('exam')}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatDuration(seconds: number, minuteLabel: string, minutesLabel: string, secondLabel: string, secondsLabel: string) {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? secondLabel : secondsLabel}`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const minutesPart = `${m} ${m === 1 ? minuteLabel : minutesLabel}`;
  return s > 0 ? `${minutesPart} ${s} ${s === 1 ? secondLabel : secondsLabel}` : minutesPart;
}

export default function AnalysisPageContent({ data }: { data: AnalyticsData }) {
  const { t, tParams } = useI18n();
  const improvementTrendKey = {
    improving: 'trend_improving',
    declining: 'trend_declining',
    stable: 'trend_stable',
    insufficient_data: 'trend_insufficient',
  }[data.overall.improvementTrend];
  return (
    <main id="main-content" className="flex flex-col flex-1 min-h-dvh w-full max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-24 bg-black text-white">
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-900 pb-12"
        >
          <div>
            <p className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-6">{t('performance').toUpperCase()}</p>
            <h1 className="text-[clamp(3rem,6vw,7rem)] leading-[0.9] font-light tracking-tighter mb-6 text-zinc-100" tabIndex={-1}>{t('analysis_page')}</h1>
            <p className="text-2xl md:text-3xl font-light text-zinc-400">{t('analysis_desc')}</p>
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
            <h2 className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-6">{t('overall_accuracy')}</h2>
            <div className="text-6xl md:text-7xl font-light tracking-tighter">{data.overall.avgPercentage}%</div>
            <p className="text-sm text-zinc-400 mt-3">{tParams('across_sessions', { count: data.overall.totalSessions })}</p>
          </div>

          <div className="border-t border-zinc-900 pt-8">
            <h2 className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-6">{t('improvement_trend')}</h2>
            <div className="flex items-center gap-2">
              {data.overall.improvementTrend === 'improving' && <TrendingUp className="text-green-500 w-8 h-8" />}
              {data.overall.improvementTrend === 'declining' && <TrendingDown className="text-red-500 w-8 h-8" />}
              {data.overall.improvementTrend === 'stable' && <Minus className="text-zinc-400 w-8 h-8" />}
              {data.overall.improvementTrend === 'insufficient_data' && <Minus className="text-zinc-400 w-8 h-8" />}
              <div className="text-3xl font-light capitalize">
                {t(improvementTrendKey)}
              </div>
            </div>
            {data.overall.improvementTrend === 'insufficient_data' && (
              <p className="text-sm text-zinc-400 mt-3">{t('analysis_more_sessions')}</p>
            )}
          </div>

          <div className="border-t border-zinc-900 pt-8">
            <h2 className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-6">{t('avg_time_session')}</h2>
            <div className="flex items-center gap-2">
              <Clock className="text-zinc-400 w-8 h-8" />
              <div className="text-4xl font-light tracking-tighter">{formatDuration(data.timeEfficiency.avgDurationSeconds, t('minute'), t('minutes'), t('second'), t('seconds'))}</div>
            </div>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mb-24 border-t border-zinc-900 pt-8"
        >
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tighter">{t('performance_trend')}</h2>
              <p className="mt-3 text-lg font-light text-zinc-400">{t('analysis_trend_desc')}</p>
            </div>
            {data.overall.totalSessions >= 2 && (
              <p className="text-sm uppercase tracking-[0.18em] text-zinc-400">
                {data.sessionTrend[0]?.percentage ?? 0}% → {data.sessionTrend[data.sessionTrend.length - 1]?.percentage ?? 0}%
              </p>
            )}
          </div>
          <TrendChart points={data.sessionTrend} t={t} tParams={tParams} />
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid gap-12 lg:grid-cols-2 mb-24"
        >
          <div className="border-t border-zinc-900 pt-8">
            <h2 className="text-4xl md:text-5xl font-light tracking-tighter mb-4">{t('strong_areas')}</h2>
            <p className="text-zinc-400 text-lg font-light mb-8">{t('strong_areas_desc')}</p>
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
              <p className="text-sm text-zinc-400">{t('no_strong_subjects')}</p>
            )}
          </div>

          <div className="border-t border-zinc-900 pt-8">
            <h2 className="text-4xl md:text-5xl font-light tracking-tighter mb-4">{t('areas_improvement')}</h2>
            <p className="text-zinc-400 text-lg font-light mb-8">{t('weak_areas_desc')}</p>
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
                  <strong>{t('recommendation')}:</strong> {t('practice_more_weak')}
                  <div className="mt-3">
                    <Link href="/practice" className="inline-flex min-h-11 items-center rounded-full bg-white text-black px-6 py-3 uppercase tracking-widest text-xs font-bold hover:bg-zinc-200 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]">{t('start_practice')} →</Link>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">{t('no_weak_subjects')}</p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="border-t border-zinc-900 pt-8"
        >
          <h2 className="text-4xl md:text-5xl font-light tracking-tighter mb-4">{t('subject_breakdown')}</h2>
          <p className="text-zinc-400 text-lg font-light mb-12">{t('subject_breakdown_desc')}</p>
          {data.subjectAccuracy.length > 0 ? (
            <div className="space-y-10">
              {data.subjectAccuracy.map(stat => (
                <div key={stat.subject} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-light text-2xl">{stat.subject}</span>
                    <span className="text-zinc-400">{stat.accuracy}% ({stat.correct}/{stat.total} {t('correct').toLowerCase()})</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden" role="progressbar" aria-valuenow={stat.accuracy} aria-valuemin={0} aria-valuemax={100} aria-label={tParams('accuracy_for', { subject: stat.subject })}>
                    <div 
                      className="h-full bg-[var(--brand-accent)] transition-all"
                      style={{ width: `${stat.accuracy}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs font-medium">
                    <span className="text-green-500">{stat.correct} {t('correct')}</span>
                    <span className="text-red-500">{stat.incorrect} {t('incorrect')}</span>
                    <span className="text-zinc-400">{stat.unanswered} {t('unanswered')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 text-center py-8">{t('analysis_not_enough_data')}</p>
          )}
        </motion.div>

      </div>

      <div className="pt-16 w-full flex flex-wrap gap-4 border-t border-zinc-900 mt-24">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors uppercase tracking-widest text-xs font-bold h-12 px-6"
        >
          {t('return_dashboard')}
        </Link>
        <Link
          href="/history"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-white text-black hover:bg-zinc-200 transition-colors uppercase tracking-widest text-xs font-bold h-12 px-6"
        >
          {t('history')}
        </Link>
      </div>
    </main>
  );
}
