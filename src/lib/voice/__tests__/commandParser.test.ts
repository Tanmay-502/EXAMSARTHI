import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { parseCommand } from '../commandParser';
import { normalizeSpokenEmail } from '../emailParser';

describe('Voice Command Parser', () => {
  describe('English (en-IN)', () => {
    test('plain login commands are deterministic', () => {
  assert.deepEqual(parseCommand('login', 'en-IN'), { type: 'SIGN_IN' })
  assert.deepEqual(parseCommand('लॉग इन', 'hi-IN'), { type: 'SIGN_IN' })
  assert.deepEqual(parseCommand('లాగిన్', 'te-IN'), { type: 'SIGN_IN' })
})

test('should parse SELECT_OPTION correctly', () => {
      assert.deepStrictEqual(parseCommand('option a', 'en-IN'), { type: 'SELECT_OPTION', index: 0 });
      assert.deepStrictEqual(parseCommand('answer b', 'en-IN'), { type: 'SELECT_OPTION', index: 1 });
      assert.deepStrictEqual(parseCommand('i choose c', 'en-IN', 'exam_active'), { type: 'SELECT_OPTION', index: 2 });
      assert.deepStrictEqual(parseCommand('d is the correct answer', 'en-IN'), { type: 'SELECT_OPTION', index: 3 });
    });

    test('should parse Navigation commands', () => {
      assert.deepStrictEqual(parseCommand('next', 'en-IN'), { type: 'NEXT' });
      assert.deepStrictEqual(parseCommand('back', 'en-IN'), { type: 'BACK' });
      assert.deepStrictEqual(parseCommand('repeat', 'en-IN'), { type: 'REPEAT' });
    });

    test('should parse JUMP_TO_QUESTION', () => {
      assert.deepStrictEqual(parseCommand('jump to question 5', 'en-IN'), { type: 'JUMP_TO_QUESTION', index: 4 });
      assert.deepStrictEqual(parseCommand('go to question 10', 'en-IN'), { type: 'JUMP_TO_QUESTION', index: 9 });
      assert.deepStrictEqual(parseCommand('question', 'en-IN'), { type: 'UNKNOWN' });
    });

    test('should parse Confirmation flows', () => {
      assert.deepStrictEqual(parseCommand('yes confirm it', 'en-IN'), { type: 'CONFIRM' });
      assert.deepStrictEqual(parseCommand('no change it', 'en-IN'), { type: 'CHANGE' });
    });

    test('should parse natural navigation phrases', () => {
      assert.deepStrictEqual(parseCommand('take me back to dashboard', 'en-IN'), { type: 'OPEN_DASHBOARD' });
      assert.deepStrictEqual(parseCommand('go to dashboard', 'en-IN'), { type: 'OPEN_DASHBOARD' });
      assert.deepStrictEqual(parseCommand('I want to give exam', 'en-IN'), { type: 'DASHBOARD_EXAM' });
    });

    test('does not treat ordinary speech as an option outside exam context', () => {
      assert.deepStrictEqual(parseCommand('who is first', 'en-IN', 'mode_selection'), { type: 'UNKNOWN' });
      assert.deepStrictEqual(parseCommand('who is first', 'en-IN', 'dashboard'), { type: 'UNKNOWN' });
      assert.deepStrictEqual(parseCommand('first', 'en-IN', 'exam_active'), { type: 'SELECT_OPTION', index: 0 });
    });

    test('mode words and analysis phrases are context-gated', () => {
      assert.deepStrictEqual(parseCommand('voice', 'en-IN', 'mode_selection'), { type: 'SELECT_MODE_VOICE' });
      assert.deepStrictEqual(parseCommand('standard', 'en-IN', 'dashboard'), { type: 'SELECT_MODE_STANDARD' });
      assert.deepStrictEqual(parseCommand('voice', 'en-IN', 'exam_active'), { type: 'UNKNOWN' });
      assert.deepStrictEqual(parseCommand('standard', 'en-IN', 'practice_active'), { type: 'UNKNOWN' });
      assert.deepStrictEqual(parseCommand('analysis', 'en-IN', 'dashboard'), { type: 'OPEN_ANALYSIS' });
      assert.deepStrictEqual(parseCommand('analysis', 'en-IN', 'exam_active'), { type: 'UNKNOWN' });
    });

    test('recognizes STT homophones for answer choices', () => {
      const cases: Array<[string, number]> = [
        ['a', 0], ['ay', 0], ['eh', 0],
        ['be', 1], ['bee', 1],
        ['see', 2], ['sea', 2],
        ['dee', 3],
        ['2', 1], ['to', 1], ['too', 1],
        ['3', 2], ['tree', 2],
        ['4', 3], ['for', 3],
      ];
      for (const [utterance, index] of cases) {
        assert.deepStrictEqual(parseCommand(utterance, 'en-IN', 'exam_active'), { type: 'SELECT_OPTION', index });
      }
      assert.deepStrictEqual(parseCommand('a very long utterance with many words', 'en-IN', 'exam_active'), { type: 'UNKNOWN' });
    });

    test('should parse Review commands', () => {
      assert.deepStrictEqual(parseCommand('mark for review', 'en-IN'), { type: 'MARK_REVIEW' });
      assert.deepStrictEqual(parseCommand('unmark it', 'en-IN'), { type: 'REMOVE_REVIEW' });
      assert.deepStrictEqual(parseCommand('review unanswered', 'en-IN'), { type: 'REVIEW_UNANSWERED' });
      assert.deepStrictEqual(parseCommand('review marked', 'en-IN'), { type: 'REVIEW_MARKED' });
    });
  });

  describe('Hindi (hi-IN)', () => {
    test('should parse SELECT_OPTION', () => {
      assert.deepStrictEqual(parseCommand('विकल्प ए', 'hi-IN'), { type: 'SELECT_OPTION', index: 0 });
      assert.deepStrictEqual(parseCommand('ऑप्शन बी', 'hi-IN'), { type: 'SELECT_OPTION', index: 1 });
    });

    test('should parse Navigation commands', () => {
      assert.deepStrictEqual(parseCommand('अगला', 'hi-IN'), { type: 'NEXT' });
      assert.deepStrictEqual(parseCommand('पिछला', 'hi-IN'), { type: 'BACK' });
    });

    test('should parse Confirmation flows', () => {
      assert.deepStrictEqual(parseCommand('पुष्टि करें', 'hi-IN'), { type: 'CONFIRM' });
      assert.deepStrictEqual(parseCommand('नहीं', 'hi-IN'), { type: 'CHANGE' });
    });
  });

  describe('Telugu (te-IN)', () => {
    test('should parse SELECT_OPTION', () => {
      assert.deepStrictEqual(parseCommand('ఎంపిక ఏ', 'te-IN'), { type: 'SELECT_OPTION', index: 0 });
      assert.deepStrictEqual(parseCommand('జవాబు బి', 'te-IN'), { type: 'SELECT_OPTION', index: 1 });
    });

    test('should parse Confirmation flows', () => {
      assert.deepStrictEqual(parseCommand('నిర్ధారించు', 'te-IN'), { type: 'CONFIRM' });
      assert.deepStrictEqual(parseCommand('కాదు', 'te-IN'), { type: 'CHANGE' });
    });

    test('should parse Telugu mode and analysis fallbacks', () => {
      assert.deepStrictEqual(parseCommand('వాయిస్', 'te-IN', 'mode_selection'), { type: 'SELECT_MODE_VOICE' });
      assert.deepStrictEqual(parseCommand('స్టాండర్డ్', 'te-IN', 'onboarding'), { type: 'SELECT_MODE_STANDARD' });
      assert.deepStrictEqual(parseCommand('విశ్లేషణ', 'te-IN', 'dashboard'), { type: 'OPEN_ANALYSIS' });
      assert.deepStrictEqual(parseCommand('నా పనితీరు ఎలా ఉంది', 'te-IN', 'dashboard'), { type: 'OPEN_ANALYSIS' });
    });
  });
  describe('Spoken email parsing', () => {
    test('normalizes natural spoken Gmail addresses', () => {
      assert.strictEqual(
        normalizeSpokenEmail('my email is tanmay at gmail dot com'),
        'tanmay@gmail.com'
      );
    });

    test('normalizes number words without corrupting names', () => {
      assert.strictEqual(
        normalizeSpokenEmail('jain dharm mein 502 83 at gmail dot com'),
        'jaindharmmein50283@gmail.com'
      );
    });

    test('does not return an invalid email for ordinary speech', () => {
      assert.strictEqual(normalizeSpokenEmail('I want to login'), null);
    });
  });
});
