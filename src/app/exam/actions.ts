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

export async function fetchExamQuestions(examId: string, sessionId: string, lang: string = 'en-IN') {
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

  let seed = Array.from(sessionId).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0) >>> 0;
  const shuffledQuestions = [...questions];
  for (let i = shuffledQuestions.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
  }

  // Map to the frontend Question type
  return shuffledQuestions.map((q: { id: string; exam_id: string; order_index: number; content_text: string; options: string[]; content_translations: Record<string, string>; options_translations: Record<string, string[]>; image_url: string | null; image_alt_text: string | null }) => {
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
  const adminClient = await createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  // Provision profile if it doesn't exist
  await ensureCandidateProfile(supabase, user)

  const { data, error } = await adminClient
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

  await supabase.from('audit_logs').insert({
    session_id: data.id,
    candidate_id: user.id,
    action: 'started_exam',
  })

  return data.id
}

export async function startPracticeSession() {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  await ensureCandidateProfile(supabase, user)

  const { data, error } = await adminClient
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

  await supabase.from('audit_logs').insert({
    session_id: data.id,
    candidate_id: user.id,
    action: 'started_exam',
    metadata: { is_practice: true }
  })

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
    .eq('candidate_id', user.id)
    .single()
    
  if (sessionErr || !session) {
    throw new Error('Exam session not found or unauthorized')
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

  // 4. Upsert answers using adminClient to bypass disabled UPDATE/INSERT policy for clients
  if (answersToInsert.length > 0) {
    const { error: ansError } = await adminClient
      .from('answers')
      .upsert(answersToInsert, { onConflict: 'session_id, question_id' })
      
    if (ansError) {
      throw new Error(`Failed to save answers: ${ansError.message}`)
    }
  }

  // 5. Complete session with comprehensive analytics using adminClient to bypass disabled UPDATE policy
  const { error: sessionError } = await adminClient
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

  if (sessionError) {
    throw new Error(`Failed to complete session: ${sessionError.message}`)
  }

  await supabase.from('audit_logs').insert({
    session_id: sessionId,
    candidate_id: user.id,
    action: 'submitted_exam',
    metadata: { score: correct_questions, percentage }
  })

  return { success: true, score: correct_questions }
}

export async function recordAnswerEvent(sessionId: string, questionId: string) {
  const supabase = await createClient()
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

  await supabase.from('audit_logs').insert({
    session_id: sessionId,
    candidate_id: user.id,
    action: 'answered_question',
    metadata: { question_id: questionId }
  })

  return { success: true }
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

  // JSONB merge logic
  const currentPrefs = (profile.accessibility_prefs as Record<string, unknown>) || {}
  
  const updatedPrefs = {
    ...currentPrefs,
    ...prefs
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
  const adminClient = await createAdminClient();
  
  const { data: profile } = await adminClient
    .from('profiles')
    .select('accessibility_prefs, learning_profile_consent')
    .eq('id', userId)
    .single();

  if (!profile || !profile.learning_profile_consent) {
    throw new Error('Consent not granted or profile not found');
  }

  // Fetch all submitted sessions
  const { data: sessions } = await adminClient
    .from('exam_sessions')
    .select('id, is_practice, percentage, started_at, completed_at, score, total_questions')
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

  // Fetch answers to get subject-wise accuracy
  const sessionIds = sessions.map((s: { id: string }) => s.id);
  const { data: answersData } = await adminClient
    .from('answers')
    .select(`
      session_id,
      selected_option_index,
      questions (
        subject,
        question_answers (
          correct_answer_index
        )
      )
    `)
    .in('session_id', sessionIds);

  const subjectStats = new Map<string, { correct: number; total: number }>();

  if (answersData) {
    answersData.forEach((ans: {
      selected_option_index: number | null;
      questions: {
        subject: string | null;
        question_answers: { correct_answer_index: number }[] | { correct_answer_index: number } | null;
      }[] | {
        subject: string | null;
        question_answers: { correct_answer_index: number }[] | { correct_answer_index: number } | null;
      } | null;
    }) => {
      const qList = Array.isArray(ans.questions) ? ans.questions : (ans.questions ? [ans.questions] : []);
      const q = qList[0];
      if (!q) return;
      const subject = q.subject || 'General';
      const qa = q.question_answers;
      const correctIndex = Array.isArray(qa) 
        ? (qa.length > 0 ? qa[0].correct_answer_index : -1)
        : qa?.correct_answer_index;
      
      const isCorrect = ans.selected_option_index !== null && ans.selected_option_index === correctIndex;
      
      const stat = subjectStats.get(subject) || { correct: 0, total: 0 };
      stat.total += 1;
      if (isCorrect) stat.correct += 1;
      subjectStats.set(subject, stat);
    });
  }

  const subjects = Array.from(subjectStats.entries()).map(([sub, stat]) => ({
    subject: sub,
    accuracy: Math.round((stat.correct / stat.total) * 100)
  }));

  const strongSubjects = subjects.filter(s => s.accuracy >= 70).map(s => s.subject);
  const weakSubjects = subjects.filter(s => s.accuracy < 50).map(s => s.subject);

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
