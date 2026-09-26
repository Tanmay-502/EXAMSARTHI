'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Question } from '@/lib/store/examStore'
import { SupabaseClient, User } from '@supabase/supabase-js'

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
    .select('id, exam_id, order_index, content_text, options, content_translations, options_translations')
    .eq('exam_id', examId)
    .order('order_index', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch questions: ${error.message}`)
  }

  // Map to the frontend Question type
  return questions.map((q: { id: string; exam_id: string; order_index: number; content_text: string; options: string[]; content_translations: Record<string, string>; options_translations: Record<string, string[]> }) => {
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

export async function submitExamAnswers(sessionId: string, answers: Record<string, unknown>) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  // 1. Fetch the exam session to get exam_id
  const { data: session, error: sessionErr } = await supabase
    .from('exam_sessions')
    .select('exam_id, status')
    .eq('id', sessionId)
    .single()
    
  if (sessionErr || !session) {
    throw new Error('Exam session not found')
  }

  if (session.status === 'submitted') {
    throw new Error('Exam session already submitted')
  }

  // 2. Fetch correct answers via admin client (bypasses RLS)
  // We join question_answers with questions to only grade questions for this exam
  const { data: questions, error: questionsErr } = await adminClient
    .from('questions')
    .select('id, question_answers(correct_answer_index)')
    .eq('exam_id', session.exam_id)

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

  const answersToInsert = Object.values(answers).map((ans: unknown) => {
    const ansTyped = ans as { question_id: string; answer_data: unknown; is_marked_for_review: boolean; };
    
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
