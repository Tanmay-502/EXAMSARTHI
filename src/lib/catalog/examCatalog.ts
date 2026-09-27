import { createClient } from '@/lib/supabase/client';

export type SupportedSubject = 'Geography' | 'Science' | 'Reasoning' | 'Mathematics' | 'History' | 'Computer Science' | string;

export interface ExamRecord {
  id: string;
  title: string;
}


export const SUPPORTED_SUBJECTS: SupportedSubject[] = [
  'Geography',
  'Science',
  'Reasoning',
  'Mathematics',
  'History',
  'Computer Science',
  'DBMS'
];

function normalizeSpokenText(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesPhrase(text: string, phrase: string): boolean {
  const normalizedText = normalizeSpokenText(text);
  const normalizedPhrase = normalizeSpokenText(phrase);
  if (!normalizedText || !normalizedPhrase) return false;

  if (normalizedText === normalizedPhrase) {
    return true;
  }

  const textTokens = normalizedText.split(' ').filter(Boolean);
  const phraseTokens = normalizedPhrase.split(' ').filter(
    token => !['the', 'a', 'an', 'and', 'of', 'to', 'for', 'my', 'me'].includes(token)
  );

  if (phraseTokens.length === 0) return false;

  let matched = 0;
  let lastIndex = -1;
  for (const token of phraseTokens) {
    const index = textTokens.findIndex((candidate, i) => i > lastIndex && candidate === token);
    if (index === -1) continue;
    matched += 1;
    lastIndex = index;
  }

  return matched === phraseTokens.length;
}

export function normalizeExamName(text: string): string {
  return normalizeSpokenText(text);
}

export async function resolveSubject(spokenText: string): Promise<SupportedSubject | null> {
  const normalized = spokenText.toLowerCase().trim();
  
  const mappings: { key: string, value: SupportedSubject }[] = [
    { key: 'database management systems', value: 'DBMS' },
    { key: 'dbms', value: 'DBMS' },
    { key: 'डेटाबेस मैनेजमेंट', value: 'DBMS' },
    { key: 'डेटाबेस', value: 'DBMS' },
    { key: 'डीबीएमएस', value: 'DBMS' },

    { key: 'computer science', value: 'Computer Science' },
    { key: 'computer', value: 'Computer Science' },
    { key: 'कंप्यूटर साइंस', value: 'Computer Science' },
    { key: 'कंप्यूटर विज्ञान', value: 'Computer Science' },
    { key: 'కంప్యూటర్ సైన్స్', value: 'Computer Science' },

    { key: 'mathematics', value: 'Mathematics' },
    { key: 'maths', value: 'Mathematics' },
    { key: 'math', value: 'Mathematics' },
    { key: 'गणित', value: 'Mathematics' },
    { key: 'గణితం', value: 'Mathematics' },
    { key: 'మాథ్స్', value: 'Mathematics' },

    { key: 'geography', value: 'Geography' },
    { key: 'geo', value: 'Geography' },
    { key: 'भूगोल', value: 'Geography' },
    { key: 'భూగోళ శాస్త్రం', value: 'Geography' },

    { key: 'reasoning', value: 'Reasoning' },
    { key: 'तर्क', value: 'Reasoning' },
    { key: 'रीजनिंग', value: 'Reasoning' },
    { key: 'రీజనింగ్', value: 'Reasoning' },

    { key: 'science', value: 'Science' },
    { key: 'विज्ञान', value: 'Science' },
    { key: 'సైన్స్', value: 'Science' },
    { key: 'విజ్ఞానం', value: 'Science' },

    { key: 'history', value: 'History' },
    { key: 'इतिहास', value: 'History' },
    { key: 'చరిత్ర', value: 'History' },
  ];

  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('questions').select('subject').not('subject', 'is', null);
    if (error) throw error;

    const dbSubjects = Array.from(new Set(
      (data || [])
        .map(d => d.subject?.trim())
        .filter((subject): subject is string => Boolean(subject))
    ));

    dbSubjects.sort((a, b) => b.length - a.length);

    // Aliases may only resolve to a subject that actually exists in the
    // currently provisioned question bank.
    for (const mapping of mappings) {
      if (!matchesPhrase(normalized, mapping.key)) continue;
      const canonical = dbSubjects.find(
        subject => subject.toLowerCase() === mapping.value.toLowerCase()
      );
      if (canonical) return canonical;
    }

    for (const sub of dbSubjects) {
      if (matchesPhrase(normalized, sub)) {
        return sub;
      }
    }
  } catch (e) {
    console.error('Failed to resolve subject dynamically', e);
  }

  return null;
}

export async function resolveExam(spokenText: string): Promise<ExamRecord | null> {
  const requested = normalizeSpokenText(spokenText)
    .replace(/^(please )?((i )?(want|would like) to )?(take|give|start|attempt) (an )?(exam|the exam) /, '')
    .trim();

  if (!requested) return null;

  try {
    const supabase = createClient();
    const { data: exams, error } = await supabase.from('exams').select('id, title');
    if (error) throw error;

    const sortedExams = [...(exams || [])].sort((a, b) => b.title.length - a.title.length);
    for (const exam of sortedExams) {
      if (matchesPhrase(requested, exam.title)) {
        return { id: exam.id, title: exam.title };
      }
    }

    const requestTokens = requested.split(' ').filter(Boolean);
    if (requestTokens.length >= 2) {
      const scored = sortedExams
        .map(exam => {
          const titleTokens = normalizeSpokenText(exam.title).split(' ').filter(Boolean);
          const matched = requestTokens.filter(token => titleTokens.includes(token)).length;
          return { exam, score: matched / requestTokens.length, matched };
        })
        .filter(item => item.matched >= 2 && item.score >= 0.7)
        .sort((a, b) => b.score - a.score || b.matched - a.matched);
      if (scored[0]) return { id: scored[0].exam.id, title: scored[0].exam.title };
    }
  } catch (e) {
    console.error('Failed to resolve exam dynamically', e);
  }

  return null;
}
