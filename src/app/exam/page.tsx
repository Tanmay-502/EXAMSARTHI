'use client'

import { ExamEngine } from '@/components/exam/ExamEngine';
import { useExamStore } from '@/lib/store/examStore';
import { useEffect, useState } from 'react';
import { fetchExamQuestions, startExamSession } from './actions';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useRouter } from 'next/navigation';

export default function ExamPage() {
  const initializeExam = useExamStore(state => state.initializeExam);
  const { lang } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadExam() {
      try {
        // Hardcoded exam ID for MVP, ideally passed via URL or props
        const examId = 'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b'; // Replace with a real exam ID later
        
        // Start a session and fetch questions concurrently if possible, 
        // but session creation needs to succeed first for good UX.
        // For MVP we just try both:
        const questions = await fetchExamQuestions(examId, lang);
        const sessionId = await startExamSession(examId);
        
        initializeExam(sessionId, examId, questions);
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message === 'Unauthorized') {
            router.push('/auth/login?message=unauthenticated');
            return;
          }
          setError(err.message || 'Failed to load exam');
        } else {
          setError('Failed to load exam');
        }
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [initializeExam, lang, router]);

  if (loading) {
    return <div className="flex flex-col items-center justify-center flex-1 p-6 text-xl">Loading Exam...</div>;
  }

  if (error) {
    return <div className="flex flex-col items-center justify-center flex-1 p-6 text-xl text-destructive">{error}</div>;
  }

  return (
    <main className="flex flex-col flex-1 p-6">
      <div className="sr-only">Exam Mode</div>
      <ExamEngine mode="exam" />
    </main>
  );
}


