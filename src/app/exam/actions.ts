'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Question } from '@/lib/store/examStore'
import { SupabaseClient, User } from '@supabase/supabase-js'
import { writeAudit } from '@/lib/audit/writeAudit'
import { chunk } from '@/lib/db/chunk'
import { assertPracticeFeedbackAccess, buildPracticeAnswerFeedback } from '@/lib/practice/feedback'
import { isMissingColumnError } from '@/lib/db/schemaCompatibility'

type CandidateSession = {
  id: string;
  candidate_id: string;
  exam_id: string | null;
  is_practice: boolean;
  practice_subject: string | null;
  status: string;
  question_ids: unknown;
  started_at: string;
};

async function readCandidateSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<CandidateSession | null> {
  const selects = [
    'id, candidate_id, exam_id, is_practice, practice_subject, status, question_ids, started_at',
    'id, candidate_id, exam_id, practice_subject, status, question_ids, started_at',
    'id, candidate_id, exam_id, status, question_ids, started_at',
  ];

  for (const select of selects) {
    const result = await supabase
      .from('exam_sessions')
      .select(select)
      .eq('id', sessionId)
      .eq('candidate_id', userId)
      .single();

    if (!result.error && result.data) {
      const row = result.data as unknown as Record<string, unknown>;
      const examId = typeof row.exam_id === 'string' ? row.exam_id : null;
      const practiceSubject = typeof row.practice_subject === 'string' ? row.practice_subject : null;
      const isPractice = typeof row.is_practice === 'boolean'
        ? row.is_practice
        : Boolean(practiceSubject && !examId);

      return {
        id: String(row.id),
        candidate_id: String(row.candidate_id),
        exam_id: examId,
        is_practice: isPractice,
        practice_subject: practiceSubject,
        status: String(row.status),
        question_ids: row.question_ids,
        started_at: String(row.started_at),
      };
    }

    if (!isMissingColumnError(result.error)) return null;
  }

  return null;
}

type ServerAnalyticsQuestion = {
  id: string;
  exam_id: string | null;
  subject: string | null;
  question_answers:
    | { correct_answer_index: number }
    | { correct_answer_index: number }[]
    | null;
};

export async function fetchAvailableExams() {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  let { data, error } = await adminClient
    .from('exams')
    .select('id, title, description, duration_minutes, questions(count)')
    .eq('kind', 'exam');

  // Legacy production schemas predate the exam-mode classifier. In that schema
  // every exam row is an exam-mode assessment, so it is safe to omit the filter.
  if (error && isMissingColumnError(error)) {
    const legacy = await adminClient
      .from('exams')
      .select('id, title, description, duration_minutes, questions(count)');
    data = legacy.data;
    error = legacy.error;
  }

  if (error) {
    throw new Error(`Failed to fetch exams: ${error.message}`)
  }

  return (data ?? [])
    .map((exam: { id: string; title: string; description: string | null; duration_minutes: number; questions: unknown }) => {
      const qs = exam.questions as { count: number }[] | null;
      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration_minutes: exam.duration_minutes,
        question_count: Array.isArray(qs) && qs.length > 0 ? Number(qs[0].count) || 0 : 0
      };
    })
    .filter(exam => exam.question_count > 0) as {
      id: string;
      title: string;
      description: string | null;
      duration_minutes: number;
      question_count: number;
    }[];
}

