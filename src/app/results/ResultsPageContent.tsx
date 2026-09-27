'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { VoiceCore } from '@/components/voice/VoiceCore';
import { ScoreVisualizer } from '@/components/exam/ScoreVisualizer';
import { Trophy, Target, AlertCircle, HelpCircle, ArrowRight, BarChart3, BookOpen, History, Home } from 'lucide-react';

type SubjectStat = {
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
};

type ResultsPageContentProps = {
  total_questions: number;
  attempted_questions: number;
  correct_questions: number;
  incorrect_questions: number;
  unanswered_questions: number;
  percentage: number;
  subjectStats: Record<string, SubjectStat>;
  weakestSubject: string;
};

export default function ResultsPageContent({
  total_questions,
  attempted_questions,
  correct_questions,
  incorrect_questions,
  unanswered_questions,
  percentage,
  subjectStats,
  weakestSubject,
}: ResultsPageContentProps) {
  return (
    <main id="main-content" className="flex flex-col flex-1 min-h-screen w-full bg-black text-white">
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-24">
        
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-24"
        >
          <div className="mb-12 flex items-center justify-between border-b border-zinc-900 pb-8">
            <div className="flex flex-col">
              <span className="text-zinc-400 tracking-[0.2em] text-xs uppercase mb-2">RESULTS</span>
              <span className="text-xl font-light tracking-wide">EXAMSAARTHI</span>
            </div>
            <VoiceCore size="sm" />
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4 text-zinc-400">
              <Trophy className="w-6 h-6 text-zinc-400" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Performance summary</span>
            </div>
            <h1 className="text-[clamp(3.5rem,8vw,9rem)] leading-[0.9] font-light tracking-tighter text-zinc-100">
              Exam<br />complete.
            </h1>
            <p className="text-2xl md:text-4xl font-light text-zinc-400">Your performance, understood.</p>
          </div>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="border-t border-zinc-900 py-12 mb-24"
        >
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-12">
            <div className="max-w-2xl">
              <p className="text-zinc-400 tracking-[0.2em] text-sm uppercase mb-4">OVERALL SCORE</p>
              <p className="text-xl md:text-2xl text-zinc-400 font-light leading-relaxed">
                You answered <span className="text-white">{attempted_questions}</span> out of {total_questions} questions.
              </p>
            </div>
            <ScoreVisualizer percentage={percentage || 0} />
          </div>
        </motion.section>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-zinc-900 pt-12 mb-24">
          <div className="flex items-center space-x-6 group">
            <div className="p-3 rounded-full border border-zinc-800 text-zinc-300">
              <Target className="w-8 h-8" />
            </div>
            <div>
              <div className="text-5xl font-light">{correct_questions}</div>
              <div className="text-xs font-bold uppercase text-zinc-400 tracking-[0.2em] mt-2">Correct</div>
            </div>
          </div>

          <div className="flex items-center space-x-6 group">
            <div className="p-3 rounded-full border border-zinc-800 text-zinc-300">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <div className="text-5xl font-light">{incorrect_questions}</div>
              <div className="text-xs font-bold uppercase text-zinc-400 tracking-[0.2em] mt-2">Incorrect</div>
            </div>
          </div>

          <div className="flex items-center space-x-6 group">
            <div className="p-3 rounded-full border border-zinc-800 text-zinc-300">
              <HelpCircle className="w-8 h-8" />
            </div>
            <div>
              <div className="text-5xl font-light">{unanswered_questions}</div>
              <div className="text-xs font-bold uppercase text-zinc-400 tracking-[0.2em] mt-2">Skipped</div>
            </div>
          </div>
        </div>

        {/* Subject Breakdown */}
        {Object.keys(subjectStats).length > 0 && (
          <div className="border-t border-zinc-900 pt-12 mb-24">
            <div className="flex items-center space-x-4 mb-12">
              <BarChart3 className="w-6 h-6 text-zinc-400" />
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Subject analysis</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {Object.entries(subjectStats).map(([subj, stats]) => {
                const subjPerc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                return (
                  <div key={subj} className="border-t border-zinc-900 pt-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-light">{subj}</h3>
                      <span className="text-3xl font-light">{subjPerc}%</span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-1 mb-8 overflow-hidden">
                      <div 
                        className="bg-white h-1 rounded-full transition-all duration-1000"
                        style={{ width: `${subjPerc}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xl font-light">{stats.correct}</div>
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-2">Correct</div>
                      </div>
                      <div>
                        <div className="text-xl font-light">{stats.incorrect}</div>
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-2">Incorrect</div>
                      </div>
                      <div>
                        <div className="text-xl font-light">{stats.unanswered}</div>
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-2">Skipped</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-start items-stretch gap-4 border-t border-zinc-900 pt-12">
          {weakestSubject && (
            <Link
              href={`/practice?subject=${encodeURIComponent(weakestSubject)}`}
              className="group inline-flex items-center justify-center px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-zinc-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <BookOpen className="mr-3 w-4 h-4" />
              Practice {weakestSubject}
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
          <Link
            href="/history"
            className="inline-flex items-center justify-center px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest border border-zinc-800 hover:border-zinc-500 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <History className="mr-3 w-4 h-4" />
            View History
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest border border-zinc-800 hover:border-zinc-500 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Home className="mr-3 w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
