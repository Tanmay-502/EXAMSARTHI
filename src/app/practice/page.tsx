'use client'

import { ExamEngine } from '@/components/exam/ExamEngine';
import { useExamStore, Question } from '@/lib/store/examStore';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useEffect } from 'react';

const MOCK_QUESTIONS: Question[] = [
  {
    id: 'p1',
    exam_id: 'practice',
    question_text: 'What is the capital of India?',
    question_type: 'MCQ',
    options: ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'],
    marks: 1,
    order_num: 1,
  },
  {
    id: 'p2',
    exam_id: 'practice',
    question_text: 'Which planet is known as the Red Planet?',
    question_type: 'MCQ',
    options: ['Venus', 'Jupiter', 'Mars', 'Saturn'],
    marks: 1,
    order_num: 2,
  }
];

export default function PracticePage() {
  const initializeExam = useExamStore(state => state.initializeExam);
  const { t } = useI18n();
  
  useEffect(() => {
    initializeExam('practice-session', 'practice-exam', MOCK_QUESTIONS);
  }, [initializeExam]);

  return (
    <main className="flex flex-col flex-1 p-6">
      <div className="sr-only">{t('practice')} Mode</div>
      <ExamEngine mode="practice" />
    </main>
  );
}
