'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { VoiceCore } from '@/components/voice/VoiceCore';
import { useI18n } from '@/lib/i18n/I18nProvider';

type HistorySession = {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total_questions: number | null;
  percentage: number | null;
  is_practice: boolean | null;
  practice_subject: string | null;
  exams: { title: string } | { title: string }[] | null;
};

function formatDuration(start: string, end: string, minuteLabel: string, minutesLabel: string) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const diffMins = Math.round((e - s) / 60000);
  return `${diffMins} ${diffMins === 1 ? minuteLabel : minutesLabel}`;
}

export default function HistoryPageContent({ filter, displayedSessions }: { filter: string; displayedSessions: HistorySession[] }) {
  const { lang, t, tParams } = useI18n();
  return (
    <main id="main-content" className="flex flex-col flex-1 min-h-dvh w-full max-w-7xl mx-auto pt-32 pb-24 px-6 md:px-12 bg-black text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full"
      >
        <div className="mb-24 flex items-end justify-between gap-8 border-b border-zinc-900 pb-8">
          <div>
            <h1 className="text-[clamp(3rem,6vw,7rem)] leading-[0.9] font-light tracking-tighter mb-4 text-zinc-100" tabIndex={-1}>{t('exam')} {t('history')}</h1>
            <p className="text-2xl md:text-4xl font-light text-zinc-400">{t('review_past_attempts')}</p>
          </div>
          <VoiceCore size="sm" />
        </div>

        <div className="flex flex-wrap gap-4 mb-16" role="group" aria-label={t("filter_history")}>
          <Link 
            href="/history?filter=all" 
            className={`px-6 py-3 rounded-full border uppercase tracking-widest text-xs font-bold transition-colors ${filter === 'all' ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white'}`}
            aria-current={filter === 'all' ? 'page' : undefined}
          >
            {t('filter_all')}
          </Link>
          <Link 
            href="/history?filter=exam" 
            className={`px-6 py-3 rounded-full border uppercase tracking-widest text-xs font-bold transition-colors ${filter === 'exam' ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white'}`}
            aria-current={filter === 'exam' ? 'page' : undefined}
          >
            {t('filter_exam')}
          </Link>
          <Link 
            href="/history?filter=practice" 
            className={`px-6 py-3 rounded-full border uppercase tracking-widest text-xs font-bold transition-colors ${filter === 'practice' ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white'}`}
            aria-current={filter === 'practice' ? 'page' : undefined}
          >
            {t('filter_practice')}
          </Link>
        </div>

        {(!displayedSessions || displayedSessions.length === 0) ? (
          <div className="border border-zinc-900 p-12 text-center text-zinc-400">
            <p className="text-xl font-light">{t('history_empty')}</p>
          </div>
        ) : (
          <div className="border-t border-zinc-900 overflow-x-auto">
            <table className="w-full border-collapse text-left" aria-label={t('table_exam_history')}>
              <caption className="sr-only">{t('table_exam_history')}</caption>
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-400">
                  <th scope="col" className="p-6 font-bold tracking-[0.2em] text-xs uppercase">{t('date')}</th>
                  <th scope="col" className="p-6 font-bold tracking-[0.2em] text-xs uppercase">{t('type')}</th>
                  <th scope="col" className="p-6 font-bold tracking-[0.2em] text-xs uppercase">{t('exam_title')}</th>
                  <th scope="col" className="p-6 font-bold tracking-[0.2em] text-xs uppercase">{t('duration')}</th>
                  <th scope="col" className="p-6 font-bold tracking-[0.2em] text-xs uppercase">{t('score')}</th>
                  <th scope="col" className="p-6 font-bold tracking-[0.2em] text-xs uppercase text-center">{t('percentage')}</th>
                  <th scope="col" className="p-6 font-bold tracking-[0.2em] text-xs uppercase text-right">{t('action')}</th>
                </tr>
              </thead>
              <tbody>
                {displayedSessions.map((session) => (
                  <tr key={session.id} className="border-b border-zinc-900 hover:bg-zinc-950 transition-colors">
                    <td className="p-6 whitespace-nowrap text-zinc-400 font-light">
                      {session.completed_at ? new Date(session.completed_at).toLocaleDateString(lang) : '-'}
                    </td>
                    <td className="p-6 whitespace-nowrap">
                      <span className="text-xs uppercase tracking-widest font-bold text-zinc-400">
                        {session.is_practice ? t('practice') : t('exam')}
                      </span>
                    </td>
                    <td className="p-6 font-light text-lg">
                      {session.is_practice
                        ? t('practice') + (session.practice_subject ? ' — ' + session.practice_subject : '')
                        : (Array.isArray(session.exams) ? session.exams[0]?.title : session.exams?.title) || t('unknown_exam')}
                    </td>
                    <td className="p-6 text-zinc-400 font-light">
                      {session.started_at && session.completed_at ? formatDuration(session.started_at, session.completed_at, t('minute'), t('minutes')) : '-'}
                    </td>
                    <td className="p-6 font-light">
                      {session.score !== null ? `${session.score} / ${session.total_questions}` : '-'}
                    </td>
                    <td className="p-6 text-center font-light text-2xl">
                      {session.percentage !== null ? `${session.percentage}%` : '-'}
                    </td>
                    <td className="p-6 text-right">
                      {session.status === 'submitted' && (
                        <Link
                          href={`/results?session_id=${session.id}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-full text-xs font-bold uppercase tracking-widest border border-zinc-800 text-zinc-300 hover:border-zinc-400 hover:text-white px-5 transition-colors"
                          aria-label={tParams('view_results_for', { title: session.is_practice ? t('practice') : ((Array.isArray(session.exams) ? session.exams[0]?.title : session.exams?.title) || t('unknown_exam')), date: session.completed_at ? new Date(session.completed_at).toLocaleDateString(lang) : t('unknown_date') })}
                        >
                          {t('results')}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <div className="pt-16 w-full">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-full text-xs font-bold uppercase tracking-widest transition-colors border border-zinc-800 text-zinc-300 hover:border-zinc-500 hover:text-white h-12 px-6"
        >
          {t('return_dashboard')}
        </Link>
      </div>
    </main>
  );
}
