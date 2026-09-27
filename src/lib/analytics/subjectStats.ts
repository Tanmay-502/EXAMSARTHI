import type { SupabaseClient } from '@supabase/supabase-js';

export type SubjectStat = {
  subject: string;
  correct: number;
  incorrect: number;
  unanswered: number;
  total: number;
  accuracy: number;
};

type SessionForSubjectStats = {
  id: string;
  exam_id: string | null;
  is_practice: boolean | null;
  question_ids?: unknown;
};

type QuestionRow = {
  id: string;
  exam_id: string | null;
  subject: string | null;
  question_answers:
    | { correct_answer_index: number }[]
    | { correct_answer_index: number }
    | null;
};

type AnswerRow = {
  session_id: string;
  question_id: string;
  selected_option_index: number | null;
};

function getCorrectAnswerIndex(question: QuestionRow): number | null {
  const answers = question.question_answers;
  if (Array.isArray(answers)) return answers[0]?.correct_answer_index ?? null;
  return answers?.correct_answer_index ?? null;
}

function uniqueStringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0)));
}

export async function buildSubjectStats(
  adminClient: SupabaseClient,
  sessions: SessionForSubjectStats[]
): Promise<Record<string, SubjectStat>> {
  if (sessions.length === 0) return {};

  const sessionIds = sessions.map(session => session.id);
  const examIds = Array.from(new Set(
    sessions
      .filter(session => !session.is_practice && session.exam_id)
      .map(session => session.exam_id as string)
  ));
  const practiceQuestionIds = Array.from(new Set(
    sessions.flatMap(session => session.is_practice ? uniqueStringIds(session.question_ids) : [])
  ));

  const [examQuestionsResult, practiceQuestionsResult, answersResult] = await Promise.all([
    examIds.length > 0
      ? adminClient
          .from('questions')
          .select('id, exam_id, subject, question_answers(correct_answer_index)')
          .in('exam_id', examIds)
      : Promise.resolve({ data: [], error: null }),
    practiceQuestionIds.length > 0
      ? adminClient
          .from('questions')
          .select('id, exam_id, subject, question_answers(correct_answer_index)')
          .in('id', practiceQuestionIds)
      : Promise.resolve({ data: [], error: null }),
    adminClient
      .from('answers')
      .select('session_id, question_id, selected_option_index')
      .in('session_id', sessionIds),
  ]);

  if (examQuestionsResult.error) throw new Error(examQuestionsResult.error.message);
  if (practiceQuestionsResult.error) throw new Error(practiceQuestionsResult.error.message);
  if (answersResult.error) throw new Error(answersResult.error.message);

  const questions = [
    ...((examQuestionsResult.data || []) as unknown as QuestionRow[]),
    ...((practiceQuestionsResult.data || []) as unknown as QuestionRow[]),
  ];
  const questionById = new Map(questions.map(question => [question.id, question]));
  const questionsByExam = new Map<string, string[]>();
  for (const question of questions) {
    if (!question.exam_id) continue;
    const ids = questionsByExam.get(question.exam_id) || [];
    ids.push(question.id);
    questionsByExam.set(question.exam_id, ids);
  }

  const answerBySessionQuestion = new Map(
    ((answersResult.data || []) as unknown as AnswerRow[]).map(answer => [
      `${answer.session_id}:${answer.question_id}`,
      answer.selected_option_index,
    ])
  );

  const stats: Record<string, SubjectStat> = {};

  for (const session of sessions) {
    const questionIds = session.is_practice
      ? uniqueStringIds(session.question_ids)
      : (session.exam_id ? questionsByExam.get(session.exam_id) || [] : []);

    for (const questionId of questionIds) {
      const question = questionById.get(questionId);
      if (!question) continue;

      const subject = question.subject || 'General';
      const stat = stats[subject] || {
        subject,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        total: 0,
        accuracy: 0,
      };

      stat.total += 1;
      const selectedOptionIndex = answerBySessionQuestion.get(`${session.id}:${questionId}`);
      if (selectedOptionIndex === undefined || selectedOptionIndex === null) {
        stat.unanswered += 1;
      } else if (selectedOptionIndex === getCorrectAnswerIndex(question)) {
        stat.correct += 1;
      } else {
        stat.incorrect += 1;
      }

      stat.accuracy = Math.round((stat.correct / stat.total) * 100);
      stats[subject] = stat;
    }
  }

  return stats;
}
