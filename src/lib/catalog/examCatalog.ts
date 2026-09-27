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

export async function resolveSubject(spokenText: string): Promise<SupportedSubject | null> {
  const normalized = spokenText.toLowerCase().trim();
  
  const mappings: Record<string, SupportedSubject> = {
    'geography': 'Geography',
    'geo': 'Geography',
    'science': 'Science',
    'reasoning': 'Reasoning',
    'math': 'Mathematics',
    'maths': 'Mathematics',
    'mathematics': 'Mathematics',
    'history': 'History',
    'computer science': 'Computer Science',
    'cs': 'Computer Science',
    'computer': 'Computer Science',
    'dbms': 'DBMS'
  };

  for (const [key, value] of Object.entries(mappings)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  // Dynamic lookup
  try {
    const supabase = createClient();
    const { data } = await supabase.from('questions').select('subject').not('subject', 'is', null);
    if (data) {
      const dbSubjects = Array.from(new Set(data.map(d => d.subject)));
      for (const sub of dbSubjects) {
        if (sub && normalized.includes(sub.toLowerCase())) {
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
  
  if (normalized.includes('general knowledge') || normalized.includes('reasoning demo') || normalized.includes('demo')) {
    return SUPPORTED_EXAMS[0];
  }

  try {
    const supabase = createClient();
    const { data: exams } = await supabase.from('exams').select('id, title');
    
    if (exams) {
      for (const exam of exams) {
        if (normalized.includes(exam.title.toLowerCase())) {
          return { id: exam.id, title: exam.title };
        }
      }
    }
  } catch (e) {
    console.error('Failed to resolve exam dynamically', e);
  }

  return null;
}