export async function fetchExamQuestions(examId: string, sessionId: string, lang: string = 'en-IN') {
  const supabase = await createClient()
  
  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  // Bind question retrieval to the authenticated in-progress session.
  const { data: session, error: sessionError } = await supabase
    .from('exam_sessions')
    .select('id, exam_id, status, question_ids')
    .eq('id', sessionId)
    .eq('candidate_id', user.id)
    .single()

  if (sessionError || !session || session.status !== 'in_progress' || session.exam_id !== examId) {
    throw new Error('Exam session not found, inactive, or unauthorized')
  }

  const rosterIds = Array.isArray(session.question_ids)
    ? session.question_ids.filter((id: unknown): id is string => typeof id === 'string')
    : []

  if (rosterIds.length === 0) {
    throw new Error('Exam session has no frozen question roster')
  }

  // Fetch questions, explicitly EXCLUDING correct_answer_index.
  const baseQuery = supabase
    .from('questions')
    .select('id, exam_id, order_index, content_text, options, content_translations, options_translations, image_url, image_alt_text')

  const { data: questions, error } = rosterIds.length > 0
    ? await baseQuery.in('id', rosterIds)
    : await baseQuery.eq('exam_id', examId).order('order_index', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch questions: ${error.message}`)
  }

  // Map to the frontend Question type
  const orderedQuestions = rosterIds.length > 0
    ? rosterIds
        .map(id => questions.find(question => question.id === id))
        .filter((question): question is NonNullable<typeof questions[number]> => Boolean(question))
    : questions

  const mappedQuestions = orderedQuestions.map((q: { id: string; exam_id: string; order_index: number; content_text: string; options: string[]; content_translations: Record<string, string>; options_translations: Record<string, string[]>; image_url: string | null; image_alt_text: string | null }) => {
    let questionText = q.content_text;
    let optionsList = q.options;

    // Apply translations if requested language is not English and translations exist
    if (lang !== 'en-IN') {
      if (q.content_translations && q.content_translations[lang]) {
        questionText = q.content_translations[lang];
      }
      if (q.options_translations && q.options_translations[lang] && Array.isArray(q.options_translations[lang])) {
        optionsList = q.options_translations[lang];
      }
    }

    return {
      id: q.id,
      exam_id: q.exam_id,
      question_text: questionText,
      question_type: 'MCQ', // MVP defaults to MCQ
      options: optionsList,
      marks: 1, // Defaulting to 1 mark per question for MVP
      image_url: q.image_url || undefined,
      image_alt_text: q.image_alt_text || undefined,
      order_num: q.order_index
    };
  }) as Question[];

  let seed = Array.from(`${examId}:${sessionId}:${user.id}`).reduce(
    (hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0,
    0
  ) >>> 0;
  const random = () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = mappedQuestions.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [mappedQuestions[i], mappedQuestions[j]] = [mappedQuestions[j], mappedQuestions[i]];
  }

  return mappedQuestions;
}

async function getExamAnswerDeadline(
  adminClient: SupabaseClient,
  session: { is_practice: boolean | null; exam_id: string | null; started_at: string }
) {
  if (session.is_practice || !session.exam_id) return null;

  const { data: exam, error } = await adminClient
    .from('exams')
    .select('duration_minutes')
    .eq('id', session.exam_id)
    .single();

  if (error || !exam) {
    throw new Error('Exam configuration could not be loaded');
  }

  const startedAt = new Date(session.started_at).getTime();
  const durationSeconds = Number(exam.duration_minutes) * 60;

  if (!Number.isFinite(startedAt) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('Exam timing configuration is invalid');
  }

  return startedAt + (durationSeconds + 5) * 1000;
}

async function ensureExamAnswerWindow(
  adminClient: SupabaseClient,
  session: { is_practice: boolean | null; exam_id: string | null; started_at: string }
) {
  const deadline = await getExamAnswerDeadline(adminClient, session);
  if (deadline !== null && Date.now() > deadline) {
    throw new Error('Exam time has expired');
  }
}

async function ensureCandidateProfile(supabase: SupabaseClient, user: User) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    const adminClient = await createAdminClient()
    const { error } = await adminClient
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || null
      })
      
    if (error && error.code !== '23505') { // Ignore unique violation if created concurrently
      throw new Error(`Failed to provision candidate profile: ${error.message}`)
    }
  }
}

export async function startExamSession(examId: string) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  // Provision profile if it doesn't exist
  await ensureCandidateProfile(supabase, user)

  let { data: examConfig, error: examConfigError } = await adminClient
    .from('exams')
    .select('id, kind')
    .eq('id', examId)
    .eq('kind', 'exam')
    .single();

  // A pre-classifier production schema contains only timed exams. Treat the
  // requested row as an exam in that legacy case, without weakening the modern
  // kind-based check when the column exists.
  if (examConfigError && isMissingColumnError(examConfigError)) {
    const legacy = await adminClient
      .from('exams')
      .select('id')
      .eq('id', examId)
      .single();
    examConfig = legacy.data ? { ...legacy.data, kind: 'exam' } : null;
    examConfigError = legacy.error;
  }

  if (examConfigError || !examConfig) {
    throw new Error('Requested exam is not an exam-mode assessment');
  }

  const { data: rosterQuestions, error: rosterError } = await adminClient
    .from('questions')
    .select('id')
    .eq('exam_id', examId)
    .order('order_index', { ascending: true })

  if (rosterError) {
    throw new Error(`Failed to load exam question roster: ${rosterError.message}`)
  }

  const questionIds = (rosterQuestions || []).map(question => question.id)
  if (questionIds.length === 0) {
    throw new Error('This exam currently has no available questions')
  }

  let existingQuery = await adminClient
    .from('exam_sessions')
    .select('id, started_at, question_ids')
    .eq('exam_id', examId)
    .eq('candidate_id', user.id)
    .eq('status', 'in_progress')
    .eq('is_practice', false)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingQuery.error && isMissingColumnError(existingQuery.error)) {
    existingQuery = await adminClient
      .from('exam_sessions')
      .select('id, started_at, question_ids')
      .eq('exam_id', examId)
      .eq('candidate_id', user.id)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  if (existingQuery.error && !isMissingColumnError(existingQuery.error)) {
    throw new Error(`Failed to inspect active exam session: ${existingQuery.error.message}`);
  }

  const existing = existingQuery.data;

  if (existing) {
    const { data: exam } = await adminClient
      .from('exams')
      .select('duration_minutes')
      .eq('id', examId)
      .single();

    const startedAt = new Date(existing.started_at).getTime();
    const durationSeconds = Number(exam?.duration_minutes || 0) * 60;
    const stillActive =
      Number.isFinite(startedAt) &&
      Number.isFinite(durationSeconds) &&
      durationSeconds > 0 &&
      Date.now() <= startedAt + (durationSeconds + 5) * 1000;

    const existingRoster = Array.isArray(existing.question_ids)
      ? existing.question_ids.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    if (stillActive && existingRoster.length > 0) {
      return { id: existing.id, startedAt: existing.started_at, serverNow: Date.now(), userId: user.id };
    }

    await adminClient
      .from('exam_sessions')
      .update({
        status: 'abandoned',
        completed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('candidate_id', user.id)
      .eq('status', 'in_progress');
  }

  const { data, error } = await adminClient
    .from('exam_sessions')
    .insert({
      exam_id: examId,
      candidate_id: user.id,
      status: 'in_progress',
      question_ids: questionIds,
    })
    .select('id, started_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      let racedQuery = await adminClient
        .from('exam_sessions')
        .select('id, started_at')
        .eq('exam_id', examId)
        .eq('candidate_id', user.id)
        .eq('status', 'in_progress')
        .eq('is_practice', false)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (racedQuery.error && isMissingColumnError(racedQuery.error)) {
        racedQuery = await adminClient
          .from('exam_sessions')
          .select('id, started_at')
          .eq('exam_id', examId)
          .eq('candidate_id', user.id)
          .eq('status', 'in_progress')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
      }

      const raced = racedQuery.data;
      if (raced) {
        const racedSession = raced as { id: string; started_at: string };
        return { id: racedSession.id, startedAt: racedSession.started_at, serverNow: Date.now(), userId: user.id };
      }
    }

    throw new Error(`Failed to start session: ${error.message}`)
  }

  await writeAudit({
    session_id: data.id,
    candidate_id: user.id,
    action: 'started_exam',
  })

  const insertedSession = data as { id: string; started_at: string };
  return { id: insertedSession.id, startedAt: insertedSession.started_at, serverNow: Date.now(), userId: user.id }
}

/**
 * Validates a practice roster and creates a session or reuses one with matching questions and subject.
 * @param questionIds - Question IDs to deduplicate and cap at 100 before validation.
 * @param practiceSubject - Subject that every roster question must match.
 * @param practiceDifficulty - Difficulty that every roster question must match.
 * @returns The session ID and authenticated user ID for both new and reused sessions.
 * @throws If authentication, roster validation, or session creation fails.
 */
export async function startPracticeSession(questionIds: string[] = [], practiceSubject = '', practiceDifficulty = '') {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    throw new Error('Practice session requires a question roster')
  }

  const uniqueQuestionIds = [...new Set(questionIds)].slice(0, 100)
  await ensureCandidateProfile(supabase, user)

  const normalizedSubject = practiceSubject.trim()
  const normalizedDifficulty = practiceDifficulty.trim().toLowerCase()

  if (!normalizedSubject || !['easy', 'medium', 'hard'].includes(normalizedDifficulty)) {
    throw new Error('Practice session parameters are invalid')
  }

  const { data: rosterQuestions, error: rosterError } = await adminClient
    .from('questions')
    .select('id, exam_id, subject, difficulty, exams!inner(kind)')
    .in('id', uniqueQuestionIds)

  if (rosterError || !rosterQuestions || rosterQuestions.length !== uniqueQuestionIds.length) {
    throw new Error('Practice question roster is invalid')
  }

  const rosterIsValid = rosterQuestions.every(question => {
    const relation = question.exams as { kind?: string } | { kind?: string }[] | null;
    const kind = Array.isArray(relation) ? relation[0]?.kind : relation?.kind;
    return (
      question.subject === normalizedSubject &&
      question.difficulty === normalizedDifficulty &&
      kind === 'practice_bank'
    );
  })

  if (!rosterIsValid) {
    throw new Error('Practice question roster does not match the selected parameters')
  }

  const { data: existing } = await adminClient
    .from('exam_sessions')
    .select('id, question_ids, practice_subject')
    .eq('candidate_id', user.id)
    .eq('status', 'in_progress')
    .eq('is_practice', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const existingQuestionIds = Array.isArray(existing.question_ids)
      ? existing.question_ids.filter((id: unknown): id is string => typeof id === 'string')
      : [];

    const requestedSet = new Set(uniqueQuestionIds);
    const existingSet = new Set(existingQuestionIds);
    const sameRoster =
      requestedSet.size === existingSet.size &&
      uniqueQuestionIds.every(id => existingSet.has(id)) &&
      existing.practice_subject === normalizedSubject;

    if (sameRoster) return { id: existing.id, userId: user.id };

    await adminClient
      .from('exam_sessions')
      .update({
        status: 'abandoned',
        completed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('candidate_id', user.id)
      .eq('status', 'in_progress');
  }

  const { data, error } = await adminClient
    .from('exam_sessions')
    .insert({
      exam_id: null,
      candidate_id: user.id,
      status: 'in_progress',
      is_practice: true,
      question_ids: uniqueQuestionIds,
      practice_subject: normalizedSubject,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: raced } = await adminClient
        .from('exam_sessions')
        .select('id, question_ids, practice_subject')
        .eq('candidate_id', user.id)
        .eq('status', 'in_progress')
        .eq('is_practice', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const racedQuestionIds = Array.isArray(raced?.question_ids)
        ? raced.question_ids.filter((id: unknown): id is string => typeof id === 'string')
        : [];

      const sameRacedRoster =
        Boolean(raced) &&
        raced?.practice_subject === normalizedSubject &&
        racedQuestionIds.length === uniqueQuestionIds.length &&
        uniqueQuestionIds.every(id => racedQuestionIds.includes(id));

      if (raced && sameRacedRoster) return { id: raced.id, userId: user.id };

      throw new Error('A different practice session is already active. Please finish it before starting another.');
    }

    throw new Error(`Failed to start practice session: ${error.message}`)
  }

  await writeAudit({
    session_id: data.id,
    candidate_id: user.id,
    action: 'started_practice',
    metadata: { is_practice: true, question_count: uniqueQuestionIds.length }
  })

  return { id: data.id, userId: user.id }
}

export async function resolveSubject(spokenText: string): Promise<string | null> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const normalized = spokenText.trim()
  if (!normalized) return null

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const matchesPhrase = (value: string, phrase: string) => {
    const text = normalize(value)
    const wanted = normalize(phrase)
    if (!text || !wanted) return false
    if (text === wanted) return true
    const textTokens = text.split(' ').filter(Boolean)
    const wantedTokens = wanted.split(' ').filter(
      token => !['the', 'a', 'an', 'and', 'of', 'to', 'for', 'my', 'me'].includes(token)
    )
    let lastIndex = -1
    for (const token of wantedTokens) {
      const index = textTokens.findIndex((candidate, i) => i > lastIndex && candidate === token)
      if (index === -1) return false
      lastIndex = index
    }
    return true
  }

  const aliases: Array<{ keys: string[]; candidates: string[] }> = [
    { keys: ['database management systems', 'dbms', 'डेटाबेस', 'डीबीएमएस', 'డీబీఎంఎస్'], candidates: ['Computer Science/DBMS', 'DBMS'] },
    { keys: ['computer science', 'computer', 'कंप्यूटर साइंस', 'कंप्यूटर विज्ञान', 'కంప్యూటర్ సైన్స్'], candidates: ['Computer Science/DBMS', 'Computer Science'] },
    { keys: ['mathematics', 'maths', 'math', 'गणित', 'గణితం', 'మాథ్స్'], candidates: ['Mathematics'] },
    { keys: ['reasoning', 'तर्क', 'रीजनिंग', 'రీజనింగ్'], candidates: ['Reasoning'] },
    { keys: ['science', 'विज्ञान', 'సైన్స్', 'విజ్ఞానం'], candidates: ['Science'] },
    { keys: ['general knowledge', 'gk', 'सामान्य ज्ञान', 'सामान्य जानकारी', 'జనరల్ నాలెడ్జ్', 'సాధారణ జ్ఞానం'], candidates: ['General Knowledge'] },
    { keys: ['history and polity', 'history', 'polity', 'इतिहास', 'राजव्यवस्था', 'इतिहास और राजव्यवस्था', 'చరిత్ర', 'రాజకీయాలు', 'చరిత్ర మరియు రాజకీయాలు'], candidates: ['History & Polity', 'History', 'Polity'] }
  ]

  const { data, error } = await adminClient
    .from('questions')
    .select('subject, exams!inner(kind)')
    .eq('exams.kind', 'practice_bank')
    .not('subject', 'is', null)

  if (error) {
    console.error('Failed to resolve practice subject:', error)
    return null
  }

  const subjects = [...new Set(
    (data ?? [])
      .map(row => row.subject?.trim())
      .filter((subject): subject is string => Boolean(subject))
  )]

  for (const alias of aliases) {
    if (!alias.keys.some(key => matchesPhrase(normalized, key))) continue
    const match = subjects.find(subject =>
      alias.candidates.some(candidate => subject.toLowerCase() === candidate.toLowerCase())
    )
    if (match) return match
  }

  return [...subjects]
    .sort((a, b) => b.length - a.length)
    .find(subject => matchesPhrase(normalized, subject)) ?? null
}

export async function fetchAvailablePracticeSubjects() {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await adminClient
    .from('questions')
    .select('subject, exams!inner(kind)')
    .eq('exams.kind', 'practice_bank')
    .not('subject', 'is', null)

  if (error) {
    throw new Error(`Failed to fetch practice subjects: ${error.message}`)
  }

  const rows = (data ?? []) as Array<{ subject: string | null }>
  return [...new Set(
    rows
      .map(row => row.subject?.trim())
      .filter((subject): subject is string => Boolean(subject))
  )].sort((a, b) => a.localeCompare(b))
}

export async function fetchPracticeQuestions(subject: string, difficulty: string, count: number, lang: string = 'en-IN') {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const normalizedSubject = subject.trim()
  const normalizedDifficulty = difficulty.trim().toLowerCase()
  const normalizedCount = Number.isInteger(count) ? count : Number.parseInt(String(count), 10)

  if (!normalizedSubject || normalizedSubject.length > 100) {
    throw new Error('Invalid practice subject')
  }

  if (!['easy', 'medium', 'hard'].includes(normalizedDifficulty)) {
    throw new Error('Invalid practice difficulty')
  }

  if (!Number.isInteger(normalizedCount) || normalizedCount < 1 || normalizedCount > 100) {
    throw new Error('Invalid practice question count')
  }

  const countQuery = await adminClient
    .from('questions')
    .select('id, exams!inner(kind)', { count: 'exact', head: true })
    .eq('subject', normalizedSubject)
    .eq('difficulty', normalizedDifficulty)
    .eq('exams.kind', 'practice_bank')

  if (countQuery.error) {
    throw new Error(`Failed to count practice questions: ${countQuery.error.message}`)
  }

  const availableCount = countQuery.count || 0
  const fetchCount = Math.min(normalizedCount, availableCount)
  if (fetchCount === 0) {
    return { questions: [], totalFound: availableCount }
  }

  const maxOffset = Math.max(0, availableCount - fetchCount)
  const offset = maxOffset > 0 ? Math.floor(Math.random() * (maxOffset + 1)) : 0

  const questionsQuery = await adminClient
    .from('questions')
    .select('id, exam_id, order_index, content_text, options, content_translations, options_translations, subject, difficulty, image_url, image_alt_text, exams!inner(kind)')
    .eq('subject', normalizedSubject)
    .eq('difficulty', normalizedDifficulty)
    .eq('exams.kind', 'practice_bank')
    .order('order_index', { ascending: true })
    .range(offset, Math.max(offset - 1, offset + fetchCount - 1))

  if (questionsQuery.error) {
    throw new Error(`Failed to fetch practice questions: ${questionsQuery.error.message}`)
  }

  const questions = questionsQuery.data || []
  const shuffledQuestions = [...questions]
  for (let i = shuffledQuestions.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]]
  }

  return {
    questions: shuffledQuestions.map((qRaw: Record<string, unknown>, i: number) => {
      const q = qRaw as {
        id: string;
        content_text: string;
        options: string[];
        content_translations?: Record<string, string>;
        options_translations?: Record<string, string[]>;
        image_url?: string;
        image_alt_text?: string;
        subject?: string;
        difficulty?: string;
      };
      let questionText = q.content_text;
      let optionsList = q.options;

      if (lang !== 'en-IN') {
        if (q.content_translations && q.content_translations[lang]) {
          questionText = q.content_translations[lang];
        }
        if (q.options_translations && q.options_translations[lang] && Array.isArray(q.options_translations[lang])) {
          optionsList = q.options_translations[lang];
        }
      }

      return {
        id: q.id,
        exam_id: 'practice',
        question_text: questionText,
        question_type: 'MCQ',
        options: optionsList,
        marks: 1,
        image_url: q.image_url || undefined,
        image_alt_text: q.image_alt_text || undefined,
        order_num: i + 1,
        subject: q.subject,
        difficulty: q.difficulty
      };
    }) as Question[],
    totalFound: availableCount
  };
}


export async function checkPracticeAnswer(
  sessionId: string,
  questionId: string,
  selectedIndex: number
) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) {
    throw new Error('Invalid option index')
  }

  const session = await readCandidateSession(supabase, user.id, sessionId);

  if (!session) {
    throw new Error('Practice session not found or unauthorized')
  }

  const rosterIds = Array.isArray(session.question_ids)
    ? session.question_ids.filter((id: unknown): id is string => typeof id === 'string')
    : []

  assertPracticeFeedbackAccess(
    {
      isPractice: session.is_practice,
      status: session.status,
      questionIds: rosterIds,
    },
    questionId,
  )

  const { data: question, error: questionError } = await adminClient
    .from('questions')
    .select('id, options, question_answers(correct_answer_index, explanation)')
    .eq('id', questionId)
    .single()

  if (questionError || !question) {
    throw new Error('Practice question not found')
  }

  const options = Array.isArray(question.options) ? question.options : []
  if (selectedIndex >= options.length) {
    throw new Error('Invalid option index')
  }

  const questionAnswer = Array.isArray(question.question_answers)
    ? question.question_answers[0]
    : question.question_answers

  const correctIndex = questionAnswer?.correct_answer_index
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    throw new Error('Practice answer key is invalid')
  }

  return buildPracticeAnswerFeedback(
    correctIndex,
    selectedIndex,
    typeof questionAnswer?.explanation === 'string' ? questionAnswer.explanation : null,
  )
}

export async function saveAnswer(
  sessionId: string,
  questionId: string,
  answerData: unknown,
  isMarkedForReview: boolean
) {
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const session = await readCandidateSession(supabase, user.id, sessionId);

  if (!session) {
    throw new Error('Exam session not found or unauthorized');
  }

  if (session.status !== 'in_progress') {
    throw new Error('Answers can only be saved while the session is in progress');
  }

  await ensureExamAnswerWindow(adminClient, session);

  const { data: question, error: questionError } = await adminClient
    .from('questions')
    .select('id, exam_id, options')
    .eq('id', questionId)
    .single();

  if (questionError || !question) {
    throw new Error('Question not found');
  }

  const practiceQuestionIds = Array.isArray(session.question_ids)
    ? session.question_ids.filter((id: unknown): id is string => typeof id === 'string')
    : [];

  if (session.is_practice) {
    if (!practiceQuestionIds.includes(questionId)) {
      throw new Error('Question does not belong to this practice session');
    }
  } else if (question.exam_id !== session.exam_id) {
    throw new Error('Question does not belong to this exam session');
  } else if (practiceQuestionIds.length > 0 && !practiceQuestionIds.includes(questionId)) {
    throw new Error('Question does not belong to this exam session');
  }

  const selectedOptionIndex =
    typeof answerData === 'number' && Number.isInteger(answerData) && answerData >= 0
      ? answerData
      : null;

  const options = Array.isArray(question.options) ? question.options : [];
  if (selectedOptionIndex !== null && selectedOptionIndex >= options.length) {
    throw new Error('Invalid option index');
  }

  const { error: answerError } = await adminClient
    .from('answers')
    .upsert(
      {
        session_id: sessionId,
        question_id: questionId,
        selected_option_index: selectedOptionIndex,
        marked_for_review: Boolean(isMarkedForReview),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,question_id' }
    );

  if (answerError) {
    throw new Error(`Failed to save answer: ${answerError.message}`);
  }

  await writeAudit({
    session_id: sessionId,
    candidate_id: user.id,
    action: 'answer_saved',
    metadata: { question_id: questionId, selected_option_index: selectedOptionIndex },
  });

  return { success: true };
}

/**
 * Saves eligible answers and grades the authenticated candidate's active session from persisted answers.
 * Client answers received after the exam deadline are ignored; grading uses the frozen session roster.
 * @param sessionId - Active session owned by the authenticated candidate.
 * @param answers - Client answers keyed by question ID.
 * @param questionIds - Unused legacy argument; the stored session roster determines grading.
 * @returns A success flag and the number of correct answers.
 * @throws If authorization, validation, persistence, or session completion fails.
 */
export async function submitExamAnswers(sessionId: string, answers: Record<string, unknown>, questionIds?: string[]) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  // 1. Fetch the exam session to get exam_id and check if practice
  const session = await readCandidateSession(supabase, user.id, sessionId);
    
  if (!session) {
    throw new Error('Exam session not found or unauthorized')
  }

  if (session.status !== 'in_progress') {
    throw new Error('Exam session is not active')
  }

  const serverDeadline = await getExamAnswerDeadline(adminClient, {
    is_practice: session.is_practice,
    exam_id: session.exam_id,
    started_at: session.started_at
  });
  const acceptingNewClientAnswers = serverDeadline === null || Date.now() <= serverDeadline;

  // 2. Fetch correct answers via admin client (bypasses RLS)
  let query = adminClient
    .from('questions')
    .select('id, options, question_answers(correct_answer_index)');

  const rosterIds = Array.isArray(session.question_ids)
    ? session.question_ids.filter((id: unknown): id is string => typeof id === 'string')
    : [];

  if (rosterIds.length === 0) {
    throw new Error('Session has no frozen question roster');
  }
  query = query.in('id', rosterIds);

  const { data: questions, error: questionsErr } = await query;

  if (questionsErr || !questions) {
    throw new Error('Failed to fetch grading data')
  }

  // 3. Calculate score and analytics
  let correct_questions = 0;
  let attempted_questions = 0;
  let incorrect_questions = 0;
  const total_questions = questions.length;
  const questionMap = new Map<string, number>();
  const optionCountMap = new Map<string, number>();
  
  type QuestionWithAnswer = {
    id: string;
    options: unknown;
    question_answers: { correct_answer_index: number }[] | { correct_answer_index: number } | null;
  };
  
  (questions as QuestionWithAnswer[]).forEach((q) => {
    optionCountMap.set(q.id, Array.isArray(q.options) ? q.options.length : 0);
    if (Array.isArray(q.question_answers) && q.question_answers.length > 0) {
      questionMap.set(q.id, q.question_answers[0].correct_answer_index);
    } else if (q.question_answers && !Array.isArray(q.question_answers)) {
      questionMap.set(q.id, q.question_answers.correct_answer_index);
    }
  });

  const validQuestionIds = new Set(questions.map((q) => q.id));

  const answersToInsert = acceptingNewClientAnswers
    ? Object.values(answers)
        .map((ans: unknown) => ans as { question_id: string; answer_data: unknown; is_marked_for_review: boolean; })
        .filter((ansTyped) => validQuestionIds.has(ansTyped.question_id))
        .map((ansTyped) => {
    
    const isAttempted = typeof ansTyped.answer_data === 'number'
      && Number.isInteger(ansTyped.answer_data)
      && ansTyped.answer_data >= 0
      && ansTyped.answer_data < (optionCountMap.get(ansTyped.question_id) || 0);
    if (isAttempted) {
      attempted_questions += 1;
      if (questionMap.get(ansTyped.question_id) === ansTyped.answer_data) {
        correct_questions += 1;
      } else {
        incorrect_questions += 1;
      }
    }
    
    return {
      session_id: sessionId,
      question_id: ansTyped.question_id,
      selected_option_index: (typeof ansTyped.answer_data === 'number' && Number.isInteger(ansTyped.answer_data) && ansTyped.answer_data >= 0 && ansTyped.answer_data < (optionCountMap.get(ansTyped.question_id) || 0)) ? ansTyped.answer_data : null,
      marked_for_review: ansTyped.is_marked_for_review
    };
  })
    : [];

  if (acceptingNewClientAnswers && answersToInsert.length > 0) {
    const { error: ansError } = await adminClient
      .from('answers')
      .upsert(answersToInsert, { onConflict: 'session_id,question_id' });

    if (ansError) {
      throw new Error(`Failed to save answers: ${ansError.message}`);
    }
  }

  // Always calculate the final score from server-persisted answers. If the
  // exam deadline has already passed, no new client answers are accepted.
  const { data: persistedAnswers, error: persistedAnswersError } = await adminClient
    .from('answers')
    .select('question_id, selected_option_index')
    .eq('session_id', sessionId);

  if (persistedAnswersError) {
    throw new Error(`Failed to load persisted answers: ${persistedAnswersError.message}`);
  }

  const serverAnswerMap = new Map(
    (persistedAnswers || []).map(answer => [answer.question_id, answer.selected_option_index])
  );

  correct_questions = 0;
  attempted_questions = 0;
  incorrect_questions = 0;

  for (const question of questions) {
    const selectedIndex = serverAnswerMap.get(question.id) ?? null;
    const optionCount = optionCountMap.get(question.id) || 0;

    if (
      typeof selectedIndex !== 'number' ||
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= optionCount
    ) {
      continue;
    }

    attempted_questions += 1;

    if (questionMap.get(question.id) === selectedIndex) {
      correct_questions += 1;
    } else {
      incorrect_questions += 1;
    }
  }

  const unanswered_questions = total_questions - attempted_questions;
  const percentage = total_questions > 0 ? (correct_questions / total_questions) * 100 : 0;

  // 5. Complete session with comprehensive analytics using adminClient to bypass disabled UPDATE policy
  const { data: updatedSession, error: sessionError } = await adminClient
    .from('exam_sessions')
    .update({
      status: 'submitted',
      completed_at: new Date().toISOString(),
      score: correct_questions,
      total_questions,
      attempted_questions,
      correct_questions,
      incorrect_questions,
      unanswered_questions,
      percentage
    })
    .eq('id', sessionId)
    .eq('candidate_id', user.id)
    .eq('status', 'in_progress')
    .select('id')
    .maybeSingle()

  if (sessionError) {
    throw new Error(`Failed to complete session: ${sessionError.message}`)
  }

  if (!updatedSession) {
    throw new Error('Exam session was already submitted or is no longer active')
  }

  await writeAudit({
    session_id: sessionId,
    candidate_id: user.id,
    action: 'submitted_exam',
    metadata: { score: correct_questions, percentage }
  })

  return { success: true, score: correct_questions }
}

export async function recordAnswerEvent(sessionId: string, questionId: string) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  // Verify ownership
  const { data: session } = await supabase
    .from('exam_sessions')
    .select('id, status, question_ids')
    .eq('id', sessionId)
    .eq('candidate_id', user.id)
    .single()

  if (!session || session.status !== 'in_progress') return { success: false }

  const roster = Array.isArray(session.question_ids)
    ? session.question_ids.filter((id: unknown): id is string => typeof id === 'string')
    : []

  if (roster.length === 0 || !roster.includes(questionId)) return { success: false }

  await writeAudit({
    session_id: sessionId,
    candidate_id: user.id,
    action: 'answered_question',
    metadata: { question_id: questionId }
  })

  return { success: true }
}

export async function verifyActiveSession(sessionId: string, isPractice: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const session = await readCandidateSession(supabase, user.id, sessionId);

  const questionIds = Array.isArray(session?.question_ids)
    ? session.question_ids.filter((id: unknown): id is string => typeof id === 'string')
    : []

  if (!session || session.is_practice !== isPractice || session.status !== 'in_progress' || questionIds.length === 0) {
    return { valid: false as const, serverNow: Date.now(), userId: user.id }
  }

  return {
    valid: true as const,
    serverNow: Date.now(),
    userId: user.id,
    session: {
      id: session.id,
      examId: session.exam_id,
      isPractice: Boolean(session.is_practice),
      status: session.status,
      questionIds,
      startedAt: session.started_at,
    },
  }
}

export async function updatePreferences(prefs: { preferred_mode?: string; preferred_lang?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Fetch current preferences first since we need to merge
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('accessibility_prefs')
    .eq('id', user.id)
    .single()

  if (fetchError) throw new Error(`Failed to fetch profile: ${fetchError.message}`)

  const currentPrefs = (profile.accessibility_prefs as Record<string, unknown>) || {}
  const sanitizedPrefs: Record<string, string> = {};

  if (prefs.preferred_mode !== undefined) {
    if (prefs.preferred_mode !== 'standard' && prefs.preferred_mode !== 'voice-first') {
      throw new Error('Invalid preferred mode');
    }
    sanitizedPrefs.preferred_mode = prefs.preferred_mode;
  }

  if (prefs.preferred_lang !== undefined) {
    if (!['en-IN', 'hi-IN', 'te-IN'].includes(prefs.preferred_lang)) {
      throw new Error('Invalid preferred language');
    }
    sanitizedPrefs.preferred_lang = prefs.preferred_lang;
  }

  const updatedPrefs = {
    ...currentPrefs,
    ...sanitizedPrefs
  }

  // Update profile
  const adminClient = await createAdminClient()
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ accessibility_prefs: updatedPrefs })
    .eq('id', user.id)

  if (updateError) throw new Error(`Failed to update preferences: ${updateError.message}`)

  return { success: true }
}

export async function updateLearningProfileConsent(consent: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const adminClient = await createAdminClient();
  const { error } = await adminClient
    .from('profiles')
    .update({ learning_profile_consent: consent })
    .eq('id', user.id);

  if (error) throw new Error(`Failed to update consent: ${error.message}`);
  return { success: true };
}

export async function buildLearningProfile(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    throw new Error('Unauthorized');
  }

  const adminClient = await createAdminClient();
  
  const { data: profile } = await adminClient
    .from('profiles')
    .select('accessibility_prefs, learning_profile_consent')
    .eq('id', userId)
    .single();

  if (!profile || !profile.learning_profile_consent) {
    throw new Error('Consent not granted or profile not found');
  }

  // Fetch all submitted sessions and their frozen question rosters.
  const { data: sessions } = await adminClient
    .from('exam_sessions')
    .select('id, is_practice, exam_id, question_ids, percentage, started_at, completed_at, score, total_questions')
    .eq('candidate_id', userId)
    .eq('status', 'submitted')
    .order('completed_at', { ascending: false });

  if (!sessions || sessions.length === 0) {
    return { error: 'Not enough data to build profile.' };
  }

  const totalSessions = sessions.length;
  const practiceSessions = sessions.filter((s: { is_practice: boolean }) => s.is_practice).length;
  const examSessions = totalSessions - practiceSessions;
  const recentAccuracy = sessions.slice(0, 5).map((s: { percentage: number }) => s.percentage);

  const sessionIds = sessions.map((s: { id: string }) => s.id);
  const answerBatches = await Promise.all(
    chunk(sessionIds).map(ids =>
      adminClient
        .from('answers')
        .select('session_id, question_id, selected_option_index')
        .in('session_id', ids)
    )
  );
  const answerBySessionQuestion = new Map<string, number | null>();
  for (const answer of answerBatches.flatMap(batch => batch.data || [])) {
    answerBySessionQuestion.set(
      `${answer.session_id}:${answer.question_id}`,
      answer.selected_option_index
    );
  }

  const rosterIds = [...new Set(
    sessions.flatMap(session =>
      Array.isArray(session.question_ids)
        ? session.question_ids.filter((id: unknown): id is string => typeof id === 'string')
        : []
    )
  )];

  const legacyExamIds = [...new Set(
    sessions
      .filter(session => !Array.isArray(session.question_ids) || session.question_ids.length === 0)
      .map(session => session.exam_id)
      .filter((id): id is string => typeof id === 'string')
  )];

  const [questionByIdBatches, questionByExamBatches] = await Promise.all([
    Promise.all(chunk(rosterIds).map(ids =>
      ids.length === 0
        ? Promise.resolve({ data: [], error: null })
        : adminClient.from('questions').select('id, exam_id, subject, question_answers(correct_answer_index)').in('id', ids)
    )),
    Promise.all(chunk(legacyExamIds).map(ids =>
      ids.length === 0
        ? Promise.resolve({ data: [], error: null })
        : adminClient.from('questions').select('id, exam_id, subject, question_answers(correct_answer_index)').in('exam_id', ids)
    )),
  ]);
  const questions = [...questionByIdBatches, ...questionByExamBatches].flatMap(batch => batch.data || []);
  const typedQuestions = (questions || []) as ServerAnalyticsQuestion[];
  const questionMap = new Map(typedQuestions.map(question => [question.id, question]));
  const subjectStats = new Map<string, { correct: number; total: number }>();

  for (const session of sessions) {
    let sessionQuestionIds = Array.isArray(session.question_ids)
      ? session.question_ids.filter((id: unknown): id is string => typeof id === 'string')
      : [];

    if (sessionQuestionIds.length === 0 && session.exam_id) {
      sessionQuestionIds = typedQuestions
        .filter(question => question.exam_id === session.exam_id)
        .map(question => question.id);
    }

    for (const questionId of sessionQuestionIds) {
      const question = questionMap.get(questionId);
      if (!question) continue;

      const subject = question.subject || 'General';
      const stat = subjectStats.get(subject) || { correct: 0, total: 0 };
      stat.total += 1;

      const answer = answerBySessionQuestion.get(`${session.id}:${questionId}`) ?? null;
      const questionAnswers = question.question_answers;
      const correctIndex = questionAnswers === null
        ? null
        : Array.isArray(questionAnswers)
          ? questionAnswers[0]?.correct_answer_index ?? null
          : questionAnswers.correct_answer_index;

      if (answer !== null && answer === correctIndex) {
        stat.correct += 1;
      }
      subjectStats.set(subject, stat);
    }
  }

  const subjects = Array.from(subjectStats.entries()).map(([sub, stat]) => ({
    subject: sub,
    accuracy: Math.round((stat.correct / stat.total) * 100)
  }));

  const strongSubjects = subjects.filter(s => s.accuracy >= 70).map(s => s.subject);
  const weakSubjects = subjects.filter(s => s.accuracy <= 50).map(s => s.subject);

  return {
    totalSessions,
    practiceSessions,
    examSessions,
    recentAccuracy,
    strongSubjects,
    weakSubjects,
    preferredLanguage: (profile.accessibility_prefs as { preferred_lang?: string })?.preferred_lang || 'en-IN',
    preferredMode: (profile.accessibility_prefs as { preferred_mode?: string })?.preferred_mode || 'standard'
  };
}
