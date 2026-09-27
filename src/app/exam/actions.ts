'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Question } from '@/lib/store/examStore'
import { SupabaseClient, User } from '@supabase/supabase-js'

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

  return data.map((exam: { id: string; title: string; description: string | null; duration_minutes: number; questions: unknown }) => {
    const qs = exam.questions as { count: number }[] | null;
    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      duration_minutes: exam.duration_minutes,
      question_count: Array.isArray(qs) && qs.length > 0 ? qs[0].count : 0
    };
  }) as { id: string; title: string; description: string | null; duration_minutes: number; question_count: number }[];
}

export async function fetchExamQuestions(examId: string, lang: string = 'en-IN') {
  const supabase = await createClient()
  
  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  // Fetch questions, explicitly EXCLUDING correct_answer_index
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, exam_id, order_index, content_text, options, content_translations, options_translations, image_url, image_alt_text')
    .eq('exam_id', examId)
    .order('order_index', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch questions: ${error.message}`)
  }

  // Map to the frontend Question type
  return questions.map((q: { id: string; exam_id: string; order_index: number; content_text: string; options: string[]; content_translations: Record<string, string>; options_translations: Record<string, string[]>; image_url: string | null; image_alt_text: string | null }) => {
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
  }) as Question[]
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
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  // Provision profile if it doesn't exist
  await ensureCandidateProfile(supabase, user)

  const { data, error } = await supabase
    .from('exam_sessions')
    .insert({
      exam_id: examId,
      candidate_id: user.id,
      status: 'in_progress',
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to start session: ${error.message}`)
  }

  return data.id
}

export async function startPracticeSession() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  await ensureCandidateProfile(supabase, user)

  const { data, error } = await supabase
    .from('exam_sessions')
    .insert({
      exam_id: null, // No specific exam for practice
      candidate_id: user.id,
      status: 'in_progress',
      is_practice: true,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to start practice session: ${error.message}`)
  }

  return data.id
}

export async function fetchPracticeQuestions(subject: string, difficulty: string, count: number, lang: string = 'en-IN') {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  let query = supabase
    .from('questions')
    .select('id, exam_id, order_index, content_text, options, content_translations, options_translations, subject, difficulty, image_url, image_alt_text')
    
  if (subject) {
    query = query.ilike('subject', `%${subject}%`)
  }
  if (difficulty) {
    query = query.eq('difficulty', difficulty)
  }

  const { data: questions, error } = await query.limit(count)

  if (error) {
    throw new Error(`Failed to fetch practice questions: ${error.message}`)
  }

  return {
    questions: questions.map((qRaw: Record<string, unknown>, i: number) => {
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
    totalFound: questions.length
  };
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
    .select('exam_id, status, is_practice')
    .eq('id', sessionId)
    .single()
    
  if (sessionErr || !session) {
    throw new Error('Exam session not found')
  }

  if (session.status === 'submitted') {
    throw new Error('Exam session already submitted')
  }

  // Extract question IDs from answers
  const answerKeys = Object.values(answers).map((a: unknown) => (a as { question_id: string }).question_id);
  
  // 2. Fetch correct answers via admin client (bypasses RLS)
  let query = adminClient
    .from('questions')
    .select('id, question_answers(correct_answer_index)');

  if (session.is_practice) {
    if (!questionIds || questionIds.length === 0) {
      if (answerKeys.length === 0) {
        throw new Error('No questions provided for practice session');
      }
      query = query.in('id', answerKeys);
    } else {
      query = query.in('id', questionIds);
    }
  } else {
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
  
  type QuestionWithAnswer = {
    id: string;
    question_answers: { correct_answer_index: number }[] | { correct_answer_index: number } | null;
  };
  
  (questions as QuestionWithAnswer[]).forEach((q) => {
    if (Array.isArray(q.question_answers) && q.question_answers.length > 0) {
      questionMap.set(q.id, q.question_answers[0].correct_answer_index);
    } else if (q.question_answers && !Array.isArray(q.question_answers)) {
      questionMap.set(q.id, q.question_answers.correct_answer_index);
    }
  });

  const validQuestionIds = new Set(questions.map((q) => q.id));

  const answersToInsert = Object.values(answers)
    .map((ans: unknown) => ans as { question_id: string; answer_data: unknown; is_marked_for_review: boolean; })
    .filter((ansTyped) => validQuestionIds.has(ansTyped.question_id))
    .map((ansTyped) => {
    
    // Grading
    const isAttempted = typeof ansTyped.answer_data === 'number' && ansTyped.answer_data >= 0;
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
      selected_option_index: (typeof ansTyped.answer_data === 'number' && ansTyped.answer_data >= 0) ? ansTyped.answer_data : null,
      marked_for_review: ansTyped.is_marked_for_review
    };
  })

  const unanswered_questions = total_questions - attempted_questions;
  const percentage = total_questions > 0 ? (correct_questions / total_questions) * 100 : 0;

  // 4. Upsert answers
  if (answersToInsert.length > 0) {
    const { error: ansError } = await supabase
      .from('answers')
      .upsert(answersToInsert, { onConflict: 'session_id, question_id' })
      
    if (ansError) {
      throw new Error(`Failed to save answers: ${ansError.message}`)
    }
  }

  // 5. Complete session with comprehensive analytics
  const { error: sessionError } = await supabase
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

  if (sessionError) {
    throw new Error(`Failed to complete session: ${sessionError.message}`)
  }

  return { success: true, score: correct_questions }
}
