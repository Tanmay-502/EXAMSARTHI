'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { VoiceCore } from '@/components/voice/VoiceCore';

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

function formatDuration(start: string, end: string) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const diffMins = Math.round((e - s) / 60000);
  return diffMins + ' min' + (diffMins !== 1 ? 's' : '');
}

export default function HistoryPageContent({ filter, displayedSessions }: { filter: string; displayedSessions: HistorySession[] }) {
  return (
    <main id="main-content" className="flex flex-col flex-1 min-h-screen w-full max-w-7xl mx-auto pt-32 pb-24 px-6 md:px-12 bg-black text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full"
      >
        <div className="mb-24 flex items-end justify-between gap-8 border-b border-zinc-900 pb-8">
          <div>
            <h1 className="text-[clamp(3rem,6vw,7rem)] leading-[0.9] font-light tracking-tighter mb-4 text-zinc-100" tabIndex={-1}>Exam History</h1>
            <p className="text-2xl md:text-4xl font-light text-zinc-500">Review your past attempts.</p>
          </div>
          <VoiceCore size="sm" />
        </div>

        <div className="flex flex-wrap gap-4 mb-16" role="group" aria-label="Filter history">
          <Link 
            href="/history?filter=all" 
            className={`px-6 py-3 rounded-full border uppercase tracking-widest text-xs font-bold transition-colors ${filter === 'all' ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white'}`}
            aria-current={filter === 'all' ? 'page' : undefined}
          >
            All Sessions
          </Link>
          <Link 
            href="/history?filter=exam" 
            className={`px-6 py-3 rounded-full border uppercase tracking-widest text-xs font-bold transition-colors ${filter === 'exam' ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white'}`}
            aria-current={filter === 'exam' ? 'page' : undefined}
          >
            Exams
          </Link>
          <Link 
            href="/history?filter=practice" 
            className={`px-6 py-3 rounded-full border uppercase tracking-widest text-xs font-bold transition-colors ${filter === 'practice' ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white'}`}
            aria-current={filter === 'practice' ? 'page' : undefined}
          >
            Practice
          </Link>
        </div>

        {(!displayedSessions || displayedSessions.length === 0) ? (
          <div className="border border-zinc-900 p-12 text-center text-zinc-500">
            <p className="text-xl font-light">No {filter !== 'all' ? filter : ''} sessions found.</p>
          </div>
        ) : (
          <div className="border-t border-zinc-900 overflow-x-auto">
            <table className="w-full border-collapse text-left" aria-label="Exam History">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500">
                  <th scope="col" className="p-6 font-bold tracking-[0.2em] text-xs uppercase">Date</th>
                  <th scope="col" className="p-6 font-bold tracking-[0.2em] text-xs uppercase">Type</th>
                  <th scope="col" className="p-6 font-bold tracking-[0.2em] text-xs uppercase">Exam Title</th>
                  <th scope="col" className="p-6 font-bold tracking-[0.2em] text-xs uppercase">Duration</th>
                  <th scope="col" className="p-6 font-bold tracking-[0.2em] text-xs uppercase">Score</th>
                  <th scope="col" className="p-6 font-bold tracking-[0.2em] text-xs uppercase text-center">Percentage</th>
                  <th scope="col" className="p-6 font-bold tracking-[0.2em] text-xs uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedSessions.map((session) => (
                  <tr key={session.id} className="border-b border-zinc-900 hover:bg-zinc-950 transition-colors">
                    <td className="p-6 whitespace-nowrap text-zinc-400 font-light">
                      {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-6 whitespace-nowrap">
                      <span className="text-xs uppercase tracking-widest font-bold text-zinc-400">
                        {session.is_practice ? 'Practice' : 'Exam'}
                      </span>
                    </td>
                    <td className="p-6 font-light text-lg">
                      {session.is_practice
                        ? 'Practice' + (session.practice_subject ? ' — ' + session.practice_subject : '')
                        : (Array.isArray(session.exams) ? session.exams[0]?.title : session.exams?.title) || 'Unknown Exam'}
                    </td>
                    <td className="p-6 text-zinc-500 font-light">
                      {session.started_at && session.completed_at ? formatDuration(session.started_at, session.completed_at) : '-'}
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
                          className="inline-flex items-center justify-center rounded-full text-xs font-bold uppercase tracking-widest border border-zinc-800 text-zinc-300 hover:border-zinc-500 hover:text-white h-10 px-5 transition-colors"
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
      </motion.div>

      <div className="pt-16 w-full">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-full text-xs font-bold uppercase tracking-widest transition-colors border border-zinc-800 text-zinc-300 hover:border-zinc-500 hover:text-white h-12 px-6"
        >
          Return to Dashboard
        </Link>
      </div>
    </main>
  );
}
