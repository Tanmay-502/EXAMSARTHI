import { createClient } from '@/lib/supabase/client';

export type SupportedSubject = 'Geography' | 'Science' | 'Reasoning' | 'Mathematics' | 'History' | 'Computer Science' | string;

export interface ExamRecord {
  id: string;
  title: string;
}

export const SUPPORTED_EXAMS: ExamRecord[] = [
  {
    id: 'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b',
    title: 'General Knowledge & Reasoning Demo'
  }
];

export const SUPPORTED_SUBJECTS: SupportedSubject[] = [
  'Geography',
  'Science',
  'Reasoning',
  'Mathematics',
  'History',
  'Computer Science',
  'DBMS'
];

function matchesPhrase(text: string, phrase: string): boolean {
  const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedPhrase}\\b`, 'i');
  return regex.test(text);
}

export async function resolveSubject(spokenText: string): Promise<SupportedSubject | null> {
  const normalized = spokenText.toLowerCase().trim();
  
  const mappings: { key: string, value: SupportedSubject }[] = [
    { key: 'database management systems', value: 'DBMS' },
    { key: 'computer science', value: 'Computer Science' },
    { key: 'mathematics', value: 'Mathematics' },
    { key: 'geography', value: 'Geography' },
    { key: 'reasoning', value: 'Reasoning' },
    { key: 'computer', value: 'Computer Science' },
    { key: 'science', value: 'Science' },
    { key: 'history', value: 'History' },
    { key: 'maths', value: 'Mathematics' },
    { key: 'math', value: 'Mathematics' },
    { key: 'dbms', value: 'DBMS' },
    { key: 'geo', value: 'Geography' },
    { key: 'cs', value: 'Computer Science' },
  ];

  for (const mapping of mappings) {
    if (matchesPhrase(normalized, mapping.key)) {
      return mapping.value;
    }
  }

  // Dynamic lookup
  try {
    const supabase = createClient();
    const { data } = await supabase.from('questions').select('subject').not('subject', 'is', null);
    if (data) {
      const dbSubjects = Array.from(new Set(data.map(d => d.subject))) as string[];
      dbSubjects.sort((a, b) => b.length - a.length);
      for (const sub of dbSubjects) {
        if (sub && matchesPhrase(normalized, sub.toLowerCase())) {
          return sub;
        }
      }
    }
  } catch (e) {
    console.error('Failed to resolve subject dynamically', e);
  }
  
  return null;
}

export async function resolveExam(spokenText: string): Promise<ExamRecord | null> {
  const normalized = spokenText.toLowerCase().trim();
  
  if (matchesPhrase(normalized, 'general knowledge') || matchesPhrase(normalized, 'reasoning demo') || matchesPhrase(normalized, 'demo')) {
    return SUPPORTED_EXAMS[0];
  }

  try {
    const supabase = createClient();
    const { data: exams } = await supabase.from('exams').select('id, title');
    
    if (exams) {
      const sortedExams = [...exams].sort((a, b) => b.title.length - a.title.length);
      for (const exam of sortedExams) {
        if (matchesPhrase(normalized, exam.title.toLowerCase())) {
          return { id: exam.id, title: exam.title };
        }
      }
    }
  } catch (e) {
    console.error('Failed to resolve exam dynamically', e);
  }

  return null;
}
