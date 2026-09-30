import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { assertPracticeFeedbackAccess, buildPracticeAnswerFeedback } from '../feedback';

describe('practice feedback authorization', () => {
  test('rejects exam sessions', () => {
    assert.throws(
      () => assertPracticeFeedbackAccess({ isPractice: false, status: 'in_progress', questionIds: ['q1'] }, 'q1'),
      /only available for practice sessions/,
    );
  });

  test('rejects questions outside the session roster', () => {
    assert.throws(
      () => assertPracticeFeedbackAccess({ isPractice: true, status: 'in_progress', questionIds: ['q1'] }, 'q2'),
      /does not belong to this practice session/,
    );
  });

  test('returns correct feedback', () => {
    assert.deepEqual(buildPracticeAnswerFeedback(1, 1, 'Because 2 + 2 equals 4.'), {
      correct: true,
      correctIndex: 1,
      explanation: 'Because 2 + 2 equals 4.',
    });
  });

  test('returns incorrect feedback with the server correct index', () => {
    assert.deepEqual(buildPracticeAnswerFeedback(2, 0, 'The third option satisfies the condition.'), {
      correct: false,
      correctIndex: 2,
      explanation: 'The third option satisfies the condition.',
    });
  });
});
