export type PracticeFeedbackSession = {
  isPractice: boolean | null;
  status: string | null;
  questionIds: string[];
};

export type PracticeAnswerFeedback = {
  correct: boolean;
  correctIndex: number;
  explanation: string | null;
};

export function assertPracticeFeedbackAccess(
  session: PracticeFeedbackSession | null,
  questionId: string,
): asserts session is PracticeFeedbackSession {
  if (!session || session.isPractice !== true) {
    throw new Error('Practice feedback is only available for practice sessions');
  }
  if (session.status !== 'in_progress') {
    throw new Error('Practice feedback is only available while the session is in progress');
  }
  if (!session.questionIds.includes(questionId)) {
    throw new Error('Question does not belong to this practice session');
  }
}

export function buildPracticeAnswerFeedback(
  correctIndex: number,
  selectedIndex: number,
  explanation: string | null,
): PracticeAnswerFeedback {
  return {
    correct: correctIndex === selectedIndex,
    correctIndex,
    explanation: explanation?.trim() || null,
  };
}
