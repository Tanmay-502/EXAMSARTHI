'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Question } from '@/lib/store/examStore'
import { SupabaseClient, User } from '@supabase/supabase-js'
import { writeAudit } from '@/lib/audit/writeAudit'
import { chunk } from '@/lib/db/chunk'

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
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('exams')
    .select('id, title, description, duration_minutes, questions(count)');

  if (error) {
    throw new Error(`Failed to fetch exams: ${error.message}`)
  }

  return data
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

  const { data: existing } = await adminClient
    .from('exam_sessions')
    .select('id, started_at')
    .eq('exam_id', examId)
    .eq('candidate_id', user.id)
    .eq('status', 'in_progress')
    .eq('is_practice', false)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

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

    if (stillActive) {
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
      const { data: raced } = await adminClient
        .from('exam_sessions')
        .select('id, started_at')
        .eq('exam_id', examId)
        .eq('candidate_id', user.id)
        .eq('status', 'in_progress')
        .eq('is_practice', false)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

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
    .select('id, subject, difficulty')
    .in('id', uniqueQuestionIds)

  if (rosterError || !rosterQuestions || rosterQuestions.length !== uniqueQuestionIds.length) {
    throw new Error('Practice question roster is invalid')
  }

  const rosterIsValid = rosterQuestions.every(
    question =>
      question.subject === normalizedSubject &&
      question.difficulty === normalizedDifficulty
  )

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

    if (sameRoster) return existing.id;

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

      if (raced && sameRacedRoster) return raced.id;

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

export async function fetchAvailablePracticeSubjects() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase.rpc('practice_subjects')

  if (error) {
    throw new Error(`Failed to fetch practice subjects: ${error.message}`)
  }

  return [...new Set(
    (data || [])
      .map(row => row.subject?.trim())
      .filter((subject): subject is string => Boolean(subject))
  )].sort((a, b) => a.localeCompare(b))
}

export async function fetchPracticeQuestions(subject: string, difficulty: string, count: number, lang: string = 'en-IN') {
  const supabase = await createClient()
  
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

  const countQuery = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('subject', normalizedSubject)
    .eq('difficulty', normalizedDifficulty)

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

  const questionsQuery = await supabase
    .from('questions')
    .select('id, exam_id, order_index, content_text, options, content_translations, options_translations, subject, difficulty, image_url, image_alt_text')
    .eq('subject', normalizedSubject)
    .eq('difficulty', normalizedDifficulty)
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

  const { data: session, error: sessionError } = await supabase
    .from('exam_sessions')
    .select('id, exam_id, is_practice, status, question_ids, started_at')
    .eq('id', sessionId)
    .eq('candidate_id', user.id)
    .single();

  if (sessionError || !session) {
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

export async function submitExamAnswers(sessionId: string, answers: Record<string, unknown>, questionIds?: string[]) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  // 1. Fetch the exam session to get exam_id and check if practice
  const { data: session, error: sessionErr } = await supabase
    .from('exam_sessions')
    .select('exam_id, status, is_practice, question_ids, started_at')
    .eq('id', sessionId)
    .eq('candidate_id', user.id)
    .single()
    
  if (sessionErr || !session) {
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

  if (rosterIds.length > 0) {
    query = query.in('id', rosterIds);
  } else if (session.is_practice) {
    throw new Error('Practice session has no question roster');
  } else {
    // Legacy exam sessions created before roster persistence can still be graded
    // against the exam's then-current question set.
    query = query.eq('exam_id', session.exam_id);
  }

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
      .upsert(answersToInsert, { onConflict: 'session_id, question_id' });

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
    .select('id')
    .eq('id', sessionId)
    .eq('candidate_id', user.id)
    .single()

  if (!session) return { success: false }

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

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('id, candidate_id, exam_id, is_practice, status, question_ids, started_at')
    .eq('id', sessionId)
    .eq('candidate_id', user.id)
    .single()

  if (error || !session || session.is_practice !== isPractice || session.status !== 'in_progress') {
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
      questionIds: Array.isArray(session.question_ids) ? session.question_ids : [],
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
